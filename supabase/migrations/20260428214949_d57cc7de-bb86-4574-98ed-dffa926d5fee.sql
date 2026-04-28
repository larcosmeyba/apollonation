-- Extend free_usage with per-feature counters and viewed-recipe tracking
ALTER TABLE public.free_usage
  ADD COLUMN IF NOT EXISTS free_recipes_viewed_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_programs_used_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viewed_recipe_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Backfill recipe counter from legacy boolean flag
UPDATE public.free_usage
SET free_recipes_viewed_count = 1
WHERE free_recipe_used = true AND free_recipes_viewed_count = 0;