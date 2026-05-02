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

const ApplyCoach = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    social_media_handle: "",
    social_media_following: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Please fill in your name and email.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("coach_applications").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        social_media_handle: form.social_media_handle.trim() || null,
        social_media_following: form.social_media_following.trim() || null,
        reason: form.reason.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Application submitted!", description: "We'll review your application and get back to you." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 container mx-auto px-4">
        <div className="max-w-lg mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          <h1 className="font-heading text-3xl md:text-4xl text-white font-bold mb-3">
            Apply to Become a Coach
          </h1>
          <p className="text-white/70 text-base mb-8">
            Join the Apollo Reborn coaching team. Fill out the form below and we'll review your application.
          </p>

          {submitted ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Send className="w-7 h-7 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-black mb-2">Application Received!</h2>
              <p className="text-black/70 text-sm">We'll review your application and reach out to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-white font-semibold text-sm">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  className="mt-1.5 bg-white text-black border-white/20 placeholder:text-black/40"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white font-semibold text-sm">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  className="mt-1.5 bg-white text-black border-white/20 placeholder:text-black/40"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <Label htmlFor="handle" className="text-white font-semibold text-sm">Social Media Handle</Label>
                <Input
                  id="handle"
                  value={form.social_media_handle}
                  onChange={(e) => setForm({ ...form, social_media_handle: e.target.value })}
                  placeholder="@yourhandle"
                  className="mt-1.5 bg-white text-black border-white/20 placeholder:text-black/40"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="following" className="text-white font-semibold text-sm">Social Media Following</Label>
                <Input
                  id="following"
                  value={form.social_media_following}
                  onChange={(e) => setForm({ ...form, social_media_following: e.target.value })}
                  placeholder="e.g. 10K on Instagram"
                  className="mt-1.5 bg-white text-black border-white/20 placeholder:text-black/40"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="reason" className="text-white font-semibold text-sm">Why do you want to join Apollo Reborn?</Label>
                <Textarea
                  id="reason"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Tell us about yourself and why you'd be a great fit..."
                  className="mt-1.5 bg-white text-black border-white/20 placeholder:text-black/40 min-h-[120px]"
                  maxLength={1000}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90 font-semibold text-base"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default ApplyCoach;
