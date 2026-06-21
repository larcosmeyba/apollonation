import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import OnDemandClassPlayer, { type PlayerBlock } from "@/components/admin/library/OnDemandClassPlayer";
import type { AdminExercise } from "@/components/admin/library/exerciseTypes";

const SECTION_ORDER: Record<string, number> = {
  warmup: 0, workout_a: 1, workout_b: 2, workout_c: 3, cooldown: 4,
};

const AdminClassPlayerLauncher = ({
  classId,
  title,
  onClose,
}: {
  classId: string;
  title: string;
  onClose: () => void;
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-class-blocks", classId],
    queryFn: async () => {
      const { data: blocks, error: bErr } = await supabase
        .from("admin_class_blocks")
        .select(
          "*, exercise:admin_exercises!admin_class_blocks_exercise_id_fkey(*), alt:admin_exercises!admin_class_blocks_alt_exercise_id_fkey(*)"
        )
        .eq("class_id", classId);
      if (bErr) throw bErr;
      return (blocks || []).slice().sort((a: any, b: any) => {
        const sa = SECTION_ORDER[a.section] ?? 99;
        const sb = SECTION_ORDER[b.section] ?? 99;
        if (sa !== sb) return sa - sb;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }
  if (error || !data || data.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white gap-4 p-6 text-center">
        <p className="text-lg font-bold">This class has no blocks yet</p>
        <p className="text-sm text-white/70">
          An admin needs to add exercises to it before it can be played.
        </p>
        <button onClick={onClose} className="mt-2 px-4 py-2 rounded-lg bg-white text-black font-semibold">
          Close
        </button>
      </div>
    );
  }

  const playerBlocks: PlayerBlock[] = data.map((b: any) => ({
    exercise: (b.exercise || null) as AdminExercise | null,
    alt: (b.alt || null) as AdminExercise | null,
    work_seconds: b.work_seconds,
    rest_seconds: b.rest_seconds,
    sets: b.sets,
    set_rest_seconds: b.set_rest_seconds,
    cue_overrides: b.cue_overrides,
    weight_prompt: b.weight_prompt,
    tempo_prompt: b.tempo_prompt,
    drop_set: b.drop_set,
    section: b.section,
    target_reps_min: b.target_reps_min,
    target_reps_max: b.target_reps_max,
    progression_cue: b.progression_cue,
  }));

  return <OnDemandClassPlayer title={title} blocks={playerBlocks} onClose={onClose} allowSkip={false} />;
};

export default AdminClassPlayerLauncher;
