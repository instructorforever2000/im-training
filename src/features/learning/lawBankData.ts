// بيانات بنك القوانين (Laws bank data) — every rules question, by sport and law/chapter. Kept apart from the screen so it can be shared.
import legacy from "@/content/legacy-v28/quiz-bank.json"
import cur from "./curriculum.json"
import football from "./laws/football.json"
import futsal from "./laws/futsal.json"
import basketball from "./laws/basketball.json"
import handball from "./laws/handball.json"
import volleyball from "./laws/volleyball.json"
import comp from "./laws/comp.json"

export type Row = readonly [string, string, string, string, string, string]
export interface LawQ { readonly sp: string; readonly ch: string; readonly row: Row }

export const GENERAL = "أسئلة عامة"
export const MIXED = "مواقف متنوعة"
const FILES: Record<string, readonly { ch: string; q: Row }[]> = { football, futsal, basketball, handball, volleyball, comp } as unknown as Record<string, readonly { ch: string; q: Row }[]>
export const LAW_BANK: readonly LawQ[] = [
  ...(legacy as unknown as readonly { sp: string; ar: Row }[]).map((x) => ({ sp: x.sp, ch: GENERAL, row: x.ar })),
  ...Object.entries(cur.lawBank as unknown as Record<string, readonly Row[]>).flatMap(([sp, rows]) => rows.map((row) => ({ sp, ch: MIXED, row }))),
  ...Object.entries(FILES).flatMap(([sp, rows]) => rows.map((r) => ({ sp, ch: r.ch, row: r.q }))),
]
