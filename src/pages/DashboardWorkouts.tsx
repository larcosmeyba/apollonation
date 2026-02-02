import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Clock, Flame, Filter, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Sample workout data - this would come from Supabase in production
const sampleWorkouts = [
  {
    id: "1",
    title: "Full Body Strength",
    description: "Complete full body workout with Coach Marcos",
    duration_minutes: 45,
    calories_estimate: 400,
    category: "Strength",
    thumbnail_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400",
    is_featured: true,
  },
  {
    id: "2",
    title: "HIIT Cardio Blast",
    description: "High intensity interval training",
    duration_minutes: 30,
    calories_estimate: 350,
    category: "HIIT",
    thumbnail_url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400",
    is_featured: false,
  },
  {
    id: "3",
    title: "Core Crusher",
    description: "Build a strong core foundation",
    duration_minutes: 20,
    calories_estimate: 200,
    category: "Core",
    thumbnail_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400",
    is_featured: false,
  },
  {
    id: "4",
    title: "Upper Body Power",
    description: "Build strength in arms, chest, and back",
    duration_minutes: 40,
    calories_estimate: 320,
    category: "Strength",
    thumbnail_url: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400",
    is_featured: true,
  },
  {
    id: "5",
    title: "Leg Day Intense",
    description: "Complete lower body transformation",
    duration_minutes: 50,
    calories_estimate: 450,
    category: "Strength",
    thumbnail_url: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400",
    is_featured: false,
  },
  {
    id: "6",
    title: "Morning Mobility",
    description: "Start your day with flexibility work",
    duration_minutes: 15,
    calories_estimate: 100,
    category: "Mobility",
    thumbnail_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400",
    is_featured: false,
  },
];

const categories = ["All", "Strength", "HIIT", "Core", "Mobility", "Cardio"];

const DashboardWorkouts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredWorkouts = sampleWorkouts.filter((workout) => {
    const matchesSearch = workout.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || workout.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            Workout <span className="text-apollo-gold">Library</span>
          </h1>
          <p className="text-muted-foreground">
            Access our growing collection of HD workout videos with Coach Marcos
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted border-border"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-muted border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Workouts grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkouts.map((workout) => (
            <div
              key={workout.id}
              className="card-apollo group overflow-hidden hover:border-apollo-gold/50 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={workout.thumbnail_url}
                  alt={workout.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Play button */}
                <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-apollo-gold flex items-center justify-center">
                    <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </button>

                {/* Featured badge */}
                {workout.is_featured && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-apollo-gold rounded text-xs font-bold text-primary-foreground">
                    FEATURED
                  </div>
                )}

                {/* Favorite button */}
                <button
                  onClick={() => toggleFavorite(workout.id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      favorites.includes(workout.id)
                        ? "fill-apollo-gold text-apollo-gold"
                        : "text-white"
                    }`}
                  />
                </button>

                {/* Duration & calories */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-white/90">
                      <Clock className="w-3 h-3" />
                      {workout.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/90">
                      <Flame className="w-3 h-3" />
                      {workout.calories_estimate} cal
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-apollo-gold uppercase tracking-wide">
                    {workout.category}
                  </span>
                </div>
                <h3 className="font-heading text-lg mb-1">{workout.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {workout.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {filteredWorkouts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No workouts found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardWorkouts;
