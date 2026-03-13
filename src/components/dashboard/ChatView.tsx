import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { useProfileLookup } from "@/hooks/useProfileLookup";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, ArrowLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import React from "react";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderMessageContent(content: string) {
  const parts = content.split(URL_REGEX);
  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all hover:opacity-80"
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

interface ChatViewProps {
  partnerId: string;
  onBack?: () => void;
  showHeader?: boolean;
}

const DRAFT_KEY_PREFIX = "chat-draft-";

const ChatView = ({ partnerId, onBack, showHeader = true }: ChatViewProps) => {
  const { user } = useAuth();
  const { messages, messagesLoading, sendMessage, markAsRead } = useMessages(partnerId);
  const { data: profiles } = useProfileLookup([partnerId]);
  const [newMessage, setNewMessage] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY_PREFIX + partnerId) || ""; } catch { return ""; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCoachProfile, setShowCoachProfile] = useState(false);

  // Fetch full partner profile for avatar and bio
  const { data: partnerProfile } = useQuery({
    queryKey: ["partner-full-profile", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio, fitness_goals")
        .eq("user_id", partnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Get signed avatar URL if needed
  const { data: avatarUrl } = useQuery({
    queryKey: ["avatar-url", partnerProfile?.avatar_url],
    queryFn: async () => {
      const url = partnerProfile?.avatar_url;
      if (!url) return null;
      if (url.startsWith("http")) return url;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(url, 3600);
      return data?.signedUrl || null;
    },
    enabled: !!partnerProfile?.avatar_url,
  });

  // Persist draft to localStorage
  useEffect(() => {
    try {
      if (newMessage) localStorage.setItem(DRAFT_KEY_PREFIX + partnerId, newMessage);
      else localStorage.removeItem(DRAFT_KEY_PREFIX + partnerId);
    } catch {}
  }, [newMessage, partnerId]);

  const partnerName = partnerProfile?.display_name || profiles?.[partnerId]?.display_name || "Coach";

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (partnerId) {
      markAsRead.mutate(partnerId);
    }
  }, [partnerId, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    sendMessage.mutate({ recipientId: partnerId, content: trimmed });
    setNewMessage("");
    try { localStorage.removeItem(DRAFT_KEY_PREFIX + partnerId); } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-3 p-4 border-b border-border">
          {onBack && (
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowCoachProfile(true)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-9 w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={partnerName} />}
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                {partnerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="font-medium text-sm">{partnerName}</p>
              {partnerProfile?.bio && (
                <p className="text-[10px] text-muted-foreground">Tap to view profile</p>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messagesLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"} items-end gap-2`}
              >
                {/* Coach avatar on received messages */}
                {!isMine && (
                  <Avatar className="h-7 w-7 flex-shrink-0 mb-1">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={partnerName} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-medium">
                      {partnerName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-[hsl(210,100%,52%)] text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{renderMessageContent(msg.content)}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none bg-muted border-border text-foreground placeholder:text-muted-foreground"
            rows={1}
          />
          <Button
            variant="apollo"
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessage.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Coach Profile Dialog */}
      <Dialog open={showCoachProfile} onOpenChange={setShowCoachProfile}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Coach Profile</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={partnerName} />}
              <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                {partnerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-heading text-xl">{partnerName}</h3>
              <p className="text-xs text-apollo-gold uppercase tracking-wider mt-1">Your Coach</p>
            </div>
            {partnerProfile?.bio && (
              <div className="text-sm text-muted-foreground leading-relaxed">
                {partnerProfile.bio}
              </div>
            )}
            {partnerProfile?.fitness_goals && (
              <div className="w-full text-left">
                <p className="text-xs text-apollo-gold font-medium uppercase tracking-wider mb-2">Coaching Philosophy</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {partnerProfile.fitness_goals}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatView;
