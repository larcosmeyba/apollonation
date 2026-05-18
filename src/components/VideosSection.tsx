import { useWorkoutCategories } from "@/hooks/useWorkoutCategories";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";
import marcos2 from "@/assets/marcos-2.jpg";
import marcos3 from "@/assets/marcos-3.jpg";
import marcos5 from "@/assets/marcos-5.jpg";

const FALLBACK: Record<string, string> = {
  Strength: marcosAction6,
  Sculpt: marcos2,
  HIIT: marcosAction7,
  Cardio: marcosAction1,
  Core: marcos5,
  Stretch: marcos3,
};

const VideosSection = () => {
  const { data: categories = [] } = useWorkoutCategories();

  // Always render the 6 canonical categories, in order, even before the query resolves.
  const tiles = ["Strength", "Sculpt", "HIIT", "Cardio", "Core", "Stretch"].map((name) => {
    const cat = categories.find((c) => c.name === name);
    const v = cat?.updated_at ? new Date(cat.updated_at).getTime() : Date.now();
    return {
      name,
      thumbnail: cat?.thumbnail_url ? `${cat.thumbnail_url}?v=${v}` : FALLBACK[name],
    };
  });

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-white/70 font-medium text-[10px] uppercase tracking-[0.25em] mb-6 block">
            On-Demand Library
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.05em] text-white">
            Workouts Ready
            <span className="text-white/70 block mt-2">When You Are</span>
          </h2>
          <p className="text-white/70 text-base font-light leading-relaxed">
            Strength, sculpt, HIIT, cardio, core, and stretch — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
          {tiles.map((tile) => (
            <div
              key={tile.name}
              className="relative overflow-hidden border border-border rounded-xl aspect-[3/4]"
            >
              <img
                src={tile.thumbnail}
                alt={tile.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                <h3 className="font-heading text-base sm:text-lg text-white tracking-wide">
                  {tile.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideosSection;
