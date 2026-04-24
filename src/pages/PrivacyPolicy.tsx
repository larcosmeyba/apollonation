import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Privacy Policy"
        description="Apollo Reborn's privacy policy. Learn how we collect, use, and protect your personal information."
        path="/privacy"
      />
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
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
            <li>Phone number</li>
            <li>Payment information (processed securely through third-party payment processors)</li>
            <li>Profile information (bio, fitness goals, avatar)</li>
            <li>Photos uploaded for macro tracking features</li>
          </ul>

          <h3 className="font-heading text-xl text-foreground">Usage Information</h3>
          <p>We automatically collect certain information when you use our Services:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Device information (type, operating system, unique identifiers)</li>
            <li>Log data (access times, pages viewed, IP address)</li>
            <li>Workout and nutrition tracking data</li>
            <li>App usage patterns and preferences</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">2. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our Services</li>
            <li>Process transactions and send related information</li>
            <li>Send promotional communications (with your consent)</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Monitor and analyze usage patterns</li>
            <li>Personalize your experience and deliver content relevant to your fitness goals</li>
            <li>Provide AI-powered macro tracking and nutritional analysis</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">3. Sharing of Information</h2>
          <p>We may share your information in the following situations:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
            <li><strong>Legal Requirements:</strong> If required by law or in response to valid legal process</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            <li><strong>With Your Consent:</strong> When you have given us permission to share your information</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information. 
            However, no method of transmission over the Internet or electronic storage is 100% secure. 
            While we strive to protect your information, we cannot guarantee absolute security.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">5. Your Rights and Choices</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt out of promotional communications</li>
            <li>Data portability</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">6. Children's Privacy</h2>
          <p>
            Our Services are not intended for individuals under the age of 18. 
            We do not knowingly collect personal information from children under 18. 
            If we become aware that we have collected such information, we will take steps to delete it.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">7. Third-Party Services</h2>
          <p>Apollo Reborn relies on the following third-party services to operate. Each handles only the data needed for its function and is bound by its own privacy policy:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase</strong> — authentication, database, file storage, and serverless backend functions.</li>
            <li><strong>RevenueCat</strong> — subscription state management and in-app purchase receipt verification.</li>
            <li><strong>Apple App Store / Google Play</strong> — billing and payment processing for subscriptions.</li>
            <li><strong>Resend</strong> — transactional email delivery (account, security, and coach messages).</li>
            <li><strong>Plausible Analytics</strong> — privacy-friendly, cookie-free traffic analytics on our marketing site.</li>
          </ul>
          <p>
            We do not sell your personal information. Our Services may contain links to third-party websites; we are not responsible for their privacy practices.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">8. Data Retention</h2>
          <p>
            Apollo Reborn retains user data only for as long as necessary to provide services within the application.
          </p>
          <p>
            User account information, workout history, training progress, nutrition preferences, and questionnaire 
            responses are stored while the user account remains active.
          </p>
          <p>
            <strong className="text-foreground">Deletion is immediate and permanent.</strong> When you delete your account from
            within the app, your profile, plans, logs, photos, and messages are removed from our systems right away and cannot
            be recovered. Limited records may be retained only where required for legal, financial, or security obligations.
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
