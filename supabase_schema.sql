-- Run this in Supabase SQL Editor → https://supabase.com/dashboard/project/drekaituxrqkhlnzlaop/sql

-- Priests table
create table if not exists priests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  city text not null,
  languages text[] default '{}',
  ceremonies text[] default '{}',
  experience integer default 0,
  price integer default 0,
  bio text default '',
  photo_url text,
  verified boolean default false,
  created_at timestamptz default now()
);

-- Bookings table
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  priest_id uuid references priests(id),
  customer_name text not null,
  customer_phone text not null,
  ceremony text not null,
  booking_date date not null,
  booking_time text not null,
  address text not null,
  amount integer not null,
  commission integer generated always as (round(amount * 0.15)) stored,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Allow anyone to read priests (public browse)
alter table priests enable row level security;
create policy "Public read priests" on priests for select using (true);
create policy "Anyone can register as priest" on priests for insert with check (true);

-- Allow anyone to create bookings
alter table bookings enable row level security;
create policy "Anyone can create booking" on bookings for insert with check (true);

-- Storage bucket for priest photos
insert into storage.buckets (id, name, public) values ('priest-photos', 'priest-photos', true)
on conflict do nothing;

create policy "Anyone can upload priest photos" on storage.objects
  for insert with check (bucket_id = 'priest-photos');

create policy "Public read priest photos" on storage.objects
  for select using (bucket_id = 'priest-photos');
