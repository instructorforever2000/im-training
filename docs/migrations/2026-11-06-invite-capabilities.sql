-- صلاحيات الدعوة التفصيلية (per-invite capabilities and sections) — additive only, approved by the owner 2026-11-06.
-- null = everything the role allows (existing members keep their current access unchanged).
-- capabilities: edit (participate/add/change) · print · download (export files) · reports · certificates
-- sections: program · assessment · tournaments · squad · library · board · roles · learning
alter table public.invite_codes add column if not exists capabilities text[];
alter table public.invite_codes add column if not exists sections text[];
alter table public.memberships add column if not exists capabilities text[];
alter table public.invite_codes add constraint invite_codes_capabilities_known
  check (capabilities is null or capabilities <@ array['edit','print','download','reports','certificates']);
alter table public.memberships add constraint memberships_capabilities_known
  check (capabilities is null or capabilities <@ array['edit','print','download','reports','certificates']);

-- The invite's capabilities and sections pass to the new member.
create or replace function public.redeem_invite(p_code text)
 returns public.memberships
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_inv public.invite_codes;
  v_mem public.memberships;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  select * into v_inv from public.invite_codes
   where code = upper(trim(p_code)) and is_active
     and (expires_at is null or expires_at > now())
     and (max_uses is null or uses < max_uses)
   for update;
  if not found then
    raise exception 'Invalid or expired invite code' using errcode = 'P0002';
  end if;
  select * into v_mem from public.memberships
   where user_id = v_uid and org_id = v_inv.org_id and platform_id = v_inv.platform_id;
  if found then
    return v_mem;
  end if;
  insert into public.memberships (user_id, org_id, platform_id, role, invite_code_id, access_until, capabilities, sections)
  values (v_uid, v_inv.org_id, v_inv.platform_id, v_inv.default_role, v_inv.id,
          case when v_inv.access_days is null then null else now() + make_interval(days => v_inv.access_days) end,
          v_inv.capabilities, coalesce(v_inv.sections, '{}'))
  returning * into v_mem;
  update public.invite_codes set uses = uses + 1 where id = v_inv.id;
  insert into public.audit_log (actor_id, action, target_table, target_id, details)
  values (v_uid, 'invite_redeemed', 'memberships', v_mem.id::text,
          jsonb_build_object('code_id', v_inv.id, 'platform', v_inv.platform_id, 'org', v_inv.org_id, 'access_days', v_inv.access_days,
                             'capabilities', v_inv.capabilities, 'sections', v_inv.sections));
  return v_mem;
end $function$;

-- Writes (p_roles given) also need the "edit" capability; reads are unchanged.
create or replace function private.training_staff(p_org uuid, p_roles text[] default null::text[])
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select exists (select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.platform_id = 'training'
      and m.status = 'approved'
      and (m.access_until is null or m.access_until > now())
      and m.role::text = any(coalesce(p_roles, array['org_admin','technical_director','coach','fitness_coach','supervisor','viewer']))
      and (p_roles is null or m.capabilities is null or 'edit' = any(m.capabilities)));
$function$;
