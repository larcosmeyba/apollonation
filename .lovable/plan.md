# Success Blueprints — Implementation Plan

A new PDF-based learning library inside Apollo Reborn. Members browse, view, and download premium fitness/nutrition/recovery guides. Marcos manages everything from the admin panel.

## 1. Database & Storage

**New table `blueprints`:**
- `title`, `description`, `category` (text), `cover_image_url`, `pdf_path` (storage key), `read_time_minutes` (int), `goal_tags` (text[] — for future recommendations), `is_published` (bool), `is_archived` (bool), `sort_order`, `created_at`, `updated_at`.

**New table `blueprint_analytics`:**
- `blueprint_id`, `user_id`, `event_type` ('view' | 'download'), `created_at`.
- Used for view/download counts and "Most Popular" stat on admin dashboard.

**RLS:**
- `blueprints`: public read of published+non-archived to `authenticated`; full CRUD restricted to `admin` role via `has_role()`.
- `blueprint_analytics`: insert allowed for authenticated users (own user_id only); admin can select all.

**Storage buckets (both private, signed-URL access):**
- `blueprint-pdfs` — PDF files
- `blueprint-covers` — cover images
- RLS on `storage.objects`: authenticated can SELECT; only admins INSERT/UPDATE/DELETE.

## 2. Client Experience

**Navigation:** Add "Blueprints" link to `DashboardSidebar.tsx` secondary nav (BookOpen icon) and to `DashboardBottomTabs` overflow/menu.

**New routes:**
- `/dashboard/blueprints` — `DashboardBlueprints.tsx`: card grid with category filter chips, search. Each card shows cover image, title, category badge, description, read-time, and **View** + **Download** buttons.
- `/dashboard/blueprints/:id` — `DashboardBlueprintViewer.tsx`: in-app PDF viewer using browser-native `<iframe src={signedPdfUrl}>` (works on iOS/Android via Capacitor WebView). Download button triggers analytics event + opens signed URL.

**Analytics:** insert into `blueprint_analytics` on view and on download (fire-and-forget).

**Premium look:** dark graphite cards matching existing aesthetic, subtle gradient overlays on covers, category color accents.

## 3. Admin Experience

**New `AdminBlueprints.tsx`** tab in `AdminLayout` (BookOpen icon, slotted near Blog).
- Table/grid of all blueprints with cover thumbnail, title, category, published toggle, view count, download count.
- "New Blueprint" dialog: title, description, category dropdown (Muscle Building, Fat Loss, Nutrition, Recovery, Cardio, Mindset, Progressive Overload, General Health), read-time, goal tags (multi-select), cover image upload, PDF upload.
- Edit, Archive, Delete actions.
- Top stats row: Total Blueprints, Total Views, Total Downloads, Most Popular.

Register tab in `AdminDashboard.tsx` switch.

## 4. Future Recommendation Hook (not built now, schema-ready)

`goal_tags` on blueprints lets us later query `WHERE 'build_muscle' = ANY(goal_tags)` based on `user_fitness_profile.primary_goal`. No code shipped this round — just schema.

## Technical Notes

- PDFs served via Supabase signed URLs (1-hour expiry) using existing `useSignedUrl` hook pattern.
- iOS/Android: `<iframe>` works inside Capacitor WebView for PDFs; fallback "Open in browser" link if rendering fails.
- No edge functions needed — direct table + storage access with RLS is sufficient.
- Analytics counts computed via aggregate queries on `blueprint_analytics` (small scale; can add materialized view later if needed).

## Out of Scope

- Goal-based auto-recommendations (schema ready, UI later).
- Per-user completion tracking (noted as future).
- PDF text search / annotations.

Approve and I'll build phases 1–3 in one pass.
