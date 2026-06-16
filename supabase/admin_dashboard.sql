create extension if not exists pgcrypto;

create table if not exists public.profiles (
  email text primary key,
  user_id text,
  display_name text,
  provider text,
  provider_account_id text,
  subscription_status text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('user', 'admin'));
  end if;
end $$;

insert into public.profiles (email, role)
values ('xilichenzk@gmail.com', 'admin')
on conflict (email) do update
set role = 'admin';

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  visitor_id text not null,
  path text not null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx
  on public.page_views (created_at desc);

create index if not exists page_views_visitor_created_at_idx
  on public.page_views (visitor_id, created_at desc);

create index if not exists page_views_path_created_at_idx
  on public.page_views (path, created_at desc);

alter table public.page_views enable row level security;

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
