
-- Per-user grocery checkbox state
CREATE TABLE public.grocery_item_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  week_number int NOT NULL,
  item_key text NOT NULL,
  already_have boolean NOT NULL DEFAULT false,
  purchased boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id, week_number, item_key)
);

ALTER TABLE public.grocery_item_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own grocery item states"
  ON public.grocery_item_states FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all grocery item states"
  ON public.grocery_item_states FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_grocery_item_states_updated_at
  BEFORE UPDATE ON public.grocery_item_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_grocery_item_states_lookup
  ON public.grocery_item_states (user_id, plan_id, week_number);

-- Per-user weekly food budget
CREATE TABLE public.user_food_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  weekly_budget numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_food_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own food budget"
  ON public.user_food_budgets FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all food budgets"
  ON public.user_food_budgets FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_user_food_budgets_updated_at
  BEFORE UPDATE ON public.user_food_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
