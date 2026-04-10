import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const inquiryTypes = [
  { value: "general", label: "General Inquiry" },
  { value: "coach_application", label: "Apply to Become a Coach" },
  { value: "account_deletion", label: "Request Account & Data Deletion" },
  { value: "privacy", label: "Privacy & Data Request" },
  { value: "support", label: "Technical Support" },
  { value: "feedback", label: "Feedback & Suggestions" },
];

const ContactPortal = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    inquiry_type: "general",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Please fill in your name and email.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast({ title: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Rate limit check
      const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
        p_identifier: form.email.trim().toLowerCase(),
        p_action: "contact_portal",
        p_max_requests: 3,
        p_window_minutes: 60,
      });

      if (rlError || !allowed) {
        toast({ title: "Too many requests", description: "Please wait before submitting again.", variant: "destructive" });
        setLoading(false);
        return;
      }

      const selectedLabel = inquiryTypes.find((t) => t.value === form.inquiry_type)?.label || "General Inquiry";

      const { error } = await supabase.from("contact_requests").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        preferred_contact: "email",
        message: `[${selectedLabel}] ${form.message.trim() || "No additional details provided."}`,
      });

      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Request submitted!", description: "We'll review your request and get back to you." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <SEOHead
        title="Contact Portal"
        description="Get in touch with Apollo Reborn™. Submit inquiries, request account deletion, apply to coach, or get support."
        path="/contact"
      />
      <Navbar />
      <div className="pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-lg mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <h1 className="font-heading text-3xl md:text-4xl text-foreground font-bold mb-3">
            Contact <span className="text-primary">Portal</span>
          </h1>
          <p className="text-foreground/70 text-base mb-8">
            How can we help? Select a topic below and we'll get back to you as soon as possible.
          </p>

          {submitted ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7 text-foreground/70" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Request Received!</h2>
              <p className="text-foreground/70 text-sm">We'll review your submission and reach out to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="inquiry_type" className="text-foreground font-semibold text-sm">What can we help with? *</Label>
                <select
                  id="inquiry_type"
                  value={form.inquiry_type}
                  onChange={(e) => setForm({ ...form, inquiry_type: e.target.value })}
                  className="mt-1.5 w-full h-11 px-3 rounded-md bg-muted text-foreground border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {inquiryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.inquiry_type === "account_deletion" && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-foreground/80">
                    <strong>Account Deletion:</strong> Submitting this request will initiate the permanent deletion of your account and all associated data. 
                    This process is irreversible. Please see our{" "}
                    <Link to="/account-deletion" className="text-primary underline hover:text-primary/80">
                      Account Deletion Instructions
                    </Link>{" "}
                    for more details.
                  </p>
                </div>
              )}

              {form.inquiry_type === "coach_application" && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="text-sm text-foreground/80">
                    <strong>Coach Applications:</strong> Tell us about your experience, social media presence, and why you'd like to join Apollo Reborn™.
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="name" className="text-foreground font-semibold text-sm">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="mt-1.5 bg-muted border-border"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-foreground font-semibold text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  className="mt-1.5 bg-muted border-border"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-foreground font-semibold text-sm">
                  {form.inquiry_type === "account_deletion"
                    ? "Confirm your request (optional)"
                    : form.inquiry_type === "coach_application"
                    ? "Tell us about yourself *"
                    : "Message (optional)"}
                </Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={
                    form.inquiry_type === "account_deletion"
                      ? "Please confirm you'd like to delete your account and all associated data..."
                      : form.inquiry_type === "coach_application"
                      ? "Tell us about your experience, certifications, social media following, and why you'd be a great fit..."
                      : "How can we help?"
                  }
                  className="mt-1.5 bg-muted border-border min-h-[120px] resize-none"
                  maxLength={1000}
                />
                {form.message.length > 0 && (
                  <p className="text-[10px] text-foreground/50 text-right mt-1">{form.message.length}/1000</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold text-base"
              >
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default ContactPortal;
