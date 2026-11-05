// المكتبة (Library) — approved merged direction, 27 Oct 2026:
// the coach's request is the main screen (Coach command) · a play opens in the 3D lab · a skill opens its knowledge map.
import { Suspense, lazy, useCallback, useEffect, useState } from "react"
import "./library.css"
import { DRILLS, PLAYS, SKILLS, type NodeKey } from "./content"
import { Dock } from "@/components/ui/Dock"
import { SkillMap } from "./SkillMap"
import { Catalog } from "./Catalog"
import { DrillView } from "./DrillView"
import { NO_FILTER, type Filters } from "./catalog"
import "./catalog.css"
import "./browse.css"
import { PlayBrowser, SkillBrowser, SkillPage } from "./Browse"
import { SessionPlanner } from "./Session"

const PlayLab = lazy(async () => ({ default: (await import("./PlayLab")).PlayLab }))

export type View = { v: "cmd" } | { v: "play"; id: string } | { v: "map"; key: NodeKey }
type Tab = "drills" | "session" | "plays" | "skills"
type Theme = "light" | "dark"
const THEME_KEY = "im-theme"
const TABS: readonly { key: Tab; ar: string; en: string }[] = [
  { key: "drills", ar: "التمارين", en: "Drills" },
  { key: "session", ar: "بناء وحدة تدريبية", en: "Session builder" },
  { key: "plays", ar: "الخطط المتحركة", en: "Animated plays" },
  { key: "skills", ar: "المهارات", en: "Skills" },
]

function readTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light" } catch { return "light" }
}

export function LibraryScreen(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [view, setView] = useState<View>({ v: "cmd" })
  const [tab, setTab] = useState<Tab>("drills")
  const [filters, setFilters] = useState<Filters>(NO_FILTER)
  const [drill, setDrill] = useState<{ id: string; list: string[] } | null>(null)
  const [extra, setExtra] = useState<string[]>([])
  const [skill, setSkill] = useState<string | null>(null)
  const flip = useCallback((): void => {
    setTheme((t) => { const n: Theme = t === "dark" ? "light" : "dark"; try { localStorage.setItem(THEME_KEY, n) } catch { /* private mode */ } return n })
  }, [])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [view, tab, skill])
  const dark = theme === "dark"
  const back = useCallback((): void => setDrill(null), [])
  const go = useCallback((id: string): void => setDrill((d) => (d ? { ...d, id } : d)), [])
  const add = (id: string): void => { setExtra((x) => (x.includes(id) ? x : [...x, id])); setDrill(null); setTab("session") }
  return (
    <div className="lib" data-theme={theme} dir="rtl">
      <Dock active="library" />
      {drill && <DrillView id={drill.id} list={drill.list} dark={dark} ctx={filters.sport === "all" ? undefined : filters.sport} back={back} go={go} addToSession={add} />}
      {!drill && view.v === "cmd" && (
        <div className="libv">
          <header className="lhead glass">
            <div className="ttl"><h1>المكتبة <span className="en">Library</span></h1>
              <p>{DRILLS.length} تمرينًا بصورة ثلاثية الأبعاد · {PLAYS.length} خطة متحركة · {SKILLS.length} مهارة — مصنّفة حسب اللعبة والمرحلة السنية والهدف وشكل التمرين</p></div>
            <nav className="tabs" role="tablist" aria-label="أقسام المكتبة">
              {TABS.map((t) => <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>{t.ar}<span className="en">{t.en}</span>{t.key === "session" && extra.length > 0 && <b className="badge">{extra.length}</b>}</button>)}
            </nav>
            <button className="chip" onClick={flip} title="الوضع الفاتح / الغامق">◐</button>
          </header>
          {tab === "drills" && <Catalog dark={dark} filters={filters} setFilters={setFilters} open={(id, list) => setDrill({ id, list })} />}
          {tab === "session" && <SessionPlanner key={extra.join()} extra={extra} openDrill={(id, list) => setDrill({ id, list })} />}
          {tab === "plays" && <PlayBrowser open={setView} />}
          {tab === "skills" && !skill && <SkillBrowser openSkill={setSkill} />}
          {tab === "skills" && skill && <SkillPage id={skill} dark={dark} back={() => setSkill(null)} open={setView} openDrill={(id, list) => setDrill({ id, list })} />}
        </div>
      )}
      {!drill && view.v === "play" && <Suspense fallback={<div className="cmdv"><p className="wrap">…</p></div>}><PlayLab id={view.id} open={setView} flip={flip} theme={theme} /></Suspense>}
      {!drill && view.v === "map" && <SkillMap start={view.key} open={setView} flip={flip} />}
    </div>
  )
}

