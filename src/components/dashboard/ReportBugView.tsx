import { useState } from "react";
import { Bug, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onBack: () => void;
}

const ReportBugView = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({ title: "Please describe the issue", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const context = `URL: ${window.location.href}\nUA: ${navigator.userAgent}\nViewport: ${window.innerWidth}x${window.innerHeight}`;
      const { error } = await supabase.functions.invoke("report-bug", {
        body: { subject: subject.trim(), message: message.trim(), context },
      });
      if (error) throw error;
      toast({
        title: "Bug report sent ✅",
        description: "Thanks! We've been notified and will look into it ASAP.",
      });
      setSubject("");
      setMessage("");
      onBack();
    } catch (err) {
      console.error(err);
      toast({
        title: "Couldn't send report",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <button onClick={onBack} className="text-foreground mb-4 text-sm font-bold">← Back</button>
      <div className="flex items-center gap-2 mb-2">
        <Bug className="w-6 h-6 text-foreground" />
        <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Report a Bug
        </h1>
      </div>
      <p className="text-sm text-foreground/60 mb-6">
        Found something broken or confusing? Let us know — Coach Marcos gets notified right away.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2 block">
            Subject (optional)
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Workout video won't play"
            maxLength={200}
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-2 block">
            What happened? <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue. What were you doing? What did you expect to happen? What actually happened?"
            rows={8}
            maxLength={4000}
            required
          />
          <p className="text-[10px] text-foreground/40 mt-1 text-right">{message.length}/4000</p>
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
          ) : (
            "Send Bug Report"
          )}
        </Button>
      </form>
    </div>
  );
};

export default ReportBugView;
