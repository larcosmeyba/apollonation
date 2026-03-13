import { useState, useRef, useEffect } from "react";
import { MessageCircleQuestion, X, Send, Loader2, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! 👋 I'm Apollo Support. I can help you navigate the app or report a bug. What do you need help with?",
};

const SupportChatbot = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: { messages: history },
      });

      if (error) throw error;

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.reply || "Sorry, I couldn't process that. Please try again.",
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If the AI flagged a bug report, save it
      if (data?.isBugReport && user) {
        await (supabase as any).from("support_tickets").insert({
          user_id: user.id,
          type: "bug",
          subject: userMsg.content.slice(0, 100),
          message: userMsg.content,
        });
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
          aria-label="Open support chat"
        >
          <MessageCircleQuestion className="w-5 h-5" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[hsl(var(--apollo-charcoal-light))]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircleQuestion className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-heading tracking-wide">Apollo Support</p>
                <p className="text-[10px] text-muted-foreground">App help & bug reports</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[hsl(210,100%,52%)] text-white rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question or report a bug..."
                className="text-sm bg-muted border-border"
                disabled={loading}
              />
              <Button
                type="submit"
                variant="apollo"
                size="icon"
                className="shrink-0"
                disabled={!input.trim() || loading}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatbot;
