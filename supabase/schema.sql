-- Kiraya database setup
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

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
create or replace function public.protect_listing_fields()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
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

drop policy if exists "Anyone can see live listings" on public.listings;
create policy "Anyone can see live listings" on public.listings
  for select using ((status = 'live' and expires_at > now()) or owner_id = auth.uid());

drop policy if exists "Logged-in users can add listings" on public.listings;
create policy "Logged-in users can add listings" on public.listings
  for insert to authenticated with check (owner_id = auth.uid());

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
-- Nobody can read reports from the app; you see them in the Supabase dashboard.

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
    bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
