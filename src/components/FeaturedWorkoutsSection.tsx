import { Dumbbell, Clock, Flame, Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import fitnessGym from "@/assets/fitness-gym.png";
import fitness1 from "@/assets/fitness-1.png";
import fitness4 from "@/assets/fitness-4.png";

// Fallback images for workouts without thumbnails
const fallbackImages = [fitnessGym, fitness1, fitness4];

interface Workout {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  calories_estimate: number | null;
  thumbnail_url: string | null;
  is_featured: boolean | null;
}

const FeaturedWorkoutsSection = () => {
  const { data: workouts } = useQuery({
    queryKey: ["featured-workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as Workout[];
    },
  });

  const displayWorkouts = workouts && workouts.length > 0 ? workouts : null;

  return (
    <section id="workouts" className="py-32 relative">
      {/* Top divider */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label mb-6 block">On-Demand Training</span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.05em] text-white">
            Featured
            <span className="text-primary block mt-2">Workouts</span>
          </h2>
          <p className="text-white/50 text-base font-light leading-relaxed">
            Professionally crafted programs to push your limits and unlock your full potential.
          </p>
        </div>

        {/* Workouts Grid */}
        {displayWorkouts ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {displayWorkouts.map((workout, index) => (
              <div
                key={workout.id}
                className="group border border-white/10 hover:border-primary/40 transition-all duration-700 bg-white/[0.02] hover:bg-white/[0.04] overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <img
                    src={workout.thumbnail_url || fallbackImages[index % fallbackImages.length]}
                    alt={workout.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="w-14 h-14 rounded-full border border-primary/60 bg-primary/10 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>

                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] bg-primary/20 text-primary border border-primary/30 backdrop-blur-sm">
                      {workout.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-heading text-lg mb-2 tracking-[0.05em] text-white group-hover:text-primary transition-colors duration-500">
                    {workout.title}
                  </h3>
                  <p className="text-white/40 text-sm font-light line-clamp-2 mb-4">
                    {workout.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-white/40 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary/70" />
                      <span>{workout.duration_minutes} min</span>
                    </div>
                    {workout.calories_estimate && (
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-primary/70" />
                        <span>{workout.calories_estimate} cal</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-primary/70" />
                      <span className="capitalize">{workout.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder cards when no workouts exist */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[fitnessGym, fitness1, fitness4].map((img, index) => (
              <div
                key={index}
                className="group border border-white/10 hover:border-primary/40 transition-all duration-700 bg-white/[0.02] overflow-hidden"
              >
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <img src={img} alt="Workout" className="w-full h-full object-cover opacity-60" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                </div>
                <div className="p-6">
                  <div className="h-5 w-3/4 bg-white/10 rounded mb-3" />
                  <div className="h-3 w-full bg-white/5 rounded mb-2" />
                  <div className="h-3 w-2/3 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <Link to="/auth">
            <Button variant="apollo" size="lg" className="group min-w-[220px] h-14 text-base">
              Unlock All Workouts
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedWorkoutsSection;
