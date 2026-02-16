import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Smartphone, Copy, Check, UserPlus, Snowflake, Archive, RotateCcw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  subscription_tier: "basic" | "pro" | "elite";
  account_status: string;
  status_changed_at: string | null;
  created_at: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAppDialogOpen, setIsAppDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUserForApp, setSelectedUserForApp] = useState<Profile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    subscription_tier: "basic" as "basic" | "pro" | "elite",
  });
  const [createFormData, setCreateFormData] = useState({
    email: "",
    password: "",
    display_name: "",
    subscription_tier: "basic" as "basic" | "pro" | "elite",
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
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
    archived: profiles?.filter((p) => p.account_status === "archived").length || 0,
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ subscription_tier: data.subscription_tier })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User updated successfully" });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error) => {
      toast({ title: "Error updating user", description: error.message, variant: "destructive" });
    },
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
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      const labels: Record<string, string> = {
        active: "Account reactivated — billing resumed",
        frozen: "Account frozen — billing paused",
        archived: "Account archived — membership cancelled",
      };
      const stripeInfo = data?.stripe_action === "no_stripe_customer"
        ? " (no Stripe billing found)"
        : "";
      toast({ title: (labels[status] || "Status updated") + stripeInfo });
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
      toast({ title: "Client created successfully", description: "They can now log in with the credentials you set." });
      setIsCreateDialogOpen(false);
      setCreateFormData({ email: "", password: "", display_name: "", subscription_tier: "basic" });
    },
    onError: (error) => {
      toast({ title: "Error creating client", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({ subscription_tier: user.subscription_tier });
    setIsEditDialogOpen(true);
  };

  const handleAppAccess = (user: Profile) => {
    setSelectedUserForApp(user);
    setIsAppDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: formData });
    }
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

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "elite":
        return "bg-apollo-gold/20 text-apollo-gold";
      case "pro":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "frozen":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-blue-500/20 text-blue-400">Frozen</span>;
      case "archived":
        return <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-muted text-muted-foreground">Archived</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl">Client Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage clients, memberships, and account status
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
              <TableHead>Tier</TableHead>
              <TableHead>{statusFilter === "active" ? "Joined" : "Status Changed"}</TableHead>
              <TableHead className="w-40">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : filteredProfiles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {statusFilter === "active" ? "No active clients." : 
                   statusFilter === "frozen" ? "No frozen accounts." : "No archived clients."}
                </TableCell>
              </TableRow>
            ) : (
              filteredProfiles?.map((profile) => (
                <TableRow key={profile.id} className={profile.account_status !== "active" ? "opacity-70" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{profile.display_name || "—"}</span>
                      {getStatusBadge(profile.account_status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs uppercase ${getTierBadgeColor(profile.subscription_tier)}`}>
                      {profile.subscription_tier}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {statusFilter !== "active" && profile.status_changed_at
                      ? new Date(profile.status_changed_at).toLocaleDateString()
                      : new Date(profile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {/* Edit tier */}
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(profile)} title="Edit subscription">
                        <Pencil className="w-4 h-4" />
                      </Button>

                      {/* App access info */}
                      {(profile.subscription_tier === "pro" || profile.subscription_tier === "elite") && profile.account_status === "active" && (
                        <Button size="icon" variant="ghost" onClick={() => handleAppAccess(profile)} title="App access info">
                          <Smartphone className="w-4 h-4 text-apollo-gold" />
                        </Button>
                      )}

                      {/* Freeze */}
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

                      {/* Archive */}
                      {profile.account_status !== "archived" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Archive account"
                          onClick={() => statusMutation.mutate({ userId: profile.user_id, status: "archived" })}
                          disabled={statusMutation.isPending}
                        >
                          <Archive className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      )}

                      {/* Reactivate */}
                      {profile.account_status !== "active" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reactivate account"
                          onClick={() => statusMutation.mutate({ userId: profile.user_id, status: "active" })}
                          disabled={statusMutation.isPending}
                        >
                          <RotateCcw className="w-4 h-4 text-apollo-gold" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
              Set up a new client account with login credentials and membership tier.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <Label htmlFor="create-name">Display Name</Label>
              <Input
                id="create-name"
                value={createFormData.display_name}
                onChange={(e) => setCreateFormData((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="Client's full name"
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
                placeholder="client@example.com"
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
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Share this with the client so they can log in. They can change it later.
              </p>
            </div>
            <div>
              <Label htmlFor="create-tier">Membership Tier</Label>
              <Select
                value={createFormData.subscription_tier}
                onValueChange={(v) => setCreateFormData((p) => ({ ...p, subscription_tier: v as "basic" | "pro" | "elite" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Essential - On-demand workouts + recipes</SelectItem>
                  <SelectItem value="pro">Premier - Mobile app + coaching access</SelectItem>
                  <SelectItem value="elite">Elite - Full access including AI features</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update {editingUser?.display_name || "user"}'s subscription tier
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tier">Subscription Tier</Label>
              <Select
                value={formData.subscription_tier}
                onValueChange={(v) => setFormData((p) => ({ ...p, subscription_tier: v as "basic" | "pro" | "elite" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Essential - On-demand workouts + recipes</SelectItem>
                  <SelectItem value="pro">Premier - Mobile app + coaching access</SelectItem>
                  <SelectItem value="elite">Elite - Full access including AI features</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="apollo" disabled={updateMutation.isPending}>
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* App Access Dialog */}
      <Dialog open={isAppDialogOpen} onOpenChange={setIsAppDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apollo Nation App Access</DialogTitle>
            <DialogDescription>
              Use these credentials to manually set up app access for {selectedUserForApp?.display_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">User ID</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={selectedUserForApp?.user_id || ""} className="font-mono text-sm" />
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(selectedUserForApp?.user_id || "", "user_id")}>
                    {copiedField === "user_id" ? <Check className="w-4 h-4 text-apollo-gold" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={selectedUserForApp?.display_name || "Not set"} className="text-sm" />
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(selectedUserForApp?.display_name || "", "name")}>
                    {copiedField === "name" ? <Check className="w-4 h-4 text-apollo-gold" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              💡 The user will use the same email/password they created on the website to log into the Apollo Nation mobile app.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
