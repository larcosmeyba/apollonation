DO $$
DECLARE
  uids uuid[] := ARRAY['4b189f33-0ecd-4f3a-9f43-a042444b7b38'::uuid, '93c0865d-f389-4f38-a003-3c80cfbae43d'::uuid];
  uid uuid;
  tbl text;
  user_tables text[] := ARRAY[
    'client_questionnaires','client_nutrition_questionnaires','client_nutrition_profiles',
    'nutrition_plan_meals','nutrition_plans','client_training_plans','training_plan_days','training_plan_exercises',
    'body_metrics','progress_photos','macro_logs','step_logs','health_data_logs','health_connection_status',
    'recovery_logs','workout_session_logs','exercise_set_logs','exercise_user_notes','user_workout_completions',
    'user_program_workouts','user_programs','user_workout_progress','user_favorites','user_achievements',
    'custom_activity_logs','user_activity_logs','workout_recommendations','user_fitness_profile',
    'user_macro_targets','user_food_budgets','food_spend_logs','grocery_item_states','meal_plan_generation_log',
    'mw_questionnaire_responses','mw_plans','mw_plan_days','mw_plan_exercises','mw_set_logs','mw_trial_status',
    'challenge_checkins','challenge_enrollments','notifications','push_tokens','user_notification_preferences',
    'user_privacy_preferences','free_usage','client_notes','coach_insights','coach_intake_responses',
    'support_tickets','contact_requests','referral_codes','referral_tracking','openai_request_logs',
    'email_send_log','email_send_state','email_unsubscribe_tokens','message_email_state','message_reports',
    'admin_audit_log'
  ];
BEGIN
  FOREACH uid IN ARRAY uids LOOP
    -- messages (sender or recipient)
    DELETE FROM public.messages WHERE sender_id = uid OR recipient_id = uid;
    -- coach assignments
    DELETE FROM public.coach_client_assignments WHERE client_user_id = uid OR coach_user_id = uid;
    -- blocks
    DELETE FROM public.user_blocks WHERE blocker_user_id = uid OR blocked_user_id = uid;
    -- message reports (reporter)
    DELETE FROM public.message_reports WHERE reporter_user_id = uid;
    -- admin audit log (target)
    DELETE FROM public.admin_audit_log WHERE target_user_id = uid OR admin_user_id = uid;

    FOREACH tbl IN ARRAY user_tables LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', tbl) USING uid;
      EXCEPTION WHEN undefined_column OR undefined_table THEN NULL;
      END;
    END LOOP;

    DELETE FROM public.user_roles WHERE user_id = uid;
    DELETE FROM public.profiles WHERE user_id = uid;
    DELETE FROM auth.users WHERE id = uid;
  END LOOP;
END $$;