-- Far But Together: close open access on the original tables.
-- Before this, check-ins, visits, friendships, relationships and requests
-- could be read (and in places changed) by anyone, even signed out. This
-- replaces those open rules with rules that limit each row to the people it
-- belongs to. Paste this whole file into the Supabase SQL Editor and click
-- Run. It is safe to run more than once.

alter table public.checkins enable row level security;
alter table public.visits enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_requests enable row level security;
alter table public.relationships enable row level security;
alter table public.significant_other_requests enable row level security;

-- Remove the open rules.
drop policy if exists "insert checkins" on public.checkins;
drop policy if exists "select checkins" on public.checkins;
drop policy if exists "delete friend requests" on public.friend_requests;
drop policy if exists "friend_requests_insert" on public.friend_requests;
drop policy if exists "friend_requests_select" on public.friend_requests;
drop policy if exists "insert friend requests" on public.friend_requests;
drop policy if exists "view friend requests" on public.friend_requests;
drop policy if exists "insert friendships" on public.friendships;
drop policy if exists "view friendships" on public.friendships;
drop policy if exists "insert relationships" on public.relationships;
drop policy if exists "select relationships" on public.relationships;
drop policy if exists "delete so requests" on public.significant_other_requests;
drop policy if exists "insert so requests" on public.significant_other_requests;
drop policy if exists "select so requests" on public.significant_other_requests;
drop policy if exists "insert visits" on public.visits;
drop policy if exists "select visits" on public.visits;

-- Check-ins: you and your partner can read them; you can add your own.
drop policy if exists "read own and partner checkins" on public.checkins;
create policy "read own and partner checkins" on public.checkins
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.relationships r
       where (r.user_one = auth.uid() and r.user_two = checkins.user_id)
          or (r.user_two = auth.uid() and r.user_one = checkins.user_id)
    )
  );

drop policy if exists "add own checkins" on public.checkins;
create policy "add own checkins" on public.checkins
  for insert to authenticated
  with check (user_id = auth.uid());

-- Visits: only the two people in the relationship.
drop policy if exists "partners read visits" on public.visits;
create policy "partners read visits" on public.visits
  for select to authenticated
  using (
    relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
  );

drop policy if exists "partners add visits" on public.visits;
create policy "partners add visits" on public.visits
  for insert to authenticated
  with check (
    relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
  );

-- Friend requests: you can only send as yourself. (Reading and deleting
-- your own requests already have rules.)
drop policy if exists "send friend requests" on public.friend_requests;
create policy "send friend requests" on public.friend_requests
  for insert to authenticated
  with check (sender_id = auth.uid() and receiver_id <> auth.uid());

-- Friendships: see your own; one is created only when you accept a request
-- that was sent to you.
drop policy if exists "see own friendships" on public.friendships;
create policy "see own friendships" on public.friendships
  for select to authenticated
  using (user_one = auth.uid() or user_two = auth.uid());

drop policy if exists "accept friend requests" on public.friendships;
create policy "accept friend requests" on public.friendships
  for insert to authenticated
  with check (
    user_two = auth.uid()
    and exists (
      select 1 from public.friend_requests q
       where q.sender_id = user_one and q.receiver_id = user_two
    )
  );

-- Relationship requests: send only to a friend, as yourself.
drop policy if exists "send relationship requests" on public.significant_other_requests;
create policy "send relationship requests" on public.significant_other_requests
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and receiver_id <> auth.uid()
    and exists (
      select 1 from public.friendships f
       where (f.user_one = auth.uid() and f.user_two = receiver_id)
          or (f.user_two = auth.uid() and f.user_one = receiver_id)
    )
  );

-- Relationships: see your own; one is created only when you accept a
-- request that was sent to you.
drop policy if exists "see own relationship" on public.relationships;
create policy "see own relationship" on public.relationships
  for select to authenticated
  using (user_one = auth.uid() or user_two = auth.uid());

drop policy if exists "accept relationship requests" on public.relationships;
create policy "accept relationship requests" on public.relationships
  for insert to authenticated
  with check (
    user_two = auth.uid()
    and exists (
      select 1 from public.significant_other_requests q
       where q.sender_id = user_one and q.receiver_id = user_two
    )
  );

-- The rules now in place. Every row should say "authenticated", and none
-- should say just "true".
select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and tablename in (
     'profiles', 'checkins', 'visits', 'relationships', 'friendships',
     'friend_requests', 'significant_other_requests'
   )
 order by tablename, policyname;
