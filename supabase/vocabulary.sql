create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  word text not null,
  meaning text not null default '',
  part_of_speech text not null default '',
  example text not null default '',
  example_zh text not null default '',
  source_sentence text,
  mastered_count integer not null default 0,
  wrong_count integer not null default 0,
  correct_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_vocabulary_user_email_word_key
  on public.user_vocabulary (user_email, word);

create index if not exists user_vocabulary_user_email_created_at_idx
  on public.user_vocabulary (user_email, created_at desc);
