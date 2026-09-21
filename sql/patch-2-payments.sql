-- PATCH 2: Secure payments

alter table public.orders add column if not exists coupon_code text;

-- students may only create their OWN orders, and only as pending
drop policy if exists "insert own orders" on public.orders;
create policy "insert own orders" on public.orders
  for insert with check (auth.uid() = user_id and status = 'pending');

-- safe way for a student to claim a FREE course
create or replace function public.claim_free_course(p_course uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;

  if not exists (
    select 1 from public.courses
    where id = p_course and is_free = true and is_published = true
  ) then
    raise exception 'This course is not free';
  end if;

  insert into public.enrollments (user_id, course_id, source)
  values (auth.uid(), p_course, 'free')
  on conflict (user_id, course_id) do nothing;

  return true;
end;
$$;

grant execute on function public.claim_free_course(uuid) to authenticated;
