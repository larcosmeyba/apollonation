import { Clock, Flame, Dumbbell } from "lucide-react";
import marcos5 from "@/assets/marcos-5.jpg";
import marcos6 from "@/assets/marcos-6.webp";
import marcos7 from "@/assets/marcos-7.webp";
import marcos8 from "@/assets/marcos-8.webp";
import marcos9 from "@/assets/marcos-9.webp";

const videos = [
  {
    title: "Full Body Power",
    duration: "45 min",
    calories: "450",
    category: "Strength",
    thumbnail: marcos5,
    featured: true,
  },
  {
    title: "HIIT Inferno",
    duration: "30 min",
    calories: "380",
    category: "Cardio",
    thumbnail: marcos6,
  },
  {
    title: "Core Destroyer",
    duration: "20 min",
    calories: "200",
    category: "Core",
    thumbnail: marcos7,
  },
  {
    title: "Upper Body Sculpt",
    duration: "40 min",
    calories: "320",
    category: "Strength",
    thumbnail: marcos8,
  },
  {
    title: "Leg Day Domination",
    duration: "50 min",
    calories: "500",
    category: "Strength",
    thumbnail: marcos9,
  },
];

const VideosSection = () => {
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
            Professional workout videos designed to push your limits.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {videos.slice(1).map((video, index) => (
            <div
              key={index}
              className="relative overflow-hidden border border-border rounded-xl"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
                decoding="async"
                className="w-full h-48 md:h-56 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-heading text-lg mb-2 text-white">
                  {video.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-white/70">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{video.duration}</span>
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{video.calories} cal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideosSection;
