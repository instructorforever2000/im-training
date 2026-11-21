// الصلاحيات التفصيلية (Capabilities): what the current person may do beyond viewing.
// Owner → everything · member → what the invite granted (null = everything the role allows) · visitor → viewing only.
// Writes are also enforced in the database (private.training_staff needs "edit"); print/download/reports/
// certificates are client actions, so the UI locks them and explains politely.
import { useSyncExternalStore } from "react"
import capsCfg from "./caps.json"

export type Cap = "edit" | "print" | "download" | "reports" | "certificates"
export type SectionKey = "program" | "assessment" | "tournaments" | "squad" | "library" | "board" | "roles" | "learning"

interface CapInfo { readonly k: Cap; readonly ar: string; readonly en: string; readonly note: string }
export const CAPS: readonly CapInfo[] = capsCfg.caps as CapInfo[]
export const SECTIONS: readonly { k: SectionKey; ar: string; en: string }[] = capsCfg.sections as { k: SectionKey; ar: string; en: string }[]
export const ALL_CAPS: readonly Cap[] = CAPS.map((c) => c.k)

/** role: "owner" · a membership role (coach, parent…) · null = visitor. */
interface Grant { caps: ReadonlySet<Cap>; sections: ReadonlySet<SectionKey> | null; role: string | null }
const FULL: Grant = { caps: new Set(ALL_CAPS), sections: null, role: "owner" }
const NONE: Grant = { caps: new Set(), sections: null, role: null }
const ROLE_DEFAULTS = capsCfg.roleDefaults as Record<string, readonly string[]>
let grant: Grant = NONE
let applied = false
const sig = (g: Grant): string => [...g.caps].sort().join() + "|" + (g.sections ? [...g.sections].sort().join() : "*") + "|" + (g.role ?? "")
const subs = new Set<() => void>()

/** Called once the app knows who is here. caps null = what the role allows (caps.json roleDefaults); sections null/empty = all. */
export function setGrant(caps: readonly string[] | null | "all" | "none", sections: readonly string[] | null = null, role?: string | null): void {
  const known = new Set<string>(ALL_CAPS)
  const preset: Record<string, Grant> = { all: FULL, none: NONE }
  const pick = (list: readonly string[]): Grant => ({ caps: new Set(list.filter((c) => known.has(c)) as Cap[]), sections: null, role: role ?? null })
  const byRole = (role && ROLE_DEFAULTS[role]) || ALL_CAPS
  const base = typeof caps === "string" ? preset[caps] : pick(caps ?? byRole)
  const next: Grant = { caps: base.caps, sections: sections && sections.length ? new Set(sections as SectionKey[]) : null, role: role === undefined ? base.role : role }
  if (applied && sig(next) === sig(grant)) return
  applied = true
  grant = next
  // Ctrl+P / browser print is blocked too when printing is not granted (see index.css).
  if (next.caps.has("print")) delete document.documentElement.dataset.noprint; else document.documentElement.dataset.noprint = ""
  // Called while the app renders: tell subscribers after this render finishes.
  queueMicrotask(() => subs.forEach((f) => f()))
}
const subscribe = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f) } }
const snap = (): Grant => grant

export const can = (c: Cap): boolean => grant.caps.has(c)
export const canOpen = (s: string): boolean => !grant.sections || grant.sections.has(s as SectionKey)
export function useCan(c: Cap): boolean { return useSyncExternalStore(subscribe, snap).caps.has(c) }

/** Coaching staff — same list as private.training_staff in the database (sees team rosters). */
const STAFF: ReadonlySet<string> = new Set(["owner", "org_admin", "technical_director", "coach", "fitness_coach", "supervisor"])
/** Who may create/edit teams — same as the teams_write policy. */
const TEAM_ADMINS: ReadonlySet<string> = new Set(["owner", "org_admin", "technical_director"])
/** Who may add players — same as the players_write policy. */
const ROSTER_EDITORS: ReadonlySet<string> = new Set([...TEAM_ADMINS, "coach"])
export interface Who { readonly role: string | null; readonly staff: boolean; readonly teamAdmin: boolean; readonly rosterEditor: boolean }
export function useWho(): Who {
  const role = useSyncExternalStore(subscribe, snap).role
  return { role, staff: !!role && STAFF.has(role), teamAdmin: !!role && TEAM_ADMINS.has(role), rosterEditor: !!role && ROSTER_EDITORS.has(role) }
}

/** Runs the action when allowed; otherwise shows a short, polite note (no "request an invite"). */
export function guard(c: Cap, action: () => void): void {
  if (can(c)) { action(); return }
  const info = CAPS.find((x) => x.k === c)
  showNote(`${info?.ar ?? ""} — ${capsCfg.lockedNote}`, info?.note ?? "")
}

const NOTE_MS = 3800
function showNote(title: string, sub: string): void {
  document.querySelector(".cap-note")?.remove()
  const el = document.createElement("div")
  el.className = "cap-note"
  el.setAttribute("role", "status")
  const b = document.createElement("b"); b.textContent = "✦ " + title
  const s = document.createElement("small"); s.textContent = sub
  el.append(b, s)
  document.body.append(el)
  window.setTimeout(() => el.remove(), NOTE_MS)
}

/** Prints the page when the capability is granted (a certificate needs "certificates", not "print"). */
export function printWith(c: Cap): void {
  guard(c, () => {
    const root = document.documentElement
    const blocked = root.dataset.noprint !== undefined
    delete root.dataset.noprint
    window.print()
    if (blocked) root.dataset.noprint = ""
  })
}
