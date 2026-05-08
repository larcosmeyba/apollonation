import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy"
        description="Apollo Reborn's privacy policy. Learn how we collect, use, and protect your personal information."
        path="/privacy"
      />
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="font-heading text-4xl md:text-5xl mb-8">
          Privacy <span className="text-primary">Policy</span>
        </h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p>
            Apollo Fitness LLC, operating as Apollo Reborn ("we," "us," or "our"), is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website 
            and mobile application (collectively, the "Services").
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">1. Information We Collect</h2>
          <h3 className="font-heading text-xl text-foreground">Personal Information</h3>
          <p>We may collect personally identifiable information that you voluntarily provide, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name and display name</li>
            <li>Email address</li>
            <li>Phone number (optional)</li>
            <li>Profile information (bio, fitness goals, avatar)</li>
            <li>Body metrics you log (weight, height, age, sex, body measurements)</li>
            <li>Photos you choose to upload (meal photos, progress photos, workout-screen captures)</li>
            <li>Workout, nutrition, and questionnaire responses</li>
            <li>Messages you send to your assigned coach (Elite tier only)</li>
          </ul>
          <p className="text-xs">
            <strong>Payments:</strong> All subscription payments are processed by the App Store.
            We never see, receive, or store your payment card details. We only receive an anonymized purchase token used to
            verify your subscription status.
          </p>

          <h3 className="font-heading text-xl text-foreground">Health & Fitness Data (Apple Health / HealthKit)</h3>
          <p>
            On iOS, with your explicit permission, Apollo Reborn reads the following categories from Apple Health:
            steps, distance, active calories, heart rate, resting heart rate, sleep analysis, workouts, and body weight.
          </p>
          <p className="font-medium text-foreground">
            We do not — and will never — use HealthKit data for advertising, marketing, data mining, or sale to third
            parties. HealthKit data is only used to personalize your training, surface progress to you in the app, and
            (for Elite tier) share with your assigned coach so they can adjust your plan. You can revoke access at any
            time in iPhone Settings → Privacy → Health → Apollo Reborn.
          </p>

          <h3 className="font-heading text-xl text-foreground">Usage Information</h3>
          <p>We automatically collect certain information when you use our Services:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Device information (model, operating system version)</li>
            <li>Log data (access times, in-app screens viewed, IP address used to authenticate)</li>
            <li>Crash diagnostics and technical errors</li>
            <li>App usage patterns and preferences</li>
          </ul>
          <p className="text-xs">
            We do <strong>not</strong> use third-party advertising SDKs, do <strong>not</strong> track you across other
            apps and websites, and do <strong>not</strong> use Apple's IDFA. Our marketing site uses cookie-free
            Plausible Analytics only.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">2. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our Services</li>
            <li>Verify your subscription entitlement via App Store receipts</li>
            <li>Send transactional and account communications</li>
            <li>Send promotional communications (only with your explicit opt-in)</li>
            <li>Respond to your comments, questions, and support requests</li>
            <li>Personalize your training plans, nutrition plans, and recommendations</li>
            <li>Provide AI-powered macro estimates and meal planning (images and text are sent to Lovable AI Gateway / Google Gemini / OpenAI for inference and are not used by those providers to train models for other customers)</li>
            <li>Detect, prevent, and address fraud, abuse, and security incidents</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">3. Sharing of Information</h2>
          <p>
            <strong className="text-foreground">We do not sell your personal information.</strong> We share information only as
            described below:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Your assigned coach (Elite only):</strong> health, workout, nutrition, and questionnaire data so they can personalize your plan and answer questions you send them.</li>
            <li><strong>Service Providers:</strong> bound by contract to process data only on our behalf (see Section 7).</li>
            <li><strong>Legal Requirements:</strong> if required by law, subpoena, or valid legal process.</li>
            <li><strong>Business Transfers:</strong> in connection with a merger, acquisition, or sale of assets, with notice to you.</li>
            <li><strong>With Your Consent:</strong> when you explicitly direct us to share information.</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information, including
            encryption in transit (TLS), encryption at rest, row-level security on our database, signed-URL access to media,
            and least-privilege access controls. However, no method of transmission or electronic storage is 100% secure.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">5. Your Rights and Choices</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and personal information at any time, directly in the app via
              Profile → Settings → Delete Account, or via our{" "}
              <Link to="/account-deletion" className="text-primary hover:underline">Account Deletion page</Link>
            </li>
            <li>Opt out of promotional communications using the unsubscribe link in any email</li>
            <li>Request a copy of your data (data portability)</li>
            <li>Block, mute, or report any user content. We have a zero-tolerance policy for objectionable content and
              act on reports within 24 hours (see Terms).</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">6. Children's Privacy</h2>
          <p>
            Our Services are not intended for individuals under the age of 18. We do not knowingly collect personal
            information from children under 18. If you believe a child has provided us with personal information, please
            contact us and we will delete it promptly.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">7. Third-Party Services</h2>
          <p>Apollo Reborn relies on the following third-party services. Each handles only the data needed for its function and is bound by its own privacy policy:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase</strong> — authentication, database, file storage, and serverless backend functions.</li>
            <li><strong>RevenueCat</strong> — App Store receipt verification and subscription state.</li>
            <li><strong>Apple App Store</strong> — billing and payment processing for subscriptions.</li>
            <li><strong>Apple HealthKit</strong> — on-device source for the health categories listed above (iOS only).</li>
            <li><strong>Resend</strong> — transactional email delivery (account, security, and coach messages).</li>
            <li><strong>Lovable AI Gateway</strong> (Google Gemini, OpenAI) — AI inference for macro estimates and meal planning. Inputs are not used to train third-party models.</li>
            <li><strong>Plausible Analytics</strong> — privacy-friendly, cookie-free traffic analytics on our marketing site only.</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">8. Data Retention &amp; Deletion</h2>
          <p>
            User account information, workout history, training progress, nutrition preferences, photos, messages, and
            questionnaire responses are stored while your account remains active.
          </p>
          <p>
            <strong className="text-foreground">Deletion is immediate and permanent.</strong> When you delete your account
            from inside the app (Profile → Settings → Delete Account) or via our public{" "}
            <Link to="/account-deletion" className="text-primary hover:underline">Account Deletion page</Link>, your
            profile, plans, logs, photos, and messages are removed from our systems right away and cannot be recovered.
            Limited records may be retained only where required for legal, tax, or security obligations.
          </p>
          <p>
            Inactive accounts may be removed from our systems after an extended period of inactivity.
          </p>


          <h2 className="font-heading text-2xl text-foreground mt-8">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. 
            We will notify you of any changes by posting the new Privacy Policy on this page 
            and updating the "Effective Date" above.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">10. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy practices, please contact us through our{" "}
            <Link to="/contact" className="text-primary hover:underline">
              Contact Portal
            </Link>.
          </p>
          <p className="font-medium text-foreground">
            Apollo Fitness LLC
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
