-- ============================================================
-- PATCH 4: Launch readiness
-- Run in Supabase > SQL Editor > New query
-- ============================================================

-- support contact and legal name, editable in Admin > Settings
alter table public.site_settings add column if not exists support_whatsapp text default '2349162492368';
alter table public.site_settings add column if not exists support_email    text;
alter table public.site_settings add column if not exists legal_entity     text default 'Flow Income Academy';

-- admin gives a course to a student by email (for old buyers, gifts, fixes)
create or replace function public.admin_grant_access(p_email text, p_course uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  uid   uuid;
  atype text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;

  select id into uid from public.profiles
  where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then
    raise exception 'No account found for %. Ask them to create an account first.', trim(p_email);
  end if;

  select access_type into atype from public.courses where id = p_course;
  if atype is null then raise exception 'Course not found'; end if;

  insert into public.enrollments (user_id, course_id, source)
  values (uid, p_course, 'manual')
  on conflict (user_id, course_id) do nothing;

  if atype in ('telegram', 'whatsapp', 'drive', 'external') then
    perform public.issue_certificate(uid, p_course, 'enrolment');
  end if;

  return 'ok';
end; $$;
grant execute on function public.admin_grant_access(text, uuid) to authenticated;
