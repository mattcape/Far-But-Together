-- Far But Together: the team's message now changes once a day at 4 am and
-- disappears after 24 hours. Run supabase/mailbox.sql first.
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- It is safe to run more than once.

alter table public.messages
  add column if not exists team_day date;

-- Clear out the old team messages so there is at most one per person.
delete from public.messages where kind = 'team';

create unique index if not exists messages_one_team_per_person
  on public.messages (receiver_id) where kind = 'team';

-- Team messages older than 24 hours are no longer visible.
drop policy if exists "read own messages" on public.messages;
create policy "read own messages" on public.messages
  for select to authenticated
  using (
    sender_id = auth.uid()
    or (
      receiver_id = auth.uid()
      and (kind <> 'team' or created_at > now() - interval '24 hours')
    )
  );

-- Replaces the old version, which had no time zone argument.
drop function if exists public.issue_team_message();

create or replace function public.issue_team_message(p_tz text default 'America/New_York')
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
  tz text := p_tz;
  today date;
  n int;
begin
  if auth.uid() is null then
    return;
  end if;

  -- "Today" starts at 4 am in the person's own time zone.
  begin
    today := ((now() at time zone tz) - interval '4 hours')::date;
  exception when others then
    today := ((now() at time zone 'UTC') - interval '4 hours')::date;
  end;

  -- Already have today's message.
  if exists (
    select 1 from public.messages
     where receiver_id = auth.uid() and kind = 'team' and team_day = today
  ) then
    return;
  end if;

  -- Remove yesterday's, then add today's. The message is picked by day, so a
  -- person doesn't see a repeat for 40 days.
  delete from public.messages
   where receiver_id = auth.uid() and kind = 'team';

  n := today - date '2024-01-01';

  insert into public.messages (sender_id, receiver_id, kind, body, team_day)
  values (
    null,
    auth.uid(),
    'team',
    bank[((abs(hashtext(auth.uid()::text)::bigint) + n * 7) % array_length(bank, 1))::int + 1],
    today
  )
  on conflict (receiver_id) where kind = 'team' do nothing;
end;
$$;

revoke all on function public.issue_team_message(text) from public;
grant execute on function public.issue_team_message(text) to authenticated;
