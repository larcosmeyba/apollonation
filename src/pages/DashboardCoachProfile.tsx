import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import marcosAction1 from "@/assets/coach-marcos-hero.jpg";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignedCoach } from "@/hooks/useAssignedCoach";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tables } from "@/integrations/supabase/types";

type Workout = Tables<"workouts">;

const COACH_BIO = `Marcos Leyba is a NASM Certified Personal Trainer with over a decade coaching strength, HIIT, and body transformation. He's built Apollo Reborn around a simple philosophy: programs should fit your life, not the other way around. No extreme diets, no chaos, no burnout — just structured training that actually works.

Marcos has trained hundreds of clients ranging from beginners to competitive athletes, combining progressive overload with functional movement patterns to deliver results that last.

When he's not coaching, Marcos is constantly studying the latest in exercise science and nutrition to bring cutting-edge programming to his clients.`;

const DashboardCoachProfile = () => {
  const { user } = useAuth();
  const { coach } = useAssignedCoach();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"bio" | "ondemand">("bio");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const { data: workouts = [] } = useQuery({
    queryKey: ["coach-workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["user-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_favorites")
        .select("workout_id")
        .eq("user_id", user.id)
        .not("workout_id", "is", null);
      return data?.map(f => f.workout_id).filter(Boolean) as string[] || [];
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (workoutId: string) => {
      if (!user) return;
      const isFav = favorites.includes(workoutId);
      if (isFav) {
        await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("workout_id", workoutId);
      } else {
        await supabase.from("user_favorites").insert({ user_id: user.id, workout_id: workoutId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-favorites"] }),
    onError: () => toast.error("Could not update favorite"),
  });

  const getYouTubeVideoId = (url: string): string | null => {
    try {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/\/shorts\/([a-zA-Z0-9_-]+)/) || url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    } catch { return null; }
  };

  const getThumb = (w: Workout) => {
    if (w.thumbnail_url) return w.thumbnail_url;
    if (w.video_url) {
      const id = getYouTubeVideoId(w.video_url);
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    return marcosAction1;
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Coach Hero — Large square image */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.08)]">
          <img src={marcosAction1} alt="Marcos Leyba" className="w-full h-full object-cover object-[center_top]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <h1 className="text-2xl font-bold text-white">Marcos Leyba</h1>
            <p className="text-sm text-white/70 mt-1">Founder & Head Coach · Apollo Reborn</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex">
            {(["bio", "ondemand"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 pb-3 text-sm font-bold text-center transition-colors relative ${
                  activeTab === tab ? "text-foreground" : "text-foreground/40"
                }`}
              >
                {tab === "bio" ? "Bio" : "On-Demand"}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bio Tab */}
        {activeTab === "bio" && (
          <div className="space-y-4">
            <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line">{COACH_BIO}</p>

        {/* On-Demand Tab */}
        {activeTab === "ondemand" && (
          <div className="grid grid-cols-2 gap-3">
            {workouts.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWorkout(w)}
                className="group relative overflow-hidden rounded-2xl text-left"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                  <img src={getThumb(w)} alt={w.title} className="w-full h-full object-cover scale-110 group-hover:scale-[1.15] transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite.mutate(w.id); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    {favorites.includes(w.id) ? <BookmarkCheck className="w-3.5 h-3.5 text-white" /> : <Bookmark className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <div className="absolute bottom-2 left-2 right-2">
                    <h3 className="text-xs font-bold text-white uppercase truncate">{w.title}</h3>
                    <p className="text-[10px] text-white/80 mt-0.5">{w.duration_minutes} min · {w.category}</p>
                  </div>
                </div>
              </button>
            ))}
            {workouts.length === 0 && (
              <div className="col-span-2 py-12 text-center">
                <p className="text-muted-foreground text-sm">No workouts available yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workout Detail Dialog */}
      <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-background border-border">
          {selectedWorkout && (
            <>
              {selectedWorkout.video_url && (
                selectedWorkout.video_url.startsWith("storage:") ? (
                  <StorageVideoPlayer storagePath={selectedWorkout.video_url.replace("storage:", "")} />
                ) : (
                  <div className="relative aspect-video w-full">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(selectedWorkout.video_url)}?playsinline=1&modestbranding=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )
              )}
              <ScrollArea className="max-h-[60vh]">
                <div className="p-5 space-y-3">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">{selectedWorkout.title}</DialogTitle>
                    {selectedWorkout.description && <p className="text-sm text-muted-foreground mt-1">{selectedWorkout.description}</p>}
                  </DialogHeader>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{selectedWorkout.duration_minutes} min</span>
                    <span>{selectedWorkout.category}</span>
                    {selectedWorkout.calories_estimate && <span>{selectedWorkout.calories_estimate} cal</span>}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

/** Plays a video from private storage using a signed URL */
const StorageVideoPlayer = ({ storagePath }: { storagePath: string }) => {
  const [bucket, ...pathParts] = storagePath.split("/");
  const filePath = pathParts.join("/");

  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ["signed-video", storagePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 1000 * 60 * 30,
  });

  if (isLoading || !signedUrl) {
    return (
      <div className="aspect-video w-full flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full bg-black">
      <video src={signedUrl} controls autoPlay playsInline className="w-full h-full" />
    </div>
  );
};

export default DashboardCoachProfile;
