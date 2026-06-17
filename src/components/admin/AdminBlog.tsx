import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Eye, EyeOff, Loader2 } from "lucide-react";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  author: string;
  cover_url: string | null;
  read_minutes: number;
  content: string;
  published: boolean;
  published_at: string;
  updated_at: string;
};

const CATEGORIES = ["Training", "Nutrition", "Mindset", "Recovery"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const emptyPost = (): Partial<BlogPost> => ({
  slug: "",
  title: "",
  description: "",
  category: "Training",
  author: "Coach Marcos",
  cover_url: "",
  read_minutes: 5,
  content: "",
  published: true,
  published_at: new Date().toISOString().slice(0, 10),
});

const AdminBlog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts" as any)
      .select("*")
      .order("published_at", { ascending: false });
    if (error) {
      toast.error("Failed to load posts");
    } else {
      setPosts((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title || !editing.description || !editing.content) {
      toast.error("Title, description, and content are required");
      return;
    }
    const slug = editing.slug?.trim() || slugify(editing.title);
    setSaving(true);
    const payload: any = {
      slug,
      title: editing.title,
      description: editing.description,
      category: editing.category || "Training",
      author: editing.author || "Coach Marcos",
      cover_url: editing.cover_url || null,
      read_minutes: Number(editing.read_minutes) || 5,
      content: editing.content,
      published: editing.published ?? true,
      published_at: editing.published_at || new Date().toISOString().slice(0, 10),
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("blog_posts" as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("blog_posts" as any).insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing.id ? "Post updated" : "Post created");
    setEditing(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this blog post? This cannot be undone.")) return;
    const { error } = await supabase.from("blog_posts" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    void load();
  };

  const togglePublish = async (post: BlogPost) => {
    const { error } = await supabase
      .from("blog_posts" as any)
      .update({ published: !post.published })
      .eq("id", post.id);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Blog Posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and manage posts on apolloreborn.com/blog
          </p>
        </div>
        <Button onClick={() => setEditing(emptyPost())}>
          <Plus className="w-4 h-4 mr-2" /> New Post
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No blog posts yet. Click "New Post" to write your first one.
        </Card>
      ) : (
        <div className="grid gap-3">
          {posts.map((post) => (
            <Card key={post.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    {post.category}
                  </span>
                  {!post.published && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Draft
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.published_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold truncate">{post.title}</h3>
                <p className="text-xs text-muted-foreground truncate">/{post.slug}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => togglePublish(post)} title={post.published ? "Unpublish" : "Publish"}>
                  {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditing(post)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(post.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.slug || slugify(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Slug (URL)</Label>
                  <Input
                    value={editing.slug || ""}
                    onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editing.category}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Short description</Label>
                <Textarea
                  rows={2}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Author</Label>
                  <Input value={editing.author || ""} onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
                </div>
                <div>
                  <Label>Read minutes</Label>
                  <Input
                    type="number"
                    value={editing.read_minutes ?? 5}
                    onChange={(e) => setEditing({ ...editing, read_minutes: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Publish date</Label>
                  <Input
                    type="date"
                    value={editing.published_at || ""}
                    onChange={(e) => setEditing({ ...editing, published_at: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Cover image URL (optional)</Label>
                <Input
                  value={editing.cover_url || ""}
                  onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Content (HTML)</Label>
                <Textarea
                  rows={16}
                  className="font-mono text-xs"
                  value={editing.content || ""}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  placeholder="<p>Your post content...</p><h2>A section</h2><p>...</p>"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use HTML tags: &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;&lt;li&gt;, &lt;blockquote&gt;, &lt;a&gt;.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={editing.published ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, published: v })}
                />
                <Label className="cursor-pointer">Published (visible on site)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing?.id ? "Save Changes" : "Create Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlog;
