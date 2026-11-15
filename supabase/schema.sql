-- Kiraya database setup
-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run again after changes (it only adds or replaces things, it never deletes your data).

-- 0. Users and admins --------------------------------------------------------
-- One profile per account, filled in automatically when someone signs up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Accounts that signed up before this table existed
insert into public.profiles (id, email, name, created_at)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)), u.created_at
from auth.users u
on conflict (id) do nothing;

-- Super admins. Nobody can read or change this table from the app.
-- Make someone an admin in the SQL Editor:
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users see their own profile, admins see all" on public.profiles;
create policy "Users see their own profile, admins see all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can block users" on public.profiles;
create policy "Admins can block users" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 1. Listings ---------------------------------------------------------------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  owner_name text not null,
  posted_by text not null default 'owner' check (posted_by in ('owner', 'broker')),
  type text not null check (type in ('flat', 'independent-floor', 'house', 'pg', 'room', 'shared-room')),
  title text not null check (char_length(title) between 10 and 120),
  description text default '',
  city text not null,
  locality text not null,
  landmark text,
  address text,
  lat double precision not null,
  lng double precision not null,
  bhk int not null default 1,
  bathrooms int not null default 1,
  area_sqft int,
  floor int,
  total_floors int,
  furnishing text not null default 'unfurnished',
  furnishing_items text[] not null default '{}',
  amenities text[] not null default '{}',
  tenant_preference text[] not null default '{any}',
  veg_only boolean not null default false,
  pets_allowed boolean not null default false,
  rent int not null check (rent > 0),
  deposit int not null default 0,
  maintenance int not null default 0,
  electricity text not null default 'per-unit',
  negotiable boolean not null default true,
  available_from date not null default current_date,
  photos text[] not null default '{}',
  pg jsonb,
  house_rules text[] not null default '{}',
  verified boolean not null default false,
  status text not null default 'live' check (status in ('live', 'pending', 'rented', 'paused', 'expired')),
  views int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index if not exists listings_search_idx on public.listings (status, city, type, rent);
create index if not exists listings_owner_idx on public.listings (owner_id);

-- Owners can't mark their own listing as verified or change view counts.
-- Only app users (anon / authenticated) who are not admins are limited; admins, the Supabase dashboard,
-- the service role and increment_listing_views (which runs as the table owner) can change these fields.
create or replace function public.protect_listing_fields()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verified := false;
      new.views := 0;
    else
      new.verified := old.verified;
      new.views := old.views;
      new.owner_id := old.owner_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_listing_fields on public.listings;
create trigger protect_listing_fields before insert or update on public.listings
for each row execute function public.protect_listing_fields();

alter table public.listings enable row level security;

-- The full address (house number) is private: the app can write it but never read it back.
-- Every column except "address" is readable; the app selects these columns explicitly.
revoke select on public.listings from anon, authenticated;
grant select (
  id, owner_id, owner_name, posted_by, type, title, description, city, locality, landmark, lat, lng,
  bhk, bathrooms, area_sqft, floor, total_floors, furnishing, furnishing_items, amenities,
  tenant_preference, veg_only, pets_allowed, rent, deposit, maintenance, electricity, negotiable,
  available_from, photos, pg, house_rules, verified, status, views, created_at, expires_at
) on public.listings to anon, authenticated;

drop policy if exists "Anyone can see live listings" on public.listings;
create policy "Anyone can see live listings" on public.listings
  for select using ((status = 'live' and expires_at > now()) or owner_id = auth.uid() or public.is_admin());

-- Blocked users can't post
drop policy if exists "Logged-in users can add listings" on public.listings;
create policy "Logged-in users can add listings" on public.listings
  for insert to authenticated with check (
    owner_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.blocked)
  );

drop policy if exists "Admins can edit any listing" on public.listings;
create policy "Admins can edit any listing" on public.listings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete any listing" on public.listings;
create policy "Admins can delete any listing" on public.listings
  for delete to authenticated using (public.is_admin());

drop policy if exists "Owners can edit their listings" on public.listings;
create policy "Owners can edit their listings" on public.listings
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Owners can delete their listings" on public.listings;
create policy "Owners can delete their listings" on public.listings
  for delete to authenticated using (owner_id = auth.uid());

-- View counter (callable by anyone, only increases views by 1)
create or replace function public.increment_listing_views(listing_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.listings set views = views + 1 where id = listing_id;
$$;

-- 2. Owner phone numbers (only logged-in users can read them) --------------
create table if not exists public.listing_contacts (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  phone text not null check (phone ~ '^[0-9+ ]{10,15}$')
);

alter table public.listing_contacts enable row level security;

drop policy if exists "Logged-in users can see phone numbers" on public.listing_contacts;
create policy "Logged-in users can see phone numbers" on public.listing_contacts
  for select to authenticated using (true);

drop policy if exists "Owners add their phone" on public.listing_contacts;
create policy "Owners add their phone" on public.listing_contacts
  for insert to authenticated with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

drop policy if exists "Owners update their phone" on public.listing_contacts;
create policy "Owners update their phone" on public.listing_contacts
  for update to authenticated using (
    exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

-- 3. Reports (fake / already rented / broker) -------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid default auth.uid(),
  reason text not null check (char_length(reason) <= 300),
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "Anyone can report a listing" on public.reports;
create policy "Anyone can report a listing" on public.reports
  for insert to anon, authenticated with check (true);
-- Only admins can read reports (in /admin, or in the Supabase dashboard).
drop policy if exists "Admins can see reports" on public.reports;
create policy "Admins can see reports" on public.reports
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins can resolve reports" on public.reports;
create policy "Admins can resolve reports" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports" on public.reports
  for delete to authenticated using (public.is_admin());

-- 4. Photo storage ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view listing photos" on storage.objects;
create policy "Anyone can view listing photos" on storage.objects
  for select using (bucket_id = 'listing-photos');

drop policy if exists "Users upload to their own folder" on storage.objects;
create policy "Users upload to their own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own photos" on storage.objects;
create policy "Users delete their own photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'listing-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
