import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Search, Send, CheckCircle, ArrowLeft } from "lucide-react";

const AdminMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<{ userId: string; name: string; email?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ["admin-email-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, subscription_tier")
        .order("display_name");
      if (error) throw error;
      return (data || []).filter((p) => p.user_id !== user?.id);
    },
  });

  const filteredClients = searchQuery
    ? (allUsers || []).filter((c) =>
        (c.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allUsers || [];

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient || !message.trim()) return;
      const { error } = await supabase.functions.invoke("send-coach-email", {
        body: {
          recipientId: selectedClient.userId,
          subject: "Message from Your Coach",
          message: message.trim(),
          type: "direct",
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSentSuccess(true);
      toast({ title: `Email sent to ${selectedClient?.name}` });
      setMessage("");
      setTimeout(() => setSentSuccess(false), 4000);
    },
    onError: (error) => {
      toast({ title: "Failed to send email", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="h-[600px] flex border border-border rounded-lg overflow-hidden">
      {/* Client list */}
      <div className={`w-full md:w-80 border-r border-border flex flex-col ${selectedClient ? "hidden md:flex" : "flex"}`}>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filteredClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
          ) : (
            filteredClients.map((client) => {
              const isSelected = selectedClient?.userId === client.user_id;
              return (
                <button
                  key={client.user_id}
                  onClick={() => setSelectedClient({ userId: client.user_id, name: client.display_name || "Unknown" })}
                  className={`w-full text-left flex items-center gap-3 p-3 transition-all hover:bg-muted/50 ${
                    isSelected ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {(client.display_name || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{client.display_name || "Unknown"}</p>
                    <span className="text-[10px] text-primary uppercase tracking-wide">
                      {client.subscription_tier}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Email compose area */}
      <div className={`flex-1 flex flex-col ${!selectedClient ? "hidden md:flex" : "flex"}`}>
        {selectedClient ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <button onClick={() => setSelectedClient(null)} className="md:hidden p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-heading text-sm">{selectedClient.name}</p>
                <p className="text-[10px] text-muted-foreground">Email will be sent directly</p>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col justify-center max-w-lg mx-auto w-full">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Message to {selectedClient.name}</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Hey ${selectedClient.name}, ...`}
                    rows={8}
                    maxLength={2000}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="apollo"
                    onClick={() => sendEmailMutation.mutate()}
                    disabled={!message.trim() || sendEmailMutation.isPending}
                  >
                    {sendEmailMutation.isPending ? "Sending..." : (
                      <><Send className="w-4 h-4 mr-2" /> Send Email</>
                    )}
                  </Button>
                  {sentSuccess && (
                    <span className="text-sm text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Sent
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Select a member to send an email</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;
