// البطولات — fixed lookups (data over logic). Game list and system explanations come from legacy v28 content unchanged.
import games from "@/content/legacy-v28/games.json"
import systems from "@/content/legacy-v28/tournament-systems.json"
import type { System } from "./data"

export interface Game { k: string; cat: string; ar: string; en: string; m: string; pts: number[] }
export const GAMES = games as Game[]
export const gameOf = (k: string): Game | undefined => GAMES.find((g) => g.k === k)

/** Scoring families from games.json: head-to-head ones play matches, the rest are ranked by a result. */
const HEAD_TO_HEAD = new Set(["goals", "sets", "nodraw", "win", "chess"])
export const isHeadToHead = (g: Game | undefined): boolean => !!g && HEAD_TO_HEAD.has(g.m)
/** Families where a draw cannot stand (knockout needs a decider anyway; leagues give no draw points). */
export const allowsDraw = (g: Game | undefined): boolean => g?.m === "goals" || g?.m === "chess"

export const CATS: Record<string, string> = {
  team: "ألعاب جماعية", racket: "ألعاب المضرب", combat: "ألعاب المنازلات", athletics: "ألعاب القوى", aquatic: "الألعاب المائية",
  strength: "القوة واللياقة", target: "ألعاب الدقة", cue: "البلياردو والسنوكر", mind: "الألعاب الذهنية", esports: "الرياضات الإلكترونية",
  school: "ألعاب مدرسية", heritage: "ألعاب تراثية", culture: "مسابقات ثقافية", wheels: "العجلات", other: "أخرى",
}

export interface SystemMeta { ar: string; en: string; icon: string; legacy: string | null; note: string }
const SYS_TEXT = systems as { id: string; t: { ar: string; en: string }; b: { ar: string[]; en: string[] } }[]
export const SYSTEMS: Record<System, SystemMeta> = {
  league: { ar: "دوري", en: "League", icon: "◎", legacy: "sys-league", note: "كل فريق يقابل الجميع" },
  knockout: { ar: "خروج المغلوب", en: "Knockout", icon: "⟢", legacy: "sys-ko", note: "اللي يخسر يخرج" },
  mixed: { ar: "مجموعات ثم إقصائيات", en: "Groups + knockout", icon: "◫", legacy: "sys-groups", note: "الأنسب للمدارس والأكاديميات" },
  ranking: { ar: "ترتيب بالنتيجة", en: "Ranking", icon: "≡", legacy: null, note: "زمن · مسافة · نقاط تحكيم" },
}
export const systemRules = (s: System): string[] => SYS_TEXT.find((x) => x.id === SYSTEMS[s].legacy)?.b.ar ?? [
  "كل مشارك يسجّل نتيجته (زمن، أو مسافة، أو وزن، أو درجة تحكيم).",
  "الترتيب يتحسب تلقائي: الأقل أفضل في الزمن، والأعلى أفضل في المسافة والدرجات.",
  "مناسب لألعاب القوى والسباحة ورفع الأثقال والألعاب التحكيمية.",
]
export const HEAD_SYSTEMS: readonly System[] = ["league", "knockout", "mixed"]
export const MIN_ENTRIES = 2
export const MIN_PER_GROUP = 2
export const MAX_GROUPS = 8
export const QUALIFY_PER_GROUP = 2
