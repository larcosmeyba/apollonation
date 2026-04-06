import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Send, Users, CheckCircle, AlertTriangle } from "lucide-react";

const AdminBroadcast = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [targetTier, setTargetTier] = useState("all");
  const [sentCount, setSentCount] = useState<number | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["admin-broadcast-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, subscription_tier")
        .order("display_name");
      if (error) throw error;
      return (data || []).filter((p) => p.user_id !== user?.id);
    },
  });

  const filteredClients = clients?.filter((c) => {
    if (targetTier === "all") return true;
    return c.subscription_tier === targetTier;
  }) || [];

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !message.trim()) return;
      if (filteredClients.length === 0) throw new Error("No clients to send to");

      const { error } = await supabase.functions.invoke("send-coach-email", {
        body: {
          recipientIds: filteredClients.map((c) => c.user_id),
          subject: subject.trim() || "A Message from the Apollo Team",
          message: message.trim(),
          type: "broadcast",
        },
      });
      if (error) throw error;
      return filteredClients.length;
    },
    onSuccess: (count) => {
      setSentCount(count || 0);
      toast({ title: `Broadcast email sent to ${count} client${count !== 1 ? "s" : ""}` });
      setMessage("");
      setSubject("");
      setTimeout(() => setSentCount(null), 5000);
    },
    onError: (error) => {
      toast({ title: "Broadcast failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-heading text-xl flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Broadcast Email
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Send an email to all clients at once. Each client will receive it from Apollo Nation. Clients can unsubscribe anytime.
        </p>
      </div>

      <div className="card-apollo p-6 space-y-5">
        {/* Target audience */}
        <div className="space-y-2">
          <Label>Send to</Label>
          <Select value={targetTier} onValueChange={setTargetTier}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="basic">Essential Members Only</SelectItem>
              <SelectItem value="pro">Premier Members Only</SelectItem>
              <SelectItem value="elite">Elite Members Only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} will receive this email
          </p>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label>Subject Line</Label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A Message from the Apollo Team"
            maxLength={200}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey team! Just wanted to let you all know..."
            rows={6}
            maxLength={2000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Clients can unsubscribe from broadcast emails at any time. Emails are sent from Apollo Nation.
          </p>
        </div>

        {/* Send */}
        <div className="flex items-center gap-3">
          <Button
            variant="apollo"
            onClick={() => broadcastMutation.mutate()}
            disabled={!message.trim() || filteredClients.length === 0 || broadcastMutation.isPending}
          >
            {broadcastMutation.isPending ? "Sending..." : (
              <><Send className="w-4 h-4 mr-2" /> Send Broadcast Email</>
            )}
          </Button>

          {sentCount !== null && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Sent to {sentCount} client{sentCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBroadcast;
