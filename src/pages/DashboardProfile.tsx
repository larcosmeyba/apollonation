import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { User, Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DashboardProfile = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    fitness_goals: profile?.fitness_goals || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: formData.display_name,
        bio: formData.bio,
        fitness_goals: formData.fitness_goals,
      })
      .eq("id", profile.id);

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await refreshProfile();
      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
      });
    }

    setIsLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            My <span className="text-apollo-gold">Profile</span>
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile card */}
        <div className="card-apollo p-6 mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-apollo-gold/20 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-apollo-gold" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-apollo-gold flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
            <div>
              <h2 className="font-heading text-xl">
                {profile?.display_name || "Member"}
              </h2>
              <p className="text-apollo-gold uppercase text-sm tracking-wide">
                {profile?.subscription_tier || "Basic"} Member
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, display_name: e.target.value }))
                }
                placeholder="Your name"
                className="bg-muted border-border"
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Tell us about yourself..."
                rows={3}
                className="bg-muted border-border resize-none"
              />
            </div>

            <div>
              <Label htmlFor="fitness_goals">Fitness Goals</Label>
              <Textarea
                id="fitness_goals"
                value={formData.fitness_goals}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fitness_goals: e.target.value }))
                }
                placeholder="What are you working towards?"
                rows={3}
                className="bg-muted border-border resize-none"
              />
            </div>

            <Button type="submit" variant="apollo" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>

        {/* Subscription info */}
        <div className="card-apollo p-6">
          <h3 className="font-heading text-lg mb-4">Subscription</h3>
          <div className="flex items-center justify-between p-4 rounded-lg bg-apollo-gold/10 border border-apollo-gold/20">
            <div>
              <p className="font-medium">
                {profile?.subscription_tier?.toUpperCase() || "BASIC"} Plan
              </p>
              <p className="text-sm text-muted-foreground">
                {profile?.subscription_tier === "elite"
                  ? "Full access to all features"
                  : profile?.subscription_tier === "pro"
                  ? "Mobile app + coaching access"
                  : "On-demand workouts + recipes"}
              </p>
            </div>
            {profile?.subscription_tier !== "elite" && (
              <Button variant="apollo" size="sm">
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;
