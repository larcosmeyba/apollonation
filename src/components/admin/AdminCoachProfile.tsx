import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save, User, Camera, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

const AdminCoachProfile = () => {
  const { profile, refreshProfile, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [fitnessGoals, setFitnessGoals] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setFitnessGoals(profile.fitness_goals || "");
    }
  }, [profile]);

  // Get signed avatar URL
  const { data: avatarUrl, refetch: refetchAvatar } = useQuery({
    queryKey: ["coach-avatar", profile?.avatar_url],
    queryFn: async () => {
      const url = profile?.avatar_url;
      if (!url) return null;
      if (url.startsWith("http")) return url;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(url, 3600);
      return data?.signedUrl || null;
    },
    enabled: !!profile?.avatar_url,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `coach-${user.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(fileName, file, { contentType: file.type, upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setIsUploading(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: fileName })
      .eq("id", profile!.id);
    if (updateError) {
      toast({ title: "Error saving", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Profile photo updated!" });
      refreshProfile();
      refetchAvatar();
    }
    setIsUploading(false);
  };

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
          <Shield className="w-5 h-5 text-primary" />
          Coach Profile
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your profile photo and bio are visible to clients in the chat.
        </p>
      </div>

      <div className="card-apollo p-6 space-y-5">
        {/* Avatar with upload */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                {(displayName || "C")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="font-heading text-lg">{profile?.display_name || "Coach"}</p>
            <p className="text-xs text-primary uppercase tracking-wider">Administrator • Owner</p>
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
            <p className="text-xs text-muted-foreground">{bio.length}/500 — Visible when clients tap your profile in chat</p>
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
