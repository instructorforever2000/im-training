// المكتبة — browsing the animated plays and the skills: everything listed from the start, filtered by sport, category and level.
// A skill opens a clear coaching page (what it is, teaching points, errors and corrections, progression, linked drills and plays).
import { useMemo, useState } from "react"
import { DRILLS, PLAYS, PLAY_CAT, SKILLS, SKILL_CAT, SPORTS, playSport, textMatch, type Skill, type Sport } from "./content"
import { DrillImage } from "./DrillImage"
import type { View } from "./LibraryScreen"

const ALL = "all"
const GENERAL = "general"
// Progression steps: splits "لمستان ← لمسة واحدة" into ["لمستان", "لمسة واحدة"]; a text with no arrow stays whole.
// https://regex101.com/?flavor=javascript&regex=%5Cs*%E2%86%90%5Cs*&testString=%D9%84%D9%85%D8%B3%D8%AA%D8%A7%D9%86%20%E2%86%90%20%D9%84%D9%85%D8%B3%D8%A9
const PROG_SPLIT_RE = /\s*←\s*/
const LEVEL_NAMES = ["مبتدئ", "متوسط", "متقدم"] as const
const LEVELS = LEVEL_NAMES.map((_, i) => i + 1)
const LEVEL_NAME: Record<number, string> = Object.fromEntries(LEVEL_NAMES.map((n, i) => [i + 1, n]))
const SKILL_COLOR: Record<string, string> = { tech: "#1FB5A8", tact: "#5b6fe0", gk: "#e09a1c" }

function Chips<T extends string | number>({ items, value, set, label }: { items: readonly { key: T; ar: string; n: number }[]; value: T | typeof ALL; set: (v: T | typeof ALL) => void; label: string }): React.JSX.Element {
  const total = items.reduce((a, x) => a + x.n, 0)
  return (
    <div className="frow"><span className="fl">{label}</span>
      <div className="chips">
        <button className={`chip${value === ALL ? " on" : ""}`} onClick={() => set(ALL)}>الكل <small>{total}</small></button>
        {items.filter((x) => x.n).map((x) => <button key={String(x.key)} className={`chip${value === x.key ? " on" : ""}`} onClick={() => set(x.key)}>{x.ar} <small>{x.n}</small></button>)}
      </div></div>
  )
}

// ---------------- Animated plays ----------------
export function PlayBrowser({ open }: { open: (v: View) => void }): React.JSX.Element {
  const [q, setQ] = useState("")
  const [sp, setSp] = useState<string>(ALL)
  const [cat, setCat] = useState<string>(ALL)
  const sportOf = (id: string): string => { const p = PLAYS.find((x) => x.id === id); return (p && playSport(p)) ?? GENERAL }
  const bySport = PLAYS.filter((p) => sp === ALL || sportOf(p.id) === sp)
  const xs = bySport.filter((p) => (cat === ALL || p.cat === cat) && textMatch(q, p.name.ar, p.name.en, p.desc.ar))
  const sports = [...(Object.keys(SPORTS) as Sport[]).map((k) => ({ key: k as string, ar: SPORTS[k].ar, n: PLAYS.filter((p) => sportOf(p.id) === k).length })), { key: GENERAL, ar: "أنشطة عامة", n: PLAYS.filter((p) => sportOf(p.id) === GENERAL).length }]
  const cats = Object.entries(PLAY_CAT).map(([k, v]) => ({ key: k, ar: v.ar, n: bySport.filter((p) => p.cat === k).length }))
  const groups = Object.keys(PLAY_CAT).filter((k) => xs.some((p) => p.cat === k))
  return (
    <section className="browse">
      <div className="bfilters glass">
        <p className="intro">كل خطة تتحرك على ملعب ثلاثي الأبعاد خطوة بخطوة: افتحها، ثم اضغط ▶ لتشاهد حركة اللاعبين والكرة مع شرح كل خطوة.</p>
        <label className="search"><span aria-hidden="true">⌕</span><input id="lib-pq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في الخطط: ضغط، بناء، مرتد…" aria-label="بحث في الخطط" /></label>
        <Chips label="اللعبة" items={sports} value={sp} set={(v) => { setSp(v); setCat(ALL) }} />
        <Chips label="نوع الخطة" items={cats} value={cat} set={setCat} />
      </div>
      <div className="bres">
        <h2 className="bcount"><b>{xs.length}</b> خطة متحركة</h2>
        {groups.map((g) => (
          <div key={g} className="bgroup" style={{ "--c": PLAY_CAT[g].color } as React.CSSProperties}>
            <h3><i />{PLAY_CAT[g].ar} <span className="en">{PLAY_CAT[g].en}</span><small>{xs.filter((p) => p.cat === g).length}</small></h3>
            <div className="bgrid">{xs.filter((p) => p.cat === g).map((p) => {
              const a = p.tokens.filter((t) => t[0].startsWith("a")).length
              return (
                <button key={p.id} className="bcard" onClick={() => open({ v: "play", id: p.id })}>
                  <span className="bt"><b>{p.name.ar}</b><span className="en">{p.name.en}</span></span>
                  <p>{p.desc.ar}</p>
                  <span className="bm"><span>{sportOf(p.id) === GENERAL ? "أنشطة عامة" : SPORTS[sportOf(p.id) as Sport].ar}</span><span>{p.steps.length} خطوات</span><span dir="ltr">{a}v{p.tokens.length - a}</span><span className="go">▶ تشغيل</span></span>
                </button>
              )
            })}</div>
          </div>
        ))}
        {!xs.length && <p className="empty">لا توجد خطط مطابقة. غيّر اللعبة أو نوع الخطة أو كلمة البحث.</p>}
      </div>
    </section>
  )
}

// ---------------- Skills ----------------
export function SkillBrowser({ openSkill }: { openSkill: (id: string) => void }): React.JSX.Element {
  const [q, setQ] = useState("")
  const [sp, setSp] = useState<string>(ALL)
  const [cat, setCat] = useState<string>(ALL)
  const [lvl, setLvl] = useState<number | typeof ALL>(ALL)
  const bySport = SKILLS.filter((s) => sp === ALL || s.sp === sp)
  const xs = bySport.filter((s) => (cat === ALL || s.cat === cat) && (lvl === ALL || s.lvl === lvl) && textMatch(q, s.ar.n, s.en.n, s.ar.w))
  const sports = (Object.keys(SPORTS) as Sport[]).map((k) => ({ key: k as string, ar: SPORTS[k].ar, n: SKILLS.filter((s) => s.sp === k).length }))
  const cats = Object.entries(SKILL_CAT).map(([k, v]) => ({ key: k, ar: v.ar, n: bySport.filter((s) => s.cat === k).length }))
  const lvls = LEVELS.map((l) => ({ key: l as number, ar: LEVEL_NAME[l], n: bySport.filter((s) => s.lvl === l).length }))
  return (
    <section className="browse">
      <div className="bfilters glass">
        <p className="intro">بطاقة لكل مهارة: ما هي، ونقاط التعليم، والأخطاء الشائعة وطريقة تصحيحها، والتدرّج، والتمارين التي تبنيها، والخطط التي تظهر فيها.</p>
        <label className="search"><span aria-hidden="true">⌕</span><input id="lib-sq" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في المهارات: تمرير، تسديد، استلام…" aria-label="بحث في المهارات" /></label>
        <Chips label="اللعبة" items={sports} value={sp} set={(v) => { setSp(v); setCat(ALL); setLvl(ALL) }} />
        <Chips label="النوع" items={cats} value={cat} set={setCat} />
        <Chips label="المستوى" items={lvls} value={lvl} set={setLvl} />
      </div>
      <div className="bres">
        <h2 className="bcount"><b>{xs.length}</b> مهارة</h2>
        <div className="bgrid">{xs.map((s) => (
          <button key={s.id} className="bcard sk" style={{ "--c": SKILL_COLOR[s.cat] } as React.CSSProperties} onClick={() => openSkill(s.id)}>
            <span className="bt"><b>{s.ar.n}</b><span className="en">{s.en.n}</span></span>
            <p>{s.ar.w}</p>
            <span className="bm"><span>{SPORTS[s.sp].ar}</span><span>{SKILL_CAT[s.cat].ar}</span><span>{LEVEL_NAME[s.lvl]}</span><span>من {s.age} سنوات</span><span className="go">افتح البطاقة ←</span></span>
          </button>
        ))}</div>
        {!xs.length && <p className="empty">لا توجد مهارات مطابقة. غيّر الفلاتر أو كلمة البحث.</p>}
      </div>
    </section>
  )
}

export function SkillPage({ id, back, open, openDrill, dark }: { id: string; back: () => void; open: (v: View) => void; openDrill: (id: string, list: string[]) => void; dark: boolean }): React.JSX.Element {
  const s = SKILLS.find((x) => x.id === id) as Skill
  const drills = useMemo(() => (s.links?.d ?? []).map((d) => DRILLS.find((x) => x.id === d)).filter((d) => d !== undefined), [s])
  const plays = useMemo(() => (s.links?.p ?? []).map((p) => PLAYS.find((x) => x.id === p)).filter((p) => p !== undefined), [s])
  const steps = s.ar.prog.split(PROG_SPLIT_RE).filter(Boolean)
  return (
    <section className="skp" style={{ "--c": SKILL_COLOR[s.cat] } as React.CSSProperties}>
      <div className="skhead glass">
        <button className="backb" onClick={back}>→ كل المهارات</button>
        <div className="skt"><span className="eyebrow">{SPORTS[s.sp].ar} · {SKILL_CAT[s.cat].ar} · المستوى {s.lvl} ({LEVEL_NAME[s.lvl]}) · من {s.age} سنوات</span>
          <h1>{s.ar.n} <span className="en">{s.en.n}</span></h1><p>{s.ar.w}</p></div>
        <button className="chip" onClick={() => open({ v: "map", key: `s:${s.id}` })} title="العلاقات بين المهارة والتمارين والخطط">خريطة المعرفة ↗</button>
      </div>
      <div className="skgrid">
        <div className="skcol">
          <article className="skbox"><h2>نقاط التعليم <span className="en">Coaching points</span></h2>
            <ol className="num">{s.ar.pts.map((p) => <li key={p}>{p}</li>)}</ol></article>
          <article className="skbox"><h2>الأخطاء الشائعة وتصحيحها <span className="en">Errors & corrections</span></h2>
            <div className="errs">{s.ar.err.map(([e, f]) => <div key={e}><span className="e">✕ {e}</span><span className="f">✓ {f}</span></div>)}</div></article>
          <article className="skbox"><h2>التدرّج <span className="en">Progression</span></h2>
            <ol className="ladder">{steps.map((x, i) => <li key={x}><b>{i + 1}</b>{x}</li>)}</ol></article>
        </div>
        <div className="skcol">
          <article className="skbox"><h2>تمارين تبني المهارة <span className="en">Drills · {drills.length}</span></h2>
            <div className="skdr">{drills.length ? drills.map((d) => (
              <button key={d.id} onClick={() => openDrill(d.id, drills.map((x) => x.id))}><DrillImage d={d} dark={dark} alt={d.ar.name} /><b>{d.ar.name}</b><small>{d.dur} د · RPE {d.rpe}</small></button>
            )) : <p className="empty">لا توجد تمارين مرتبطة بعد.</p>}</div></article>
          <article className="skbox"><h2>خطط تظهر فيها <span className="en">Plays · {plays.length}</span></h2>
            <div className="chips">{plays.length ? plays.map((p) => <button key={p.id} className="chip" onClick={() => open({ v: "play", id: p.id })}>▶ {p.name.ar}</button>) : <span className="empty">لا توجد خطط مرتبطة بعد.</span>}</div></article>
        </div>
      </div>
    </section>
  )
}
