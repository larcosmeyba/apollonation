import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Copy, Check, UserPlus, Snowflake, Archive, RotateCcw, Search, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs } from "@/components/ui/tabs";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  is_subscribed: boolean;
  manual_subscription: boolean;
  subscription_store: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  account_status: string;
  status_changed_at: string | null;
  created_at: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAppDialogOpen, setIsAppDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUserForApp, setSelectedUserForApp] = useState<Profile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    display_name: "",
    grant_subscription: false,
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Profile[];
    },
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

  // Manual grant toggle (admin override; webhook respects manual_subscription)
  const grantMutation = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          manual_subscription: grant,
          is_subscribed: grant,
          subscription_store: grant ? "manual" : null,
          subscription_plan: grant ? "annual" : null,
          subscription_expires_at: null,
        })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Subscription updated" });
    },
    onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-client-status", {
        body: { client_user_id: userId, new_status: status },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      const labels: Record<string, string> = {
        active: "Account reactivated",
        frozen: "Account frozen",
        cancelled: "Membership cancelled",
        archived: "Client archived",
      };
      toast({ title: labels[status] || "Status updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
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
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Client created successfully" });
      setIsCreateDialogOpen(false);
      setCreateFormData({ email: "", password: "", display_name: "", grant_subscription: false });
    },
    onError: (error) => {
      toast({ title: "Error creating client", description: error.message, variant: "destructive" });
    },
  });

  const handleAppAccess = (user: Profile) => {
    setSelectedUserForApp(user);
    setIsAppDialogOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(createFormData);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "frozen":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-blue-500/20 text-blue-400">Frozen</span>;
      case "cancelled":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-red-500/20 text-red-400">Cancelled</span>;
      case "archived":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-muted text-muted-foreground">Archived</span>;
      default:
        return null;
    }
  };

  const getSubscriptionLabel = (p: Profile) => {
    if (!p.is_subscribed) return { label: "Free", className: "bg-muted text-muted-foreground" };
    if (p.manual_subscription) return { label: "Manual", className: "bg-purple-500/20 text-purple-400" };
    if (p.subscription_store === "app_store") return { label: "App Store", className: "bg-primary/20 text-primary" };
    if (p.subscription_store === "play_store") return { label: "Play Store", className: "bg-primary/20 text-primary" };
    return { label: "Subscribed", className: "bg-primary/20 text-primary" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl">Client Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage clients, manual subscription grants, and account status
          </p>
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

      <div className="card-apollo overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead className="w-32">Manual Grant</TableHead>
              <TableHead>{statusFilter === "active" ? "Joined" : "Status Changed"}</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : filteredProfiles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No clients in this status.
                </TableCell>
              </TableRow>
            ) : (
              filteredProfiles?.map((profile) => {
                const sub = getSubscriptionLabel(profile);
                return (
                  <TableRow key={profile.id} className={profile.account_status !== "active" ? "opacity-70" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{profile.display_name || "—"}</span>
                        {getStatusBadge(profile.account_status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs uppercase ${sub.className}`}>
                        {sub.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={profile.manual_subscription}
                        onCheckedChange={(v) =>
                          grantMutation.mutate({ userId: profile.user_id, grant: v })
                        }
                        disabled={grantMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {statusFilter !== "active" && profile.status_changed_at
                        ? new Date(profile.status_changed_at).toLocaleDateString()
                        : new Date(profile.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {profile.is_subscribed && profile.account_status === "active" && (
                          <Button size="icon" variant="ghost" onClick={() => handleAppAccess(profile)} title="App access info">
                            <Smartphone className="w-4 h-4 text-primary" />
                          </Button>
                        )}

                        {profile.account_status === "active" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Freeze account"
                            onClick={() => statusMutation.mutate({ userId: profile.user_id, status: "frozen" })}
                            disabled={statusMutation.isPending}
                          >
                            <Snowflake className="w-4 h-4 text-blue-400" />
                          </Button>
                        )}

                        {(profile.account_status === "active" || profile.account_status === "frozen") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Cancel membership"
                            onClick={() => statusMutation.mutate({ userId: profile.user_id, status: "cancelled" })}
                            disabled={statusMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 text-red-400" />
                          </Button>
                        )}

                        {profile.account_status !== "archived" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Archive"
                            onClick={() => statusMutation.mutate({ userId: profile.user_id, status: "archived" })}
                            disabled={statusMutation.isPending}
                          >
                            <Archive className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}

                        {profile.account_status !== "active" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Reactivate"
                            onClick={() => statusMutation.mutate({ userId: profile.user_id, status: "active" })}
                            disabled={statusMutation.isPending}
                          >
                            <RotateCcw className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Set up a new client account with login credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="create-name">Display Name</Label>
              <Input
                id="create-name"
                value={createFormData.display_name}
                onChange={(e) => setCreateFormData((p) => ({ ...p, display_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="create-password">Temporary Password</Label>
              <Input
                id="create-password"
                type="text"
                value={createFormData.password}
                onChange={(e) => setCreateFormData((p) => ({ ...p, password: e.target.value }))}
                minLength={6}
                required
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">Grant subscription manually</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bypasses App Store / Play Store billing.
                </p>
              </div>
              <Switch
                checked={createFormData.grant_subscription}
                onCheckedChange={(v) => setCreateFormData((p) => ({ ...p, grant_subscription: v }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="apollo" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* App Access Dialog */}
      <Dialog open={isAppDialogOpen} onOpenChange={setIsAppDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apollo Reborn App Access</DialogTitle>
            <DialogDescription>
              Reference info for {selectedUserForApp?.display_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={selectedUserForApp?.user_id || ""} className="font-mono text-sm" />
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(selectedUserForApp?.user_id || "", "user_id")}>
                    {copiedField === "user_id" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={selectedUserForApp?.display_name || "Not set"} className="text-sm" />
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(selectedUserForApp?.display_name || "", "name")}>
                    {copiedField === "name" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              💡 The user logs into the mobile app with the same email/password they were given.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
