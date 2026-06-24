import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import DOMPurify from "dompurify";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Post = {
  slug: string;
  title: string;
  description: string;
  category: string;
  author: string;
  read_minutes: number;
  content: string;
  published_at: string;
  cover_url: string | null;
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("blog_posts" as any)
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(data as any);
      const { data: rel } = await supabase
        .from("blog_posts" as any)
        .select("slug,title,description,category,author,read_minutes,content,published_at,cover_url")
        .neq("slug", slug)
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      setRelated(((rel as any) || []) as Post[]);
      setLoading(false);
    })();
  }, [slug]);

  if (notFound) return <Navigate to="/blog" replace />;
  if (loading || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-white/60" />
      </div>
    );
  }

  const safeContent = useMemo(
    () =>
      DOMPurify.sanitize(post.content, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "formaction"],
      }),
    [post.content]
  );


  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published_at,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Apollo Reborn",
      logo: { "@type": "ImageObject", url: "https://www.apolloreborn.com/og-image.jpg" },
    },
    mainEntityOfPage: `https://www.apolloreborn.com/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={post.title}
        description={post.description}
        path={`/blog/${post.slug}`}
        type="article"
        jsonLd={jsonLd}
      />
      <Navbar />

      <main className="pt-24 pb-20">
        <article className="container mx-auto px-4 max-w-3xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-5 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 tracking-wide">
                {post.category}
              </span>
              <span className="text-white/40">{post.read_minutes} min read</span>
            </div>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-white leading-tight mb-5">
              {post.title}
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-6">{post.description}</p>
            <div className="flex items-center gap-3 text-sm text-white/50 pb-6 border-b border-white/10">
              <span>{post.author}</span>
              <span>·</span>
              <time dateTime={post.published_at}>
                {new Date(post.published_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          </header>

          {post.cover_url && (
            <img src={post.cover_url} alt={post.title} className="w-full rounded-2xl mb-10" loading="lazy" />
          )}

          <div
            className="prose-blog text-white/85 leading-relaxed space-y-5
              [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-4
              [&_p]:text-base [&_p]:md:text-lg [&_p]:text-white/80
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:text-white/80
              [&_blockquote]:border-l-2 [&_blockquote]:border-white/40 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-white/70 [&_blockquote]:my-8
              [&_a]:text-white [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: safeContent }}
          />

          <div className="mt-16 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <h3 className="font-heading text-xl md:text-2xl font-bold text-white mb-3">
              Want a plan built around this?
            </h3>
            <p className="text-white/70 mb-6 text-sm md:text-base">
              Apollo Reborn turns these principles into daily workouts and meal plans tuned to your body and goals.
            </p>
            <Link to="/subscribe">
              <Button className="rounded-full px-7 bg-white text-black hover:bg-white/90 font-semibold">
                Get the App
              </Button>
            </Link>
          </div>
        </article>

        {related.length > 0 && (
          <section className="container mx-auto px-4 max-w-6xl mt-20">
            <h2 className="font-heading text-2xl font-bold text-white mb-6">Keep reading</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="block p-6 rounded-2xl border border-white/10 bg-card/60 hover:border-white/30 transition-all"
                >
                  <span className="text-xs tracking-wide text-white/50 uppercase">{p.category}</span>
                  <h3 className="font-heading text-lg font-bold text-white mt-2 mb-2 leading-snug">{p.title}</h3>
                  <p className="text-white/60 text-sm line-clamp-2">{p.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
