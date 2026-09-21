-- ============================================================
-- PATCH 3: Affiliate programme, certificates, promo video
-- Run in Supabase > SQL Editor > New query
-- If the RLS warning appears, click "Run and enable RLS"
-- ============================================================

-- ---------- SITE SETTINGS (one row) ----------
create table if not exists public.site_settings (
  id                    int primary key default 1,
  affiliate_fee_ngn     numeric(12,2) default 2000,
  affiliate_free_until  timestamptz default (now() + interval '60 days'),
  commission_rate       numeric(5,2) default 30,
  min_payout_ngn        numeric(12,2) default 5000,
  instructor_name       text default 'Oladeji Aduragbemi',
  instructor_title      text default 'Lead Instructor, Flow Income Academy',
  constraint single_row check (id = 1)
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;
drop policy if exists "public read settings" on public.site_settings;
drop policy if exists "admin write settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select using (true);
create policy "admin write settings" on public.site_settings for all using (public.is_admin());

-- ---------- COURSES: promo video ----------
alter table public.courses add column if not exists promo_video_url text;

-- ---------- ORDERS: referral code ----------
alter table public.orders add column if not exists ref_code text;

-- ---------- AFFILIATES: extra fields ----------
alter table public.affiliates add column if not exists clicks int default 0;
alter table public.affiliates add column if not exists sales_count int default 0;
alter table public.affiliates add column if not exists source text default 'free';
do $$ begin
  alter table public.affiliates add constraint affiliates_user_unique unique (user_id);
exception when duplicate_object or duplicate_table then null; end $$;

-- ---------- REFERRALS: one per order ----------
do $$ begin
  alter table public.referrals add constraint referrals_order_unique unique (order_id);
exception when duplicate_object or duplicate_table then null; end $$;

-- ---------- PAYOUT REQUESTS ----------
create table if not exists public.payout_requests (
  id             uuid primary key default gen_random_uuid(),
  affiliate_id   uuid references public.affiliates(id) on delete cascade,
  amount         numeric(12,2) not null,
  bank_name      text,
  account_number text,
  account_name   text,
  status         text default 'pending',   -- pending | paid | rejected
  created_at     timestamptz default now(),
  paid_at        timestamptz
);
alter table public.payout_requests enable row level security;
drop policy if exists "read own payouts"  on public.payout_requests;
drop policy if exists "admin all payouts" on public.payout_requests;
create policy "read own payouts" on public.payout_requests for select using (
  public.is_admin() or exists (
    select 1 from public.affiliates a
    where a.id = payout_requests.affiliate_id and a.user_id = auth.uid()
  )
);
create policy "admin all payouts" on public.payout_requests for all using (public.is_admin());

-- ---------- CERTIFICATES ----------
create table if not exists public.certificates (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  user_id       uuid references public.profiles(id) on delete cascade,
  course_id     uuid references public.courses(id) on delete cascade,
  student_name  text not null,
  basis         text not null default 'completed',   -- completed | enrolment
  issued_at     timestamptz default now(),
  unique (user_id, course_id)
);
alter table public.certificates enable row level security;
drop policy if exists "read own certificates"  on public.certificates;
drop policy if exists "admin all certificates" on public.certificates;
create policy "read own certificates"  on public.certificates for select using (auth.uid() = user_id or public.is_admin());
create policy "admin all certificates" on public.certificates for all using (public.is_admin());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- make a unique affiliate code like ADURA417
create or replace function public.make_affiliate_code(p_name text)
returns text language plpgsql as $$
declare
  base text;
  c    text;
begin
  base := upper(regexp_replace(coalesce(split_part(p_name, ' ', 1), ''), '[^A-Za-z]', '', 'g'));
  if length(base) < 3 then base := 'FLOW'; end if;
  base := left(base, 6);
  loop
    c := base || (100 + floor(random() * 900))::int::text;
    exit when not exists (select 1 from public.affiliates where code = c);
  end loop;
  return c;
end; $$;

-- internal: create affiliate row (server and free-join only)
create or replace function public.create_affiliate_for(p_user uuid, p_source text)
returns text language plpgsql security definer set search_path = public as $$
declare
  existing text;
  pname    text;
  pphone   text;
  newcode  text;
  r        numeric;
begin
  select code into existing from public.affiliates where user_id = p_user;
  if existing is not null then return existing; end if;

  select full_name, phone into pname, pphone from public.profiles where id = p_user;
  select commission_rate into r from public.site_settings where id = 1;
  newcode := public.make_affiliate_code(pname);

  insert into public.affiliates (user_id, code, full_name, phone, rate, source, is_active)
  values (p_user, newcode, pname, pphone, coalesce(r, 30), p_source, true);

  return newcode;
end; $$;
revoke execute on function public.create_affiliate_for(uuid, text) from public, anon, authenticated;
grant  execute on function public.create_affiliate_for(uuid, text) to service_role;

-- student joins free during the launch window
create or replace function public.join_affiliate_free()
returns text language plpgsql security definer set search_path = public as $$
declare
  until timestamptz;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select affiliate_free_until into until from public.site_settings where id = 1;
  if until is null or until < now() then
    raise exception 'Free sign up has ended. Please pay the sign up fee.';
  end if;
  return public.create_affiliate_for(auth.uid(), 'free');
end; $$;
grant execute on function public.join_affiliate_free() to authenticated;

-- count a click on a referral link (anyone can call)
create or replace function public.track_ref_click(p_code text)
returns void language sql security definer set search_path = public as $$
  update public.affiliates set clicks = clicks + 1
  where code = upper(p_code) and is_active = true;
$$;
grant execute on function public.track_ref_click(text) to anon, authenticated;

-- internal: record commission on a paid order
create or replace function public.record_referral(p_order uuid, p_code text, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  aff   public.affiliates;
  buyer uuid;
  comm  numeric;
begin
  if p_code is null or p_amount is null or p_amount <= 0 then return; end if;
  select * into aff from public.affiliates where code = upper(p_code) and is_active = true;
  if aff.id is null then return; end if;
  select user_id into buyer from public.orders where id = p_order;
  if buyer = aff.user_id then return; end if;   -- no commission on own purchase

  comm := round(p_amount * aff.rate / 100);

  insert into public.referrals (affiliate_id, order_id, commission)
  values (aff.id, p_order, comm)
  on conflict (order_id) do nothing;

  if found then
    update public.affiliates
    set total_earned = total_earned + comm,
        sales_count  = sales_count + 1
    where id = aff.id;
  end if;
end; $$;
revoke execute on function public.record_referral(uuid, text, numeric) from public, anon, authenticated;
grant  execute on function public.record_referral(uuid, text, numeric) to service_role;

-- affiliate asks to be paid
create or replace function public.request_payout(p_amount numeric, p_bank text, p_number text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare
  aff     public.affiliates;
  pending numeric;
  balance numeric;
  minp    numeric;
begin
  select * into aff from public.affiliates where user_id = auth.uid() and is_active = true;
  if aff.id is null then raise exception 'You are not an active affiliate'; end if;

  select coalesce(sum(amount), 0) into pending
  from public.payout_requests where affiliate_id = aff.id and status = 'pending';

  balance := aff.total_earned - aff.total_paid - pending;
  select min_payout_ngn into minp from public.site_settings where id = 1;

  if p_amount < coalesce(minp, 0) then
    raise exception 'Minimum payout is NGN %', coalesce(minp, 0);
  end if;
  if p_amount > balance then
    raise exception 'You can request up to NGN %', balance;
  end if;
  if coalesce(p_bank, '') = '' or coalesce(p_number, '') = '' or coalesce(p_name, '') = '' then
    raise exception 'Please fill in your bank details';
  end if;

  insert into public.payout_requests (affiliate_id, amount, bank_name, account_number, account_name)
  values (aff.id, p_amount, p_bank, p_number, p_name);
end; $$;
grant execute on function public.request_payout(numeric, text, text, text) to authenticated;

-- admin marks a payout as paid
create or replace function public.admin_mark_payout(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare
  pr public.payout_requests;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into pr from public.payout_requests where id = p_id;
  if pr.id is null or pr.status <> 'pending' then return; end if;

  update public.payout_requests
  set status = p_status, paid_at = case when p_status = 'paid' then now() else null end
  where id = p_id;

  if p_status = 'paid' then
    update public.affiliates set total_paid = total_paid + pr.amount where id = pr.affiliate_id;
  end if;
end; $$;
grant execute on function public.admin_mark_payout(uuid, text) to authenticated;

-- internal: issue a certificate
create or replace function public.issue_certificate(p_user uuid, p_course uuid, p_basis text)
returns text language plpgsql security definer set search_path = public as $$
declare
  existing text;
  pname    text;
  pemail   text;
  newcode  text;
begin
  select code into existing from public.certificates where user_id = p_user and course_id = p_course;
  if existing is not null then
    if p_basis = 'completed' then
      update public.certificates set basis = 'completed' where code = existing;
    end if;
    return existing;
  end if;

  select full_name, email into pname, pemail from public.profiles where id = p_user;
  if coalesce(trim(pname), '') = '' then pname := split_part(coalesce(pemail, 'Student'), '@', 1); end if;

  loop
    newcode := 'FIA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.certificates where code = newcode);
  end loop;

  insert into public.certificates (code, user_id, course_id, student_name, basis)
  values (newcode, p_user, p_course, pname, p_basis);

  return newcode;
end; $$;
revoke execute on function public.issue_certificate(uuid, uuid, text) from public, anon, authenticated;
grant  execute on function public.issue_certificate(uuid, uuid, text) to service_role;

-- student claims certificate after finishing all lessons
create or replace function public.claim_certificate(p_course uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  total int;
  done  int;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if not exists (select 1 from public.enrollments where user_id = auth.uid() and course_id = p_course) then
    raise exception 'You are not enrolled in this course';
  end if;

  select count(*) into total from public.lessons where course_id = p_course;
  select count(*) into done  from public.lesson_progress
    where user_id = auth.uid() and course_id = p_course;

  if total = 0 then raise exception 'This course has no lessons yet'; end if;
  if done < total then
    raise exception 'Finish all % lessons first. You have completed %.', total, done;
  end if;

  return public.issue_certificate(auth.uid(), p_course, 'completed');
end; $$;
grant execute on function public.claim_certificate(uuid) to authenticated;

-- public verification (returns one certificate, no listing)
create or replace function public.verify_certificate(p_code text)
returns table (
  code text, student_name text, basis text, issued_at timestamptz,
  course_title text, course_slug text, skills text[], lesson_count int,
  instructor_name text, instructor_title text, is_owner boolean
)
language sql security definer set search_path = public as $$
  select c.code, c.student_name, c.basis, c.issued_at,
         co.title, co.slug, co.what_you_learn,
         (select count(*)::int from public.lessons l where l.course_id = co.id),
         s.instructor_name, s.instructor_title,
         (c.user_id = auth.uid())
  from public.certificates c
  join public.courses co on co.id = c.course_id
  cross join public.site_settings s
  where c.code = upper(p_code) and s.id = 1;
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ============================================================
-- DONE
-- ============================================================

-- affiliate sees their own sales (course and commission only, no buyer details)
create or replace function public.my_referrals()
returns table (created_at timestamptz, course_title text, commission numeric)
language sql security definer set search_path = public as $$
  select r.created_at, coalesce(c.title, 'Course'), r.commission
  from public.referrals r
  join public.affiliates a on a.id = r.affiliate_id
  left join public.orders o on o.id = r.order_id
  left join public.courses c on c.id = o.course_id
  where a.user_id = auth.uid()
  order by r.created_at desc
  limit 100;
$$;
grant execute on function public.my_referrals() to authenticated;
