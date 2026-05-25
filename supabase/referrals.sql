alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists bonus_pro_until timestamptz,
  add column if not exists referred_by_email text;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_email text not null,
  invitee_email text not null unique,
  referral_code text not null,
  invitee_bonus_until timestamptz,
  inviter_rewarded_at timestamptz,
  inviter_bonus_days integer not null default 0,
  paid_stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index if not exists referrals_inviter_email_created_at_idx
  on public.referrals (inviter_email, created_at desc);

create index if not exists referrals_referral_code_idx
  on public.referrals (referral_code);
