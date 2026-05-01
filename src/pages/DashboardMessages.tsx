import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardBottomTabs from "@/components/dashboard/DashboardBottomTabs";
import ChatView from "@/components/dashboard/ChatView";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { useAssignedCoach } from "@/hooks/useAssignedCoach";
import { useMessages } from "@/hooks/useMessages";
import { useProfileLookup } from "@/hooks/useProfileLookup";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const DashboardMessages = () => {
  const { isAdmin, loading } = useAdminStatus();
  const { coach, loading: coachLoading } = useAssignedCoach();
  const { canAccessCoachMessaging, loading: accessLoading } = useAccessControl();
  const navigate = useNavigate();

  if (loading || (!isAdmin && coachLoading) || (!isAdmin && accessLoading)) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Elite-only feature for clients — show blurred paywall preview to non-Elite users.
  if (!isAdmin && !canAccessCoachMessaging) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
        {/* Faux conversation, blurred */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 p-4 space-y-3 blur-sm pointer-events-none select-none" aria-hidden>
            <div className="flex justify-start"><div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">Great work this week. Let's adjust your push day — drop the bench volume by 1 set and add tempo work.</div></div>
            <div className="flex justify-end"><div className="max-w-[75%] rounded-2xl rounded-br-sm bg-[hsl(210,100%,52%)] text-white px-4 py-2.5 text-sm">Sounds good. Should I keep the same RPE target?</div></div>
            <div className="flex justify-start"><div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">Stay at RPE 8. We're building, not testing. Send me a video of your top set on Friday.</div></div>
            <div className="flex justify-end"><div className="max-w-[75%] rounded-2xl rounded-br-sm bg-[hsl(210,100%,52%)] text-white px-4 py-2.5 text-sm">Will do. Macros felt low on Tuesday — pushing to 220g protein this week?</div></div>
            <div className="flex justify-start"><div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">Yes — 220g protein, keep carbs at 280g. Check in Sunday with weight + waist.</div></div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />

          {/* Overlay card */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="rounded-2xl bg-card border border-border/60 p-6 text-center max-w-sm w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6 text-amber-500" />
              </div>
              <span className="inline-block text-[10px] uppercase tracking-[0.15em] font-bold bg-amber-500 text-background rounded-full px-2.5 py-1">
                Apollo Elite™
              </span>
              <h3 className="text-xl font-bold leading-tight">Direct access to Coach Marcos</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Async coaching and personalized program adjustments — typically within 24 hours.
              </p>
              <Button variant="apollo" className="w-full" onClick={() => navigate("/subscribe?reason=elite")}>
                Upgrade to Elite
              </Button>
              <button
                onClick={() => navigate("/dashboard/profile")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Already have Elite? Restore purchases
              </button>
            </div>
          </div>
        </div>
        <DashboardBottomTabs />
      </div>
    );
  }

  // Non-admin clients go straight to coach DM
  if (!isAdmin) {
    if (!coach) {
      return (
        <div className="fixed inset-0 bg-background flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="max-w-xs space-y-3">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                You don't have a coach assigned yet. Once a coach is paired with your account, you'll be able to message them here.
              </p>
            </div>
          </div>
          <DashboardBottomTabs />
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
        {/* Chat takes remaining space above bottom tabs. ChatView's built-in
            header shows the coach avatar and is tappable to open the profile dialog. */}
        <div className="flex-1 overflow-hidden min-h-0 mb-16">
          <ChatView
            partnerId={coach.user_id}
            showHeader
            partnerNameOverride="Coach Marcos"
          />
        </div>

        {/* Bottom tabs */}
        <DashboardBottomTabs />
      </div>
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
  }, [searchParams, conversations, selectedChat]);

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
      <div className="max-w-4xl mx-auto" style={{ height: "calc(100vh - 8rem)" }}>
        <div className="card-apollo h-full flex overflow-hidden min-h-0">
          {/* Conversation list */}
          <div
            className={`w-full md:w-80 border-r border-border flex flex-col ${
              selectedChat ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-border">
              <h1 className="font-heading text-xl flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
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
                        isSelected ? "bg-primary/10 border-l-2 border-primary" : ""
                      } ${isUnread ? "bg-primary/5" : ""}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${isUnread ? "font-semibold" : ""}`}>
                            {name}
                          </p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {(() => {
                              const d = new Date(conv.lastMessage.created_at);
                              if (Number.isNaN(d.getTime())) return "";
                              try {
                                return formatDistanceToNow(d, { addSuffix: true });
                              } catch {
                                return "";
                              }
                            })()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage.content}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
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
