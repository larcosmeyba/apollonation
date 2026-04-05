import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is Apollo Nation?",
    a: "Apollo Nation is a premium fitness platform built by coach Marcos Leyba. It offers structured on-demand workouts, personalized training programs, nutrition planning, and direct coach access — all in one app.",
  },
  {
    q: "How do I subscribe?",
    a: "You can subscribe directly through the Apple App Store. Once you download the Apollo Nation app, you'll be able to choose a membership plan and start training immediately.",
  },
  {
    q: "What types of workouts are available?",
    a: "Apollo Nation offers a wide range of workout styles including Strength, HIIT, Sculpt, Cardio, Core, Stretch, Yoga, and Senior-focused classes. New workouts are added every week.",
  },
  {
    q: "Do I need equipment?",
    a: "It depends on the workout. Many classes are bodyweight-only, while others may use dumbbells, resistance bands, or kettlebells. Each workout description lists the required equipment before you start.",
  },
  {
    q: "How often are new workouts added?",
    a: "New on-demand workouts are uploaded weekly. You can find them in the 'New This Week' section on your home page.",
  },
  {
    q: "Can I save workouts for later?",
    a: "Yes! Tap the bookmark icon on any workout to save it to your Collections. You can access all your saved workouts from the Collections tab on the On Demand page.",
  },
  {
    q: "Is there a meal plan included?",
    a: "Yes. Depending on your membership tier, you'll have access to personalized meal plans, grocery lists, and budget-friendly nutrition guidance through the Fuel tab.",
  },
  {
    q: "Can I message my coach?",
    a: "Yes. Apollo Nation includes direct messaging with your coach so you can ask questions, get form checks, and stay accountable.",
  },
  {
    q: "What if I'm a complete beginner?",
    a: "Apollo Nation is built for all fitness levels. Workouts range from beginner-friendly to advanced. Your coach can also help guide you to the right starting point based on your experience.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can manage or cancel your subscription at any time through your Apple App Store settings under Subscriptions.",
  },
  {
    q: "Is there a free trial?",
    a: "Trial availability depends on the current membership options in the App Store. Check the app listing for the latest offers.",
  },
  {
    q: "How do I contact support?",
    a: "You can reach out through the in-app messaging system or send us a DM on Instagram @larcosfit or TikTok @larcosfitness.",
  },
];

const FAQ = () => {
  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6 pb-12">
        <div className="pt-2">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            FAQ
          </h1>
          <p className="text-sm text-foreground/60 mt-2">
            Everything you need to know about Apollo Nation.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-2xl bg-card border border-border px-5 py-1 data-[state=open]:bg-card"
            >
              <AccordionTrigger className="text-sm font-bold text-foreground hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-foreground/70 leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </DashboardLayout>
  );
};

export default FAQ;
