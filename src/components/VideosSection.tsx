import { Play, Clock, Flame, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import marcos5 from "@/assets/marcos-5.jpg";
import marcos6 from "@/assets/marcos-6.jpg";
import marcos7 from "@/assets/marcos-7.jpg";
import marcos8 from "@/assets/marcos-8.jpg";
import marcos9 from "@/assets/marcos-9.jpg";

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
          <span className="text-muted-foreground font-medium text-[10px] uppercase tracking-[0.25em] mb-6 block">
            On-Demand Library
          </span>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl mb-6 tracking-[0.05em] text-foreground">
            Workouts Ready
            <span className="text-foreground/50 block mt-2">When You Are</span>
          </h2>
          <p className="text-muted-foreground text-base font-light leading-relaxed">
            Access 100+ professional workout videos anytime, anywhere.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {/* Featured Video */}
          <div className="md:col-span-2 lg:row-span-2 group relative overflow-hidden cursor-pointer border border-border hover:border-foreground/20 transition-all duration-500 rounded-xl">
            <img
              src={videos[0].thumbnail}
              alt={videos[0].title}
              loading="lazy"
              decoding="async"
              className="w-full h-full min-h-[300px] md:min-h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border border-foreground/40 bg-foreground/10 backdrop-blur-sm flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 rounded-full">
                <Play className="w-6 h-6 text-foreground fill-current ml-1" />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6">
              <span className="inline-block px-3 py-1 bg-foreground text-background text-[9px] font-semibold uppercase tracking-[0.2em] mb-3 rounded-full">
                Featured
              </span>
              <h3 className="font-heading text-2xl md:text-3xl mb-3 text-foreground">{videos[0].title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{videos[0].duration}</span>
                <span className="flex items-center gap-1.5"><Flame className="w-4 h-4" />{videos[0].calories} cal</span>
                <span className="flex items-center gap-1.5"><Dumbbell className="w-4 h-4" />{videos[0].category}</span>
              </div>
            </div>
          </div>

          {videos.slice(1).map((video, index) => (
            <div
              key={index}
              className="group relative overflow-hidden cursor-pointer border border-border hover:border-foreground/20 transition-all duration-500 rounded-xl"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
                decoding="async"
                className="w-full h-48 md:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 border border-foreground/40 bg-foreground/10 backdrop-blur-sm flex items-center justify-center rounded-full">
                  <Play className="w-5 h-5 text-foreground fill-current ml-0.5" />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-heading text-lg mb-2 text-foreground group-hover:text-foreground/80 transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{video.duration}</span>
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{video.calories} cal</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/auth">
            <Button variant="apollo-outline" size="lg" className="rounded-full">
              Browse Full Library
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default VideosSection;
