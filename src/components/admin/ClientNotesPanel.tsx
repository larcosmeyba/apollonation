import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Save, X, Plus, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClientNote {
  id: string;
  client_user_id: string;
  admin_user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  userId: string;
  clientName: string;
}

const ClientNotesPanel = ({ userId, clientName }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: notes, isLoading } = useQuery({
    queryKey: ["admin-client-notes", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientNote[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("client_notes").insert({
        client_user_id: userId,
        admin_user_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-notes", userId] });
      toast({ title: "Note saved" });
      setNewNote("");
      setIsAdding(false);
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("client_notes").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-notes", userId] });
      toast({ title: "Note updated" });
      setEditingNote(null);
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-client-notes", userId] });
      toast({ title: "Note deleted" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg">Notes for {clientName}</h3>
        {!isAdding && (
          <Button variant="apollo" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Note
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="card-apollo p-4 space-y-3">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write your private note about this client..."
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setIsAdding(false); setNewNote(""); }}>Cancel</Button>
            <Button variant="apollo" size="sm" disabled={!newNote.trim() || addMutation.isPending} onClick={() => addMutation.mutate(newNote.trim())}>
              Save Note
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">Loading notes...</p>
      ) : !notes?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No notes yet for {clientName}.</p>
          <p className="text-xs mt-1">Click "Add Note" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="card-apollo p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {editingNote?.id === note.id ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(note.updated_at).toLocaleDateString()} at{" "}
                    {new Date(note.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {editingNote?.id === note.id ? (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => updateMutation.mutate({ id: note.id, content: editContent })} disabled={updateMutation.isPending}>
                        <Save className="w-4 h-4 text-apollo-gold" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingNote(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingNote(note); setEditContent(note.content); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(note.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientNotesPanel;
