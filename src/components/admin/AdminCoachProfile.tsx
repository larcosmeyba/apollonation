import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save, Camera, Loader2, X, Plus, Image as ImageIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

const CERTIFICATIONS = ["NASM", "NSCA", "ACE", "ACSM", "CSCS", "Precision Nutrition", "Other"];
const SPECIALTIES = [
  "Strength", "HIIT", "Sculpt", "Cardio", "Core", "Stretch",
  "Senior", "Mobility", "Fat Loss", "Muscle Gain", "Body Recomp",
];

const AdminCoachProfile = () => {
  const { profile, refreshProfile, user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [longBio, setLongBio] = useState("");
  const [trainingApproach, setTrainingApproach] = useState("");
  const [yearsCoaching, setYearsCoaching] = useState<string>("");
  const [instagram, setInstagram] = useState("");
  const [certs, setCerts] = useState<string[]>([]);
  const [specs, setSpecs] = useState<string[]>([]);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setLongBio((profile as any).long_bio || "");
      setTrainingApproach(profile.fitness_goals || "");
      setYearsCoaching((profile as any).years_coaching?.toString() || "");
      setInstagram((profile as any).instagram_handle || "");
      setCerts((profile as any).certifications || []);
      setSpecs((profile as any).specialties || []);
      setHeroImageUrl((profile as any).hero_image_url || null);
    }
  }, [profile]);

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
    const fileName = `${user.id}/coach.${ext}`;
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

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 8MB", variant: "destructive" });
      return;
    }
    setIsUploadingHero(true);
    const ext = file.name.split(".").pop();
    const fileName = `${user.id}/hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(fileName, file, { contentType: file.type, upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setIsUploadingHero(false);
      return;
    }
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(fileName, 3600 * 24 * 365 * 5);
    setHeroImageUrl(signed?.signedUrl || null);
    setIsUploadingHero(false);
    toast({ title: "Hero image uploaded — remember to save" });
  };

  const toggleArr = (arr: string[], v: string, setter: (s: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile found");
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          fitness_goals: trainingApproach.trim() || null,
          long_bio: longBio.trim() || null,
          years_coaching: yearsCoaching ? parseInt(yearsCoaching) : null,
          instagram_handle: instagram.trim().replace(/^@/, "") || null,
          certifications: certs,
          specialties: specs,
          hero_image_url: heroImageUrl,
        } as any)
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
          Visible to clients in chat and on your coach profile page in the app.
        </p>
      </div>

      <div className="card-apollo p-6 space-y-6">
        {/* Avatar */}
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

        {/* Hero/cover image */}
        <div className="space-y-2">
          <Label>Hero / Cover Image</Label>
          <p className="text-xs text-muted-foreground">Wide image shown at the top of your coach profile in the client app.</p>
          <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
          {heroImageUrl ? (
            <div className="relative">
              <img src={heroImageUrl} alt="Hero" className="w-full aspect-[16/9] object-cover rounded-md border border-border" />
              <button
                type="button"
                onClick={() => setHeroImageUrl(null)}
                className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full h-24 border-dashed" onClick={() => heroInputRef.current?.click()} disabled={isUploadingHero}>
              {isUploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload hero image (max 8MB)</span>
                </div>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Coach Marcos" maxLength={50} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Short Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="NASM Certified Personal Trainer with 10+ years experience..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/500 — Used in chat and short previews</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="long-bio">Long Bio</Label>
            <Textarea
              id="long-bio"
              value={longBio}
              onChange={(e) => setLongBio(e.target.value)}
              placeholder="Tell your story — your background, what brought you to coaching, what clients should know about you..."
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{longBio.length}/2000 — Shown on your coach profile page in the client app</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="years">Years Coaching</Label>
              <Input id="years" type="number" min={0} max={70} value={yearsCoaching} onChange={(e) => setYearsCoaching(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ig">Instagram Handle</Label>
              <Input id="ig" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="larcosfit" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Certifications</Label>
            <div className="flex flex-wrap gap-2">
              {CERTIFICATIONS.map((c) => (
                <Badge
                  key={c}
                  variant={certs.includes(c) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleArr(certs, c, setCerts)}
                >
                  {certs.includes(c) ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Specialties</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <Badge
                  key={s}
                  variant={specs.includes(s) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleArr(specs, s, setSpecs)}
                >
                  {specs.includes(s) ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="approach">Training Approach</Label>
            <Textarea
              id="approach"
              value={trainingApproach}
              onChange={(e) => setTrainingApproach(e.target.value)}
              placeholder="What makes your coaching style different? What do clients experience with you?"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <Button variant="apollo" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
};

export default AdminCoachProfile;
