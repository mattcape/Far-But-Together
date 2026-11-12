-- Far But Together, round 2: unfriend / cancel / end relationship, days
-- together, time zones, bucket list, and photos on memories.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once.

-- 1. Let people undo things -------------------------------------------------

drop policy if exists "remove own friendships" on public.friendships;
create policy "remove own friendships" on public.friendships
  for delete to authenticated
  using (user_one = auth.uid() or user_two = auth.uid());

drop policy if exists "see own friend requests" on public.friend_requests;
create policy "see own friend requests" on public.friend_requests
  for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "remove own friend requests" on public.friend_requests;
create policy "remove own friend requests" on public.friend_requests
  for delete to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "see own relationship requests" on public.significant_other_requests;
create policy "see own relationship requests" on public.significant_other_requests
  for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "remove own relationship requests" on public.significant_other_requests;
create policy "remove own relationship requests" on public.significant_other_requests
  for delete to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

drop policy if exists "end own relationship" on public.relationships;
create policy "end own relationship" on public.relationships
  for delete to authenticated
  using (user_one = auth.uid() or user_two = auth.uid());

drop policy if exists "members delete visits" on public.visits;
create policy "members delete visits" on public.visits
  for delete to authenticated
  using (
    relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
  );

-- 2. Days together ----------------------------------------------------------

alter table public.relationships
  add column if not exists anniversary date;

-- Either partner can change the anniversary, and nothing else about it.
revoke update on public.relationships from authenticated;
grant update (anniversary) on public.relationships to authenticated;

drop policy if exists "members set anniversary" on public.relationships;
create policy "members set anniversary" on public.relationships
  for update to authenticated
  using (user_one = auth.uid() or user_two = auth.uid())
  with check (user_one = auth.uid() or user_two = auth.uid());

-- 3. Time zones -------------------------------------------------------------

alter table public.profiles
  add column if not exists timezone text;

-- 4. Bucket list ------------------------------------------------------------

do $$
declare
  id_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
    into id_type
    from pg_attribute a
   where a.attrelid = 'public.relationships'::regclass
     and a.attname = 'id';

  execute format($f$
    create table if not exists public.bucket_items (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      created_by uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      title text not null check (char_length(title) between 1 and 120),
      done boolean not null default false,
      done_at timestamptz,
      created_at timestamptz not null default now()
    )
  $f$, id_type);
end
$$;

create index if not exists bucket_items_relationship_idx
  on public.bucket_items (relationship_id, created_at);

alter table public.bucket_items enable row level security;

drop policy if exists "partners manage bucket list" on public.bucket_items;
create policy "partners manage bucket list" on public.bucket_items
  for all to authenticated
  using (
    relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
  )
  with check (
    relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
  );

-- 5. Photos on memories -----------------------------------------------------

alter table public.memories
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'memory-photos', 'memory-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Photos live in a folder named after the relationship, and only its two
-- members can see, add or remove them.
drop policy if exists "partners read memory photos" on storage.objects;
create policy "partners read memory photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'memory-photos'
    and (storage.foldername(name))[1] in (
      select r.id::text from public.relationships r
       where r.user_one = auth.uid() or r.user_two = auth.uid()
    )
  );

drop policy if exists "partners add memory photos" on storage.objects;
create policy "partners add memory photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'memory-photos'
    and (storage.foldername(name))[1] in (
      select r.id::text from public.relationships r
       where r.user_one = auth.uid() or r.user_two = auth.uid()
    )
  );

drop policy if exists "partners remove memory photos" on storage.objects;
create policy "partners remove memory photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'memory-photos'
    and (storage.foldername(name))[1] in (
      select r.id::text from public.relationships r
       where r.user_one = auth.uid() or r.user_two = auth.uid()
    )
  );
