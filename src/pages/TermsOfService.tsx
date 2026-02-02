import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="font-heading text-4xl md:text-5xl mb-8">
          Terms of <span className="text-apollo-gold">Service</span>
        </h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <p>
            Welcome to Apollo Nation. These Terms of Service ("Terms") govern your use of the website and mobile application 
            (collectively, the "Services") operated by Apollo Fitness LLC ("we," "us," or "our"). 
            By accessing or using our Services, you agree to be bound by these Terms.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using our Services, you acknowledge that you have read, understood, 
            and agree to be bound by these Terms and our Privacy Policy. If you do not agree, 
            please do not use our Services.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">2. Eligibility</h2>
          <p>
            You must be at least 18 years old to use our Services. By using our Services, 
            you represent and warrant that you meet this age requirement and have the legal capacity 
            to enter into these Terms.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">3. Account Registration</h2>
          <p>
            To access certain features of our Services, you must create an account. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and promptly update your account information</li>
            <li>Keep your password secure and confidential</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized access</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">4. Subscription and Payments</h2>
          <p>
            Certain features require a paid subscription. By subscribing, you agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Pay all applicable fees as described at the time of purchase</li>
            <li>Provide valid payment information</li>
            <li>Authorize us to charge your payment method for recurring subscriptions</li>
            <li>Accept that subscriptions auto-renew unless cancelled</li>
          </ul>
          <p>
            Refunds are handled on a case-by-case basis. Please contact us for refund requests.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">5. Health and Fitness Disclaimer</h2>
          <p className="font-medium text-foreground bg-apollo-gold/10 p-4 rounded-lg border border-apollo-gold/20">
            IMPORTANT: The content provided through our Services, including workout videos, nutrition recipes, 
            macro tracking, and coaching guidance, is for informational and educational purposes only. 
            It is NOT intended to be a substitute for professional medical advice, diagnosis, or treatment.
          </p>
          <p>By using our Services, you acknowledge and agree that:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You should consult with a qualified healthcare provider before beginning any exercise program, 
                changing your diet, or using any fitness-related information</li>
            <li>You are solely responsible for your own health and safety</li>
            <li>Participation in any exercise or nutrition program involves inherent risks of injury</li>
            <li>AI-powered macro estimates are approximations and should not replace professional nutritional guidance</li>
            <li>We are not liable for any injuries, health issues, or damages resulting from your use of our Services</li>
            <li>You voluntarily assume all risks associated with using our fitness and nutrition content</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">6. Assumption of Risk</h2>
          <p>
            Physical exercise can be strenuous and subject to risk of serious injury, disability, and even death. 
            You understand that fitness activities involve inherent risks including, but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Muscle, joint, or bone injuries</li>
            <li>Cardiovascular complications</li>
            <li>Overexertion or fatigue</li>
            <li>Adverse reactions to dietary changes</li>
          </ul>
          <p>
            YOU EXPRESSLY ASSUME ALL RISKS ASSOCIATED WITH PARTICIPATING IN ANY FITNESS ACTIVITIES 
            OR FOLLOWING ANY NUTRITIONAL GUIDANCE PROVIDED THROUGH OUR SERVICES.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">7. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, APOLLO FITNESS LLC AND ITS OFFICERS, DIRECTORS, 
            EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, 
            OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Personal injury or death</li>
            <li>Loss of profits, data, or goodwill</li>
            <li>Service interruption or computer damage</li>
            <li>Any other intangible losses</li>
          </ul>
          <p>
            Our total liability for any claims arising from your use of the Services shall not exceed 
            the amount you paid to us in the twelve (12) months preceding the claim.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">8. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless Apollo Fitness LLC and its affiliates, 
            officers, directors, employees, and agents from any claims, damages, losses, liabilities, 
            and expenses (including attorneys' fees) arising from:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your use of the Services</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Any injury or harm resulting from your participation in fitness activities</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">9. Intellectual Property</h2>
          <p>
            All content on our Services, including but not limited to text, graphics, logos, images, 
            videos, and software, is the property of Apollo Fitness LLC or its licensors and is protected 
            by intellectual property laws. You may not reproduce, distribute, or create derivative works 
            without our express written permission.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">10. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the Services for any unlawful purpose</li>
            <li>Share your account credentials with others</li>
            <li>Attempt to circumvent any security features</li>
            <li>Upload malicious code or interfere with the Services</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Redistribute or resell our content</li>
          </ul>

          <h2 className="font-heading text-2xl text-foreground mt-8">11. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without cause, 
            and with or without notice. Upon termination, your right to use the Services will immediately cease.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">12. Dispute Resolution</h2>
          <p>
            Any disputes arising from these Terms or your use of the Services shall be resolved through 
            binding arbitration in accordance with the rules of the American Arbitration Association. 
            You agree to waive any right to a jury trial or to participate in a class action lawsuit.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">13. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State 
            in which Apollo Fitness LLC is registered, without regard to conflict of law principles.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">14. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of material changes 
            by posting the updated Terms on our website. Your continued use of the Services after such changes 
            constitutes your acceptance of the new Terms.
          </p>

          <h2 className="font-heading text-2xl text-foreground mt-8">15. Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us at:
          </p>
          <p className="font-medium text-foreground">
            Apollo Fitness LLC<br />
            Email: legal@apollonation.com
          </p>

          <div className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm">
              BY USING OUR SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND 
              BY THESE TERMS OF SERVICE. IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST NOT USE OUR SERVICES.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
