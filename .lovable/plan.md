# Fuel/Nutrition Questionnaire — Unified Profile Refactor

## Current state (what we found)

There are **three** overlapping intake tables today:

- `client_questionnaires` — Apollo onboarding (sex, age, height, weight, activity, training, goal, dietary restrictions, food budget, disliked foods, injuries, equipment).
- `client_nutrition_questionnaires` — Fuel intake (weight, height, age, gender, activity, goal, meals/day, dietary prefs, allergies, budget, **calorie/protein/carb/fat targets**).
- `coach_intake_responses` — Coach-only (biggest goal, why coaching, struggles, commitment).

They re-ask weight/height/age/gender/goal/activity in two places, and `client_nutrition_questionnaires.user_id` is `UNIQUE` so a single missing field forces the full Fuel form again. Many downstream edge functions (`generate-meal-plan`, `generate-training-plan`, `auto-generate-programs`, `weekly-meal-plan-refresh`, `client-regenerate-meal-plan`, `suggest-meal-swap`, `coach-ai-command`, `apply-budget-to-grocery-list`) read from these tables directly.

## Strategy: one master profile, no big-bang rewrites

Build a single **`user_fitness_profile`** as the master record. Keep the existing tables (do not drop) so legacy generators keep working, and **mirror writes** from the master profile into them via a database trigger. New code reads only from `user_fitness_profile`; old code keeps working unchanged.

This avoids rewriting 8+ edge functions in this pass.

---

## 1. New table

`public.user_fitness_profile` (one row per user, `user_id UNIQUE`):

Core identity: `height_inches`, `weight_lbs`, `age`, `sex`, `goal_weight_lbs`
Goals & activity: `primary_goal`, `activity_level`, `training_experience`, `training_days_per_week`, `preferred_training_days[]`, `workout_duration_minutes`, `equipment_available[]`, `workout_environment`
Nutrition: `dietary_preferences[]`, `allergies[]`, `disliked_foods[]`, `meals_per_day`, `nutrition_goal`, `calorie_target`, `protein_target_g`, `carb_target_g`, `fat_target_g`, `weekly_food_budget`, `grocery_store`
Coach: `injuries`, `coach_notes`, `progress_photo_urls[]`
Flags: `onboarding_completed`, `nutrition_completed`, `coaching_intake_completed`
Audit: `created_at`, `updated_at`

RLS: owner-only manage + admin SELECT. GRANTs to `authenticated` + `service_role`. `updated_at` trigger.

## 2. Data backfill (one migration)

Upsert into `user_fitness_profile` from `client_questionnaires` (most recent active) + `client_nutrition_questionnaires` so existing users skip re-asking. Mark `onboarding_completed=true` where a client_questionnaire exists, `nutrition_completed=true` where macros are present, `coaching_intake_completed=true` where a `coach_intake_responses.completed_at` exists.

## 3. Sync triggers (compatibility layer)

`AFTER INSERT/UPDATE ON user_fitness_profile` → `UPSERT` matching columns into `client_questionnaires` and `client_nutrition_questionnaires`. Mirror only the shared fields; never overwrite fields the legacy table owns exclusively (e.g. `cycle_start_date`). Keeps every existing edge function working without code changes.

## 4. New hook + helpers

- `src/hooks/useFitnessProfile.ts` — single source of truth React hook: `{ profile, loading, save, completion }`. Used by all questionnaires.
- `getMissingNutritionFields(profile)` / `getMissingCoachFields(profile)` helpers in `src/lib/fitnessProfile.ts` — drives "only ask missing questions" logic.

## 5. Questionnaire flow changes (frontend)

- **First-time onboarding** (`src/pages/Questionnaire.tsx`) — saves into `user_fitness_profile` (then mirror trigger fills legacy tables). Sets `onboarding_completed=true`. Skip entire page if flag already true (redirect to dashboard).
- **Fuel intake** (`src/pages/DashboardNutritionSetup.tsx`) — preload from `useFitnessProfile`. Build the question list dynamically from `getMissingNutritionFields()`. If nothing missing, redirect straight to `/dashboard/nutrition` and set `nutrition_completed=true`. If only meals/day + allergies + disliked foods are missing, ask only those — never re-ask weight/height/age/gender/goal/activity.
- **Coach intake** (`src/components/dashboard/CoachIntakeQuestionnaire.tsx`) — preload profile. Hide identity/goal/activity questions when present. Ask only: injuries, equipment, training days, preferred time, biggest struggle, optional progress photos, optional coach notes. Sets `coaching_intake_completed=true`.
- **Recalc on edit** — when `weight_lbs` / `primary_goal` / `activity_level` change, call existing `useMacroTargets` to recompute calorie/macro targets and write them back.

## 6. Question-firing audit

Sweep the three questionnaire components for the issues you described:

- Confirm every step has a stable unique `id` and writes to the correct column.
- Disable Next when required answers are empty (already partly done — verify each step).
- Surface save errors via `toast` instead of silent catches (current code swallows some errors).
- Persist in-progress answers to `localStorage` keyed by user so a refresh restores them.
- Conditional questions: ensure follow-ups only render when their parent has the matching value (e.g. `allergies_other` only when `allergies` includes `'other'`).

---

## Out of scope (this pass)

- Rewriting edge functions to read from `user_fitness_profile` (the sync trigger keeps them green; we can migrate them in a follow-up).
- Dropping `client_questionnaires` / `client_nutrition_questionnaires` (kept for legacy reads + admin views).
- Coach profile UI redesign.

---

## Risks & mitigations

- **Trigger loop**: trigger only fires on `user_fitness_profile`; legacy writes stay one-way (legacy → master only via the backfill migration, not on every write).
- **Backfill conflicts**: use `ON CONFLICT (user_id) DO UPDATE` and only set columns that are non-null in the source.
- **Existing in-flight forms**: keep submit paths writing to legacy tables as a fallback for one release cycle so nothing breaks if a client has the old JS cached.

---

Reply "go" and I'll ship the migration first (you'll get a separate SQL approval), then the hook + the three questionnaire updates.
