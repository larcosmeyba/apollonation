import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Search, Plus, Pencil, Trash2, Save, X, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClientNote {
  id: string;
  client_user_id: string;
  admin_user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

const AdminClientNotes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["admin-client-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .order("display_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ["admin-client-notes", selectedClient?.user_id],
    queryFn: async () => {
      const query = supabase
        .from("client_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedClient) {
        query.eq("client_user_id", selectedClient.user_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClientNote[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ clientId, content }: { clientId: string; content: string }) => {
      const { error } = await supabase.from("client_notes").insert({
        client_user_id: clientId,
        admin_user_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-notes"] });
      toast({ title: "Note saved" });
      setNewNote("");
      setIsAddDialogOpen(false);
    },
    onError: (e) => toast({ title: "Error saving note", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("client_notes").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-notes"] });
      toast({ title: "Note updated" });
      setEditingNote(null);
    },
    onError: (e) => toast({ title: "Error updating note", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-notes"] });
      toast({ title: "Note deleted" });
    },
    onError: (e) => toast({ title: "Error deleting note", description: e.message, variant: "destructive" }),
  });

  const filteredProfiles = profiles?.filter(
    (p) => !searchQuery || (p.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientName = (userId: string) =>
    profiles?.find((p) => p.user_id === userId)?.display_name || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl">Client Notes</h2>
          <p className="text-sm text-muted-foreground">
            Keep private notes about your clients
          </p>
        </div>
        <Button variant="apollo" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* Client filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Client chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedClient(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !selectedClient
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All Clients
        </button>
        {filteredProfiles?.map((p) => (
          <button
            key={p.user_id}
            onClick={() => setSelectedClient(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedClient?.user_id === p.user_id
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.display_name || "Unnamed"}
          </button>
        ))}
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notesLoading ? (
          <p className="text-center py-8 text-muted-foreground">Loading notes...</p>
        ) : !notes?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No notes yet{selectedClient ? ` for ${selectedClient.display_name}` : ""}.</p>
            <p className="text-xs mt-1">Click "Add Note" to get started.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="card-apollo p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-primary font-medium">
                    {getClientName(note.client_user_id)}
                  </p>
                  {editingNote?.id === note.id ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="mt-2"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1 whitespace-pre-wrap">{note.content}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(note.updated_at).toLocaleDateString()} at{" "}
                    {new Date(note.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {editingNote?.id === note.id ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => updateMutation.mutate({ id: note.id, content: editContent })}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="w-4 h-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingNote(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingNote(note);
                          setEditContent(note.content);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(note.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Note Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Client</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {profiles?.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => setSelectedClient(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedClient?.user_id === p.user_id
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p.display_name || "Unnamed"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Note</label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write your note about this client..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button
                variant="apollo"
                disabled={!selectedClient || !newNote.trim() || addMutation.isPending}
                onClick={() => {
                  if (selectedClient && newNote.trim()) {
                    addMutation.mutate({ clientId: selectedClient.user_id, content: newNote.trim() });
                  }
                }}
              >
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientNotes;
