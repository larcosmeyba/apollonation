-- Remove duplicates if any exist before creating the unique constraint
delete from public.exercise_set_logs a
using public.exercise_set_logs b
where a.id < b.id
  and a.user_id = b.user_id
  and a.training_plan_exercise_id = b.training_plan_exercise_id
  and a.log_date = b.log_date
  and a.set_number = b.set_number;

alter table public.exercise_set_logs
  add constraint exercise_set_logs_user_ex_date_set_unique
  unique (user_id, training_plan_exercise_id, log_date, set_number);