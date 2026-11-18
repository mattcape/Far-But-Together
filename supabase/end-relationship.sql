-- Far But Together: make "End relationship" reliable.
--
-- Before this, ending a relationship deleted the row straight from the
-- browser. If the database quietly refused (no rows deleted, no error), the
-- app still said "ended" and the old relationship, its anniversary and the
-- "You have a partner" lock stayed behind. This function does the whole job
-- on the server and says whether it worked.

drop policy if exists "end own relationship" on public.relationships;
create policy "end own relationship" on public.relationships
  for delete to authenticated
  using (user_one = auth.uid() or user_two = auth.uid());

create or replace function public.end_relationship(
  p_id public.relationships.id%type
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the two people in the relationship can end it.
  if not exists (
    select 1 from public.relationships r
     where r.id = p_id
       and (r.user_one = auth.uid() or r.user_two = auth.uid())
  ) then
    return false;
  end if;

  delete from public.visits where relationship_id = p_id;
  delete from public.relationships where id = p_id;

  return true;
end;
$$;

revoke all on function public.end_relationship(public.relationships.id%type) from public, anon;
grant execute on function public.end_relationship(public.relationships.id%type) to authenticated;

-- Check: every relationship you have, so a leftover one is easy to spot.
-- (Each person should be in at most one.)
select r.id, u1.email as user_one, u2.email as user_two, r.anniversary
  from public.relationships r
  join auth.users u1 on u1.id = r.user_one
  join auth.users u2 on u2.id = r.user_two
 order by r.anniversary nulls last;
