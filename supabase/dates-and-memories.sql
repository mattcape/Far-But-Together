-- Far But Together: tables for the Dates and Memories pages.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once.

-- The relationship_id column is created with the same type as
-- relationships.id, so this works whether your ids are uuids or numbers.
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
    create table if not exists public.dates (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      created_by uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      title text not null,
      date_on date not null,
      notes text,
      created_at timestamptz not null default now()
    )
  $f$, id_type);

  execute format($f$
    create table if not exists public.memories (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      created_by uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      title text not null,
      body text,
      memory_date date not null default current_date,
      created_at timestamptz not null default now()
    )
  $f$, id_type);
end
$$;

create index if not exists dates_relationship_idx
  on public.dates (relationship_id, date_on);
create index if not exists memories_relationship_idx
  on public.memories (relationship_id, memory_date desc);

-- Only the two people in a relationship can see or change its rows.
alter table public.dates enable row level security;
alter table public.memories enable row level security;

drop policy if exists "partners manage dates" on public.dates;
create policy "partners manage dates" on public.dates
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

drop policy if exists "partners manage memories" on public.memories;
create policy "partners manage memories" on public.memories
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
