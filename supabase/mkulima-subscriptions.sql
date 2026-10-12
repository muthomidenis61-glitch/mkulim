-- Run this SQL in the Supabase SQL Editor before enabling MKULIMA subscriptions.
-- All rows are private to the server-side service role. Never expose the service role key in the browser.
create extension if not exists pgcrypto;

create table if not exists public.mkulima_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint mkulima_trial_duration check (ends_at > starts_at)
);

create table if not exists public.mkulima_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('Weekly','Monthly')),
  amount_kes integer not null check (amount_kes in (300,1050)),
  phone text not null,
  checkout_request_id text not null unique,
  merchant_request_id text,
  status text not null default 'pending' check (status in ('pending','paid','failed','review')),
  mpesa_receipt text,
  result_description text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.mkulima_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('Weekly','Monthly')),
  status text not null check (status in ('active','expired','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  mpesa_receipt text,
  updated_at timestamptz not null default now(),
  constraint mkulima_subscription_period check (ends_at > starts_at)
);

alter table public.mkulima_trials enable row level security;
alter table public.mkulima_payments enable row level security;
alter table public.mkulima_subscriptions enable row level security;
-- No client policies are created intentionally. Only Netlify server functions using
-- SUPABASE_SERVICE_ROLE_KEY access these tables. Keep that key server-side.
revoke all on public.mkulima_trials from anon, authenticated;
revoke all on public.mkulima_payments from anon, authenticated;
revoke all on public.mkulima_subscriptions from anon, authenticated;
grant all on public.mkulima_trials to service_role;
grant all on public.mkulima_payments to service_role;
grant all on public.mkulima_subscriptions to service_role;
