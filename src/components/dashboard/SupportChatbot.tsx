import { useState } from "react";
import { MessageCircleQuestion, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const SupportChatbot = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
          aria-label="Open support"
        >
          <MessageCircleQuestion className="w-5 h-5" />
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
          <div className="p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Send className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading text-base tracking-wide text-foreground">
                Have a question?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
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
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatbot;
