import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Smartphone, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  subscription_tier: "basic" | "pro" | "elite";
  created_at: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAppDialogOpen, setIsAppDialogOpen] = useState(false);
  const [selectedUserForApp, setSelectedUserForApp] = useState<Profile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    subscription_tier: "basic" as "basic" | "pro" | "elite",
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Admin can see all profiles via has_role function in RLS
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: data.subscription_tier,
        })
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

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      subscription_tier: user.subscription_tier,
    });
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl">User Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage member subscriptions and app access. For Pro/Elite members, use their credentials to set up app access.
        </p>
      </div>

      <div className="card-apollo overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : profiles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              profiles?.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.display_name || "—"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs uppercase ${getTierBadgeColor(profile.subscription_tier)}`}>
                      {profile.subscription_tier}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(profile)} title="Edit subscription">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {(profile.subscription_tier === "pro" || profile.subscription_tier === "elite") && (
                        <Button size="icon" variant="ghost" onClick={() => handleAppAccess(profile)} title="App access info">
                          <Smartphone className="w-4 h-4 text-apollo-gold" />
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
                  <SelectItem value="basic">Basic - On-demand workouts + recipes</SelectItem>
                  <SelectItem value="pro">Pro - Mobile app + coaching access</SelectItem>
                  <SelectItem value="elite">Elite - Full access including AI macro tracker</SelectItem>
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
                  <Input 
                    readOnly 
                    value={selectedUserForApp?.user_id || ""} 
                    className="font-mono text-sm"
                  />
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedUserForApp?.user_id || "", "user_id")}
                  >
                    {copiedField === "user_id" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={selectedUserForApp?.display_name || "Not set"} 
                    className="text-sm"
                  />
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => copyToClipboard(selectedUserForApp?.display_name || "", "name")}
                  >
                    {copiedField === "name" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              💡 The user will use the same email/password they created on the website to log into the Apollo Nation mobile app. 
              You may need to manually verify their credentials in the app.
            </p>
            <p className="text-xs text-muted-foreground/70">
              🔒 Phone numbers are stored securely and only visible to the user themselves.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
