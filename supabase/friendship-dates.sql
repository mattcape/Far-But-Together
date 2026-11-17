-- Far But Together: remember when each friendship began, so a friend's page
-- can show how long you've been friends. Paste this into the Supabase SQL
-- Editor and click Run. It is safe to run more than once.
--
-- Friendships that already exist start counting from the day you run this,
-- unless your table already had a created_at column.

alter table public.friendships
  add column if not exists created_at timestamptz not null default now();

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'friendships'
 order by ordinal_position;
