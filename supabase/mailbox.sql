-- Far But Together: mailbox, "thinking of you" nudges, and daily team messages.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid default auth.uid() references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'nudge', 'team')),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_receiver_idx
  on public.messages (receiver_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "read own messages" on public.messages;
create policy "read own messages" on public.messages
  for select to authenticated
  using (receiver_id = auth.uid() or sender_id = auth.uid());

-- You can send to your partner or your friends, as yourself, at most one
-- message every 5 seconds. Team messages are only made by the function below.
drop policy if exists "send messages" on public.messages;
create policy "send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and receiver_id <> auth.uid()
    and kind in ('note', 'nudge')
    and (
      exists (
        select 1 from public.friendships f
         where (f.user_one = auth.uid() and f.user_two = receiver_id)
            or (f.user_two = auth.uid() and f.user_one = receiver_id)
      )
      or exists (
        select 1 from public.relationships r
         where (r.user_one = auth.uid() and r.user_two = receiver_id)
            or (r.user_two = auth.uid() and r.user_one = receiver_id)
      )
    )
    and not exists (
      select 1 from public.messages m
       where m.sender_id = auth.uid()
         and m.created_at > now() - interval '5 seconds'
    )
  );

-- The person it was sent to can mark it read, and nothing else about it.
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

drop policy if exists "mark own messages read" on public.messages;
create policy "mark own messages read" on public.messages
  for update to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

drop policy if exists "delete received messages" on public.messages;
create policy "delete received messages" on public.messages
  for delete to authenticated
  using (receiver_id = auth.uid());

-- Each time someone opens the site, the app calls this to drop a fresh
-- uplifting message from the Far But Together team into their mailbox.
-- It avoids repeating the person's last 10 team messages.
create or replace function public.issue_team_message()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bank text[] := array[
    'You are doing better than you think. Keep going.',
    'Distance is just a number. What you two share is real.',
    'Every day apart is a day closer to the next hello.',
    'Be proud of yourself for showing up today.',
    'Small acts of love add up. Today''s counts too.',
    'You are allowed to miss someone and still have a great day.',
    'Love that travels this far is strong love.',
    'Take a deep breath. You have handled every hard day so far.',
    'Someone out there is smiling because of you.',
    'Your effort to stay close does not go unnoticed.',
    'Today is a good day to tell someone what they mean to you.',
    'Progress, not perfection. You are on your way.',
    'The best things are worth waiting for, and you are proof.',
    'You bring more light into the world than you realize.',
    'Rest is part of the work. Be gentle with yourself today.',
    'Your next reunion is getting closer with every sunrise.',
    'Kindness costs nothing and means everything. Pass some along.',
    'You are enough, exactly as you are today.',
    'A short message can change someone''s whole day. Send one.',
    'Courage is loving someone from far away and doing it anyway.',
    'Look how far you have come together.',
    'It is okay to have a hard day. Tomorrow is a new page.',
    'Your patience is a quiet kind of strength.',
    'Hold on to the good moments. They are building something lasting.',
    'You make the people around you feel seen. Thank you.',
    'Trust the plan you two are making. It is working.',
    'Gratitude turns a regular day into a good one. What are you thankful for?',
    'No distance is too great for people who keep choosing each other.',
    'You have what it takes to make today meaningful.',
    'Remember the last time you laughed together. Smile about it now.',
    'Believe in the version of the future you are working toward.',
    'Even on cloudy days, the sun is still up there. So is your person.',
    'Do one thing today that your future self will thank you for.',
    'You are loved more than you know.',
    'Every check-in is a little bridge between you. Keep building it.',
    'Your story is still being written, and it is a good one.',
    'Be the reason someone feels cared for today.',
    'The distance will end. What you are building will not.',
    'Celebrate small wins. They are the big ones in disguise.',
    'Warm thoughts are on their way to you from all of us at Far But Together.'
  ];
  pick text;
begin
  if auth.uid() is null then
    return;
  end if;

  select b into pick
    from unnest(bank) as b
   where b not in (
     select body from public.messages
      where receiver_id = auth.uid() and kind = 'team'
      order by created_at desc
      limit 10
   )
   order by random()
   limit 1;

  if pick is null then
    pick := bank[1 + floor(random() * array_length(bank, 1))::int];
  end if;

  insert into public.messages (sender_id, receiver_id, kind, body)
  values (null, auth.uid(), 'team', pick);
end;
$$;

revoke all on function public.issue_team_message() from public;
grant execute on function public.issue_team_message() to authenticated;
