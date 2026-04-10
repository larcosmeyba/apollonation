import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Search, Snowflake, Archive, XCircle, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import AdminClientProfile from "./AdminClientProfile";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  subscription_tier: "basic" | "pro" | "elite";
  account_status: string;
  created_at: string;
}

const AdminClientList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    display_name: "",
    subscription_tier: "basic" as "basic" | "pro" | "elite",
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("display_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Last active map
  const clientIds = profiles?.map(c => c.user_id) || [];
  const { data: lastActiveMap } = useQuery({
    queryKey: ["admin-last-active", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return {};
      const [sessions, macros, messages, steps] = await Promise.all([
        supabase.from("workout_session_logs").select("user_id, created_at").in("user_id", clientIds).order("created_at", { ascending: false }).limit(200),
        supabase.from("macro_logs").select("user_id, created_at").in("user_id", clientIds).order("created_at", { ascending: false }).limit(200),
        supabase.from("messages").select("sender_id, created_at").in("sender_id", clientIds).order("created_at", { ascending: false }).limit(200),
        supabase.from("step_logs").select("user_id, created_at").in("user_id", clientIds).order("created_at", { ascending: false }).limit(200),
      ]);
      const map: Record<string, string> = {};
      const update = (uid: string, ts: string) => { if (!map[uid] || ts > map[uid]) map[uid] = ts; };
      sessions.data?.forEach(r => update(r.user_id, r.created_at));
      macros.data?.forEach(r => update(r.user_id, r.created_at));
      messages.data?.forEach(r => update(r.sender_id, r.created_at));
      steps.data?.forEach(r => update(r.user_id, r.created_at));
      return map;
    },
    enabled: clientIds.length > 0,
  });

  const filteredProfiles = profiles?.filter((p) => {
    const matchesStatus = p.account_status === statusFilter;
    const matchesSearch = !searchQuery ||
      (p.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    active: profiles?.filter((p) => p.account_status === "active").length || 0,
    frozen: profiles?.filter((p) => p.account_status === "frozen").length || 0,
    cancelled: profiles?.filter((p) => p.account_status === "cancelled").length || 0,
    archived: profiles?.filter((p) => p.account_status === "archived").length || 0,
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof createFormData) => {
      const { data: result, error } = await supabase.functions.invoke("admin-create-client", {
        body: data,
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast({ title: "Client created successfully" });
      setIsCreateDialogOpen(false);
      setCreateFormData({ email: "", password: "", display_name: "", subscription_tier: "basic" });
    },
    onError: (error) => {
      toast({ title: "Error creating client", description: error.message, variant: "destructive" });
    },
  });

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      elite: "bg-primary/20 text-primary",
      pro: "bg-purple-500/20 text-purple-400",
      basic: "bg-muted text-muted-foreground",
    };
    return colors[tier] || colors.basic;
  };

  // If a client is selected, show their unified profile
  if (selectedClient) {
    return (
      <AdminClientProfile
        userId={selectedClient.user_id}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl">Clients</h2>
          <p className="text-sm text-muted-foreground">All client profiles and data in one place</p>
        </div>
        <Button variant="apollo" onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          New Client
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="active" className="gap-1.5">
              Active <span className="text-[10px] opacity-60">({statusCounts.active})</span>
            </TabsTrigger>
            <TabsTrigger value="frozen" className="gap-1.5">
              <Snowflake className="w-3 h-3" /> Frozen <span className="text-[10px] opacity-60">({statusCounts.frozen})</span>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-1.5">
              <XCircle className="w-3 h-3" /> Cancelled <span className="text-[10px] opacity-60">({statusCounts.cancelled})</span>
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-1.5">
              <Archive className="w-3 h-3" /> Archived <span className="text-[10px] opacity-60">({statusCounts.archived})</span>
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      </Tabs>

      {/* Client cards */}
      <div className="grid gap-3">
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading clients...</p>
        ) : filteredProfiles?.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No clients found.</p>
        ) : (
          filteredProfiles?.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setSelectedClient(profile)}
              className="card-apollo flex items-center gap-4 p-4 text-left hover:border-primary/30 transition-all group"
            >
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                  {(profile.display_name || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{profile.display_name || "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">
                  {lastActiveMap?.[profile.user_id]
                    ? `Active ${formatDistanceToNow(new Date(lastActiveMap[profile.user_id]), { addSuffix: true })}`
                    : "Never active"}
                </p>
              </div>
              {/* Tier badge removed — unified membership */}
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))
        )}
      </div>

      {/* Create Client Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>Set up a new client account with login credentials.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(createFormData); }} className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input value={createFormData.display_name} onChange={(e) => setCreateFormData(p => ({ ...p, display_name: e.target.value }))} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={createFormData.email} onChange={(e) => setCreateFormData(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <Label>Temporary Password</Label>
              <Input type="text" value={createFormData.password} onChange={(e) => setCreateFormData(p => ({ ...p, password: e.target.value }))} minLength={6} required />
            </div>
            {/* Tier selector removed — unified membership */}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="apollo" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientList;
