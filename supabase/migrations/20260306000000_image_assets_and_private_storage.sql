-- Create image_assets table to track generated visuals
create table if not exists public.image_assets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hero_id uuid null references public.characters(id) on delete cascade,
  story_id uuid null references public.stories(id) on delete cascade,
  type text not null check (type in ('hero','scene')),
  prompt_hash text,
  model text,
  generation_id text,
  tokens_prompt integer,
  tokens_completion integer,
  cost_total numeric,
  storage_bucket text not null,
  storage_path text not null,
  is_public boolean default false,
  created_at timestamptz not null default now()
);

alter table public.image_assets enable row level security;

create policy "Users can select their own image assets"
  on public.image_assets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own image assets"
  on public.image_assets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own image assets"
  on public.image_assets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own image assets"
  on public.image_assets for delete
  using (auth.uid() = user_id);

create index if not exists image_assets_user_id_idx on public.image_assets(user_id);
create index if not exists image_assets_hero_idx on public.image_assets(hero_id);
create index if not exists image_assets_story_idx on public.image_assets(story_id);
create index if not exists image_assets_prompt_hash_idx on public.image_assets(prompt_hash);

-- Harden storage buckets: keep files private and scoped by owner
insert into storage.buckets (id, name, public)
values ('hero-portraits', 'hero-portraits', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('story-images', 'story-images', false)
on conflict (id) do nothing;

update storage.buckets set public = false where id in ('hero-portraits', 'story-images');

-- Clean up overly permissive policy if it exists
drop policy if exists "Anyone can view hero portraits" on storage.objects;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Hero portraits are owner-readable'
  ) then
    create policy "Hero portraits are owner-readable"
      on storage.objects for select
      using (
        bucket_id = 'hero-portraits'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Hero portraits owner writes'
  ) then
    create policy "Hero portraits owner writes"
      on storage.objects for insert
      with check (
        bucket_id = 'hero-portraits'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Hero portraits owner updates'
  ) then
    create policy "Hero portraits owner updates"
      on storage.objects for update using (
        bucket_id = 'hero-portraits'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Hero portraits owner deletes'
  ) then
    create policy "Hero portraits owner deletes"
      on storage.objects for delete using (
        bucket_id = 'hero-portraits'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Story images are owner-readable'
  ) then
    create policy "Story images are owner-readable"
      on storage.objects for select
      using (
        bucket_id = 'story-images'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Story images owner writes'
  ) then
    create policy "Story images owner writes"
      on storage.objects for insert
      with check (
        bucket_id = 'story-images'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Story images owner updates'
  ) then
    create policy "Story images owner updates"
      on storage.objects for update using (
        bucket_id = 'story-images'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'objects' and policyname = 'Story images owner deletes'
  ) then
    create policy "Story images owner deletes"
      on storage.objects for delete using (
        bucket_id = 'story-images'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
