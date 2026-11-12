-- Far But Together: reporting and hiding posts on the Community page.
-- Run supabase/community.sql first. Paste this file into the Supabase
-- SQL Editor and click Run. It is safe to run more than once.

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null
    references public.community_posts(id) on delete cascade,
  reporter_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.community_reports enable row level security;

-- You can report as yourself and see only your own reports.
drop policy if exists "report as yourself" on public.community_reports;
create policy "report as yourself" on public.community_reports
  for insert to authenticated with check (reporter_id = auth.uid());

drop policy if exists "see own reports" on public.community_reports;
create policy "see own reports" on public.community_reports
  for select to authenticated using (reporter_id = auth.uid());

-- Lets the posts policy count reports without exposing who made them.
create or replace function public.community_report_count(p_post uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from public.community_reports where post_id = p_post;
$$;

-- Replace the read policy: a post you reported is hidden from you at once,
-- and a post reported by 3 different people is hidden from everyone but
-- its author.
drop policy if exists "signed in can read posts" on public.community_posts;
drop policy if exists "read visible posts" on public.community_posts;
create policy "read visible posts" on public.community_posts
  for select to authenticated
  using (
    author_id = auth.uid()
    or (
      not exists (
        select 1 from public.community_reports r
         where r.post_id = community_posts.id
           and r.reporter_id = auth.uid()
      )
      and public.community_report_count(community_posts.id) < 3
    )
  );
