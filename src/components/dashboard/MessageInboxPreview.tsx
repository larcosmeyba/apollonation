import { Link } from "react-router-dom";
import { MessageSquare, ChevronRight } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useProfileLookup } from "@/hooks/useProfileLookup";
import { formatDistanceToNow } from "date-fns";

const MessageInboxPreview = () => {
  const { conversations, unreadCount } = useMessages();
  const partnerIds = conversations.map((c) => c.partnerId);
  const { data: profiles } = useProfileLookup(partnerIds);

  const recentConversations = conversations.slice(0, 3);

  return (
    <div className="card-apollo p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg">Messages</h2>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <Link
          to="/dashboard/messages"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {recentConversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet. Your coach may reach out soon!
        </p>
      ) : (
        <div className="space-y-3">
          {recentConversations.map((conv) => {
            const profile = profiles?.[conv.partnerId];
            const name = profile?.display_name || "Unknown";
            const isUnread = conv.unreadCount > 0;

            return (
              <Link
                key={conv.partnerId}
                to={`/dashboard/messages?chat=${conv.partnerId}`}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-muted/50 ${
                  isUnread ? "bg-primary/5 border border-primary/20" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
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
                      {formatDistanceToNow(new Date(conv.lastMessage.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage.content}
                  </p>
                </div>
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessageInboxPreview;
