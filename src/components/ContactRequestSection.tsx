import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, Send } from "lucide-react";

const ContactRequestSection = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState<"email" | "call">("email");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({ title: "Please fill in your name and email", variant: "destructive" });
      return;
    }
    if (name.trim().length > 100) {
      toast({ title: "Name must be under 100 characters", variant: "destructive" });
      return;
    }
    if (email.trim().length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (phone && phone.trim().length > 20) {
      toast({ title: "Phone number is too long", variant: "destructive" });
      return;
    }
    if (message && message.trim().length > 1000) {
      toast({ title: "Message must be under 1000 characters", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
      p_identifier: email.trim().toLowerCase(),
      p_action: "contact_form",
      p_max_requests: 3,
      p_window_minutes: 60,
    });

    if (rlError || !allowed) {
      setIsSubmitting(false);
      toast({ title: "Too many requests", description: "Please wait before submitting again.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("contact_requests").insert({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      preferred_contact: preferredContact,
      message: message.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Request sent!", description: "We'll be in touch soon." });
    }
  };

  if (submitted) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto text-center rounded-xl border border-border bg-card p-12">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <Send className="w-6 h-6 text-foreground/60" />
            </div>
            <h3 className="font-heading text-2xl mb-3">We Got Your Message</h3>
            <p className="text-muted-foreground">Thanks for reaching out! We'll get back to you shortly.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-[0.2em] mb-6 block">Get In Touch</span>
            <h2 className="font-heading text-3xl md:text-4xl mb-4">
              Ready to <span className="text-foreground/50">Start?</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Request a call or send us an email. We'll help you find the right plan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-8 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name" className="text-xs uppercase tracking-wider text-muted-foreground">Name *</Label>
                <Input
                  id="contact-name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  className="bg-muted border-border h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email *</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                  className="bg-muted border-border h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-phone" className="text-xs uppercase tracking-wider text-muted-foreground">Phone (optional)</Label>
              <Input
                id="contact-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                className="bg-muted border-border h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preferred Contact Method</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPreferredContact("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                    preferredContact === "email"
                      ? "border-foreground/30 bg-foreground/5 text-foreground"
                      : "border-border bg-muted text-muted-foreground hover:border-foreground/20"
                  }`}
                >
                  <Mail className="w-4 h-4" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredContact("call")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${
                    preferredContact === "call"
                      ? "border-foreground/30 bg-foreground/5 text-foreground"
                      : "border-border bg-muted text-muted-foreground hover:border-foreground/20"
                  }`}
                >
                  <Phone className="w-4 h-4" /> Call
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message" className="text-xs uppercase tracking-wider text-muted-foreground">Message (optional)</Label>
              <Textarea
                id="contact-message"
                placeholder="Tell us about your fitness goals..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={4}
                className="bg-muted border-border resize-none"
              />
              {message.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-right">{message.length}/1000</p>
              )}
            </div>

            <Button type="submit" variant="apollo" size="lg" className="w-full h-12" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Request"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactRequestSection;
