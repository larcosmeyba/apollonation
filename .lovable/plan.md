
# Apollo Reborn — Admin: Exercise Library + Workout Builder (Phase 1)

Based on your answers: **web admin only**, **no MP4 export**, **trim-to-loop in player**, **MUX stitching deferred**. This phase ships a production-ready library + builder you can use to produce classes immediately. The client app plays the resulting class live (MUX clips + timers + overlays) — no offline render needed.

## What you get this phase

1. **Exercise Library** — CRUD for exercises with MUX playback IDs, full taxonomy, loop in/out points, and a preview player.
2. **On-Demand Class Builder** — Drag-and-drop class composer that pulls from the library, with per-block timer/rest/cues/alternates and a live preview.
3. **AI Class Generator** — Lovable AI (Gemini 2.5) auto-sequences a class from your library given duration + style + equipment.
4. **Cinematic class player** — Reusable Apollo intro, exercise screen with timer / next-up / cues / weight & tempo prompts, split-screen alternate view, seamless loop via in/out trim points.

What's deferred to phase 2: MP4 export through MUX stitched assets, AI motion-matched looping, coach-created classes.

## Data model (new tables)

- `admin_exercises` — name, mux_playback_id, mux_asset_id, thumbnail_url, orientation (`horizontal`/`vertical`), muscle_group, equipment[], difficulty, movement_type, alternative_exercise_id (FK self), coaching_notes, weight_recommendation, tempo_recommendation, loop_in_seconds, loop_out_seconds, tags[]
- `admin_classes` — title, description, duration_minutes (15/20/30), class_type (strength/sculpt/hiit/cycling/recovery/beginner), equipment[], difficulty, status (draft/published), cover_image_url, intro_enabled
- `admin_class_blocks` — class_id, sort_order, kind (`exercise`/`rest`/`transition`), exercise_id (FK), work_seconds, rest_seconds, sets, set_rest_seconds, cue_overrides (text), weight_prompt, tempo_prompt, drop_set (bool), alt_exercise_id (FK)
- `admin_class_templates` — saved class scaffolds for reuse

All admin-only RLS (`has_role(auth.uid(),'admin')`). Authenticated users can `SELECT` published classes + their referenced exercises.

## Admin UI (extends `AdminDashboard`)

Two new tabs added to the existing admin sidebar:

- **Exercise Library** (`AdminExerciseLibrary.tsx`)
  - Grid of exercise cards: thumbnail, MUX preview on hover, title, tag chips
  - Filters: muscle group, equipment, difficulty, movement type, orientation
  - Add/Edit sheet: paste MUX playback ID → auto-fetch thumbnail, set in/out loop points by scrubbing, fill metadata, link alternative exercise
- **On-Demand Builder** (`AdminClassBuilder.tsx`)
  - Left rail: filtered library (horizontal-only when building)
  - Center: drag-to-add timeline of blocks with inline edit (work / rest / cues / weight / tempo / drop set / alt)
  - Right: settings panel (duration, type, equipment, intro on/off) + **AI Generate** button
  - **Preview** button → opens cinematic player in a modal

## AI Generate (edge function `generate-ondemand-class`)

Inputs: duration, class_type, equipment, target difficulty, available exercise IDs (horizontal only).
Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a strict JSON schema returning ordered blocks, work/rest, sets, cue and tempo prompts. Result populates the builder timeline (you can edit before saving).

## Cinematic player (`OnDemandClassPlayer.tsx`)

Reusable for both admin preview and client playback. Sequence:

```
[Apollo Intro clip]  →  [Exercise screen × N]  →  [Outro card]
```

Exercise screen:
- MUX HLS video (looped between `loop_in_seconds`/`loop_out_seconds` with crossfade — pure JS via two stacked `<video>` elements)
- Top: exercise name + set indicator
- Center-right: large countdown timer + rest timer when active
- Bottom-left: coaching cue / weight / tempo prompt rotation
- Bottom-right: "Next: [exercise]" preview thumbnail
- Toggle button → split-screen with alternative exercise (50/50 layout)

Dark cinematic look, Apollo brand colors, large heading typography, framer-motion fades between blocks.

## Technical notes

- MUX clips are referenced by `playback_id` only (you already host on MUX). Player URL: `https://stream.mux.com/{playback_id}.m3u8`. Thumbnails: `https://image.mux.com/{playback_id}/thumbnail.jpg`.
- Loop blending: two `<video>` elements, swap and crossfade 200ms before `loop_out_seconds`. No FFmpeg needed.
- Apollo intro: store one MUX playback ID in a `system_settings` row or env constant; reused across all classes.
- Workout JSON saved to `admin_classes` + `admin_class_blocks` is the single source of truth. The current client "On-Demand Classes" feature can be migrated to read from this in a follow-up.
- All new admin pages are gated by existing `AdminRoute` + `isNative()` redirect — App Store binary unaffected.

## Out of scope (call out before starting Phase 2)

- MP4 rendering / download — needs MUX stitched assets API or Shotstack
- Auto-caption overlays
- Coach-created classes (non-admin)
- True AI motion-loop blending
