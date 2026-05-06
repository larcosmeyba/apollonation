## "My Workouts" Module — Web-Only Build Plan

A new subscriber-facing tab for Apollo Reborn that generates personalized workout plans and guides users through sessions. Scoped to **web only** — gated from native iOS/Android shells until you approve mobile rollout.

---

### Web-Only Gating Strategy

We already have `isWeb()` / `isNative()` helpers in `src/lib/platform.ts`. The new tab and route will:
- Only render in the dashboard nav when `isWeb()` is true (mirrors how the Admin link is gated today).
- The `/dashboard/my-workouts` route will redirect native users to the existing `/dashboard/training` page.
- No Capacitor plugins, no IAP touchpoints — purely web React + Supabase.

This keeps native bundles untouched until you give the go-ahead.

---

### Build Order (matches your prompt — milestones to review between)

1. **Data model + seed (PAUSE FOR REVIEW)**
   - New tables: `mw_exercises`, `mw_plans`, `mw_plan_days`, `mw_plan_exercises`, `mw_set_logs`, `mw_questionnaire_responses`, `mw_trial_status`.
   - Seed 8 placeholder exercises (real schema, swap-friendly fake data).
   - RLS: users read/write only their own rows; exercise library readable by authenticated users.
   - **Stop here, show schema, wait for your OK before UI.**

2. **Onboarding questionnaire (Q1–Q7)**
   - One question per screen, progress bar, large tap cards, slide transitions.
   - Unrealistic-timeframe coaching message on Q3.
   - Auto-skip Q6 when "In a gym" is the only Q5 answer.

3. **Plan generation edge function + dashboard**
   - `generate-my-workout-plan` edge function (server-side logic).
   - Pulls exclusively from `mw_exercises`.
   - Dashboard: weekly strip, "Today's Workout" card, quick stats.

4. **Start Workout flow**
   - Per-exercise full-screen card, looping demo video, set logging (reps/weight/difficulty 1–10), rest timer ring, resume-in-progress.

5. **Coach prompt layer**
   - Bubble prompts based on difficulty signal, "Coach intensity" setting (More / Fewer / Silent).

6. **Rest day, history, end-of-workout summary**
   - PR badges, trend charts, tomorrow preview.

7. **Trial gating + paywall**
   - 2-day free trial tracked in `mw_trial_status`, post-trial upgrade screen pointing to existing `/subscribe`.

8. **Polish**
   - Motion, empty/loading/error states, accessibility.

---

### Technical Notes

- Stack: existing React + TS + Tailwind + Supabase. No new dependencies expected beyond what's installed.
- All tables prefixed `mw_` to avoid colliding with the existing `admin_exercises` / `admin_classes` library.
- Edge function follows project conventions: `verify_jwt = true`, `auth.getUser()` validation, Zod input parsing, esm.sh imports.
- Reuses existing design tokens in `index.css` — no new color system. Dark theme, current accent.
- Mobile-first responsive layout (browsers on phones), but not packaged into Capacitor builds.

---

### What I'll do first if you approve

Step 1 only: create the migration with the seven tables + RLS + 8 seed exercises, then stop and show you the schema for sign-off before any UI work.