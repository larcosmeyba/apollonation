import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { useProfileLookup } from "@/hooks/useProfileLookup";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Send, ArrowLeft, Flag, Ban } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

function safeRelativeTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
}
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import React from "react";

// Split on whitespace boundaries while keeping the delimiters so we can
// inspect each candidate URL independently and reject anything that isn't
// a valid http(s) URL.
const URL_CANDIDATE_REGEX = /(\bhttps?:\/\/\S+)/gi;

function isSafeHttpUrl(candidate: string): string | null {
  try {
    // Strip trailing punctuation that often follows URLs in prose.
    const trimmed = candidate.replace(/[),.!?;:]+$/g, "");
    const u = new URL(trimmed);
    if (u.protocol === "http:" || u.protocol === "https:") return trimmed;
    return null;
  } catch {
    return null;
  }
}

function renderMessageContent(content: string) {
  const parts = content.split(URL_CANDIDATE_REGEX);
  return parts.map((part, i) => {
    const safe = isSafeHttpUrl(part);
    if (safe) {
      return (
        <a
          key={i}
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all hover:opacity-80"
        >
          {safe}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

interface ChatViewProps {
  partnerId: string;
  onBack?: () => void;
  showHeader?: boolean;
  /** Override the displayed partner name (e.g. force "Coach Marcos"). */
  partnerNameOverride?: string;
}

const DRAFT_KEY_PREFIX = "chat-draft-";

const ChatView = ({ partnerId, onBack, showHeader = true, partnerNameOverride }: ChatViewProps) => {
  const { user } = useAuth();
  const { messages, messagesLoading, sendMessage, markAsRead } = useMessages(partnerId);
  const { data: profiles } = useProfileLookup([partnerId]);
  const [newMessage, setNewMessage] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY_PREFIX + partnerId) || ""; } catch { return ""; }
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCoachProfile, setShowCoachProfile] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reportTarget, setReportTarget] = useState<{ id: string } | null>(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Has the current user blocked the partner?
  const { data: isPartnerBlocked = false } = useQuery({
    queryKey: ["is-blocked", user?.id, partnerId],
    enabled: !!user && !!partnerId,
    queryFn: async () => {
      if (!user) return false;
      try {
        const { data } = await supabase
          .from("user_blocks")
          .select("blocked_user_id")
          .eq("blocker_user_id", user.id)
          .eq("blocked_user_id", partnerId)
          .maybeSingle();
        return !!data;
      } catch {
        return false;
      }
    },
  });

  // Fetch full partner profile for avatar and bio.
  // RLS may deny non-admin clients access to a coach's full profile row;
  // treat any failure as "no extended profile available" instead of crashing.
  const { data: partnerProfile } = useQuery({
    queryKey: ["partner-full-profile", partnerId],
    enabled: !!partnerId,
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, bio, fitness_goals")
          .eq("user_id", partnerId)
          .maybeSingle();
        return data ?? null;
      } catch {
        return null;
      }
    },
  });

  // Get signed avatar URL if needed
  const { data: avatarUrl } = useQuery({
    queryKey: ["avatar-url", partnerProfile?.avatar_url],
    queryFn: async () => {
      const url = partnerProfile?.avatar_url;
      if (!url) return null;
      if (url.startsWith("http")) return url;
      try {
        const { data } = await supabase.storage.from("avatars").createSignedUrl(url, 3600);
        return data?.signedUrl || null;
      } catch {
        return null;
      }
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

  const partnerName = partnerNameOverride || partnerProfile?.display_name || profiles?.[partnerId]?.display_name || "Coach";

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
    if (isPartnerBlocked) return;
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    sendMessage.mutate(
      { recipientId: partnerId, content: trimmed },
      {
        onError: (err: any) => {
          if (err?.code === "elite_required" || err?.message === "elite_required") {
            toast({
              title: "Apollo Elite™ required",
              description: "Upgrade to Elite to message Coach Marcos.",
              variant: "destructive",
            });
            setNewMessage(trimmed); // restore draft
            return;
          }
          toast({
            title: "Couldn't send message",
            description: err?.message ?? "Try again in a moment.",
            variant: "destructive",
          });
          setNewMessage(trimmed);
        },
      }
    );
    setNewMessage("");
    try { localStorage.removeItem(DRAFT_KEY_PREFIX + partnerId); } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const submitReport = async (reason: string) => {
    if (!user || !reportTarget) return;
    setSubmittingReport(true);
    try {
      const { error } = await supabase.from("message_reports").insert({
        reporter_user_id: user.id,
        message_id: reportTarget.id,
        reason,
      });
      if (error) throw error;
      toast({ title: "Report submitted", description: "Thanks — our team will review this." });
      setReportTarget(null);
    } catch (e: any) {
      toast({ title: "Couldn't submit report", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setSubmittingReport(false);
    }
  };

  // Hide messages from blocked users (defensive — list may be cached).
  const visibleMessages = isPartnerBlocked
    ? messages.filter((m) => m.sender_id !== partnerId)
    : messages;

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
        ) : visibleMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          visibleMessages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            const canReport = !isMine; // only inbound messages
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
                  // Long-press / right-click on inbound messages opens the report sheet.
                  onContextMenu={(e) => {
                    if (!canReport) return;
                    e.preventDefault();
                    setReportTarget({ id: msg.id });
                  }}
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-[hsl(210,100%,52%)] text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{renderMessageContent(msg.content)}</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p
                      className={`text-[10px] ${
                        isMine ? "text-white/70" : "text-muted-foreground"
                      }`}
                    >
                      {safeRelativeTime(msg.created_at)}
                    </p>
                    {canReport && (
                      <button
                        onClick={() => setReportTarget({ id: msg.id })}
                        className="text-[10px] text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1"
                        aria-label="Report message"
                      >
                        <Flag className="w-3 h-3" /> Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        {isPartnerBlocked ? (
          <p className="text-xs text-muted-foreground text-center py-2 inline-flex items-center justify-center gap-2 w-full">
            <Ban className="w-3.5 h-3.5" />
            You've blocked this user. Unblock from their profile to resume messaging.
          </p>
        ) : (
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
        )}
      </div>

      {/* Report message dialog */}
      <AlertDialog open={!!reportTarget} onOpenChange={(v) => !v && setReportTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this message?</AlertDialogTitle>
            <AlertDialogDescription>
              Reports are reviewed by our team. We may remove abusive or unsafe content
              and take action on the account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction disabled={submittingReport} onClick={() => submitReport("Abuse or harassment")}>
              Abuse or harassment
            </AlertDialogAction>
            <AlertDialogAction disabled={submittingReport} onClick={() => submitReport("Spam")}>
              Spam
            </AlertDialogAction>
            <AlertDialogAction disabled={submittingReport} onClick={() => submitReport("Inappropriate content")}>
              Inappropriate content
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <p className="text-xs text-primary uppercase tracking-wider mt-1">Your Coach</p>
            </div>
            {partnerProfile?.bio && (
              <div className="text-sm text-muted-foreground leading-relaxed">
                {partnerProfile.bio}
              </div>
            )}
            {partnerProfile?.fitness_goals && (
              <div className="w-full text-left">
                <p className="text-xs text-primary font-medium uppercase tracking-wider mb-2">Coaching Philosophy</p>
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
