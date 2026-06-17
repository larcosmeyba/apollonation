import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Loader2, FileText, Eye, Download, Archive } from "lucide-react";

type Blueprint = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  pdf_path: string;
  read_time_minutes: number | null;
  goal_tags: string[];
  is_published: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
};

const CATEGORIES = [
  "Muscle Building", "Fat Loss", "Nutrition", "Recovery",
  "Cardio", "Mindset", "Progressive Overload", "General Health",
];

const GOAL_TAGS = ["build_muscle", "fat_loss", "endurance", "recovery", "nutrition", "mindset"];

const empty = (): Partial<Blueprint> => ({
  title: "",
  description: "",
  category: "General Health",
  cover_image_url: "",
  pdf_path: "",
  read_time_minutes: 10,
  goal_tags: [],
  is_published: true,
  is_archived: false,
  sort_order: 0,
});

const AdminBlueprints = () => {
  const [items, setItems] = useState<Blueprint[]>([]);
  const [stats, setStats] = useState<Record<string, { views: number; downloads: number }>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Blueprint> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blueprints" as any)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load blueprints");
    setItems((data as any) || []);

    const { data: analytics } = await supabase
      .from("blueprint_analytics" as any)
      .select("blueprint_id, event_type");
    const agg: Record<string, { views: number; downloads: number }> = {};
    (analytics as any[] || []).forEach((row) => {
      const s = agg[row.blueprint_id] ||= { views: 0, downloads: 0 };
      if (row.event_type === "view") s.views++;
      else if (row.event_type === "download") s.downloads++;
    });
    setStats(agg);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const uploadFile = async (
    bucket: "blueprint-pdfs" | "blueprint-covers",
    file: File
  ): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    return path;
  };

  const onPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingPdf(true);
    const path = await uploadFile("blueprint-pdfs", file);
    setUploadingPdf(false);
    if (path) setEditing({ ...editing, pdf_path: path });
  };

  const onCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploadingCover(true);
    const path = await uploadFile("blueprint-covers", file);
    setUploadingCover(false);
    if (path) setEditing({ ...editing, cover_image_url: path });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title || !editing.pdf_path) {
      toast.error("Title and PDF file are required");
      return;
    }
    setSaving(true);
    const payload: any = {
      title: editing.title,
      description: editing.description || null,
      category: editing.category || "General Health",
      cover_image_url: editing.cover_image_url || null,
      pdf_path: editing.pdf_path,
      read_time_minutes: Number(editing.read_time_minutes) || 10,
      goal_tags: editing.goal_tags || [],
      is_published: editing.is_published ?? true,
      is_archived: editing.is_archived ?? false,
      sort_order: Number(editing.sort_order) || 0,
    };
    const { error } = editing.id
      ? await supabase.from("blueprints" as any).update(payload).eq("id", editing.id)
      : await supabase.from("blueprints" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Blueprint updated" : "Blueprint created");
    setEditing(null);
    void load();
  };

  const remove = async (item: Blueprint) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("blueprints" as any).delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  const toggleArchive = async (item: Blueprint) => {
    await supabase
      .from("blueprints" as any)
      .update({ is_archived: !item.is_archived })
      .eq("id", item.id);
    void load();
  };

  const togglePublish = async (item: Blueprint) => {
    await supabase
      .from("blueprints" as any)
      .update({ is_published: !item.is_published })
      .eq("id", item.id);
    void load();
  };

  const totalViews = Object.values(stats).reduce((s, x) => s + x.views, 0);
  const totalDownloads = Object.values(stats).reduce((s, x) => s + x.downloads, 0);
  const popular = items
    .map((i) => ({ i, score: (stats[i.id]?.views || 0) + (stats[i.id]?.downloads || 0) * 2 }))
    .sort((a, b) => b.score - a.score)[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Success Blueprints</h1>
          <p className="text-sm text-muted-foreground mt-1">
            PDF guides for members on training, nutrition, recovery, and more.
          </p>
        </div>
        <Button onClick={() => setEditing(empty())}>
          <Plus className="w-4 h-4 mr-2" /> New Blueprint
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
          <div className="text-2xl font-bold mt-1">{items.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Views</div>
          <div className="text-2xl font-bold mt-1">{totalViews}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Downloads</div>
          <div className="text-2xl font-bold mt-1">{totalDownloads}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Most Popular</div>
          <div className="text-sm font-semibold mt-1 truncate">
            {popular?.score ? popular.i.title : "—"}
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No blueprints yet. Click "New Blueprint" to upload your first one.
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const s = stats[item.id] || { views: 0, downloads: 0 };
            return (
              <Card key={item.id} className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {item.category}
                    </span>
                    {!item.is_published && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Draft</span>
                    )}
                    {item.is_archived && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">Archived</span>
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{item.title}</h3>
                  <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                    <span><Eye className="w-3 h-3 inline mr-1" />{s.views}</span>
                    <span><Download className="w-3 h-3 inline mr-1" />{s.downloads}</span>
                    <span>{item.read_time_minutes} min read</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={item.is_published}
                    onCheckedChange={() => togglePublish(item)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => toggleArchive(item)} title={item.is_archived ? "Unarchive" : "Archive"}>
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditing(item)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(item)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Blueprint" : "New Blueprint"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Read time (minutes)</Label>
                  <Input type="number" value={editing.read_time_minutes ?? 10}
                    onChange={(e) => setEditing({ ...editing, read_time_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Goal tags (for future recommendations)</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {GOAL_TAGS.map((tag) => {
                    const active = editing.goal_tags?.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const cur = editing.goal_tags || [];
                          setEditing({
                            ...editing,
                            goal_tags: active ? cur.filter((t) => t !== tag) : [...cur, tag],
                          });
                        }}
                        className={`text-xs px-3 py-1 rounded-full border transition ${
                          active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {tag.replace("_", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Cover image</Label>
                <Input type="file" accept="image/*" onChange={onCoverChange} disabled={uploadingCover} />
                {editing.cover_image_url && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">✓ {editing.cover_image_url}</p>
                )}
              </div>
              <div>
                <Label>PDF file</Label>
                <Input type="file" accept="application/pdf" onChange={onPdfChange} disabled={uploadingPdf} />
                {editing.pdf_path && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">✓ {editing.pdf_path}</p>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_published ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
                  <Label className="cursor-pointer">Published</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_archived ?? false} onCheckedChange={(v) => setEditing({ ...editing, is_archived: v })} />
                  <Label className="cursor-pointer">Archived</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || uploadingPdf || uploadingCover}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing?.id ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlueprints;
