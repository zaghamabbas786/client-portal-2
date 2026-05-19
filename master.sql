-- =============================================================================
-- MASTER.SQL — Vivid Capital Portal (Supabase / PostgreSQL)
-- =============================================================================
-- Run this entire file once per production (or new) Supabase project:
--   Dashboard → SQL → New query → paste → Run.
--
-- This file is the canonical schema: keep every migration appended here in order
-- so production only ever needs this one script. Numbered files under
-- supabase/migrations/ are optional history; source of truth is this file.
--
-- After run: promote at least one admin (replace email):
--   update public.profiles set role = 'admin' where email = 'you@company.com';
--
-- RLS: standard users read own profile & trading_accounts. Inserts to trading_accounts
-- use the service role from Next.js admin API routes only.
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text default '',
  role text not null default 'standard' check (role in ('admin', 'standard')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'MT5',
  broker text not null,
  server text not null,
  login text not null,
  label text not null default '',
  status text not null default 'live',
  currency text not null default 'USD',
  strategy text default 'Connected',
  balance double precision not null default 0,
  equity double precision not null default 0,
  margin double precision not null default 0,
  free_margin double precision not null default 0,
  leverage int not null default 100,
  deposit double precision not null default 0,
  opened_at text,
  seed int not null default 1,
  created_at timestamptz default now()
);

create index if not exists trading_accounts_user_id_idx on public.trading_accounts (user_id);

alter table public.profiles enable row level security;
alter table public.trading_accounts enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "trading_select_own" on public.trading_accounts;
create policy "trading_select_own" on public.trading_accounts
  for select using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'standard'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- MetaAPI.cloud: link each portal row to a MetaAPI account UUID (app.metaapi.cloud → Accounts).
alter table public.trading_accounts
  add column if not exists metaapi_account_id text;

-- Role vocabulary migration (client → standard) and lock role changes to service role / DB owner.
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'standard' where role = 'client';
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'standard'));
alter table public.profiles alter column role set default 'standard';

create or replace function public.profiles_lock_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  claim_role text := nullif(trim(coalesce(
    current_setting('request.jwt.claim.role', true),
    ''
  )), '');
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if claim_role = 'service_role' then
      return new;
    end if;
    if current_user in ('postgres', 'supabase_admin') then
      return new;
    end if;
    raise exception 'Profile roles can only be changed by an administrator.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_role on public.profiles;
create trigger profiles_lock_role
  before update on public.profiles
  for each row execute function public.profiles_lock_role_escalation();

-- Optional phone for client portal settings (edited by user; email stays in auth.users).
alter table public.profiles
  add column if not exists phone text default '';

-- =============================================================================
-- Migration 002: fix admin role management
-- =============================================================================
-- Two bugs prevented admins from changing another user's role via the dashboard:
--
-- 1. Trigger used request.jwt.claim.role (singular) which PostgREST does not
--    populate — the correct key is request.jwt.claims (plural, full JSON blob).
--    This meant claim_role was always null, the service_role bypass never fired,
--    and the admin client was blocked with "Profile roles can only be changed
--    by an administrator."
--
-- 2. The only UPDATE policy was "profiles_update_own" (auth.uid() = id), so
--    even with a valid admin JWT the RLS silently filtered out cross-user
--    updates, returning 200 OK but affecting 0 rows.
-- =============================================================================

-- Fix the trigger: parse claims from the full JSON blob.
create or replace function public.profiles_lock_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  jwt_claims  jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  claim_role  text  := coalesce(jwt_claims->>'role', '');
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if claim_role = 'service_role' then
      return new;
    end if;
    if current_user in ('postgres', 'supabase_admin') then
      return new;
    end if;
    raise exception 'Profile roles can only be changed by an administrator.';
  end if;
  return new;
end;
$$;

-- Security-definer helper: checks admin status without being subject to RLS.
-- Required because a plain subquery on profiles inside an UPDATE policy triggers
-- the profiles_select_own RLS policy, which blocks the inner read and makes the
-- admin check always return false (silent 0-row update).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Add RLS policy so an authenticated admin can update any profile row.
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- Add metaapi_region column to store the region returned by MetaAPI provisioning API.
-- Used to build the correct trading API base URL per account.
alter table public.trading_accounts add column if not exists metaapi_region text;
