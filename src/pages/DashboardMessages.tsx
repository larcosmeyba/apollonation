import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatView from "@/components/dashboard/ChatView";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useMessages } from "@/hooks/useMessages";
import { useProfileLookup } from "@/hooks/useProfileLookup";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const COACH_USER_ID = "b1427538-a690-4cd4-8e34-423602562f4a";

const DashboardMessages = () => {
  const { isAdmin } = useAdminStatus();

  // Non-admin clients go straight to coach DM
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)]">
          <div className="card-apollo h-full flex overflow-hidden">
            <ChatView partnerId={COACH_USER_ID} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Admin sees the full inbox
  return <AdminInbox />;
};

const AdminInbox = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChat, setSelectedChat] = useState<string | null>(
    searchParams.get("chat")
  );
  const { conversations, conversationsLoading } = useMessages();
  const partnerIds = conversations.map((c) => c.partnerId);
  const { data: profiles } = useProfileLookup(partnerIds);

  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam) setSelectedChat(chatParam);
    else if (!selectedChat && conversations.length > 0) {
      setSelectedChat(conversations[0].partnerId);
    }
  }, [searchParams, conversations]);

  const handleSelectChat = (partnerId: string) => {
    setSelectedChat(partnerId);
    setSearchParams({ chat: partnerId });
  };

  const handleBack = () => {
    setSelectedChat(null);
    setSearchParams({});
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)]">
        <div className="card-apollo h-full flex overflow-hidden">
          {/* Conversation list */}
          <div
            className={`w-full md:w-80 border-r border-border flex flex-col ${
              selectedChat ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-border">
              <h1 className="font-heading text-xl flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-apollo-gold" />
                Messages
              </h1>
            </div>

            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Loading conversations...
                </p>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No conversations yet
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const profile = profiles?.[conv.partnerId];
                  const name = profile?.display_name || "Unknown";
                  const isUnread = conv.unreadCount > 0;
                  const isSelected = selectedChat === conv.partnerId;

                  return (
                    <button
                      key={conv.partnerId}
                      onClick={() => handleSelectChat(conv.partnerId)}
                      className={`w-full text-left flex items-center gap-3 p-4 transition-all hover:bg-muted/50 ${
                        isSelected ? "bg-apollo-gold/10 border-l-2 border-apollo-gold" : ""
                      } ${isUnread ? "bg-apollo-gold/5" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-apollo-gold/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-apollo-gold">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${isUnread ? "font-semibold" : ""}`}>
                            {name}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDistanceToNow(
                              new Date(conv.lastMessage.created_at),
                              { addSuffix: true }
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage.content}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-apollo-gold flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div
            className={`flex-1 flex flex-col ${
              !selectedChat ? "hidden md:flex" : "flex"
            }`}
          >
            {selectedChat ? (
              <ChatView partnerId={selectedChat} onBack={handleBack} />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    Select a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardMessages;
