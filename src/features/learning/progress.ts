// مركز التعلّم — learner progress, kept on this device until the learning tables are added to the database.
// One small adapter so the storage can move to Supabase later without touching the screens.

export interface UnitResult { readonly best: number; readonly at: string }
export interface Progress { readonly units: Readonly<Record<string, UnitResult>>; readonly name: string }

const KEY = "im-learning-progress-v1"
const EMPTY: Progress = { units: {}, name: "" }
export const PASS_PCT = 80

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as Partial<Progress>
    return { units: p.units ?? {}, name: p.name ?? "" }
  } catch {
    return EMPTY
  }
}

function save(p: Progress): Progress {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* private mode: progress lives for this visit only */ }
  return p
}

export function recordUnit(p: Progress, id: string, pct: number): Progress {
  const prev = p.units[id]
  if (prev && prev.best >= pct) return p
  return save({ ...p, units: { ...p.units, [id]: { best: pct, at: new Date().toISOString() } } })
}

export const setName = (p: Progress, name: string): Progress => save({ ...p, name })
export const passed = (p: Progress, id: string): boolean => (p.units[id]?.best ?? 0) >= PASS_PCT

/** Short verification code printed on a certificate: same holder + level + date → same code. */
export function certCode(name: string, level: string, date: string): string {
  const BASE = 36, MOD = 2_147_483_647, MUL = 31, LEN = 8, SEED = 7
  const h = [...`${name}|${level}|${date}`].reduce((a, ch) => (a * MUL + (ch.codePointAt(0) ?? 0)) % MOD, SEED)
  return `IM-${h.toString(BASE).toUpperCase().padStart(LEN, "0").slice(-LEN)}`
}
