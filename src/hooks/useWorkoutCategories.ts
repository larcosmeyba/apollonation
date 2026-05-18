import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkoutCategory {
  id: string;
  slug: string;
  name: string;
  thumbnail_url: string | null;
  sort_order: number;
  updated_at?: string;
}

export function useWorkoutCategories() {
  return useQuery({
    queryKey: ["workout-categories"],
    queryFn: async (): Promise<WorkoutCategory[]> => {
      const { data, error } = await supabase
        .from("workout_categories")
        .select("id, slug, name, thumbnail_url, sort_order, updated_at")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as WorkoutCategory[];
    },
    staleTime: 60 * 1000,
  });
}

/** Build a Record<name, thumbnail_url> map with cache-busting from updated_at. */
export function categoryImageMap(cats: WorkoutCategory[] | undefined) {
  const map: Record<string, string> = {};
  (cats ?? []).forEach((c) => {
    if (c.thumbnail_url) {
      const v = c.updated_at ? new Date(c.updated_at).getTime() : Date.now();
      map[c.name] = `${c.thumbnail_url}?v=${v}`;
    }
  });
  return map;
}
