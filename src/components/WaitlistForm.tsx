import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
});

const WaitlistForm = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name: name || undefined, email });
    if (!parsed.success) {
      toast({
        title: "Check your info",
        description: parsed.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("waitlist_signups").insert({
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name ?? null,
      platform: "ios",
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        setDone(true);
        return;
      }
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-5">
          <CheckCircle2 className="w-7 h-7 text-white" />
        </div>
        <h2 className="font-heading text-3xl md:text-[40px] text-foreground mb-3 leading-tight">
          You're on the list
        </h2>
        <p className="text-white/70 text-base leading-relaxed max-w-md mx-auto">
          We'll email you the moment Apollo Reborn launches on the App Store.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto text-center">
      <span className="inline-block text-[11px] tracking-[0.2em] uppercase text-white/60 mb-4 font-medium">
        Coming Soon
      </span>
      <h2 className="font-heading text-3xl md:text-[40px] text-foreground mb-4 leading-tight">
        Join the Waitlist
      </h2>
      <p className="text-white/80 text-base leading-relaxed mb-8 max-w-md mx-auto">
        Apollo Reborn launches soon on the App Store. Sign up to be notified the day it goes live.
      </p>

      <form onSubmit={onSubmit} className="space-y-3 max-w-md mx-auto text-left">
        <Input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="bg-white/5 border-white/15 text-white placeholder:text-white/40 h-12"
        />
        <Input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          className="bg-white/5 border-white/15 text-white placeholder:text-white/40 h-12"
        />

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 mt-2 rounded-md bg-white text-black hover:bg-white/90 font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Notify Me at Launch"}
        </Button>

        <p className="text-[11px] text-white/40 text-center pt-2">
          We'll only email you about the launch. No spam.
        </p>
      </form>
    </div>
  );
};

export default WaitlistForm;
