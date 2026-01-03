-- Add story_route to stories for calm route selection
alter table stories
  add column if not exists story_route text check (story_route in ('A','B','C')) default 'A';

update stories
  set story_route = coalesce(story_route, 'A');

alter table stories
  alter column story_route set not null;
