import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const AdminPushNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("reminder");
  const [targetUser, setTargetUser] = useState("all");

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients-notify"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name").order("display_name");
      return data || [];
    },
  });

  const { data: recentNotifications = [] } = useQuery({
    queryKey: ["admin-recent-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!title || !message) throw new Error("Title and message required");
      const targets = targetUser === "all" ? clients.map((c: any) => c.user_id) : [targetUser];
      const inserts = targets.map((uid: string) => ({
        user_id: uid,
        title,
        message,
        type,
        is_read: false,
      }));
      const { error } = await supabase.from("notifications").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Notifications sent!" });
      setTitle("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-recent-notifications"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-recent-notifications"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl mb-1">Push Notifications</h2>
        <p className="text-sm text-muted-foreground">Send in-app notifications to clients</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Send Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reminder">🔔 Reminder</SelectItem>
                  <SelectItem value="achievement">🏆 Achievement</SelectItem>
                  <SelectItem value="alert">⚠️ Alert</SelectItem>
                  <SelectItem value="info">ℹ️ Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Send To</label>
              <Select value={targetUser} onValueChange={setTargetUser}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.display_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input placeholder="Notification title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border" />
          <Textarea placeholder="Message..." value={message} onChange={(e) => setMessage(e.target.value)} className="bg-muted border-border" rows={3} />
          <Button variant="apollo" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !title || !message}>
            <Bell className="w-4 h-4 mr-2" /> {sendMutation.isPending ? "Sending..." : "Send Notification"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-heading">Recent Notifications ({recentNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications sent yet</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentNotifications.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.is_read ? "text-muted-foreground/40" : "text-primary"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {format(new Date(n.created_at), "MMM d, h:mm a")} · {n.is_read ? "Read" : "Unread"}
                    </p>
                  </div>
                  <button onClick={() => deleteMutation.mutate(n.id)} className="p-1 rounded hover:bg-muted">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPushNotifications;
