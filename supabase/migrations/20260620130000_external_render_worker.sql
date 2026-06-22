-- ============================================================
-- External render worker support
-- The FFmpeg worker (Railway) produces ONE finished MP4, stores it
-- in Cloudflare R2 with a 24h lifecycle, and writes the temp download
-- URL back to render_jobs. Nothing is permanently stored in Supabase.
-- After download, the admin uploads to Mux and pastes the playback id
-- back onto the class (admin_classes.mux_playback_id).
-- Additive only.
-- ============================================================

ALTER TABLE public.render_jobs
  -- when the temporary R2 download URL stops working (set by the worker)
  ADD COLUMN IF NOT EXISTS expires_at    timestamptz,
  -- 'mux' = legacy Mux input-stitching path; 'ffmpeg' = external worker
  ADD COLUMN IF NOT EXISTS render_engine text NOT NULL DEFAULT 'mux';

-- The finished, manually-uploaded Mux video for a published class.
ALTER TABLE public.admin_classes
  ADD COLUMN IF NOT EXISTS mux_playback_id text;
