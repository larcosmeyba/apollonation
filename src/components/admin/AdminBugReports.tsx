import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bug, Send, CheckCircle2, Loader2, ArrowLeft, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Ticket {
  id: string;
  user_id: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

const AdminBugReports = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-bug-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("type", "bug")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Ticket[];
    },
  });

  // Get reporter profile (display_name) for selected ticket
  const { data: reporter } = useQuery({
    queryKey: ["bug-reporter", selected?.user_id],
    enabled: !!selected,
    queryFn: async () => {
      if (!selected) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, user_id")
        .eq("user_id", selected.user_id)
        .maybeSingle();
      return data;
    },
  });

  const openTicket = (t: Ticket) => {
    setSelected(t);
    setReplySubject(`Re: ${t.subject || "Your bug report"}`);
    setReplyMessage(
      `Hey${reporter?.display_name ? ` ${reporter.display_name.split(" ")[0]}` : ""},\n\nThanks for reporting this — we're on it. I'll let you know as soon as the fix is live.\n\n— Coach Marcos`
    );
  };

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selected || !replyMessage.trim()) return;
      const { error } = await supabase.functions.invoke("send-coach-email", {
        body: {
          recipientId: selected.user_id,
          subject: replySubject || "Re: Your bug report",
          message: replyMessage.trim(),
          type: "direct",
        },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      if (!selected) return;
      await supabase
        .from("support_tickets")
        .update({ status: "responded" })
        .eq("id", selected.id);
      toast({ title: "Reply sent ✅", description: "The user has been emailed." });
      qc.invalidateQueries({ queryKey: ["admin-bug-tickets"] });
      setSelected(null);
      setReplyMessage("");
      setReplySubject("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  const markResolved = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: "resolved" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Marked as resolved" });
      qc.invalidateQueries({ queryKey: ["admin-bug-tickets"] });
    },
  });

  const statusColor = (s: string) =>
    s === "resolved"
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : s === "responded"
      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
      : "bg-orange-500/15 text-orange-400 border-orange-500/30";

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to bug reports
        </button>

        <div className="border border-border rounded-lg p-5 bg-card mb-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-heading mb-1">{selected.subject}</h2>
              <p className="text-xs text-muted-foreground">
                From{" "}
                <span className="text-foreground">
                  {reporter?.display_name || "Unknown user"}
                </span>{" "}
                · {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge variant="outline" className={statusColor(selected.status)}>
              {selected.status}
            </Badge>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans border-t border-border pt-3">
            {selected.message}
          </pre>
        </div>

        <div className="border border-border rounded-lg p-5 bg-card space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            <h3 className="font-heading">Reply to user via email</h3>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Subject</Label>
            <Input value={replySubject} onChange={(e) => setReplySubject(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Message</Label>
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={10}
              maxLength={4000}
              className="resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="apollo"
              onClick={() => sendReply.mutate()}
              disabled={!replyMessage.trim() || sendReply.isPending}
            >
              {sendReply.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Email</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => markResolved.mutate(selected.id)}
              disabled={markResolved.isPending || selected.status === "resolved"}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark resolved
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Bug className="w-5 h-5 text-destructive" />
        <h1 className="text-2xl font-heading">Bug Reports</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        User-submitted issues from the in-app "Report a Bug" form. Reply directly via email.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No bug reports yet 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => openTicket(t)}
              className="w-full text-left border border-border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="font-medium text-sm truncate flex-1">{t.subject}</p>
                <Badge variant="outline" className={`${statusColor(t.status)} text-[10px]`}>
                  {t.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.message}</p>
              <p className="text-[10px] text-muted-foreground/70">
                {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBugReports;
