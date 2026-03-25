import { useState } from "react";
import { MessageCircleQuestion, X, Send, Ticket, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const SupportChatbot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { data: tickets = [] } = useQuery({
    queryKey: ["my-support-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("support_tickets")
        .select("id, subject, status, created_at, type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user && isOpen,
  });

  if (!user) return null;

  const openTickets = tickets.filter((t: any) => t.status === "open").length;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
          aria-label="Open support"
        >
          <MessageCircleQuestion className="w-5 h-5" />
          {openTickets > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-medium">
              {openTickets}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[hsl(var(--apollo-charcoal-light))]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircleQuestion className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-heading tracking-wide">Apollo Support</p>
                <p className="text-[10px] text-muted-foreground">Need help? Message your coach</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading text-base tracking-wide text-foreground">
                Have a question?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send your coach a direct message and they'll get back to you as soon as possible.
              </p>
            </div>
            <Button
              variant="apollo"
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                navigate("/dashboard/messages");
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Send a Message
            </Button>

            {/* Recent tickets */}
            {tickets.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Ticket className="w-3 h-3" /> Recent Tickets
                </p>
                <div className="space-y-1.5">
                  {tickets.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 text-xs">
                      {ticket.status === "open" ? (
                        <Clock className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ticket.subject || "Support Request"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        ticket.status === "open" ? "bg-yellow-500/15 text-yellow-400" : "bg-green-500/15 text-green-400"
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatbot;
