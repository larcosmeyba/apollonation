import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import ChatView from "@/components/dashboard/ChatView";
import CoachSummaryPanel from "@/components/admin/CoachSummaryPanel";
import MemberBadge from "@/components/MemberBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/hooks/useMessages";
import { useProfileLookup } from "@/hooks/useProfileLookup";

type FilterTab = "eligible" | "active" | "trial" | "expired";

interface PartnerMembership {
  user_id: string;
  is_subscribed: boolean;
  is_trial: boolean;
  account_status: string;
}

const AdminMessages = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<string | null>(searchParams.get("chat"));
  const [filter, setFilter] = useState<FilterTab>("eligible");
  const { conversations, conversationsLoading } = useMessages(undefined, { asCoachAdmin: true });
  const partnerIds = conversations.map((c) => c.partnerId);
  const { data: profiles } = useProfileLookup(partnerIds);

  // Pull membership state for everyone in the inbox so we can filter and badge.
  const { data: memberships } = useQuery({
    queryKey: ["admin-inbox-memberships", partnerIds.sort().join(",")],
    enabled: partnerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,is_subscribed,is_trial,account_status")
        .in("user_id", partnerIds);
      if (error) throw error;
      const map: Record<string, PartnerMembership> = {};
      (data as PartnerMembership[]).forEach((m) => {
        map[m.user_id] = m;
      });
      return map;
    },
  });

  const isEligible = (m?: PartnerMembership) => !!m?.is_subscribed;
  const isActive = (m?: PartnerMembership) => !!m?.is_subscribed && !m?.is_trial;
  const isTrial = (m?: PartnerMembership) => !!m?.is_subscribed && !!m?.is_trial;
  const isExpired = (m?: PartnerMembership) => !m?.is_subscribed;

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const m = memberships?.[c.partnerId];
      if (filter === "eligible") return isEligible(m);
      if (filter === "active") return isActive(m);
      if (filter === "trial") return isTrial(m);
      if (filter === "expired") return isExpired(m);
      return true;
    });
  }, [conversations, memberships, filter]);

  const counts = useMemo(() => {
    const list = conversations.map((c) => memberships?.[c.partnerId]);
    return {
      eligible: list.filter(isEligible).length,
      active: list.filter(isActive).length,
      trial: list.filter(isTrial).length,
      expired: list.filter(isExpired).length,
    };
  }, [conversations, memberships]);

  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam) setSelectedChat(chatParam);
    else if (!selectedChat && filteredConversations.length > 0) {
      setSelectedChat(filteredConversations[0].partnerId);
    }
  }, [searchParams, filteredConversations, selectedChat]);

  const handleSelectChat = (partnerId: string) => {
    setSelectedChat(partnerId);
    setSearchParams({ chat: partnerId });
  };

  const handleBack = () => {
    setSelectedChat(null);
    setSearchParams({});
  };

  return (
    <div className="max-w-5xl mx-auto" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="card-apollo h-full flex overflow-hidden min-h-0">
        <div className={`w-full md:w-80 border-r border-border flex flex-col ${selectedChat ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border space-y-3">
            <h1 className="font-heading text-xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Messages
            </h1>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
              <TabsList className="bg-muted/50 h-auto flex-wrap w-full justify-start">
                <TabsTrigger value="eligible" className="text-[11px] px-2 py-1">
                  Eligible <span className="ml-1 opacity-60">({counts.eligible})</span>
                </TabsTrigger>
                <TabsTrigger value="active" className="text-[11px] px-2 py-1">
                  Members <span className="ml-1 opacity-60">({counts.active})</span>
                </TabsTrigger>
                <TabsTrigger value="trial" className="text-[11px] px-2 py-1">
                  Trial <span className="ml-1 opacity-60">({counts.trial})</span>
                </TabsTrigger>
                <TabsTrigger value="expired" className="text-[11px] px-2 py-1">
                  Expired <span className="ml-1 opacity-60">({counts.expired})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading conversations...</p>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Filter className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {filter === "eligible"
                    ? "No active members with conversations yet."
                    : filter === "expired"
                    ? "No expired members in the inbox."
                    : "No conversations match this filter."}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const profile = profiles?.[conv.partnerId];
                const membership = memberships?.[conv.partnerId];
                const name = profile?.display_name || "Unknown";
                const isUnread = conv.unreadCount > 0;
                const isSelected = selectedChat === conv.partnerId;
                const d = new Date(conv.lastMessage.created_at);

                return (
                  <button
                    key={conv.partnerId}
                    onClick={() => handleSelectChat(conv.partnerId)}
                    className={`w-full text-left flex items-center gap-3 p-4 transition-all hover:bg-muted/50 ${
                      isSelected ? "bg-primary/10 border-l-2 border-primary" : ""
                    } ${isUnread ? "bg-primary/5" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">{name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className={`text-sm truncate ${isUnread ? "font-semibold" : ""}`}>{name}</p>
                          <MemberBadge active={membership?.is_subscribed} trial={membership?.is_trial} />
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {Number.isNaN(d.getTime()) ? "" : formatDistanceToNow(d, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.content}</p>
                    </div>
                    {isUnread && <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={`flex-1 flex flex-col min-h-0 ${!selectedChat ? "hidden md:flex" : "flex"}`}>
          {selectedChat ? (
            <>
              <CoachSummaryPanel clientId={selectedChat} />
              <div className="flex-1 min-h-0 flex flex-col">
                <ChatView partnerId={selectedChat} onBack={handleBack} asCoachAdmin />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
