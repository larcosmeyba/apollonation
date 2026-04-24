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
import { UserPlus, Search, Snowflake, Archive, XCircle, ChevronRight, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";
import AdminClientProfile from "./AdminClientProfile";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  is_subscribed: boolean;
  account_status: string;
  created_at: string;
  is_test_account?: boolean;
}

const AdminClientList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [showTestAccounts, setShowTestAccounts] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    display_name: "",
    grant_subscription: false,
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

  const visibleProfiles = profiles?.filter((p) => showTestAccounts || !p.is_test_account);

  const filteredProfiles = visibleProfiles?.filter((p) => {
    const matchesStatus = p.account_status === statusFilter;
    const matchesSearch = !searchQuery ||
      (p.display_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    active: visibleProfiles?.filter((p) => p.account_status === "active").length || 0,
    frozen: visibleProfiles?.filter((p) => p.account_status === "frozen").length || 0,
    cancelled: visibleProfiles?.filter((p) => p.account_status === "cancelled").length || 0,
    archived: visibleProfiles?.filter((p) => p.account_status === "archived").length || 0,
  };

  const toggleTestAccount = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_test_account: value } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      toast({ title: "Updated" });
    },
  });

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
      setCreateFormData({ email: "", password: "", display_name: "", grant_subscription: false });
    },
    onError: (error) => {
      toast({ title: "Error creating client", description: error.message, variant: "destructive" });
    },
  });

  const getTierBadge = (_tier?: string) => "bg-primary/20 text-primary";

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
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <FlaskConical className="w-3.5 h-3.5" />
              <Switch checked={showTestAccounts} onCheckedChange={setShowTestAccounts} />
              <span>Show test accounts</span>
            </label>
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
            <div
              key={profile.id}
              className="card-apollo flex items-center gap-4 p-4 text-left hover:border-primary/30 transition-all group"
            >
              <button onClick={() => setSelectedClient(profile)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                <Avatar className="h-11 w-11 flex-shrink-0">
                  <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                    {(profile.display_name || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{profile.display_name || "Unnamed"}</p>
                    {profile.is_test_account && <Badge variant="outline" className="text-[9px] uppercase">Test</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lastActiveMap?.[profile.user_id]
                      ? `Active ${formatDistanceToNow(new Date(lastActiveMap[profile.user_id]), { addSuffix: true })}`
                      : "Never active"}
                  </p>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleTestAccount.mutate({ id: profile.id, value: !profile.is_test_account }); }}
                className="text-[10px] text-muted-foreground hover:text-primary px-2 py-1 rounded border border-border"
                title={profile.is_test_account ? "Unmark as test account" : "Mark as test account"}
              >
                {profile.is_test_account ? "Untag" : "Mark test"}
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
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
