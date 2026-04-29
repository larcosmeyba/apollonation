import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

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

export const useMessages = (conversationPartnerId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    queryKey: ["messages", conversationPartnerId, blocksQuery.data?.length ?? 0],
    retry: false,
    queryFn: async () => {
      if (!user || !conversationPartnerId) return [];
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${conversationPartnerId}),and(sender_id.eq.${conversationPartnerId},recipient_id.eq.${user.id})`
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
    enabled: !!user && !!conversationPartnerId,
  });

  // Fetch all conversations (unique partners)
  const conversationsQuery = useQuery({
    queryKey: ["conversations", blocksQuery.data?.length ?? 0],
    retry: false,
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

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
            msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
          return !blockedSet.has(partnerId);
        })
        .forEach((msg) => {
          const partnerId =
            msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
          if (!conversations.has(partnerId)) {
            conversations.set(partnerId, {
              partnerId,
              lastMessage: msg,
              unreadCount: 0,
            });
          }
          if (!msg.is_read && msg.recipient_id === user.id) {
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
    enabled: !!user,
  });

  // Fetch unread count
  const unreadCountQuery = useQuery({
    queryKey: ["unread-count"],
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
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          content,
        })
        .select()
        .single();

      if (error) {
        // Always surface the underlying error for prod debugging before translating.
        console.error("[sendMessage] insert failed", error);
        // RLS rejects non-Elite client inserts. Surface a clear Elite-required signal.
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("row-level security") || msg.includes("policy") || error.code === "42501") {
          const e: any = new Error("elite_required");
          e.code = "elite_required";
          throw e;
        }
        throw error;
      }

      // Trigger email notification (fire-and-forget)
      supabase.functions.invoke("send-message-notification", {
        body: { recipientId },
      }).then(({ error }) => {
        if (error) console.error("Notification error:", error);
        else console.log("Notification sent successfully");
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  // Mark messages as read
  const markAsRead = useMutation({
    mutationFn: async (senderId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", senderId)
        .eq("recipient_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["unread-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
  };
};
