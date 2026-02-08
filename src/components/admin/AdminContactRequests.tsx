import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Eye, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminContactRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-contact-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_requests")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-contact-requests"] }),
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-requests"] });
      toast({ title: "Request deleted" });
    },
  });

  const filtered = requests?.filter((r) => {
    if (filter === "unread") return !r.is_read;
    if (filter === "read") return r.is_read;
    return true;
  });

  const unreadCount = requests?.filter((r) => !r.is_read).length || 0;

  if (isLoading) {
    return <div className="animate-pulse text-primary p-8">Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl">Contact Requests</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · {requests?.length || 0} total
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "unread", "read"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Requests list */}
      {!filtered?.length ? (
        <div className="card-apollo p-12 text-center text-muted-foreground">
          No {filter !== "all" ? filter : ""} requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req.id}
              className={`card-apollo p-5 transition-all ${
                !req.is_read ? "border-primary/30 bg-primary/5" : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-medium text-foreground">{req.name}</h3>
                    {!req.is_read && (
                      <Badge variant="default" className="text-xs">New</Badge>
                    )}
                    <Badge variant="outline" className="gap-1 text-xs">
                      {req.preferred_contact === "call" ? (
                        <><Phone className="w-3 h-3" /> Call</>
                      ) : (
                        <><Mail className="w-3 h-3" /> Email</>
                      )}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="text-foreground/70">Email:</span> {req.email}
                    </p>
                    {req.phone && (
                      <p>
                        <span className="text-foreground/70">Phone:</span> {req.phone}
                      </p>
                    )}
                    {req.message && (
                      <p className="mt-2 text-foreground/80 bg-muted p-3 rounded-lg">
                        {req.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(req.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!req.is_read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markRead.mutate(req.id)}
                      className="gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Mark Read
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRequest.mutate(req.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminContactRequests;
