import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Eye, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "general", label: "General" },
  { value: "tech_support", label: "Tech Support" },
  { value: "account", label: "Account" },
  { value: "press", label: "Press" },
  { value: "partnership", label: "Partnership" },
  { value: "coach_application", label: "Coach Application" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  tech_support: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  account: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  press: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  partnership: "bg-green-500/15 text-green-400 border-green-500/30",
  coach_application: "bg-primary/20 text-primary border-primary/30",
};

const AdminContactRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

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
      const { error } = await supabase.from("contact_requests").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-contact-requests"] }),
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-requests"] });
      toast({ title: "Request deleted" });
    },
  });

  const filtered = requests?.filter((r: any) => {
    if (filter === "unread" && r.is_read) return false;
    if (filter === "read" && !r.is_read) return false;
    if (categoryFilter !== "all" && (r.category || "general") !== categoryFilter) return false;
    return true;
  });

  const unreadCount = requests?.filter((r: any) => !r.is_read).length || 0;

  if (isLoading) {
    return <div className="animate-pulse text-primary p-8">Loading requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl">Contact Requests</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · {requests?.length || 0} total
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {!filtered?.length ? (
        <div className="card-apollo p-12 text-center text-muted-foreground">
          No requests match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req: any) => {
            const cat = req.category || "general";
            const catLabel = CATEGORIES.find((c) => c.value === cat)?.label || "General";
            return (
              <div
                key={req.id}
                className={`card-apollo p-5 transition-all ${!req.is_read ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground">{req.name}</h3>
                      {!req.is_read && <Badge variant="default" className="text-xs">New</Badge>}
                      <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[cat] || ""}`}>
                        {catLabel}
                      </Badge>
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
                        <span className="text-foreground/70">Email:</span>{" "}
                        <a href={`mailto:${req.email}?subject=Re: Apollo Reborn inquiry`} className="text-primary hover:underline">{req.email}</a>
                      </p>
                      {req.phone && <p><span className="text-foreground/70">Phone:</span> {req.phone}</p>}
                      {req.message && (
                        <p className="mt-2 text-foreground/80 bg-muted p-3 rounded-lg whitespace-pre-wrap">{req.message}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(req.created_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!req.is_read && (
                      <Button variant="outline" size="sm" onClick={() => markRead.mutate(req.id)} className="gap-1">
                        <Eye className="w-3.5 h-3.5" /> Mark Read
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminContactRequests;
