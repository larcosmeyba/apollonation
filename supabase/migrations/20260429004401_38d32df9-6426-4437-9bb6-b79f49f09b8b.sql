ALTER TABLE public.grocery_item_states
  ADD COLUMN IF NOT EXISTS quantity_factor numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS swapped_for_budget boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_quantity text;