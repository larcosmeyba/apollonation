import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, Send, Users, CheckCircle } from "lucide-react";

const AdminBroadcast = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [targetTier, setTargetTier] = useState("all");
  const [sentCount, setSentCount] = useState<number | null>(null);

  // Fetch all client profiles (excluding admin)
  const { data: clients } = useQuery({
    queryKey: ["admin-broadcast-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, subscription_tier")
        .order("display_name");
      if (error) throw error;
      // Filter out the admin's own profile
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

      const messages = filteredClients.map((client) => ({
        sender_id: user.id,
        recipient_id: client.user_id,
        content: message.trim(),
        is_read: false,
      }));

      if (messages.length === 0) throw new Error("No clients to send to");

      const { error } = await supabase.from("messages").insert(messages);
      if (error) throw error;
      return messages.length;
    },
    onSuccess: (count) => {
      setSentCount(count || 0);
      toast({ title: `Broadcast sent to ${count} client${count !== 1 ? "s" : ""}` });
      setMessage("");
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
          <Megaphone className="w-5 h-5 text-apollo-gold" />
          Broadcast Message
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Send a message to all clients at once. Each client will receive it as a direct message from you.
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
            {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} will receive this message
          </p>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey team! Just wanted to let you all know..."
            rows={5}
            maxLength={1000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
        </div>

        {/* Send */}
        <div className="flex items-center gap-3">
          <Button
            variant="apollo"
            onClick={() => broadcastMutation.mutate()}
            disabled={!message.trim() || filteredClients.length === 0 || broadcastMutation.isPending}
          >
            {broadcastMutation.isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Broadcast
              </>
            )}
          </Button>

          {sentCount !== null && (
            <span className="text-sm text-apollo-gold flex items-center gap-1">
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
