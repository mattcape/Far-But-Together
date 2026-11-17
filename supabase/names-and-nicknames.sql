-- Far But Together: one name change per person, and private friend nicknames.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once.

-- 1. Count how many times each person has changed their name. The app can't
--    edit this column directly (only display_name and timezone are editable).
alter table public.profiles
  add column if not exists name_changes integer not null default 0;

-- Setting a name for the first time is free. After that, one change is
-- allowed. A new profile always starts at zero, whatever the app sends.
create or replace function public.limit_name_changes()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.name_changes := 0;
    return new;
  end if;

  new.name_changes := old.name_changes;

  if new.display_name is distinct from old.display_name
     and coalesce(btrim(old.display_name), '') <> '' then
    if old.name_changes >= 1 then
      raise exception 'You can only change your name once.'
        using errcode = 'P0001';
    end if;

    new.name_changes := old.name_changes + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists limit_name_changes on public.profiles;
create trigger limit_name_changes
  before insert or update on public.profiles
  for each row execute function public.limit_name_changes();

-- 2. Nicknames: a private label only you see, changeable as often as you like.
create table if not exists public.friend_nicknames (
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  friend_id uuid not null
    references auth.users(id) on delete cascade,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 30),
  updated_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  check (owner_id <> friend_id)
);

alter table public.friend_nicknames enable row level security;

drop policy if exists "see own nicknames" on public.friend_nicknames;
create policy "see own nicknames" on public.friend_nicknames
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "add own nicknames" on public.friend_nicknames;
create policy "add own nicknames" on public.friend_nicknames
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "change own nicknames" on public.friend_nicknames;
create policy "change own nicknames" on public.friend_nicknames
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "remove own nicknames" on public.friend_nicknames;
create policy "remove own nicknames" on public.friend_nicknames
  for delete to authenticated using (owner_id = auth.uid());

-- The rules now in place.
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public' and tablename = 'friend_nicknames'
 order by policyname;
