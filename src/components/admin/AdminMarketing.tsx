import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image,
  Upload,
  Sparkles,
  Instagram,
  Trash2,
  Download,
  Loader2,
  X,
  ImagePlus,
  LayoutGrid,
} from "lucide-react";

interface MarketingPhoto {
  id: string;
  file_path: string;
  file_name: string;
  category: string;
  tags: string[];
  created_at: string;
}

interface MarketingPost {
  id: string;
  title: string;
  platform: string;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  generated_image_path: string | null;
  status: string;
  created_at: string;
}

const PLATFORM_OPTIONS = [
  { value: "instagram_square", label: "Instagram Post", dimensions: "1080×1080" },
  { value: "instagram_story", label: "Instagram Story / Reel", dimensions: "1080×1920" },
  { value: "facebook_post", label: "Facebook Post", dimensions: "1200×630" },
  { value: "tiktok", label: "TikTok", dimensions: "1080×1920" },
];

const STYLE_OPTIONS = [
  { value: "dark", label: "Dark Marble" },
  { value: "minimal", label: "Clean Minimal" },
  { value: "premium", label: "Premium Fitness" },
];

const HEADLINE_SUGGESTIONS = [
  "Train Like a God",
  "Your Body. Your Temple.",
  "Built Different. Built Better.",
  "Join Apollo Nation",
  "Unlock Your Potential",
  "Personalized Coaching. Real Results.",
  "Stop Guessing. Start Training.",
  "The App That Trains You",
];

const AdminMarketing = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("create");

  // Photo library
  const [photos, setPhotos] = useState<MarketingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  // Generator form
  const [platform, setPlatform] = useState("instagram_square");
  const [style, setStyle] = useState("dark");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  // Generated posts
  const [posts, setPosts] = useState<MarketingPost[]>([]);

  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("marketing_photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPhotos(data as MarketingPhoto[]);
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("marketing_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPosts(data as MarketingPost[]);
  }, []);

  useEffect(() => {
    fetchPhotos();
    fetchPosts();
  }, [fetchPhotos, fetchPosts]);

  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage.from("marketing").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const filePath = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("marketing")
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) {
          toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
          continue;
        }

        await supabase.from("marketing_photos").insert({
          uploaded_by: user.id,
          file_path: filePath,
          file_name: file.name,
          category: "personal",
          tags: [],
        });
      }

      toast({ title: "Photos uploaded successfully" });
      fetchPhotos();
    } catch (err) {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photo: MarketingPhoto) => {
    await supabase.storage.from("marketing").remove([photo.file_path]);
    await supabase.from("marketing_photos").delete().eq("id", photo.id);
    fetchPhotos();
    if (selectedPhotoId === photo.id) setSelectedPhotoId(null);
    toast({ title: "Photo removed" });
  };

  const handleGenerate = async () => {
    if (!headline) {
      toast({ title: "Please add a headline", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setGeneratedImageUrl(null);

    try {
      let photoUrl: string | null = null;
      if (selectedPhotoId) {
        const photo = photos.find((p) => p.id === selectedPhotoId);
        if (photo) photoUrl = getPhotoUrl(photo.file_path);
      }

      const { data, error } = await supabase.functions.invoke("generate-marketing-image", {
        body: { platform, headline, subheadline, cta_text: ctaText, photo_url: photoUrl, style },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedImageUrl(data.image_url);
      fetchPosts();
      toast({ title: "Marketing image generated!" });
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePost = async (post: MarketingPost) => {
    if (post.generated_image_path) {
      await supabase.storage.from("marketing").remove([post.generated_image_path]);
    }
    await supabase.from("marketing_posts").delete().eq("id", post.id);
    fetchPosts();
    toast({ title: "Post deleted" });
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading tracking-wide">Marketing Content</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate promotional graphics for TikTok, Instagram &amp; Facebook
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create" className="gap-2">
            <Sparkles className="w-4 h-4" /> Create
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <LayoutGrid className="w-4 h-4" /> Photo Library
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-2">
            <Image className="w-4 h-4" /> Generated Posts
          </TabsTrigger>
        </TabsList>

        {/* ─── CREATE TAB ─── */}
        <TabsContent value="create" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Platform &amp; Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Platform</label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label} ({p.dimensions})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Visual Style</label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STYLE_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Text Overlay</CardTitle>
                  <CardDescription>Add your marketing copy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Headline *
                    </label>
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Train Like a God"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {HEADLINE_SUGGESTIONS.map((h) => (
                        <button
                          key={h}
                          onClick={() => setHeadline(h)}
                          className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Subheadline
                    </label>
                    <Input
                      value={subheadline}
                      onChange={(e) => setSubheadline(e.target.value)}
                      placeholder="e.g. Personalized training & nutrition plans"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Call to Action
                    </label>
                    <Input
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="e.g. Download Now • Link in Bio"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Photo</CardTitle>
                  <CardDescription>
                    Choose a photo from your library (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {photos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No photos uploaded yet. Go to the Photo Library tab to upload.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {photos.map((photo) => (
                        <button
                          key={photo.id}
                          onClick={() =>
                            setSelectedPhotoId(selectedPhotoId === photo.id ? null : photo.id)
                          }
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedPhotoId === photo.id
                              ? "border-apollo-gold ring-1 ring-apollo-gold"
                              : "border-transparent hover:border-muted-foreground/30"
                          }`}
                        >
                          <img
                            src={getPhotoUrl(photo.file_path)}
                            alt={photo.file_name}
                            className="w-full h-full object-cover"
                          />
                          {selectedPhotoId === photo.id && (
                            <div className="absolute inset-0 bg-apollo-gold/20 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-apollo-gold flex items-center justify-center">
                                <span className="text-background text-xs">✓</span>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                onClick={handleGenerate}
                disabled={generating || !headline}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Marketing Image
                  </>
                )}
              </Button>
            </div>

            {/* Right: Preview */}
            <div>
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {generating ? (
                    <div className="aspect-square rounded-lg bg-muted flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-apollo-gold" />
                      <p className="text-sm text-muted-foreground">Generating your image...</p>
                      <p className="text-xs text-muted-foreground">This may take 15-30 seconds</p>
                    </div>
                  ) : generatedImageUrl ? (
                    <div className="space-y-3">
                      <div className="rounded-lg overflow-hidden border border-border">
                        <img
                          src={generatedImageUrl}
                          alt="Generated marketing image"
                          className="w-full h-auto"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(generatedImageUrl, `apollo-${platform}.png`)}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerate}
                          disabled={generating}
                          className="flex-1"
                        >
                          <Sparkles className="w-4 h-4" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square rounded-lg bg-muted/50 border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <ImagePlus className="w-10 h-10" />
                      <div className="text-center">
                        <p className="text-sm font-medium">No preview yet</p>
                        <p className="text-xs">Fill in the details and hit generate</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── PHOTO LIBRARY TAB ─── */}
        <TabsContent value="library" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Photo Library</CardTitle>
                  <CardDescription>
                    Upload photos of yourself, app screenshots, and brand assets
                  </CardDescription>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                  <Button asChild size="sm" disabled={uploading}>
                    <span>
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Upload Photos
                    </span>
                  </Button>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Image className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No photos uploaded yet</p>
                  <p className="text-xs mt-1">Upload fitness photos, app screenshots, and brand assets</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img
                        src={getPhotoUrl(photo.file_path)}
                        alt={photo.file_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeletePhoto(photo)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1 left-1 text-[9px] bg-background/80"
                      >
                        {photo.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── GENERATED POSTS TAB ─── */}
        <TabsContent value="posts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated Posts</CardTitle>
              <CardDescription>Your previously generated marketing content</CardDescription>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No posts generated yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded-lg border border-border overflow-hidden group"
                    >
                      {post.generated_image_path ? (
                        <img
                          src={getPhotoUrl(post.generated_image_path)}
                          alt={post.title}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{post.headline || post.title}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                            {post.platform.replace("_", " ")}
                          </Badge>
                        </div>
                        {post.subheadline && (
                          <p className="text-xs text-muted-foreground truncate">{post.subheadline}</p>
                        )}
                        <div className="flex gap-2">
                          {post.generated_image_path && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={() =>
                                handleDownload(
                                  getPhotoUrl(post.generated_image_path!),
                                  `apollo-${post.platform}.png`
                                )
                              }
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDeletePost(post)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMarketing;
