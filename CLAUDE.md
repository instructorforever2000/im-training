# Instructor Motion Training — rules for Claude
- Owner: Mohamed Ayad. Arabic-first UI (RTL), English term beside Arabic. Bilingual app. No fake/demo names or data.
- ONE repository, ONE codebase: this repo (im-training). The old single-file platform lives in `legacy/v28/` as a READ-ONLY content source — never edit it, never serve it; port its content section by section into `src/features/<name>` and preserve all of it (plays, drills, skills, games, rules, tactical board). `legacy/v28/MIGRATION-NOTES.md` holds the v29 layout decisions to carry over.
- Only one Claude session works on this repo at a time.
- Data/auth: the shared parent Supabase project `instructor-motion` (platforms, organizations, memberships, invite_codes, audit_log). Every permission is per platform; this platform id is `training`.
- Discuss design changes with the owner before applying. Use the original logo unmodified (public/icon-*.png).
- Design DNA: command-center experience, not a traditional admin dashboard; the arena/venue is the screen in field tools; purposeful motion; role-aware UI. Approved mockups: `docs/design/`.
- Real names from coaching staff language (البرنامج اليومي، الوحدة التدريبية، الحالة البدنية للاعبين…), never marketing/AI-style names.
- Keep each feature self-contained; shared UI in src/components/ui; build must pass (npm run build) before every push.
- Session summary in D:\Claude-Work\01-IM-Training every ≤10 messages.
