-- =============================================================================
-- PART 1: Recreate existing policies with TO authenticated
-- =============================================================================

-- ---- messages ----
DROP POLICY IF EXISTS "Admins can send messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients can update read status" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

CREATE POLICY "Admins can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Recipients can update read status" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view their own messages" ON public.messages
  FOR SELECT TO authenticated USING ((auth.uid() = sender_id) OR (auth.uid() = recipient_id));

-- ---- client_questionnaires ----
DROP POLICY IF EXISTS "Admins can manage all questionnaires" ON public.client_questionnaires;
DROP POLICY IF EXISTS "Users can insert their own questionnaires" ON public.client_questionnaires;
DROP POLICY IF EXISTS "Users can update their own questionnaires" ON public.client_questionnaires;
DROP POLICY IF EXISTS "Users can view their own questionnaires" ON public.client_questionnaires;

CREATE POLICY "Admins can manage all questionnaires" ON public.client_questionnaires
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own questionnaires" ON public.client_questionnaires
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own questionnaires" ON public.client_questionnaires
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own questionnaires" ON public.client_questionnaires
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---- nutrition_plans ----
DROP POLICY IF EXISTS "Admins can manage all nutrition plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Users can view their own nutrition plans" ON public.nutrition_plans;

CREATE POLICY "Admins can manage all nutrition plans" ON public.nutrition_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own nutrition plans" ON public.nutrition_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---- nutrition_plan_meals ----
DROP POLICY IF EXISTS "Admins can manage all plan meals" ON public.nutrition_plan_meals;
DROP POLICY IF EXISTS "Users can update their own plan meals" ON public.nutrition_plan_meals;
DROP POLICY IF EXISTS "Users can view their own plan meals" ON public.nutrition_plan_meals;

CREATE POLICY "Admins can manage all plan meals" ON public.nutrition_plan_meals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update their own plan meals" ON public.nutrition_plan_meals
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM nutrition_plans
    WHERE nutrition_plans.id = nutrition_plan_meals.plan_id
      AND nutrition_plans.user_id = auth.uid()
  ));
CREATE POLICY "Users can view their own plan meals" ON public.nutrition_plan_meals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM nutrition_plans
    WHERE nutrition_plans.id = nutrition_plan_meals.plan_id
      AND nutrition_plans.user_id = auth.uid()
  ));

-- ---- client_training_plans (already authenticated, no changes needed) ----

-- ---- body_metrics (already authenticated, no changes needed) ----

-- ---- progress_photos (already authenticated, no changes needed) ----

-- ---- profiles (already authenticated, no changes needed) ----

-- ---- macro_logs ----
DROP POLICY IF EXISTS "Admins can view all macro logs" ON public.macro_logs;
DROP POLICY IF EXISTS "Users can delete their own macro logs" ON public.macro_logs;
DROP POLICY IF EXISTS "Users can insert their own macro logs" ON public.macro_logs;
DROP POLICY IF EXISTS "Users can update their own macro logs" ON public.macro_logs;
DROP POLICY IF EXISTS "Users can view their own macro logs" ON public.macro_logs;

CREATE POLICY "Admins can view all macro logs" ON public.macro_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete their own macro logs" ON public.macro_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own macro logs" ON public.macro_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own macro logs" ON public.macro_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own macro logs" ON public.macro_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---- custom_activity_logs ----
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.custom_activity_logs;
DROP POLICY IF EXISTS "Users can delete their own activity logs" ON public.custom_activity_logs;
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.custom_activity_logs;
DROP POLICY IF EXISTS "Users can update their own activity logs" ON public.custom_activity_logs;
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.custom_activity_logs;

CREATE POLICY "Admins can view all activity logs" ON public.custom_activity_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete their own activity logs" ON public.custom_activity_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activity logs" ON public.custom_activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own activity logs" ON public.custom_activity_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own activity logs" ON public.custom_activity_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---- exercise_set_logs ----
DROP POLICY IF EXISTS "Admins can view all set logs" ON public.exercise_set_logs;
DROP POLICY IF EXISTS "Users can delete their own set logs" ON public.exercise_set_logs;
DROP POLICY IF EXISTS "Users can insert their own set logs" ON public.exercise_set_logs;
DROP POLICY IF EXISTS "Users can update their own set logs" ON public.exercise_set_logs;
DROP POLICY IF EXISTS "Users can view their own set logs" ON public.exercise_set_logs;

CREATE POLICY "Admins can view all set logs" ON public.exercise_set_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete their own set logs" ON public.exercise_set_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own set logs" ON public.exercise_set_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own set logs" ON public.exercise_set_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own set logs" ON public.exercise_set_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---- exercise_user_notes ----
DROP POLICY IF EXISTS "Admins can view all exercise notes" ON public.exercise_user_notes;
DROP POLICY IF EXISTS "Users can delete their own exercise notes" ON public.exercise_user_notes;
DROP POLICY IF EXISTS "Users can insert their own exercise notes" ON public.exercise_user_notes;
DROP POLICY IF EXISTS "Users can update their own exercise notes" ON public.exercise_user_notes;
DROP POLICY IF EXISTS "Users can view their own exercise notes" ON public.exercise_user_notes;

CREATE POLICY "Admins can view all exercise notes" ON public.exercise_user_notes
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can delete their own exercise notes" ON public.exercise_user_notes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exercise notes" ON public.exercise_user_notes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercise notes" ON public.exercise_user_notes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own exercise notes" ON public.exercise_user_notes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---- recovery_logs (already authenticated, no changes needed) ----

-- ---- food_spend_logs (already authenticated, no changes needed) ----

-- ---- challenge_checkins (already authenticated, no changes needed) ----

-- ---- challenge_enrollments (already authenticated, no changes needed) ----

-- ---- referral_codes (already authenticated, no changes needed) ----

-- ---- notifications (already authenticated, no changes needed) ----

-- ---- client_nutrition_profiles ----
DROP POLICY IF EXISTS "Admins can manage all nutrition profiles" ON public.client_nutrition_profiles;
DROP POLICY IF EXISTS "Users can view their own nutrition profile" ON public.client_nutrition_profiles;

CREATE POLICY "Admins can manage all nutrition profiles" ON public.client_nutrition_profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own nutrition profile" ON public.client_nutrition_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---- client_notes ----
DROP POLICY IF EXISTS "Admins can manage all client notes" ON public.client_notes;
CREATE POLICY "Admins can manage all client notes" ON public.client_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ---- exercises ----
DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Authenticated users can view exercises" ON public.exercises;

CREATE POLICY "Admins can delete exercises" ON public.exercises
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert exercises" ON public.exercises
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update exercises" ON public.exercises
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view exercises" ON public.exercises
  FOR SELECT TO authenticated USING (true);

-- ---- recipes ----
DROP POLICY IF EXISTS "Admins can delete recipes" ON public.recipes;
DROP POLICY IF EXISTS "Admins can insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Admins can update recipes" ON public.recipes;

CREATE POLICY "Admins can delete recipes" ON public.recipes
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert recipes" ON public.recipes
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update recipes" ON public.recipes
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================================================
-- PART 2: Fix rate_limits — service-role only
-- =============================================================================

DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- PART 3: Create coach_client_assignments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.coach_client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_user_id, client_user_id)
);

ALTER TABLE public.coach_client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own assignments" ON public.coach_client_assignments
  FOR SELECT TO authenticated
  USING (
    coach_user_id = auth.uid()
    OR client_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins manage assignments" ON public.coach_client_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_coach_assignments_coach
  ON public.coach_client_assignments(coach_user_id);
CREATE INDEX IF NOT EXISTS idx_coach_assignments_client
  ON public.coach_client_assignments(client_user_id);

-- =============================================================================
-- PART 4: Coach-scoped SELECT policies
-- =============================================================================

CREATE POLICY "Coach can view assigned client questionnaires"
  ON public.client_questionnaires
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments
    WHERE coach_user_id = auth.uid()
      AND client_user_id = client_questionnaires.user_id
  ));

CREATE POLICY "Coach can view assigned client nutrition plans"
  ON public.nutrition_plans
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments
    WHERE coach_user_id = auth.uid()
      AND client_user_id = nutrition_plans.user_id
  ));

CREATE POLICY "Coach can view assigned client training plans"
  ON public.client_training_plans
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments
    WHERE coach_user_id = auth.uid()
      AND client_user_id = client_training_plans.user_id
  ));

CREATE POLICY "Coach can view assigned client body metrics"
  ON public.body_metrics
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments
    WHERE coach_user_id = auth.uid()
      AND client_user_id = body_metrics.user_id
  ));

CREATE POLICY "Coach can view assigned client progress photos"
  ON public.progress_photos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments
    WHERE coach_user_id = auth.uid()
      AND client_user_id = progress_photos.user_id
  ));

CREATE POLICY "Coach can view assigned client macro logs"
  ON public.macro_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments
    WHERE coach_user_id = auth.uid()
      AND client_user_id = macro_logs.user_id
  ));

-- =============================================================================
-- PART 5: message_reports + user_blocks (Apple Guideline 1.2 / 4.7)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL,
  message_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users file their own reports" ON public.message_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "Users read their own reports" ON public.message_reports
  FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_message_reports_reporter
  ON public.message_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_message
  ON public.message_reports(message_id);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_user_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own blocks" ON public.user_blocks
  FOR ALL TO authenticated
  USING (blocker_user_id = auth.uid())
  WITH CHECK (blocker_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
  ON public.user_blocks(blocked_user_id);

-- =============================================================================
-- PART 6: Add SET search_path to SECURITY DEFINER functions missing it
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;