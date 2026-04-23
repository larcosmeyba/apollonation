import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  triage_status?: string;
  priority?: string;
  admin_reply?: string | null;
  admin_replied_at?: string | null;
}

const TRIAGE_OPTIONS = [
  { value: "new", label: "New", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { value: "acknowledged", label: "Acknowledged", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "in_progress", label: "In Progress", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  { value: "fixed", label: "Fixed", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  { value: "wont_fix", label: "Won't Fix", color: "bg-muted text-muted-foreground" },
  { value: "duplicate", label: "Duplicate", color: "bg-muted text-muted-foreground" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
  { value: "medium", label: "Medium", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  { value: "high", label: "High", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { value: "critical", label: "Critical", color: "bg-destructive/15 text-destructive border-destructive/30" },
];

const triageColor = (s: string) => TRIAGE_OPTIONS.find((o) => o.value === s)?.color || TRIAGE_OPTIONS[0].color;
const priorityColor = (s: string) => PRIORITY_OPTIONS.find((o) => o.value === s)?.color || PRIORITY_OPTIONS[1].color;

const AdminBugReports = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

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

  const filteredTickets = tickets?.filter((t) => {
    if (statusFilter !== "all" && (t.triage_status || "new") !== statusFilter) return false;
    if (priorityFilter !== "all" && (t.priority || "medium") !== priorityFilter) return false;
    return true;
  });

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
      t.admin_reply ||
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
        .update({
          status: "responded",
          triage_status: selected.triage_status === "new" ? "acknowledged" : selected.triage_status,
          admin_reply: replyMessage.trim(),
          admin_replied_at: new Date().toISOString(),
        } as any)
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

  const updateTriage = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: "triage_status" | "priority"; value: string }) => {
      const { error } = await supabase.from("support_tickets").update({ [field]: value } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Updated" });
      qc.invalidateQueries({ queryKey: ["admin-bug-tickets"] });
      if (selected) {
        // Refresh selected
        supabase.from("support_tickets").select("*").eq("id", selected.id).maybeSingle().then(({ data }) => {
          if (data) setSelected(data as Ticket);
        });
      }
    },
  });

  if (selected) {
    const triage = selected.triage_status || "new";
    const priority = selected.priority || "medium";
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to bug reports
        </button>

        <div className="border border-border rounded-lg p-5 bg-card mb-5">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-heading mb-1">{selected.subject}</h2>
              <p className="text-xs text-muted-foreground">
                From <span className="text-foreground">{reporter?.display_name || "Unknown user"}</span> ·{" "}
                {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={triage} onValueChange={(v) => updateTriage.mutate({ id: selected.id, field: "triage_status", value: v })}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={(v) => updateTriage.mutate({ id: selected.id, field: "priority", value: v })}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="apollo" onClick={() => sendReply.mutate()} disabled={!replyMessage.trim() || sendReply.isPending}>
              {sendReply.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send Email</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => updateTriage.mutate({ id: selected.id, field: "triage_status", value: "fixed" })}
              disabled={triage === "fixed"}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark fixed
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
        User-submitted issues from the in-app "Report a Bug" form. Triage and reply via email.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TRIAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…
        </div>
      ) : !filteredTickets || filteredTickets.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No bug reports match these filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((t) => {
            const tStatus = t.triage_status || "new";
            const tPrio = t.priority || "medium";
            return (
              <button
                key={t.id}
                onClick={() => openTicket(t)}
                className="w-full text-left border border-border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
                  <p className="font-medium text-sm flex-1 min-w-0 truncate">{t.subject}</p>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Badge variant="outline" className={`${priorityColor(tPrio)} text-[10px]`}>
                      {PRIORITY_OPTIONS.find((o) => o.value === tPrio)?.label}
                    </Badge>
                    <Badge variant="outline" className={`${triageColor(tStatus)} text-[10px]`}>
                      {TRIAGE_OPTIONS.find((o) => o.value === tStatus)?.label}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.message}</p>
                <p className="text-[10px] text-muted-foreground/70">
                  {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminBugReports;
