create table if not exists public.user_sessions (
  email text primary key,
  user_id text,
  current_session_id text not null,
  current_device_id text not null,
  last_login_at timestamptz not null default now(),
  last_login_ip text,
  last_login_user_agent text,
  updated_at timestamptz not null default now()
);

create index if not exists user_sessions_user_id_idx
  on public.user_sessions (user_id);

create index if not exists user_sessions_last_login_at_idx
  on public.user_sessions (last_login_at desc);

alter table public.user_sessions enable row level security;
