-- Far But Together: privacy tightening.
--  * People are found with a private friend code instead of a public list.
--  * You can only see the names of people you're connected to.
--  * Community posts come through a function that shows author names.
--  * Anyone can delete their own account.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once. The last line shows your current
-- security rules, which you can check or paste back to me.

-- 1. Friend codes -------------------------------------------------------------

alter table public.profiles
  add column if not exists friend_code text;

create or replace function public.make_friend_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  candidate text;
  i int;
begin
  loop
    bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    candidate := '';

    for i in 0..7 loop
      candidate := candidate
        || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;

    exit when not exists (
      select 1 from public.profiles where friend_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.set_friend_code()
returns trigger
language plpgsql
as $$
begin
  if new.friend_code is null then
    new.friend_code := public.make_friend_code();
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_friend_code on public.profiles;
create trigger profiles_friend_code
  before insert on public.profiles
  for each row execute function public.set_friend_code();

-- Give everyone who already has a profile a code.
do $$
declare
  r record;
begin
  for r in select id from public.profiles where friend_code is null loop
    update public.profiles
       set friend_code = public.make_friend_code()
     where id = r.id;
  end loop;
end
$$;

create unique index if not exists profiles_friend_code_key
  on public.profiles (friend_code);

-- People can change only their name and time zone, never their code.
revoke update on public.profiles from authenticated;
grant update (display_name, timezone) on public.profiles to authenticated;

-- 2. Who can see whose profile ---------------------------------------------------

create or replace function public.can_see_profile(p_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_id = auth.uid()
    or exists (
      select 1 from public.friendships f
       where (f.user_one = auth.uid() and f.user_two = p_id)
          or (f.user_two = auth.uid() and f.user_one = p_id)
    )
    or exists (
      select 1 from public.relationships r
       where (r.user_one = auth.uid() and r.user_two = p_id)
          or (r.user_two = auth.uid() and r.user_one = p_id)
    )
    or exists (
      select 1 from public.friend_requests q
       where (q.sender_id = auth.uid() and q.receiver_id = p_id)
          or (q.receiver_id = auth.uid() and q.sender_id = p_id)
    )
    or exists (
      select 1 from public.significant_other_requests q
       where (q.sender_id = auth.uid() and q.receiver_id = p_id)
          or (q.receiver_id = auth.uid() and q.sender_id = p_id)
    );
$$;

revoke all on function public.can_see_profile(uuid) from public;
grant execute on function public.can_see_profile(uuid) to authenticated;

-- Replace every existing read rule on profiles with one strict rule.
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.profiles', r.policyname);
  end loop;
end
$$;

create policy "see yourself and people you are connected to" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.can_see_profile(id));

-- 3. Finding someone by their code -----------------------------------------------

create or replace function public.find_profile_by_code(p_code text)
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.display_name
    from public.profiles p
   where auth.uid() is not null
     and p.id <> auth.uid()
     and p.friend_code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))
   limit 1;
$$;

revoke all on function public.find_profile_by_code(text) from public;
grant execute on function public.find_profile_by_code(text) to authenticated;

-- 4. Community posts with author names -------------------------------------------

create or replace function public.community_feed()
returns table (
  id uuid,
  author_id uuid,
  author_name text,
  body text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.author_id, coalesce(pr.display_name, 'Someone'), p.body,
         p.created_at
    from public.community_posts p
    left join public.profiles pr on pr.id = p.author_id
   where auth.uid() is not null
     and (
       p.author_id = auth.uid()
       or (
         not exists (
           select 1 from public.community_reports r
            where r.post_id = p.id and r.reporter_id = auth.uid()
         )
         and (
           select count(*) from public.community_reports r
            where r.post_id = p.id
         ) < 3
       )
     )
   order by p.created_at desc
   limit 100;
$$;

revoke all on function public.community_feed() from public;
grant execute on function public.community_feed() to authenticated;

-- 5. Delete my account ------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;

  delete from public.visits
   where relationship_id in (
     select id from public.relationships
      where user_one = uid or user_two = uid
   );
  delete from public.relationships where user_one = uid or user_two = uid;
  delete from public.friendships where user_one = uid or user_two = uid;
  delete from public.friend_requests where sender_id = uid or receiver_id = uid;
  delete from public.significant_other_requests
   where sender_id = uid or receiver_id = uid;
  delete from public.checkins where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- The rules now in place on the tables that hold your members' data. You
-- can read through them, or paste this result back to me to double-check.
select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and tablename in (
     'profiles', 'checkins', 'visits', 'relationships', 'friendships',
     'friend_requests', 'significant_other_requests'
   )
 order by tablename, policyname;
