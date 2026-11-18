-- Far But Together: allow more than one check-in per day.
-- Drops any rule that limits check-ins to one per person per day. The
-- primary key (the row's own id) is kept.
do $$
declare r record;
begin
  for r in
    select i.indexrelid::regclass as idx, c.conname
      from pg_index i
      left join pg_constraint c on c.conindid = i.indexrelid
     where i.indrelid = 'public.checkins'::regclass
       and i.indisunique
       and not i.indisprimary
  loop
    if r.conname is not null then
      execute format('alter table public.checkins drop constraint %I', r.conname);
    else
      execute format('drop index %s', r.idx);
    end if;
  end loop;
end $$;

-- Check: should list nothing but the primary key
select indexname, indexdef from pg_indexes
 where schemaname = 'public' and tablename = 'checkins';
