CREATE POLICY "Users can insert their own nutrition profile"
ON public.client_nutrition_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition profile"
ON public.client_nutrition_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);