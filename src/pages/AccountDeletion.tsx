import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const AccountDeletion = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Account Deletion"
        description="Learn how to request deletion of your Apollo Reborn™ account and all associated data."
        path="/account-deletion"
      />
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-foreground/60 hover:text-foreground text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="font-heading text-4xl md:text-5xl mb-4">
          Account <span className="text-primary">Deletion</span>
        </h1>
        <p className="text-foreground/70 text-lg mb-10">
          How to request the deletion of your Apollo Reborn™ account and all associated personal data.
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="font-heading text-xl text-foreground mt-0 mb-2">⚠️ Important Notice</h2>
            <p className="mb-0">
              Account deletion is <strong className="text-foreground">permanent and irreversible</strong>. Once your account is deleted, 
              all associated data — including workout history, nutrition logs, progress photos, messages, 
              and profile information — will be permanently removed from our systems and cannot be recovered.
            </p>
          </div>

          <h2 className="font-heading text-2xl text-foreground">How to Delete Your Account</h2>
          <p>Follow these steps to request full account and data deletion:</p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="font-heading text-lg text-foreground mb-1">Navigate to the Contact Portal</h3>
                <p className="mb-2">
                  Visit our{" "}
                  <Link to="/contact" className="text-primary underline hover:text-primary/80">
                    Contact Portal
                  </Link>{" "}
                  page. You can also access this from the footer of any page on our website or app.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="font-heading text-lg text-foreground mb-1">Select "Request Account & Data Deletion"</h3>
                <p className="mb-2">
                  From the <strong className="text-foreground">"What can we help with?"</strong> dropdown menu, 
                  select <strong className="text-foreground">"Request Account & Data Deletion"</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="font-heading text-lg text-foreground mb-1">Provide Your Information</h3>
                <p className="mb-2">
                  Enter your <strong className="text-foreground">full name</strong> and the{" "}
                  <strong className="text-foreground">email address associated with your account</strong>. 
                  This is required so we can verify your identity and locate your account.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground font-bold text-lg">
                4
              </div>
              <div>
                <h3 className="font-heading text-lg text-foreground mb-1">Submit Your Request</h3>
                <p className="mb-2">
                  Click <strong className="text-foreground">"Submit Request"</strong> to send your deletion request. 
                  You will receive a confirmation message on screen.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground font-bold text-lg">
                5
              </div>
              <div>
                <h3 className="font-heading text-lg text-foreground mb-1">Wait for Processing</h3>
                <p className="mb-2">
                  Our team will verify your identity and process your request. Account deletion requests are typically 
                  processed within <strong className="text-foreground">5–7 business days</strong>. You will receive 
                  an email confirmation once your account and data have been permanently deleted.
                </p>
              </div>
            </div>
          </div>

          <h2 className="font-heading text-2xl text-foreground mt-10">What Data Will Be Deleted?</h2>
          <p>Upon account deletion, the following data will be permanently removed:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your profile information (name, email, avatar, bio)</li>
            <li>Workout history and exercise logs</li>
            <li>Nutrition plans and meal logs</li>
            <li>Macro tracking data and food photos</li>
            <li>Progress photos and body metrics</li>
            <li>Messages and support tickets</li>
            <li>Step tracking and recovery logs</li>
            <li>Subscription and payment history (billing records may be retained as required by law)</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-10">Alternative: In-App Deletion</h2>
          <p>
            If you are logged into the Apollo Reborn™ app, you can also request account deletion from your profile:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Open the Apollo Reborn™ app</li>
            <li>Go to <strong className="text-foreground">Profile</strong> (bottom navigation)</li>
            <li>Tap <strong className="text-foreground">Settings</strong></li>
            <li>Scroll down and tap <strong className="text-foreground">"Delete Account"</strong></li>
            <li>Confirm your request</li>
          </ol>

          <h2 className="font-heading text-2xl text-foreground mt-10">Questions?</h2>
          <p>
            If you have any questions about the deletion process or your data, you can email us directly at{" "}
            <a href="mailto:support@apolloreborn.com" className="text-primary underline hover:text-primary/80">
              support@apolloreborn.com
            </a>
            , visit our{" "}
            <Link to="/contact" className="text-primary underline hover:text-primary/80">
              Contact Portal
            </Link>
            , or review our{" "}
            <Link to="/privacy" className="text-primary underline hover:text-primary/80">
              Privacy Policy
            </Link>.
          </p>

          <div className="mt-10 p-6 bg-muted rounded-lg">
            <p className="text-sm mb-0">
              Apollo Reborn™ respects your right to data privacy. We comply with applicable data protection 
              regulations and are committed to processing all deletion requests promptly and thoroughly.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountDeletion;
