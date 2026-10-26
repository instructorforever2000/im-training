-- APPLIED 2026-10-26 12:03 (owner approved) as migration org_edit_owner_only_delegable.
-- Rule from Mohamed (2026-10-26): editing an organization is the owner's right only;
-- he can delegate it to a specific person by adding 'org_edit' to that person's approved
-- membership sections. Only the owner can change sections. (Today org_admin can also edit.)
create or replace function private.can_edit_org(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
      and m.status = 'approved' and 'org_edit' = any(m.sections));
$$;
revoke all on function private.can_edit_org(uuid) from public;
grant execute on function private.can_edit_org(uuid) to authenticated;

drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update to authenticated
  using (public.is_owner() or private.can_edit_org(id))
  with check (public.is_owner() or private.can_edit_org(id));

create or replace function private.guard_member_sections() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.sections is distinct from old.sections and not public.is_owner() then
    raise exception 'only the owner can change delegated permissions' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists guard_member_sections on public.memberships;
create trigger guard_member_sections before update on public.memberships
  for each row execute function private.guard_member_sections();
