-- ============================================================
-- FLOW INCOME ACADEMY - DATABASE SCHEMA
-- Run this ENTIRE file in Supabase > SQL Editor > New Query
-- ============================================================

-- ---------- PROFILES (extends Supabase auth.users) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  role        text not null default 'student',   -- student | instructor | admin
  created_at  timestamptz default now()
);

-- ---------- CATEGORIES ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  icon        text,
  sort_order  int default 0
);

-- ---------- COURSES ----------
create table if not exists public.courses (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  slug             text unique not null,
  short_desc       text,
  full_desc        text,
  what_you_learn   text[],
  requirements     text[],
  price_ngn        numeric(12,2) not null default 0,
  price_usdt       numeric(12,2) default 0,
  compare_price    numeric(12,2),
  thumbnail_url    text,
  emoji            text default 'BOOK',
  category_id      uuid references public.categories(id) on delete set null,
  level            text default 'Beginner',
  duration_text    text,
  lesson_count     int default 0,
  legacy_file      text,          -- e.g. ai-tools-income.html
  legacy_code      text,          -- e.g. Q3ZN-B7WX-4LSM
  drive_link       text,          -- Google Drive link for video courses
  instructor_id    uuid references public.profiles(id) on delete set null,
  is_published     boolean default false,
  is_featured      boolean default false,
  is_free          boolean default false,
  sort_order       int default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ---------- BUNDLES ----------
create table if not exists public.bundles (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text unique not null,
  description   text,
  price_ngn     numeric(12,2) not null default 0,
  price_usdt    numeric(12,2) default 0,
  compare_price numeric(12,2),
  emoji         text default 'PACK',
  legacy_file   text,
  legacy_code   text,
  is_published  boolean default false,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

create table if not exists public.bundle_courses (
  bundle_id uuid references public.bundles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  primary key (bundle_id, course_id)
);

-- ---------- LESSONS (for future native course player) ----------
create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid references public.courses(id) on delete cascade,
  title        text not null,
  content_type text default 'text',   -- text | video | pdf | drive
  content      text,
  content_url  text,
  duration_min int,
  sort_order   int default 0,
  is_preview   boolean default false,
  created_at   timestamptz default now()
);

-- ---------- ORDERS ----------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  email         text,
  full_name     text,
  phone         text,
  item_type     text not null,        -- course | bundle
  course_id     uuid references public.courses(id) on delete set null,
  bundle_id     uuid references public.bundles(id) on delete set null,
  amount        numeric(12,2) not null,
  currency      text default 'NGN',
  tx_ref        text unique not null,
  flw_ref       text,
  status        text default 'pending',  -- pending | paid | failed
  created_at    timestamptz default now(),
  paid_at       timestamptz
);

-- ---------- ENROLLMENTS (access granted) ----------
create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  source      text default 'purchase',  -- purchase | bundle | manual | free
  created_at  timestamptz default now(),
  unique (user_id, course_id)
);

-- ---------- AFFILIATES ----------
create table if not exists public.affiliates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  code          text unique not null,
  full_name     text,
  phone         text,
  rate          numeric(5,2) default 30.00,
  total_earned  numeric(12,2) default 0,
  total_paid    numeric(12,2) default 0,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  affiliate_id  uuid references public.affiliates(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete cascade,
  commission    numeric(12,2) not null,
  is_paid       boolean default false,
  created_at    timestamptz default now()
);

-- ---------- COUPONS ----------
create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  discount_type text default 'percent',   -- percent | fixed | free
  discount_val  numeric(12,2) default 0,
  max_uses      int,
  used_count    int default 0,
  expires_at    timestamptz,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ============================================================
-- HELPER: is current user an admin
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.courses      enable row level security;
alter table public.bundles      enable row level security;
alter table public.bundle_courses enable row level security;
alter table public.lessons      enable row level security;
alter table public.orders       enable row level security;
alter table public.enrollments  enable row level security;
alter table public.affiliates   enable row level security;
alter table public.referrals    enable row level security;
alter table public.coupons      enable row level security;

-- PROFILES
drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "admin all profiles" on public.profiles;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
create policy "admin all profiles" on public.profiles for all    using (public.is_admin());

-- CATEGORIES: public read, admin write
drop policy if exists "public read categories" on public.categories;
drop policy if exists "admin write categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);
create policy "admin write categories" on public.categories for all using (public.is_admin());

-- COURSES: anyone reads published, admin does everything
drop policy if exists "public read courses" on public.courses;
drop policy if exists "admin write courses" on public.courses;
create policy "public read courses" on public.courses for select using (is_published = true or public.is_admin());
create policy "admin write courses" on public.courses for all using (public.is_admin());

-- BUNDLES
drop policy if exists "public read bundles" on public.bundles;
drop policy if exists "admin write bundles" on public.bundles;
create policy "public read bundles" on public.bundles for select using (is_published = true or public.is_admin());
create policy "admin write bundles" on public.bundles for all using (public.is_admin());

drop policy if exists "public read bundle_courses" on public.bundle_courses;
drop policy if exists "admin write bundle_courses" on public.bundle_courses;
create policy "public read bundle_courses" on public.bundle_courses for select using (true);
create policy "admin write bundle_courses" on public.bundle_courses for all using (public.is_admin());

-- LESSONS: preview lessons public, full lessons need enrollment
drop policy if exists "read lessons" on public.lessons;
drop policy if exists "admin write lessons" on public.lessons;
create policy "read lessons" on public.lessons for select using (
  is_preview = true
  or public.is_admin()
  or exists (
    select 1 from public.enrollments e
    where e.course_id = lessons.course_id and e.user_id = auth.uid()
  )
);
create policy "admin write lessons" on public.lessons for all using (public.is_admin());

-- ORDERS
drop policy if exists "read own orders"   on public.orders;
drop policy if exists "insert own orders" on public.orders;
drop policy if exists "admin all orders"  on public.orders;
create policy "read own orders"   on public.orders for select using (auth.uid() = user_id or public.is_admin());
create policy "insert own orders" on public.orders for insert with check (true);
create policy "admin all orders"  on public.orders for all    using (public.is_admin());

-- ENROLLMENTS
drop policy if exists "read own enrollments" on public.enrollments;
drop policy if exists "admin all enrollments" on public.enrollments;
create policy "read own enrollments"  on public.enrollments for select using (auth.uid() = user_id or public.is_admin());
create policy "admin all enrollments" on public.enrollments for all    using (public.is_admin());

-- AFFILIATES
drop policy if exists "read own affiliate"  on public.affiliates;
drop policy if exists "admin all affiliates" on public.affiliates;
create policy "read own affiliate"   on public.affiliates for select using (auth.uid() = user_id or public.is_admin());
create policy "admin all affiliates" on public.affiliates for all    using (public.is_admin());

-- REFERRALS
drop policy if exists "read own referrals" on public.referrals;
drop policy if exists "admin all referrals" on public.referrals;
create policy "read own referrals" on public.referrals for select using (
  public.is_admin() or exists (
    select 1 from public.affiliates a
    where a.id = referrals.affiliate_id and a.user_id = auth.uid()
  )
);
create policy "admin all referrals" on public.referrals for all using (public.is_admin());

-- COUPONS: public can read active ones to validate, admin writes
drop policy if exists "public read coupons" on public.coupons;
drop policy if exists "admin write coupons" on public.coupons;
create policy "public read coupons" on public.coupons for select using (is_active = true or public.is_admin());
create policy "admin write coupons" on public.coupons for all using (public.is_admin());

-- ============================================================
-- SEED CATEGORIES
-- ============================================================
insert into public.categories (name, slug, icon, sort_order) values
  ('Freelancing',        'freelancing',  'BRIEFCASE', 1),
  ('Content and Design', 'content',      'CAMERA',    2),
  ('Marketing',          'marketing',    'CHART',     3),
  ('Online Business',    'business',     'STORE',     4),
  ('Web3 and Crypto',    'web3',         'CHAIN',     5),
  ('Tech Skills',        'tech',         'GEAR',      6),
  ('Trading',            'trading',      'GRAPH',     7),
  ('Specialist Skills',  'specialist',   'CAP',       8)
on conflict (slug) do nothing;

-- ============================================================
-- DONE. Next: create your admin account, then run:
--   update public.profiles set role = 'admin' where email = 'YOUR@EMAIL.COM';
-- ============================================================
