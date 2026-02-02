import { Play, Clock, Flame, Dumbbell } from "lucide-react";

const videos = [
  {
    title: "Full Body Power",
    duration: "45 min",
    calories: "450",
    category: "Strength",
    thumbnail: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=400&fit=crop",
    featured: true,
  },
  {
    title: "HIIT Inferno",
    duration: "30 min",
    calories: "380",
    category: "Cardio",
    thumbnail: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
  },
  {
    title: "Core Destroyer",
    duration: "20 min",
    calories: "200",
    category: "Core",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
  },
  {
    title: "Upper Body Sculpt",
    duration: "40 min",
    calories: "320",
    category: "Strength",
    thumbnail: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=600&h=400&fit=crop",
  },
  {
    title: "Leg Day Domination",
    duration: "50 min",
    calories: "500",
    category: "Strength",
    thumbnail: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=600&h=400&fit=crop",
  },
];

const VideosSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-apollo-charcoal-light/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-apollo-gold font-medium text-sm uppercase tracking-widest mb-4 block">
            On-Demand Library
          </span>
          <h2 className="font-heading text-4xl md:text-5xl mb-6">
            WORKOUTS READY
            <span className="text-gradient-gold block">WHEN YOU ARE</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Access 500+ professional workout videos anytime, anywhere. New content added weekly.
          </p>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Featured Video - Larger */}
          <div className="md:col-span-2 lg:row-span-2 group relative rounded-2xl overflow-hidden cursor-pointer">
            <img
              src={videos[0].thumbnail}
              alt={videos[0].title}
              className="w-full h-full min-h-[300px] md:min-h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            
            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-apollo-gold/90 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Play className="w-8 h-8 text-background fill-current ml-1" />
              </div>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <span className="inline-block px-3 py-1 bg-apollo-gold text-background text-xs font-semibold rounded-full mb-3">
                FEATURED
              </span>
              <h3 className="font-heading text-2xl md:text-3xl mb-2">{videos[0].title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {videos[0].duration}
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-apollo-copper" />
                  {videos[0].calories} cal
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell className="w-4 h-4" />
                  {videos[0].category}
                </span>
              </div>
            </div>

            {/* Gold border on hover */}
            <div className="absolute inset-0 border-2 border-apollo-gold/0 group-hover:border-apollo-gold/50 rounded-2xl transition-all duration-300" />
          </div>

          {/* Other Videos */}
          {videos.slice(1).map((video, index) => (
            <div
              key={index}
              className="group relative rounded-2xl overflow-hidden cursor-pointer"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-48 md:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              
              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 rounded-full bg-apollo-gold/90 flex items-center justify-center shadow-lg">
                  <Play className="w-5 h-5 text-background fill-current ml-0.5" />
                </div>
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-heading text-lg mb-1 group-hover:text-apollo-gold transition-colors">
                  {video.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {video.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-apollo-copper" />
                    {video.calories} cal
                  </span>
                </div>
              </div>

              {/* Gold border on hover */}
              <div className="absolute inset-0 border-2 border-apollo-gold/0 group-hover:border-apollo-gold/50 rounded-2xl transition-all duration-300" />
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <button className="btn-apollo-outline">
            Browse Full Library
          </button>
        </div>
      </div>
    </section>
  );
};

export default VideosSection;
