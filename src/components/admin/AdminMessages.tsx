import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/hooks/useMessages";
import { useProfileLookup } from "@/hooks/useProfileLookup";
import ChatView from "@/components/dashboard/ChatView";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const AdminMessages = () => {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { conversations, conversationsLoading } = useMessages();

  // Fetch all users for admin to initiate conversations
  const { data: allUsers } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, subscription_tier")
        .order("display_name");
      if (error) throw error;
      return data;
    },
  });

  const partnerIds = conversations.map((c) => c.partnerId);
  const { data: profiles } = useProfileLookup(partnerIds);

  // Merge existing conversations with all users
  const existingPartnerIds = new Set(partnerIds);
  const allContacts = [
    ...conversations.map((conv) => ({
      userId: conv.partnerId,
      name: profiles?.[conv.partnerId]?.display_name || "Unknown",
      tier: profiles?.[conv.partnerId]?.subscription_tier || "basic",
      lastMessage: conv.lastMessage,
      unreadCount: conv.unreadCount,
      hasConversation: true,
    })),
    ...(allUsers || [])
      .filter((u) => !existingPartnerIds.has(u.user_id))
      .map((u) => ({
        userId: u.user_id,
        name: u.display_name || "Unknown",
        tier: u.subscription_tier,
        lastMessage: null,
        unreadCount: 0,
        hasConversation: false,
      })),
  ];

  const filteredContacts = searchQuery
    ? allContacts.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allContacts;

  return (
    <div className="h-[600px] flex border border-border rounded-lg overflow-hidden">
      {/* Contact list */}
      <div
        className={`w-full md:w-80 border-r border-border flex flex-col ${
          selectedChat ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filteredContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedChat === contact.userId;
              const isUnread = contact.unreadCount > 0;

              return (
                <button
                  key={contact.userId}
                  onClick={() => setSelectedChat(contact.userId)}
                  className={`w-full text-left flex items-center gap-3 p-3 transition-all hover:bg-muted/50 ${
                    isSelected ? "bg-apollo-gold/10 border-l-2 border-apollo-gold" : ""
                  } ${isUnread ? "bg-apollo-gold/5" : ""}`}
                >
                  <div className="w-9 h-9 rounded-full bg-apollo-gold/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-apollo-gold">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${isUnread ? "font-semibold" : ""}`}>
                        {contact.name}
                      </p>
                      <span className="text-[10px] text-apollo-gold uppercase tracking-wide flex-shrink-0 ml-1">
                        {contact.tier}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.lastMessage
                        ? contact.lastMessage.content
                        : "No messages yet"}
                    </p>
                  </div>
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-apollo-gold flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`flex-1 flex flex-col ${!selectedChat ? "hidden md:flex" : "flex"}`}
      >
        {selectedChat ? (
          <ChatView
            partnerId={selectedChat}
            onBack={() => setSelectedChat(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Select a member to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;
