create or replace function public.increment_free_workouts_used(p_user_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare new_count int;
begin
  insert into public.free_usage (user_id, free_workouts_used_count, last_updated_at)
  values (p_user_id, 1, now())
  on conflict (user_id) do update
    set free_workouts_used_count = public.free_usage.free_workouts_used_count + 1,
        last_updated_at = now()
  returning free_workouts_used_count into new_count;
  return new_count;
end;
$$;

create or replace function public.increment_free_recipes_viewed(p_user_id uuid, p_recipe_id uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  new_count int;
  existing uuid[];
begin
  select viewed_recipe_ids into existing from public.free_usage where user_id = p_user_id;
  if p_recipe_id is not null and existing is not null and p_recipe_id = any(existing) then
    select free_recipes_viewed_count into new_count from public.free_usage where user_id = p_user_id;
    return new_count;
  end if;

  insert into public.free_usage (user_id, free_recipes_viewed_count, viewed_recipe_ids, last_updated_at)
  values (
    p_user_id,
    1,
    case when p_recipe_id is not null then array[p_recipe_id] else '{}'::uuid[] end,
    now()
  )
  on conflict (user_id) do update
    set free_recipes_viewed_count = public.free_usage.free_recipes_viewed_count + 1,
        viewed_recipe_ids = case
          when p_recipe_id is not null and not (p_recipe_id = any(public.free_usage.viewed_recipe_ids))
            then array_append(public.free_usage.viewed_recipe_ids, p_recipe_id)
          else public.free_usage.viewed_recipe_ids
        end,
        last_updated_at = now()
  returning free_recipes_viewed_count into new_count;
  return new_count;
end;
$$;

grant execute on function public.increment_free_workouts_used(uuid) to authenticated;
grant execute on function public.increment_free_recipes_viewed(uuid, uuid) to authenticated;