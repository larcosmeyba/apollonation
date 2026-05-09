import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { blogPosts } from "@/data/blogPosts";

const CATEGORIES = ["All", "Training", "Nutrition", "Mindset", "Recovery"] as const;

const Blog = () => {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  const posts = useMemo(() => {
    const filtered = category === "All" ? blogPosts : blogPosts.filter((p) => p.category === category);
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [category]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Apollo Reborn Blog",
    url: "https://www.apolloreborn.com/blog",
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      author: { "@type": "Person", name: p.author },
      url: `https://www.apolloreborn.com/blog/${p.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Blog — Training, Nutrition & Mindset"
        description="Practical training, nutrition, and mindset guides from Coach Marcos and the Apollo Reborn team. Build strength, lose fat, train for life."
        path="/blog"
        jsonLd={jsonLd}
      />
      <Navbar />

      <main className="pt-24 pb-20">
        <section className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] uppercase text-white/50 mb-4">The Apollo Journal</p>
            <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-5">
              Train Smarter. Eat Better. Live Stronger.
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto">
              Field-tested guides on building muscle, losing fat, recovering hard, and showing up every day.
            </p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full text-xs tracking-wide font-medium transition-all ${
                  category === c
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Posts grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
                <Card className="h-full p-6 flex flex-col bg-card/60">
                  <div className="flex items-center gap-3 mb-4 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 tracking-wide">
                      {post.category}
                    </span>
                    <span className="text-white/40">{post.readMinutes} min read</span>
                  </div>
                  <h2 className="font-heading text-xl font-bold text-white mb-3 leading-snug group-hover:text-white/90">
                    {post.title}
                  </h2>
                  <p className="text-white/60 text-sm leading-relaxed mb-5 flex-1">{post.description}</p>
                  <div className="flex items-center justify-between text-xs text-white/40 pt-4 border-t border-white/5">
                    <span>{post.author}</span>
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-20 text-center bg-white/5 border border-white/10 rounded-3xl p-10 md:p-14">
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-white mb-4">
              Ready to train with a real plan?
            </h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Get personalised programs, daily workouts, and macro-tracked nutrition inside the Apollo Reborn app.
            </p>
            <Link to="/subscribe">
              <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-white/90 font-semibold">
                Start Your Transformation
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
