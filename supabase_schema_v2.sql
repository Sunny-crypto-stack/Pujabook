-- Run this in Supabase SQL Editor → https://supabase.com/dashboard/project/drekaituxrqkhlnzlaop/sql

-- Add UPI ID to priests table
alter table priests add column if not exists upi_id text;
alter table priests add column if not exists email text;
alter table priests add column if not exists availability boolean default true;

-- Customer profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  email text,
  upi_id text,
  created_at timestamptz default now()
);

-- RLS for profiles
alter table profiles enable row level security;
create policy "Users can read their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can upsert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

-- Allow priests to see their own bookings
create policy "Priests can view their bookings" on bookings for select using (true);
