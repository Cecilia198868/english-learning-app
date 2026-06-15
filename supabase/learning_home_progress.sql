create table if not exists public.user_learning_home_progress (
  user_key text primary key,
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_learning_home_progress_updated_at_idx
  on public.user_learning_home_progress (updated_at desc);
