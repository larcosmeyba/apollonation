---
name: Mux-only exercise pool
description: All workout generators select only admin_exercises rows with mux_playback_id; never outsource video URLs
type: constraint
---
Every workout generator (v2 engine + legacy LLM generators: generate-training-plan, auto-generate-programs, generate-daily-workout, enroll-program, suggest-exercise-swap) MUST query `admin_exercises` filtered by `mux_playback_id IS NOT NULL`. The legacy `exercises` table is deprecated for selection — do not reintroduce it. Programs are built around the in-house Mux library only; no YouTube, no external URLs, no exercises without a playback id.

**Why:** App must only play videos we own/host in Mux. Any exercise without a Mux clip cannot be surfaced in a program.

**Recovery program:** A standalone 7-day Recovery Reset lives at `/dashboard/recovery-program` (curation in `src/data/recoveryProgram.ts`), composed from `admin_exercises` where `is_recovery=true OR is_cooldown=true` AND `mux_playback_id IS NOT NULL`. Daily curation is keyword-matched at runtime against the live Mux pool.
