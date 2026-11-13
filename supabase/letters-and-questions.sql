-- Far But Together: "Open when" letters and the Question of the day.
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
    create table if not exists public.letters (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      author_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      recipient_id uuid not null
        references auth.users(id) on delete cascade,
      occasion text not null check (char_length(occasion) between 1 and 80),
      body text not null check (char_length(body) between 1 and 2000),
      created_at timestamptz not null default now(),
      opened_at timestamptz
    )
  $f$, id_type);

  execute format($f$
    create table if not exists public.question_answers (
      id uuid primary key default gen_random_uuid(),
      relationship_id %s not null
        references public.relationships(id) on delete cascade,
      user_id uuid not null default auth.uid()
        references auth.users(id) on delete cascade,
      question_day date not null,
      question text not null,
      answer text not null check (char_length(answer) between 1 and 1000),
      created_at timestamptz not null default now(),
      unique (relationship_id, user_id, question_day)
    )
  $f$, id_type);
end
$$;

-- Letters --------------------------------------------------------------------
-- The table has no read access at all. Letters are read through the two
-- functions below, so a letter stays sealed until its reader opens it.

alter table public.letters enable row level security;

drop policy if exists "write letters to partner" on public.letters;
create policy "write letters to partner" on public.letters
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

drop policy if exists "delete own letters" on public.letters;
create policy "delete own letters" on public.letters
  for delete to authenticated
  using (author_id = auth.uid());

-- Your letters: the ones you wrote (with their text) and the ones written
-- for you (text hidden until you open them).
create or replace function public.my_letters()
returns table (
  id uuid,
  author_id uuid,
  recipient_id uuid,
  occasion text,
  created_at timestamptz,
  opened_at timestamptz,
  body text
)
language sql
security definer
set search_path = public
stable
as $$
  select l.id, l.author_id, l.recipient_id, l.occasion, l.created_at,
         l.opened_at,
         case when l.author_id = auth.uid() or l.opened_at is not null
              then l.body else null end
    from public.letters l
   where l.author_id = auth.uid() or l.recipient_id = auth.uid()
   order by l.created_at desc;
$$;

-- Opens a letter written for you, and returns its text.
create or replace function public.open_letter(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
begin
  update public.letters
     set opened_at = coalesce(opened_at, now())
   where id = p_id and recipient_id = auth.uid()
  returning body into v_body;

  return v_body;
end;
$$;

revoke all on function public.my_letters() from public;
revoke all on function public.open_letter(uuid) from public;
grant execute on function public.my_letters() to authenticated;
grant execute on function public.open_letter(uuid) to authenticated;

-- Question of the day ---------------------------------------------------------
-- Your partner's answer stays hidden until you've answered the same day.

create or replace function public.has_answered(p_rel text, p_day date)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.question_answers a
     where a.relationship_id::text = p_rel
       and a.user_id = auth.uid()
       and a.question_day = p_day
  );
$$;

revoke all on function public.has_answered(text, date) from public;
grant execute on function public.has_answered(text, date) to authenticated;

alter table public.question_answers enable row level security;

drop policy if exists "read answers once answered" on public.question_answers;
create policy "read answers once answered" on public.question_answers
  for select to authenticated
  using (
    relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
    and (
      user_id = auth.uid()
      or public.has_answered(relationship_id::text, question_day)
    )
  );

drop policy if exists "answer as yourself" on public.question_answers;
create policy "answer as yourself" on public.question_answers
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and relationship_id in (
      select id from public.relationships
       where user_one = auth.uid() or user_two = auth.uid()
    )
  );

drop policy if exists "edit own answer" on public.question_answers;
create policy "edit own answer" on public.question_answers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
