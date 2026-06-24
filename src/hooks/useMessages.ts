import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useEffect } from "react";

const DEFAULT_COACH_ID = "b1427538-a690-4cd4-8e34-423602562f4a";

export interface UseMessagesOptions {
  /**
   * When true, treat the current admin as Coach Marcos for the purposes of
   * listing conversations and replying. Conversations are grouped by the
   * client (the non-coach party), and outgoing messages are inserted with
   * sender_id = DEFAULT_COACH_ID so the client sees the reply in their own
   * coach thread. Requires the caller to actually have the admin role.
   */
  asCoachAdmin?: boolean;
}

const canUseRealtime = () => {
  if (typeof window === "undefined") return false;
  if (typeof window.WebSocket === "undefined") return false;
  return window.isSecureContext || window.location.protocol === "https:";
};

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
}

export const useMessages = (
  conversationPartnerId?: string,
  options: UseMessagesOptions = {}
) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminStatus();
  const queryClient = useQueryClient();
  // Only honor coach-admin mode if the caller is actually an admin.
  const asCoachAdmin = !!options.asCoachAdmin && isAdmin;
  // Identity to use as "self" for filtering / sending. Admins acting as the
  // coach impersonate the coach so the conversation is consistent for clients.
  const selfId = asCoachAdmin ? DEFAULT_COACH_ID : user?.id;

  // Pull this user's blocklist once. Used to filter messages everywhere.
  const blocksQuery = useQuery({
    queryKey: ["my-blocks", user?.id],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      if (!user) return [] as string[];
      try {
        const { data } = await supabase
          .from("user_blocks")
          .select("blocked_user_id")
          .eq("blocker_user_id", user.id);
        return (data || []).map((b: any) => b.blocked_user_id) as string[];
      } catch {
        return [] as string[];
      }
    },
  });
  const blockedSet = new Set(blocksQuery.data || []);

  // Fetch messages for a specific conversation
  const messagesQuery = useQuery({
    queryKey: ["messages", selfId, conversationPartnerId, asCoachAdmin, blocksQuery.data?.length ?? 0],
    retry: false,
    queryFn: async () => {
      if (!selfId || !conversationPartnerId) return [];
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${selfId},recipient_id.eq.${conversationPartnerId}),and(sender_id.eq.${conversationPartnerId},recipient_id.eq.${selfId})`
          )
          .order("created_at", { ascending: true });
        if (error) {
          console.error("[useMessages] messagesQuery error", error);
          return [] as Message[];
        }
        return (data as Message[] | null ?? []).filter((m) => !blockedSet.has(m.sender_id));
      } catch (e) {
        console.error("[useMessages] messagesQuery threw", e);
        return [] as Message[];
      }
    },
    enabled: !!selfId && !!conversationPartnerId,
  });

  // Fetch all conversations (unique partners)
  const conversationsQuery = useQuery({
    queryKey: ["conversations", selfId, asCoachAdmin, blocksQuery.data?.length ?? 0],
    retry: false,
    queryFn: async () => {
      if (!selfId) return [];
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${selfId},recipient_id.eq.${selfId}`)
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) {
          console.error("[useMessages] conversationsQuery error", error);
          return [];
        }

      // Group by conversation partner
      const conversations = new Map<
        string,
        { partnerId: string; lastMessage: Message; unreadCount: number }
      >();

      (data as Message[])
        // Hide entire conversations with users we've blocked.
        .filter((msg) => {
          const partnerId =
            msg.sender_id === selfId ? msg.recipient_id : msg.sender_id;
          return !blockedSet.has(partnerId);
        })
        .forEach((msg) => {
          const partnerId =
            msg.sender_id === selfId ? msg.recipient_id : msg.sender_id;
          if (!conversations.has(partnerId)) {
            conversations.set(partnerId, {
              partnerId,
              lastMessage: msg,
              unreadCount: 0,
            });
          }
          if (!msg.is_read && msg.recipient_id === selfId) {
            const conv = conversations.get(partnerId)!;
            conv.unreadCount += 1;
          }
        });

      return Array.from(conversations.values());
      } catch (e) {
        console.error("[useMessages] conversationsQuery threw", e);
        return [];
      }
    },
    enabled: !!selfId,
  });
  const unreadCountQuery = useQuery({
    queryKey: ["unread-count", user?.id],
    retry: false,
    queryFn: async () => {
      if (!user) return 0;
      try {
        const { count, error } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .eq("is_read", false);
        if (error) {
          console.error("[useMessages] unreadCountQuery error", error);
          return 0;
        }
        return count || 0;
      } catch (e) {
        console.error("[useMessages] unreadCountQuery threw", e);
        return 0;
      }
    },
    enabled: !!user,
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({
      recipientId,
      content,
    }: {
      recipientId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const trimmed = content.trim();
      if (!trimmed) throw new Error("Message is empty");
      if (trimmed.length > 4000) throw new Error("Message too long");

      // Defense-in-depth: explicit client-side membership pre-check for
      // coach DMs so non-members get a clean error instead of an RLS rejection.
      // The authoritative gate is still server-side (send_coach_message RPC).
      const isCoachThread = recipientId === DEFAULT_COACH_ID;
      if (isCoachThread && !asCoachAdmin) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("is_subscribed")
          .eq("user_id", user.id)
          .maybeSingle();
        const allowed = !!prof?.is_subscribed || isAdmin;
        if (!allowed) {
          const e: any = new Error("membership_required");
          e.code = "membership_required";
          throw e;
        }
      }

      const { data, error } = asCoachAdmin
        ? await supabase
            .from("messages")
            .insert({
              sender_id: DEFAULT_COACH_ID,
              recipient_id: recipientId,
              content: trimmed,
            })
            .select()
            .single()
        : isCoachThread
        ? await supabase.rpc("send_coach_message", { _content: trimmed })
        : await supabase
            .from("messages")
            .insert({
              sender_id: user.id,
              recipient_id: recipientId,
              content: trimmed,
            })
            .select()
            .single();

      if (error) {
        // Always surface the underlying error for prod debugging before translating.
        console.error("[sendMessage] insert failed", error);
        // RLS rejects non-Elite client inserts. Surface a clear Elite-required signal.
        const msg = (error.message || "").toLowerCase();
        if (
          msg.includes("row-level security") ||
          msg.includes("policy") ||
          msg.includes("membership_required") ||
          error.code === "42501"
        ) {
          const e: any = new Error("membership_required");
          e.code = "membership_required";
          throw e;
        }
        throw error;
      }

      // Optimistically push the new message into the messages cache so the
      // bubble flips from "sending" to "sent" instantly — no waiting for a
      // full refetch round-trip.
      const newMsg = (Array.isArray(data) ? data[0] : data) as Message;
      if (newMsg?.id) {
        queryClient.setQueriesData<Message[]>({ queryKey: ["messages"] }, (old) => {
          if (!old) return old;
          if (old.some((m) => m.id === newMsg.id)) return old;
          return [...old, newMsg];
        });
      }

      // Trigger email notification (fire-and-forget, do NOT block the UI)
      supabase.functions
        .invoke("send-message-notification", {
          body: { recipientId: newMsg?.recipient_id || recipientId },
        })
        .then(({ error }) => {
          if (error) console.error("Notification error:", error);
        });

      return newMsg;
    },
    onSuccess: () => {
      // Conversations list needs to refresh ordering / preview, but messages
      // were already updated optimistically above so don't force a refetch.
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (senderId: string) => {
      if (!user) throw new Error("Not authenticated");
      const recipientForRead = asCoachAdmin ? DEFAULT_COACH_ID : user.id;
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", senderId)
        .eq("recipient_id", recipientForRead)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  // Delete / unsend a message in the current conversation
  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any).rpc("delete_coach_message", {
        _message_id: messageId,
      });

      if (error) {
        console.error("[deleteMessage] failed", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  // Realtime subscription. Some embedded app/webview contexts block WebSocket and
  // supabase-js throws synchronously; messaging must still work without realtime.
  useEffect(() => {
    if (!user) return;
    if (!canUseRealtime()) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleInvalidate = () => {
      if (pendingTimer) return;
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      }, 250);
    };

    try {
      channel = supabase
        .channel(`messages-realtime-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          scheduleInvalidate
        );

      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[useMessages] realtime unavailable; falling back to manual refresh");
        }
      });
    } catch (error) {
      console.warn("[useMessages] realtime disabled", error);
      channel = null;
    }

    return () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    messages: messagesQuery.data || [],
    messagesLoading: messagesQuery.isLoading,
    conversations: conversationsQuery.data || [],
    conversationsLoading: conversationsQuery.isLoading,
    unreadCount: unreadCountQuery.data || 0,
    sendMessage,
    markAsRead,
    deleteMessage,
  };
};
