import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Trophy, Flame, Target, ChevronRight, Loader2,
  Calendar, Dumbbell, Utensils, Check,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

const DashboardChallenges = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [checkinNote, setCheckinNote] = useState("");

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["challenge-enrollments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("challenge_enrollments")
        .select("*, challenges(*)")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["challenge-checkins", user?.id, selectedChallenge?.id],
    queryFn: async () => {
      if (!user || !selectedChallenge) return [];
      const { data } = await (supabase as any)
        .from("challenge_checkins")
        .select("*")
        .eq("user_id", user.id)
        .eq("challenge_id", selectedChallenge.id)
        .order("checkin_date", { ascending: false });
      return data || [];
    },
    enabled: !!user && !!selectedChallenge,
  });

  const enroll = async (challengeId: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any).from("challenge_enrollments").insert({
        user_id: user.id,
        challenge_id: challengeId,
      });
      if (error) throw error;
      toast({ title: "Challenge joined! 🔥" });
      queryClient.invalidateQueries({ queryKey: ["challenge-enrollments"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const checkin = async (workoutDone: boolean, nutritionDone: boolean) => {
    if (!user || !selectedChallenge) return;
    try {
      const { error } = await (supabase as any).from("challenge_checkins").upsert({
        user_id: user.id,
        challenge_id: selectedChallenge.id,
        checkin_date: format(new Date(), "yyyy-MM-dd"),
        workout_completed: workoutDone,
        nutrition_logged: nutritionDone,
        notes: checkinNote || null,
      }, { onConflict: "user_id,challenge_id,checkin_date" });
      if (error) throw error;
      toast({ title: "Check-in saved! ✅" });
      setCheckinNote("");
      queryClient.invalidateQueries({ queryKey: ["challenge-checkins"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getEnrollment = (challengeId: string) =>
    enrollments.find((e: any) => e.challenge_id === challengeId);

  const todayCheckin = checkins.find(
    (c: any) => c.checkin_date === format(new Date(), "yyyy-MM-dd")
  );

  if (selectedChallenge) {
    const enrollment = getEnrollment(selectedChallenge.id);
    const startDate = enrollment ? new Date(enrollment.enrolled_at) : new Date();
    const dayNumber = differenceInDays(new Date(), startDate) + 1;
    const totalDays = selectedChallenge.duration_days;
    const progressPct = Math.min((checkins.length / totalDays) * 100, 100);

    // Calculate streak
    let streak = 0;
    const sortedCheckins = [...checkins].sort(
      (a: any, b: any) => new Date(b.checkin_date).getTime() - new Date(a.checkin_date).getTime()
    );
    for (let i = 0; i < sortedCheckins.length; i++) {
      const expected = format(addDays(new Date(), -i), "yyyy-MM-dd");
      if (sortedCheckins[i]?.checkin_date === expected) streak++;
      else break;
    }

    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <button
            onClick={() => setSelectedChallenge(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Challenges
          </button>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-heading text-2xl tracking-wide">{selectedChallenge.title}</h1>
                <p className="text-xs text-muted-foreground mt-1">{selectedChallenge.description}</p>
              </div>
              <Badge variant="outline">{selectedChallenge.duration_days} days</Badge>
            </div>

            {/* Progress */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Day {Math.min(dayNumber, totalDays)} of {totalDays}</span>
                <span>{checkins.length} check-ins</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 rounded-xl bg-muted/20">
                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="font-heading text-xl">{streak}</p>
                <p className="text-[9px] text-muted-foreground">Day Streak</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/20">
                <Dumbbell className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="font-heading text-xl">{checkins.filter((c: any) => c.workout_completed).length}</p>
                <p className="text-[9px] text-muted-foreground">Workouts</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/20">
                <Utensils className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="font-heading text-xl">{checkins.filter((c: any) => c.nutrition_logged).length}</p>
                <p className="text-[9px] text-muted-foreground">Meals Logged</p>
              </div>
            </div>
          </div>

          {/* Today's Check-in */}
          <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-5 space-y-4">
            <h3 className="font-heading text-sm uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Today's Check-In
            </h3>
            {todayCheckin ? (
              <div className="flex items-center gap-3 text-sm">
                <Check className="w-5 h-5 text-green-500" />
                <span>You've already checked in today!</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox id="workout-done" />
                  <label htmlFor="workout-done" className="text-sm cursor-pointer">Workout completed</label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="nutrition-done" />
                  <label htmlFor="nutrition-done" className="text-sm cursor-pointer">Meals logged</label>
                </div>
                <Textarea
                  placeholder="Optional notes..."
                  className="text-xs min-h-[60px]"
                  value={checkinNote}
                  onChange={(e) => setCheckinNote(e.target.value)}
                />
                <Button
                  variant="apollo"
                  className="w-full"
                  onClick={() => {
                    const wDone = (document.getElementById("workout-done") as HTMLInputElement)?.getAttribute("data-state") === "checked";
                    const nDone = (document.getElementById("nutrition-done") as HTMLInputElement)?.getAttribute("data-state") === "checked";
                    checkin(wDone, nDone);
                  }}
                >
                  Submit Check-In
                </Button>
              </div>
            )}
          </div>

          {/* Recent Check-ins */}
          {checkins.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-heading text-sm uppercase tracking-wider mb-3">Recent Check-Ins</h3>
              <div className="space-y-2">
                {checkins.slice(0, 7).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{format(new Date(c.checkin_date + "T12:00:00"), "EEE, MMM d")}</span>
                    <div className="flex items-center gap-3">
                      {c.workout_completed && <Badge variant="outline" className="text-[10px] gap-1"><Dumbbell className="w-3 h-3" /> Workout</Badge>}
                      {c.nutrition_logged && <Badge variant="outline" className="text-[10px] gap-1"><Utensils className="w-3 h-3" /> Nutrition</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="font-heading text-2xl tracking-wide">Challenges</h1>
          <p className="text-xs text-muted-foreground">Push your limits with structured challenges</p>
        </div>

        {/* Active Challenges */}
        {enrollments.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] text-primary uppercase tracking-widest">Your Active Challenges</p>
            {enrollments.filter((e: any) => e.status === "active").map((e: any) => {
              const challenge = e.challenges;
              if (!challenge) return null;
              const dayNumber = differenceInDays(new Date(), new Date(e.enrolled_at)) + 1;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedChallenge(challenge)}
                  className="w-full text-left rounded-xl border border-primary/30 bg-primary/[0.03] p-4 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading text-sm">{challenge.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">Day {Math.min(dayNumber, challenge.duration_days)} of {challenge.duration_days}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Available Challenges */}
        <div className="space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Available Challenges</p>
          {isLoading ? (
            <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-10">
              <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">No challenges available yet. Check back soon!</p>
            </div>
          ) : (
            challenges.map((c: any) => {
              const enrolled = getEnrollment(c.id);
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-heading text-lg">{c.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" />{c.duration_days} days</Badge>
                        <Badge variant="secondary" className="capitalize">{c.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    {enrolled ? (
                      <Button variant="apollo" size="sm" onClick={() => setSelectedChallenge(c)}>
                        Continue Challenge <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button variant="apollo" size="sm" onClick={() => enroll(c.id)}>
                        <Flame className="w-4 h-4 mr-1" /> Join Challenge
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardChallenges;
