## Admin Panel Overhaul — Implementation Plan

Scope is large, so I'll ship in four sequential phases. Each phase is independently testable. I'll start Phase 1 immediately after approval and report back between phases.

---

### Phase 1 — Admin Dashboard Redesign

**Add**
- Signup line graph (last 14 days, daily count of non-test profiles)
- Unified Inbox card: unread messages + bug reports + contact requests + support tickets, each a quick link
- Upcoming Milestones panel: client birthdays this month + membership anniversaries (subscription start +1yr) + program completions in last 7d
- New Sign-Ups (last 7d) — full list with name/email/date/tier
- MRR card, Trial Users, Cancellations — pulled live from RevenueCat REST API via a new `revenuecat-stats` edge function (uses existing `REVENUECAT_SECRET_API_KEY`)
- Active Members, New Members This Week, Most Viewed On-Demand Classes (top 5 from `user_workout_completions`), Most Completed Programs (top 5 from `user_programs` where status=completed)

**Remove**
- "Client Overview" stats grid (Total Clients / Active Today / Workouts Done / New Signups) — replaced by the new metrics above

**Keep**
- Recent Clients, Quick Access tools, Alerts

**Files:** rewrite `AdminDashboardHome.tsx`, new `supabase/functions/revenuecat-stats/index.ts`, add `birthday DATE` column to profiles (nullable).

---

### Phase 2 — Clients + Intake

- Remove "Frozen" status everywhere (filters, badges, status enums in UI). Statuses become: Active, Canceled, Archived.
- Auto-archive on RevenueCat cancellation webhook (`revenuecat-webhook` already exists — extend to flip `account_status='archived'` on CANCELLATION / EXPIRATION events).
- Add **required** phone number step to onboarding questionnaire (`Questionnaire.tsx` + `user_fitness_profile.phone_number` column with validation).
- Full client roster view already exists in `AdminClientList` — add phone column + birthday + filter by status (Active/Canceled/Archived only).
- Client profile additions: phone, birthday, join date, programs assigned count, notes (already exists).

---

### Phase 3 — Exercise Library Categories

- `admin_exercises.category` enum already exists. Add `"cycling"` to `ExerciseCategory` type + DB enum.
- Add category filter chips to the admin exercise library view (`AdminClassBuilder.tsx` exercise picker).
- Display category badge on each exercise card.

---

### Phase 4 — Class Builder Upgrades

- Filter exercise picker by category (8 chips: Strength/Sculpt/Cardio/Stretch/Recovery/Cycling/HIIT/Beginner)
- Search exercises by name (debounced input)
- Save class as template → new `admin_class_templates` row (table exists with 8 cols, currently 1 policy — verify schema fits)
- "Load from template" picker in class builder
- Export class to computer: download as JSON file (exercise list + metadata + Mux playback IDs) via a "Download" button

---

### Out of scope for this batch (separate follow-ups)
- Birthday/anniversary push notifications (just shown on dashboard for now)
- Trial Users requires RevenueCat introductory pricing events — will surface if data is available, else hide the card

---

### Technical notes
- RevenueCat REST: `GET https://api.revenuecat.com/v1/subscribers/{app_user_id}` is per-user. For aggregate MRR I'll use `GET https://api.revenuecat.com/v2/projects/{project_id}/metrics/overview` (Charts API). If the existing key lacks Charts API scope, the card shows "Connect Charts API" with instructions instead of failing silently.
- Migrations needed: add `birthday DATE` to profiles, add `phone_number TEXT` to `user_fitness_profile`, add `'cycling'` to exercise category enum (if PG enum) or just use TEXT.

Ready to start Phase 1 on approval.