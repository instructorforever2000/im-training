// مكتبة التمارين — the drill catalogue: international classification (sport · LTAD stage · goal · format),
// one standard card per drill with its 3D picture and permanent reference number.
import { useMemo, useState } from "react"
import { DRILLS, SPORTS, type Drill, type Sport } from "./content"
import {
  FORMATS, GOALS, NO_FILTER, QUALITY, STAGES, countBy, filterDrills, formatOf, goalLabel, goalOf, loadOf, refOf, sportsOf, stageOf,
  type Filters,
} from "./catalog"
import { DrillImage } from "./DrillImage"

const PAGE = 36
/** intensity scale of the source cards: 1 (low) … 4 (maximal) */
const INTENSITY_MAX = 4
const INTENSITY = Array.from({ length: INTENSITY_MAX }, (_, i) => i + 1)
const STAGGER = { cards: 12, ms: 30 }
const SPORT_KEYS = Object.keys(SPORTS) as Sport[]

export function Catalog({ dark, filters, setFilters, open }: { dark: boolean; filters: Filters; setFilters: (f: Filters) => void; open: (id: string, list: string[]) => void }): React.JSX.Element {
  const [shown, setShown] = useState(PAGE)
  const [openRail, setOpenRail] = useState(false)
  const list = useMemo(() => filterDrills(filters), [filters])
  const bySport = useMemo(() => countBy(filterDrills({ ...filters, sport: "all" }), (d) => sportsOf(d)[0]), [filters])
  const byGoal = useMemo(() => countBy(filterDrills({ ...filters, goal: "all" }), (d) => goalOf(d).startsWith("q:") ? "phys" : goalOf(d)), [filters])
  const byQ = useMemo(() => countBy(filterDrills({ ...filters, goal: "all" }).filter((d) => d.px && d.cat === "phys"), (d) => goalOf(d)), [filters])
  const byFormat = useMemo(() => countBy(filterDrills({ ...filters, format: "all" }), formatOf), [filters])
  const set = (p: Partial<Filters>): void => { setFilters({ ...filters, ...p }); setShown(PAGE) }
  const ctx = filters.sport === "all" ? undefined : filters.sport
  const ids = list.map((d) => d.id)
  const active = filters.sport !== "all" || filters.stage !== "all" || filters.format !== "all" || filters.goal !== "all" || filters.q !== ""
  const goalOn = (k: string): boolean => filters.goal === k || (k === "phys" && filters.goal.startsWith("q:"))

  return (
    <div className="cat">
      <aside className={`rail${openRail ? " open" : ""}`} aria-label="تصنيف التمارين">
        <label className="search"><span aria-hidden="true">⌕</span>
          <input id="lib-q" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder="ابحث بالاسم أو الرقم المرجعي…" aria-label="بحث في التمارين" /></label>

        <button className="ftoggle" onClick={() => setOpenRail(!openRail)} aria-expanded={openRail}>{openRail ? "إخفاء التصفية" : "التصفية حسب اللعبة والمرحلة والهدف"}{active ? " ●" : ""}</button>
        <section><h3>اللعبة <span className="en">Sport</span></h3>
          <div className="chips">
            <button className={`chip${filters.sport === "all" ? " on" : ""}`} onClick={() => set({ sport: "all" })}>كل الألعاب</button>
            {SPORT_KEYS.map((k) => <button key={k} className={`chip${filters.sport === k ? " on" : ""}`} onClick={() => set({ sport: k })}>{SPORTS[k].ar}<small>{bySport.get(k) ?? 0}</small></button>)}
          </div>
          <p className="hint">التمارين العامة تُعرض على ملعب اللعبة المختارة.</p>
        </section>

        <section><h3>المرحلة السنية <span className="en">LTAD stage</span></h3>
          <div className="stages">
            {STAGES.map((s) => (
              <button key={s.key} className={`stage${filters.stage === s.key ? " on" : ""}`} onClick={() => set({ stage: filters.stage === s.key ? "all" : s.key })}>
                <b>{s.ages}</b><span>{s.ar}<small className="en">{s.en}</small></span>
              </button>))}
          </div>
        </section>

        <section><h3>الهدف <span className="en">Training goal</span></h3>
          <div className="goals">
            {Object.entries(GOALS).map(([k, g]) => (
              <button key={k} className={`goal${goalOn(k) ? " on" : ""}`} style={{ "--c": g.color } as React.CSSProperties} onClick={() => set({ goal: goalOn(k) ? "all" : k })}>
                <i />{g.ar}<small>{byGoal.get(k) ?? 0}</small></button>))}
          </div>
          {goalOn("phys") && <div className="chips sub">{Object.entries(QUALITY).map(([q, l]) => { const k = `q:${q}`; return byQ.get(k) ? <button key={k} className={`chip${filters.goal === k ? " on" : ""}`} onClick={() => set({ goal: filters.goal === k ? "phys" : k })}>{l.ar}<small>{byQ.get(k)}</small></button> : null })}</div>}
        </section>

        <section><h3>شكل التمرين <span className="en">Format</span></h3>
          <div className="chips">{FORMATS.map((f) => <button key={f.key} className={`chip${filters.format === f.key ? " on" : ""}`} onClick={() => set({ format: filters.format === f.key ? "all" : f.key })}>{f.ar}<small>{byFormat.get(f.key) ?? 0}</small></button>)}</div>
        </section>
        {active && <button className="reset" onClick={() => set(NO_FILTER)}>↺ إلغاء التصفية</button>}
      </aside>

      <section className="results" aria-live="polite">
        <div className="rhead"><h2><b>{list.length}</b> تمرينًا <span className="mu">من {DRILLS.length}</span></h2>
          <span className="mu">كل تمرين ببطاقة موحّدة: الهدف · التنظيم · النقاط التعليمية · التدرّج · الحِمل</span></div>
        {list.length === 0 && <p className="empty">لا توجد تمارين بهذه المواصفات. خفّف التصفية أو غيّر كلمة البحث.</p>}
        <div className="grid">
          {list.slice(0, shown).map((d, i) => <Card key={d.id} d={d} i={i} ctx={ctx} dark={dark} onOpen={() => open(d.id, ids)} />)}
        </div>
        {shown < list.length && <button className="more" onClick={() => setShown(shown + PAGE)}>عرض المزيد ({list.length - shown})</button>}
      </section>
    </div>
  )
}

function Card({ d, i, ctx, dark, onOpen }: { d: Drill; i: number; ctx?: string; dark: boolean; onOpen: () => void }): React.JSX.Element {
  const g = goalLabel(goalOf(d)), st = STAGES.find((s) => s.key === stageOf(d)), fm = FORMATS.find((f) => f.key === formatOf(d))
  return (
    <button className="card" style={{ "--c": g.color, animationDelay: `${Math.min(i, STAGGER.cards) * STAGGER.ms}ms` } as React.CSSProperties} onClick={onOpen}>
      <DrillImage d={d} ctx={ctx} dark={dark} alt={`مشهد ثلاثي الأبعاد: ${d.ar.name}`} />
      <span className="ref">{refOf(d)}</span>
      <span className="body">
        <span className="gl"><i />{g.ar}</span>
        <b>{d.ar.name}</b>
        <span className="facts">
          <span title="المرحلة السنية">{st?.ages} س</span>
          <span>{fm?.ar}</span>
          <span>{d.dur}′</span>
          <span className="int" title={`الشدة ${d.int} من ${INTENSITY_MAX} · RPE ${d.rpe}`}>{INTENSITY.map((n) => <i key={n} className={n <= d.int ? "on" : ""} />)}</span>
          <span title="الحِمل = الدقائق × RPE">حِمل {loadOf(d)}</span>
        </span>
      </span>
    </button>
  )
}
