-- Demo mode tables for anonymous sessions
create table if not exists public.demo_profiles (
  id uuid primary key,
  created_at timestamptz not null default now(),
  stories_used integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_hero (
  profile_id uuid primary key references public.demo_profiles(id) on delete cascade,
  hero_name text not null,
  hero_type text not null,
  hero_trait text not null,
  comfort_item text not null,
  age_band text not null,
  sidekick_name text,
  sidekick_archetype text,
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_episodes (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references public.demo_profiles(id) on delete cascade,
  episode_number integer not null,
  story_text text not null,
  episode_summary text not null,
  choices_json jsonb not null default '{}'::jsonb,
  tags_used text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create unique index if not exists demo_episodes_profile_episode_idx on public.demo_episodes(profile_id, episode_number);
create index if not exists demo_episodes_profile_idx on public.demo_episodes(profile_id);

create table if not exists public.demo_preferences (
  profile_id uuid not null references public.demo_profiles(id) on delete cascade,
  tag text not null,
  score integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, tag)
);

create index if not exists demo_preferences_profile_idx on public.demo_preferences(profile_id);
