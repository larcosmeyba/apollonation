import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const CATEGORIES = ["All", "Training", "Nutrition", "Mindset", "Recovery"] as const;

type Post = {
  slug: string;
  title: string;
  description: string;
  category: string;
  author: string;
  read_minutes: number;
  published_at: string;
};

const Blog = () => {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_posts" as any)
        .select("slug,title,description,category,author,read_minutes,published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      setAllPosts(((data as any) || []) as Post[]);
      setLoading(false);
    })();
  }, []);

  const posts = useMemo(() => {
    return category === "All" ? allPosts : allPosts.filter((p) => p.category === category);
  }, [allPosts, category]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Apollo Reborn Blog",
    url: "https://www.apolloreborn.com/blog",
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.published_at,
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

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-white/60" /></div>
          ) : posts.length === 0 ? (
            <p className="text-center text-white/50 py-16">No posts yet. Check back soon.</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link key={post.slug} to={`/blog/${post.slug}`} className="group">
                  <Card className="h-full p-6 flex flex-col bg-card/60">
                    <div className="flex items-center gap-3 mb-4 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 tracking-wide">
                        {post.category}
                      </span>
                      <span className="text-white/40">{post.read_minutes} min read</span>
                    </div>
                    <h2 className="font-heading text-xl font-bold text-white mb-3 leading-snug group-hover:text-white/90">
                      {post.title}
                    </h2>
                    <p className="text-white/60 text-sm leading-relaxed mb-5 flex-1">{post.description}</p>
                    <div className="flex items-center justify-between text-xs text-white/40 pt-4 border-t border-white/5">
                      <span>{post.author}</span>
                      <time dateTime={post.published_at}>
                        {new Date(post.published_at).toLocaleDateString("en-US", {
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
          )}

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
