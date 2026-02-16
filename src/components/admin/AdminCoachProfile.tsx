import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

const AdminCoachProfile = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [fitnessGoals, setFitnessGoals] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setFitnessGoals(profile.fitness_goals || "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile found");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          fitness_goals: fitnessGoals.trim() || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      toast({ title: "Coach profile updated" });
    },
    onError: (error) => {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-heading text-xl flex items-center gap-2">
          <Shield className="w-5 h-5 text-apollo-gold" />
          Coach Profile
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your coach profile. This name appears when you message clients.
        </p>
      </div>

      <div className="card-apollo p-6 space-y-5">
        {/* Avatar placeholder */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-apollo-gold/20 flex items-center justify-center">
            <User className="w-8 h-8 text-apollo-gold" />
          </div>
          <div>
            <p className="font-heading text-lg">{profile?.display_name || "Coach"}</p>
            <p className="text-xs text-apollo-gold uppercase tracking-wider">Administrator • Owner</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Coach Marcos"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">This is the name clients see in messages</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio / About</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="NASM Certified Personal Trainer with 10+ years experience..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/500</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coaching-philosophy">Coaching Philosophy</Label>
            <Textarea
              id="coaching-philosophy"
              value={fitnessGoals}
              onChange={(e) => setFitnessGoals(e.target.value)}
              placeholder="My approach to fitness and coaching..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <Button
          variant="apollo"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
};

export default AdminCoachProfile;
