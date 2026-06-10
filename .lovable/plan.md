
# Fix plan — nutrition v2 + workout blueprint rotation + suggested_load

## Step 0 — Restore live nutrition path immediately
- Flip `NUTRITION_GENERATOR_V2` → `false` (requires you to confirm the secret update in the form I'll open). All live users return to the working legacy Gemini path while v2 is being fixed.

## Step 1 — Fix v2 meal plan persistence (#3 + #4)
**Edge function `generate-meal-plan`:**
- Replace `supabaseClient.auth.getClaims(token)` (deprecated, source of the 500) with `supabaseAdmin.auth.getUser(token)` — same pattern already used by `auto-generate-programs`. `adminId = userData.user.id`.

**Schema migration (`nutrition_plan_meals` + log):**
- `ALTER TABLE public.nutrition_plan_meals ADD COLUMN meal_id text` (nullable text — `meal_library.meal_code` is a code, not a uuid; nullable so legacy AI rows remain valid). Index on `(plan_id, meal_id)`.
- Confirm `meal_plan_generation_log` has the columns we need (`user_id`, `plan_id`, `generator_version`, `needs_review`, `gap_reason`, `meal_count`, `created_at`). Add any missing.
- Ensure GRANTs on both for `authenticated` + `service_role`.

**Edge function wiring:**
- In the v2 branch of `generate-meal-plan` and `weekly-meal-plan-refresh`, stop stripping `meal_id` — write `meal.meal_id` (the `meal_code` from the engine) into the inserted row.
- After a successful insert, INSERT one row into `meal_plan_generation_log` with `{ user_id, plan_id, generator_version: 'v2', needs_review, gap_reason, meal_count: allMeals.length }`.

**Verify (real client path):**
- Test user signs in; mint a short-lived JWT via service role; POST to `generate-meal-plan` over HTTPS with v2 forced via `x-nutrition-generator: v2` header.
- Show the inserted `nutrition_plans` row, a sample of `nutrition_plan_meals` with non-null `meal_id`s that resolve in `meal_library`, and the `meal_plan_generation_log` row.
- Only after this passes: flip `NUTRITION_GENERATOR_V2` back to `true`.

## Step 2 — Fix program slug + blueprint rotation (#2)
In `supabase/functions/_shared/workout-engine.ts`:
- `assignProgramSlug(profile)`: `Gym + Muscle Gain` → `gym_muscle_build` (currently mapping to `gym_upper_body`). Add explicit mapping table covering all goal × location combos used in W1–W15.
- `dayPlan(programSlug, dayIndex, daysPerWeek)`: instead of picking the first blueprint that matches the slug, build the week's split from the slug's full blueprint pool. For a 4-day `gym_muscle_build`, rotate `Upper / Lower / Push+Pull / Legs` (or `Upper / Lower / Upper / Lower`) so each session is unique and no two heavy-leg days sit back-to-back. Audit `session_blueprints` rows and seed any missing day_types for the slugs the matrix exercises.

Re-run W1–W15 against `auto-generate-programs` for a fresh test user; produce PASS/FAIL table + one full 4-week trace (slot → exercise_id → mux_playback_id → .m3u8) confirming W9 (leg-day spacing) is a true PASS.

## Step 3 — Persist `suggested_load` (#1)
- Migration: `ALTER TABLE public.training_plan_exercises ADD COLUMN suggested_load text` (nullable; engine emits strings like `"+5lb"` or `"-40% deload"`).
- `sessionToRows` in `_shared/v2-workout-runner.ts`: add `suggested_load: slot.suggested_load ?? null` to the mapped row.
- Re-run the same W1–W15 trace; show W6 progression deltas (W1→W2→W3 increase, W4 −40% deload) reading directly from the persisted column.

## What you need to do
1. Approve this plan.
2. When the secret form appears at Step 0, set `NUTRITION_GENERATOR_V2=false`.
3. After I verify Step 1 end-to-end, I'll prompt you to set it back to `true`.

## Deliverables (in this order)
- (after Step 1) Nutrition plan trace: plan row + meals with `meal_id` FKs + `meal_plan_generation_log` row.
- (after Step 2) W1–W15 PASS/FAIL table + traced 4-week program with rotation + leg-day spacing.
- (after Step 3) W6 row flips to PASS with `suggested_load` values read back from the DB.
