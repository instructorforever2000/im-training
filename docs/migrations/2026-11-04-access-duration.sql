-- Applied 2026-11-04 with the owner's approval: viewer role + time-limited access from invite codes.
alter type public.member_role add value if not exists 'viewer';
alter table public.invite_codes add column if not exists access_days integer check (access_days is null or access_days between 1 and 3650);
alter table public.memberships add column if not exists access_until timestamptz;
-- redeem_invite: sets memberships.access_until = now() + access_days (when the code has a duration)
-- private.training_staff: ignores expired memberships; viewer reads like supervisor and never writes
