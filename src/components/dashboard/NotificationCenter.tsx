import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, Trash2, Trophy, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const NotificationCenter = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "reminder": return "bg-orange-500/15 text-orange-400";
      case "achievement": return "bg-green-500/15 text-green-400";
      case "alert": return "bg-destructive/15 text-destructive";
      default: return "bg-primary/15 text-primary";
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px] bg-background border-border">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-lg">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => markAllRead.mutate()}>
                <Check className="w-3 h-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-2 max-h-[80vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n: any) => (
              <div
                key={n.id}
                className={`p-3 rounded-lg border transition-all ${
                  n.is_read ? "bg-muted/20 border-border/50" : "bg-card border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(n.type)}`}>
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {format(new Date(n.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!n.is_read && (
                      <button onClick={() => markRead.mutate(n.id)} className="p-1 rounded hover:bg-muted" title="Mark read">
                        <Check className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={() => deleteNotification.mutate(n.id)} className="p-1 rounded hover:bg-muted" title="Delete">
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
