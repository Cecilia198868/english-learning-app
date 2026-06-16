create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists user_id text;

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists provider text;

alter table public.profiles
  add column if not exists provider_account_id text;

create unique index if not exists profiles_user_id_key
  on public.profiles (user_id)
  where user_id is not null;

create unique index if not exists profiles_provider_account_key
  on public.profiles (provider, provider_account_id)
  where provider is not null
    and provider_account_id is not null;

create table if not exists public.user_auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  email text not null references public.profiles(email) on delete cascade,
  display_name text,
  provider text not null,
  provider_account_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_auth_identities_provider_account_key
    unique (provider, provider_account_id)
);

create index if not exists user_auth_identities_email_idx
  on public.user_auth_identities (email);

create index if not exists user_auth_identities_user_id_idx
  on public.user_auth_identities (user_id);

alter table public.user_auth_identities enable row level security;
