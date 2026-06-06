# My Plan — Program-Driven Training System

The screenshot is `src/pages/DashboardTraining.tsx` (the "Programs / Structured training programs" view behind the `My Plan` tab). Today it pulls from `client_training_plans` and renders weeks but has no real program enrollment, completion, swap, manual logging, or Health writeback. We'll evolve it into a true guided program experience while keeping the current Apollo aesthetic and section order from the screenshot.

---

## Sections on the page (order preserved)

1. **Header** — `Programs` / `Structured training programs` + `+ Log Activity` button (top-right).
2. **Week calendar** — Mon–Sun strip with prev/next arrows, status dots (completed ✓, today highlighted card, upcoming, missed).
3. **Program progress card** — Program name, `Week X of Y`, `N / Total Workouts Completed`, `%`, progress bar.
4. **Today's Workout card** — Day label, focus muscles, duration, type, `Start Workout` CTA.
5. **This Week** — Remaining upcoming workouts with `tap ⇄ to swap` action per row.

Empty state (no active program): show "Choose Your First Program" with a `Browse Programs` CTA → existing `Programs` library route.

---

## Behavior

- **Start Workout** → opens existing workout player route (`/dashboard/workout/:id`) with the program workout id; on completion, marks `user_workout_completions`, recomputes progress, advances `current_week` / `current_day` on `user_programs`, refreshes the calendar + Today + This Week, and (iOS only) writes `Calories Burned / Duration / Type` to Apple Health via existing `useAppleHealth` hook.
- **Calendar tap** → opens a `WorkoutPreviewSheet` (name, exercises, duration, equipment, `Start Workout`).
- **Swap (⇄ on a This-Week row)** → opens `SwapWorkoutSheet` with categories (Strength, HIIT, Cardio, Pilates, Mobility, Recovery). Server picks an equivalent workout matching same duration band ±10 min, same difficulty, same training day; sets `user_program_workouts.is_swapped = true` and `swapped_workout_id`.
- **+ Log Activity** → opens `LogActivitySheet` (type, duration, calories, notes). Inserts into `user_activity_logs` (does NOT mark scheduled workout complete). Surfaces on Home dashboard activity feed.
- **Success screen** after completion: "Workout Completed / X Minutes Logged / Progress Updated", then auto-returns to My Plan.

---

## Backend (new tables)

We already have `programs`, `client_training_plans`, `training_plan_days`, `training_plan_exercises`, `workouts`, `workout_session_logs`. We'll add the program-enrollment + completion + manual-log layer:

- **`user_programs`** — `id, user_id, program_id, current_week, current_day, started_at, completed_at, progress_percent, status ('active'|'completed'|'paused')`. Unique partial index ensures only one `active` per user.
- **`program_workouts`** — `id, program_id, week_number, day_number, workout_id, duration_minutes, focus (text[]), type`. (Seeded from existing `training_plan_days` / `training_plan_exercises` for the user's plan, or authored per program.)
- **`user_program_workouts`** — per-user override row: `id, user_id, user_program_id, program_workout_id, scheduled_date, is_swapped, swapped_workout_id, status ('upcoming'|'completed'|'missed')`.
- **`user_workout_completions`** — `id, user_id, workout_id, user_program_workout_id, completed_at, duration_minutes, calories`.
- **`user_activity_logs`** — `id, user_id, activity_type, duration_minutes, calories, notes, logged_at`.

All tables: RLS scoped to `auth.uid() = user_id`, GRANTs to `authenticated` + `service_role`, `updated_at` trigger where applicable. `program_workouts` is readable by `authenticated`.

**RPCs (security definer):**
- `enroll_in_program(p_program_id uuid)` → creates `user_programs` row + materializes `user_program_workouts` with `scheduled_date` from `started_at`.
- `complete_program_workout(p_user_program_workout_id uuid, p_duration int, p_calories int)` → inserts completion, marks row completed, advances `current_week/current_day`, recomputes `progress_percent`, marks program `completed` when 100%.
- `swap_program_workout(p_user_program_workout_id uuid, p_category text)` → picks an eligible `workouts` row (same difficulty, duration ±10, same day-of-week), stores swap.

---

## Frontend changes

- Refactor `src/pages/DashboardTraining.tsx` into composed pieces:
  - `components/dashboard/plan/ProgramHeader.tsx` (+ Log Activity button)
  - `components/dashboard/plan/WeekCalendarStrip.tsx`
  - `components/dashboard/plan/ProgramProgressCard.tsx`
  - `components/dashboard/plan/TodaysWorkoutCard.tsx`
  - `components/dashboard/plan/ThisWeekList.tsx`
  - `components/dashboard/plan/WorkoutPreviewSheet.tsx`
  - `components/dashboard/plan/SwapWorkoutSheet.tsx`
  - `components/dashboard/plan/LogActivitySheet.tsx`
  - `components/dashboard/plan/WorkoutCompleteOverlay.tsx`
- New hook `src/hooks/useActiveProgram.ts` — fetches `user_programs` + derived `program_workouts` and exposes `today`, `thisWeek`, `progress`, `completeWorkout`, `swapWorkout`.
- Hook into workout player: on completion call `complete_program_workout` and (iOS) `useAppleHealth.writeWorkout({ type, duration, calories })` — add this method to the existing hook (no-op on web/Android).
- Empty state component when `useActiveProgram` returns null → CTA to `/dashboard/programs`.

Aesthetic stays identical: pure black bg, graphite cards, gold accents, uppercase tracked labels. No restructure of the tab nav or header.

---

## Out of scope
- Authoring UI for program weeks/days (admin can seed via SQL for now).
- Group programs / shared cohorts.
- Stripe/IAP changes.

## Approval needed
Reply "go" and I'll ship the migration first (you'll get a separate approval prompt for the SQL), then the frontend + workout-player hook-in.
