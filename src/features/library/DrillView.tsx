// بطاقة التمرين — the drill opens on its own 3D stage (fixed, full size); the standard card floats over it as glass.
import { useEffect, useRef, useState } from "react"
import { DRILLS, SPORTS, type Drill } from "./content"
import { DrillMedia } from "./DrillMedia"
import { FORMATS, STAGES, formatOf, goalLabel, goalOf, loadOf, refOf, sportsOf, stageOf } from "./catalog"

export function DrillView({ id, list, dark, ctx, back, go, addToSession }: {
  id: string; list: string[]; dark: boolean; ctx?: string; back: () => void; go: (id: string) => void; addToSession: (id: string) => void
}): React.JSX.Element {
  const d = DRILLS.find((x) => x.id === id) as Drill
  const canvas = useRef<HTMLCanvasElement>(null)
  const [min, setMin] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const el = canvas.current
    if (!el || !d) return
    let stop: (() => void) | null = null, live = true
    setReady(false)
    const mount = async (): Promise<void> => {
      const { mountStage } = await import("./arena3d/render")
      if (!live) return
      stop = mountStage(el, d, ctx, dark)
      setReady(true)
    }
    void mount()
    return () => { live = false; stop?.() }
  }, [d, ctx, dark])
  useEffect(() => {
    const k = (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement).closest("input,textarea")) return
      const i = list.indexOf(id)
      if (e.key === "Escape") back()
      if (e.key === "ArrowLeft" && i < list.length - 1) go(list[i + 1])
      if (e.key === "ArrowRight" && i > 0) go(list[i - 1])
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [id, list, back, go])
  if (!d) return <div className="dv"><button className="glass back" onClick={back}>→ المكتبة</button></div>
  const i = list.indexOf(id), g = goalLabel(goalOf(d)), st = STAGES.find((s) => s.key === stageOf(d)), fm = FORMATS.find((f) => f.key === formatOf(d))
  return (
    <div className="dv">
      <canvas ref={canvas} className={`scene3d${ready ? " on" : ""}`} aria-label={`مشهد ثلاثي الأبعاد للتمرين: ${d.ar.name}. اسحب للتدوير، واستخدم العجلة للتقريب.`} />
      <div className="topbar glass">
        <button onClick={back}>→ المكتبة <span className="en">Library</span></button>
        <span className="sep" />
        <button disabled={i <= 0} onClick={() => go(list[i - 1])} aria-label="التمرين السابق">‹</button>
        <span className="pos">{i + 1} / {list.length}</span>
        <button disabled={i >= list.length - 1} onClick={() => go(list[i + 1])} aria-label="التمرين التالي">›</button>
      </div>
      <p className="orbit glass">اسحب لتدوير المشهد · العجلة للتقريب</p>

      <article className={`dcard glass${min ? " min" : ""}`} style={{ "--c": g.color } as React.CSSProperties}>
        <header>
          <div className="row"><span className="ref">{refOf(d)}</span><span className="gl"><i />{g.ar} <span className="en">{g.en}</span></span>
            <button className="mn" onClick={() => setMin(!min)} aria-label={min ? "إظهار البطاقة" : "تصغير البطاقة"}>{min ? "▢" : "—"}</button></div>
          <h1>{d.ar.name}</h1>
          <p className="en sub">{d.en.name}</p>
        </header>
        {!min && <div className="scroll">
          <section><h2>الهدف <span className="en">Objective</span></h2><p>{d.ar.obj}</p></section>
          <section><h2>التنظيم <span className="en">Organisation</span></h2>
            <dl className="org">
              <div><dt>اللاعبون</dt><dd>{d.ar.n}</dd></div>
              <div><dt>المساحة</dt><dd>{d.ar.area}</dd></div>
              <div><dt>الأدوات</dt><dd>{d.ar.eq && d.ar.eq !== "—" ? d.ar.eq : "بدون أدوات"}</dd></div>
              <div><dt>المدة</dt><dd>{d.dur} دقيقة</dd></div>
              <div><dt>الشدة</dt><dd>{d.int} / 4 · RPE {d.rpe}</dd></div>
              <div><dt>الحِمل</dt><dd>{loadOf(d)} <small>(د × RPE)</small></dd></div>
            </dl>
          </section>
          <section><h2>النقاط التعليمية <span className="en">Coaching points</span></h2><ol className="pts">{d.ar.pts.map((p) => <li key={p}>{p}</li>)}</ol></section>
          <section className="two">
            <div><h2>التدرّج <span className="en">Progression</span></h2><p>{d.ar.prog}</p></div>
            <div><h2>التبسيط <span className="en">Regression</span></h2><p>{d.ar.reg}</p></div>
          </section>
          <DrillMedia drillId={d.id} />
          {d.ar.note && <section className="note"><h2>ملاحظة المدرب</h2><p>{d.ar.note}</p></section>}
          <section className="tags">
            <span className="chip">{st?.ar} · {st?.ages} سنة</span>
            <span className="chip">{fm?.ar}</span>
            {sportsOf(d).map((s) => <span key={s} className="chip">{SPORTS[s].ar}</span>)}
            <span className="chip">مناسب من عمر {d.age}</span>
          </section>
          <div className="acts">
            <button className="p" onClick={() => addToSession(d.id)}>＋ أضف إلى الوحدة التدريبية</button>
            <button onClick={() => window.print()}>طباعة البطاقة</button>
          </div>
        </div>}
      </article>
    </div>
  )
}
