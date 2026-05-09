export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: "Training" | "Nutrition" | "Mindset" | "Recovery";
  author: string;
  date: string; // ISO
  readMinutes: number;
  cover?: string;
  // Simple HTML content. Use semantic tags (<h2>, <p>, <ul>, <li>, <blockquote>).
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "build-muscle-after-40",
    title: "How to Build Muscle After 40 (Without Wrecking Your Joints)",
    description:
      "A practical, science-backed framework for adding lean mass in your 40s and beyond — with smarter training, recovery, and nutrition.",
    category: "Training",
    author: "Coach Marcos",
    date: "2026-05-01",
    readMinutes: 7,
    content: `
      <p>Building muscle after 40 isn't about training harder — it's about training smarter. Recovery windows shrink, joints get pickier, and the margin for error gets thin. Here's the framework I use with my Apollo Reborn clients.</p>
      <h2>1. Train for tension, not destruction</h2>
      <p>Lower the ego, raise the standard. Three to four hard working sets per muscle, 6–12 reps, controlled tempo. You don't need 20 sets to grow — you need 20 quality sets per week.</p>
      <h2>2. Prioritise protein, sleep, and steps</h2>
      <p>1g of protein per pound of bodyweight, 7+ hours of sleep, and 8–10k daily steps. Without those three, hypertrophy stalls. With them, even an average program works.</p>
      <h2>3. Rotate stimuli every 4–6 weeks</h2>
      <p>Joint-friendly variations (DB press, neutral-grip rows, hack squats) let you push hard without breaking down. Periodise. Recover. Repeat.</p>
      <blockquote>"Consistency beats intensity. Always."</blockquote>
    `,
  },
  {
    slug: "nutrition-for-fat-loss",
    title: "The Only Nutrition Plan You Need for Sustainable Fat Loss",
    description:
      "Forget extreme cuts. Here's how to lose fat, keep your strength, and never feel like you're starving.",
    category: "Nutrition",
    author: "Coach Marcos",
    date: "2026-04-22",
    readMinutes: 6,
    content: `
      <p>Most fat loss plans fail because they're built around restriction. Apollo Reborn flips it: build the plan around the foods you actually eat, then engineer the deficit.</p>
      <h2>Step 1 — Set a small deficit (15–20%)</h2>
      <p>Aggressive cuts kill muscle, mood, and adherence. A modest deficit lets you train hard and stay consistent for months, not days.</p>
      <h2>Step 2 — Anchor every meal with protein</h2>
      <p>30–50g of protein per meal keeps you full and protects lean mass. Hit this and the rest of the plan gets easy.</p>
      <h2>Step 3 — Track for 2 weeks, then auto-pilot</h2>
      <p>You don't need to log forever. Two weeks of tracking teaches you portions and macros for life.</p>
    `,
  },
  {
    slug: "mindset-of-elite-athletes",
    title: "The Mindset Habits of Elite Athletes (That You Can Steal)",
    description:
      "What separates the top 1% isn't talent — it's a small set of mental habits that compound over time.",
    category: "Mindset",
    author: "Coach Marcos",
    date: "2026-04-10",
    readMinutes: 5,
    content: `
      <p>I've coached weekend warriors and pro athletes. The single biggest difference isn't genetics — it's how they think between sessions.</p>
      <h2>1. They show up on bad days</h2>
      <p>Motivation is a liar. Identity is the truth. "I'm someone who trains" beats "I feel like training" every time.</p>
      <h2>2. They keep the standard, not the streak</h2>
      <p>Miss a day? Fine. Miss the standard? Never. The goal is the average, not the perfect week.</p>
      <h2>3. They review weekly</h2>
      <p>Five minutes every Sunday: what worked, what didn't, what's next. That's it. That's the whole secret.</p>
    `,
  },
  {
    slug: "recovery-protocols-that-actually-work",
    title: "Recovery Protocols That Actually Work (And the Ones That Don't)",
    description:
      "Cold plunges, saunas, foam rollers — what's worth your time and what's marketing fluff.",
    category: "Recovery",
    author: "Coach Marcos",
    date: "2026-03-28",
    readMinutes: 6,
    content: `
      <p>Recovery is where the gains actually happen. But most "recovery tools" are 5% of the result. Here's the honest tier list.</p>
      <h2>S-Tier: Sleep, protein, walking</h2>
      <p>Boring. Free. Unbeatable. If these aren't dialled in, nothing else matters.</p>
      <h2>A-Tier: Sauna, mobility work, deload weeks</h2>
      <p>Real, measurable benefits — especially the deload. Take a lighter week every 4–6 weeks. Your joints will thank you.</p>
      <h2>B-Tier: Cold plunges, massage guns</h2>
      <p>Useful for how you feel. Marginal for actual recovery. Use them — don't depend on them.</p>
    `,
  },
];

export const getPostBySlug = (slug: string) => blogPosts.find((p) => p.slug === slug);
