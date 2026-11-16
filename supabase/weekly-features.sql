-- Far But Together: photo of the day, saved date ideas, surprises, countdowns.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once.

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
    create table if not exists public.daily_photos (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      photo_day date not null,
      photo_path text not null,
      caption text check (char_length(caption) <= 140),
      created_at timestamptz not null default now(),
      unique (relationship_id, user_id, photo_day)
    )
  $f$, id_type);

  execute format($f$
    create table if not exists public.couple_date_ideas (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      created_by uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      title text not null check (char_length(title) between 1 and 80),
      notes text check (char_length(notes) <= 500),
      done_on date,
      created_at timestamptz not null default now()
    )
  $f$, id_type);

  execute format($f$
    create table if not exists public.countdowns (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      created_by uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      title text not null check (char_length(title) between 1 and 80),
      target_on date not null,
      created_at timestamptz not null default now()
    )
  $f$, id_type);

  execute format($f$
    create table if not exists public.surprises (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      author_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      recipient_id uuid not null
        references auth.users(id) on delete cascade,
      title text not null check (char_length(title) between 1 and 80),
      body text not null check (char_length(body) between 1 and 2000),
      unlock_on date not null,
      created_at timestamptz not null default now(),
      opened_at timestamptz
    )
  $f$, id_type);
end
$$;

-- Shared tables: both people in the relationship can read and change rows;
-- new rows must be created as yourself.
do $$
declare
  t text;
  who text;
begin
  foreach t in array array['couple_date_ideas', 'countdowns'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "partners read" on public.%I', t);
    execute format($p$
      create policy "partners read" on public.%I
        for select to authenticated
        using (relationship_id in (
          select id from public.relationships
           where user_one = auth.uid() or user_two = auth.uid()))
    $p$, t);

    execute format('drop policy if exists "partners add" on public.%I', t);
    execute format($p$
      create policy "partners add" on public.%I
        for insert to authenticated
        with check (
          created_by = auth.uid()
          and relationship_id in (
            select id from public.relationships
             where user_one = auth.uid() or user_two = auth.uid()))
    $p$, t);

    execute format('drop policy if exists "partners change" on public.%I', t);
    execute format($p$
      create policy "partners change" on public.%I
        for update to authenticated
        using (relationship_id in (
          select id from public.relationships
           where user_one = auth.uid() or user_two = auth.uid()))
        with check (relationship_id in (
          select id from public.relationships
           where user_one = auth.uid() or user_two = auth.uid()))
    $p$, t);

    execute format('drop policy if exists "partners remove" on public.%I', t);
    execute format($p$
      create policy "partners remove" on public.%I
        for delete to authenticated
        using (relationship_id in (
          select id from public.relationships
           where user_one = auth.uid() or user_two = auth.uid()))
    $p$, t);
  end loop;
end
$$;

-- Photo of the day: you both see the photos, but each person only adds,
-- replaces or removes their own.
alter table public.daily_photos enable row level security;

drop policy if exists "partners read photos" on public.daily_photos;
create policy "partners read photos" on public.daily_photos
  for select to authenticated
  using (
    relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
  );

drop policy if exists "add own photo" on public.daily_photos;
create policy "add own photo" on public.daily_photos
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
  );

drop policy if exists "change own photo" on public.daily_photos;
create policy "change own photo" on public.daily_photos
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "remove own photo" on public.daily_photos;
create policy "remove own photo" on public.daily_photos
  for delete to authenticated
  using (user_id = auth.uid());

-- Surprises: the table can't be read directly. Use the functions below, so
-- a surprise stays hidden from its recipient until its unlock day.
alter table public.surprises enable row level security;

drop policy if exists "write surprises to partner" on public.surprises;
create policy "write surprises to partner" on public.surprises
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.relationships r
       where r.id = relationship_id
         and (
           (r.user_one = auth.uid() and r.user_two = recipient_id)
           or (r.user_two = auth.uid() and r.user_one = recipient_id)
         )
    )
  );

drop policy if exists "delete own surprises" on public.surprises;
create policy "delete own surprises" on public.surprises
  for delete to authenticated
  using (author_id = auth.uid());

-- Your surprises: the ones you wrote (with their text), and the ones for you.
-- Text is hidden from the recipient until they open it on or after the unlock
-- day in their time zone.
create or replace function public.my_surprises(p_tz text default 'UTC')
returns table (
  id uuid,
  author_id uuid,
  recipient_id uuid,
  title text,
  unlock_on date,
  created_at timestamptz,
  opened_at timestamptz,
  unlocked boolean,
  body text
)
language sql
security definer
set search_path = public
stable
as $$
  select s.id, s.author_id, s.recipient_id, s.title, s.unlock_on,
         s.created_at, s.opened_at,
         s.unlock_on <= (now() at time zone p_tz)::date,
         case when s.author_id = auth.uid() or s.opened_at is not null
              then s.body else null end
    from public.surprises s
   where s.author_id = auth.uid() or s.recipient_id = auth.uid()
   order by s.unlock_on asc;
$$;

-- Opens a surprise written for you, but only once it has unlocked.
create or replace function public.open_surprise(p_id uuid, p_tz text default 'UTC')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
begin
  update public.surprises
     set opened_at = coalesce(opened_at, now())
   where id = p_id
     and recipient_id = auth.uid()
     and unlock_on <= (now() at time zone p_tz)::date
  returning body into v_body;

  return v_body;
end;
$$;

revoke all on function public.my_surprises(text) from public;
revoke all on function public.open_surprise(uuid, text) from public;
grant execute on function public.my_surprises(text) to authenticated;
grant execute on function public.open_surprise(uuid, text) to authenticated;

-- The rules now in place on the new tables.
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('daily_photos', 'couple_date_ideas', 'countdowns', 'surprises')
 order by tablename, policyname;
