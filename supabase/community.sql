-- Far But Together: table for the Community page.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_created_idx
  on public.community_posts (created_at desc);

alter table public.community_posts enable row level security;

-- Any signed-in person can read the board.
drop policy if exists "signed in can read posts" on public.community_posts;
create policy "signed in can read posts" on public.community_posts
  for select to authenticated using (true);

-- You can only post as yourself.
drop policy if exists "post as yourself" on public.community_posts;
create policy "post as yourself" on public.community_posts
  for insert to authenticated with check (author_id = auth.uid());

-- You can only delete your own posts.
drop policy if exists "delete own posts" on public.community_posts;
create policy "delete own posts" on public.community_posts
  for delete to authenticated using (author_id = auth.uid());
