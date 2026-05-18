import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkoutCategory {
  id: string;
  slug: string;
  name: string;
  thumbnail_url: string | null;
  sort_order: number;
}

export function useWorkoutCategories() {
  return useQuery({
    queryKey: ["workout-categories"],
    queryFn: async (): Promise<WorkoutCategory[]> => {
      const { data, error } = await supabase
        .from("workout_categories")
        .select("id, slug, name, thumbnail_url, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as WorkoutCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Build a Record<name, thumbnail_url> map (cache-busted) from a category list. */
export function categoryImageMap(cats: WorkoutCategory[] | undefined) {
  const map: Record<string, string> = {};
  (cats ?? []).forEach((c) => {
    if (c.thumbnail_url) map[c.name] = c.thumbnail_url;
  });
  return map;
}
