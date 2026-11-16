// السبورة التكتيكية 3D — the pitch is the screen: draw passes, runs, dribbles and zones on the grass, move players,
// add movement frames and play them like a broadcast replay. Saved on this device.
import { useEffect, useRef, useState } from "react"
import { autoQuality, type QualityPref, mountBoard3D, newBoard, formsOf, setFormation, MARK_COLOR, TEAM_COLOR, type Board3D as Api, type BoardState, type Cam, type Mode, type Side, type Tool, type Equip } from "./engine"
import "./board3d.css"

const KEY = "im-board3d-v1"
const QKEY = "im-board3d-quality"
const readQ = (): QualityPref => { try { const v = localStorage.getItem(QKEY); return v === "high" || v === "lite" ? v : "auto" } catch { return "auto" } }
const resolveQ = (p: QualityPref): "high" | "lite" => (p === "auto" ? autoQuality() : p)
const MODES: readonly { k: Mode; ar: string; en: string }[] = [
  { k: "fb11", ar: "قدم 11", en: "11v11" }, { k: "fb7", ar: "قدم 7", en: "7v7" }, { k: "futsal", ar: "صالات", en: "Futsal" },
]
const TOOLS: readonly { k: Tool; ar: string; en: string; d: string }[] = [
  { k: "move", ar: "تحريك", en: "Move", d: "M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" },
  { k: "pass", ar: "تمريرة", en: "Pass", d: "M3 18L19 6M19 6h-6M19 6v6" },
  { k: "run", ar: "جري بدون كرة", en: "Run", d: "M3 18c5-1 10-6 16-12M19 6h-6M19 6v6" },
  { k: "dribble", ar: "مراوغة بالكرة", en: "Dribble", d: "M3 18l3-3 2 2 3-3 2 2 3-3 2 2M19 6v6M19 6h-6" },
  { k: "zone", ar: "منطقة", en: "Zone", d: "M12 4a8 8 0 100 16 8 8 0 000-16z" },
  { k: "equip", ar: "أدوات", en: "Equipment", d: "M12 3l5 15H7zM5 20h14" },
  { k: "text", ar: "كتابة", en: "Text", d: "M5 5h14M12 5v14M9 19h6" },
  { k: "erase", ar: "ممحاة", en: "Erase", d: "M4 16l8-8 6 6-6 6H8zM14 20h6" },
]
const EQUIP: readonly { k: Equip; ar: string; en: string }[] = [
  { k: "cone", ar: "قمع", en: "Cone" }, { k: "ladder", ar: "سلم رشاقة", en: "Agility ladder" }, { k: "hurdle", ar: "حاجز", en: "Hurdle" },
  { k: "pole", ar: "عصا", en: "Pole" }, { k: "flag", ar: "علم", en: "Flag" }, { k: "minigoal", ar: "مرمى صغير", en: "Mini goal" }, { k: "mannequin", ar: "دمية حائط", en: "Mannequin" },
]
const CAMS: readonly { k: Cam; ar: string }[] = [{ k: "broadcast", ar: "البث" }, { k: "top", ar: "علوي" }, { k: "goal", ar: "خلف المرمى" }]

function load(): BoardState {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) as BoardState } catch { /* first visit */ }
  return newBoard("fb11", { A: "4-3-3", B: "4-4-2" })
}

export function Board3D({ dark }: { readonly dark: boolean }): React.JSX.Element {
  const cv = useRef<HTMLCanvasElement>(null)
  const api = useRef<Api | null>(null)
  const [b, setB] = useState<BoardState>(load)
  const [tool, setTool] = useState<Tool>("move")
  const [cam, setCam] = useState<Cam>("broadcast")
  const [fi, setFi] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [, tick] = useState(0)
  const [txt, setTxt] = useState("")
  const [qp, setQp] = useState<QualityPref>(readQ)
  useEffect(() => { try { localStorage.setItem(QKEY, qp) } catch { /* private mode */ } api.current?.setQuality(resolveQ(qp)) }, [qp])
  const [eq, setEq] = useState<Equip>("cone")
  useEffect(() => { api.current?.setEquip(eq) }, [eq])
  useEffect(() => { api.current?.setText(txt) }, [txt])
  useEffect(() => {
    const k = (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement).tagName === "INPUT") return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) api.current?.redo(); else api.current?.undo() }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); api.current?.redo() }
    }
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k)
  }, [])

  useEffect(() => {
    const c = cv.current; if (!c) return
    const a = mountBoard3D(c, b, (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* full */ } tick((n) => n + 1) }, resolveQ(readQ()))
    api.current = a
    return () => { a.dispose(); api.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { api.current?.dark(dark) }, [dark])
  useEffect(() => { api.current?.setTool(tool) }, [tool])
  useEffect(() => { api.current?.setCam(cam) }, [cam])
  useEffect(() => {
    if (!playing || !api.current) return
    return api.current.play(setFi, () => setPlaying(false))
  }, [playing])

  const st = api.current?.state() ?? b
  const replace = (n: BoardState): void => { setB(n); setFi(0); api.current?.load(n) }
  const form = (side: Side, key: string): void => { const s = api.current?.state(); if (!s) return; setFormation(s, side, key); s.frames[fi] = Object.fromEntries(s.tokens.map((t) => [t.id, [t.x, t.z]])); api.current?.frame(fi, true); api.current?.load(s); api.current?.frame(fi, false) }
  const clearMarks = (): void => { const s = api.current?.state(); if (!s) return; api.current?.load({ ...s, marks: [] }) }
  const exportPng = (): void => { const u = api.current?.png(); if (!u) return; const a = document.createElement("a"); a.href = u; a.download = "IM-tactical-board-3d.png"; a.click() }

  return (
    <div className="b3">
      <canvas ref={cv} className="b3gl" />
      <header className="b3top glass">
        <div className="ttl"><h1>السبورة التكتيكية <span className="en">3D tactical board</span></h1><span className="live">LIVE 3D</span></div>
        <div className="seg">{MODES.map((m) => <button key={m.k} className={st.mode === m.k ? "on" : ""} onClick={() => replace(newBoard(m.k))}>{m.ar}<span className="en">{m.en}</span></button>)}</div>
        {(["A", "B"] as const).map((s) => (
          <label key={s} className="frm"><i style={{ background: TEAM_COLOR[s] }} />{s === "A" ? "فريقنا" : "المنافس"}
            <select value={st.form[s]} onChange={(e) => form(s, e.target.value)}>{formsOf(st.mode).map((f) => <option key={f}>{f}</option>)}</select></label>
        ))}
        <label className="frm" title="جودة العرض — «تلقائي» يختار حسب قوة الجهاز">جودة العرض
          <select value={qp} onChange={(e) => setQp(e.target.value as QualityPref)}><option value="auto">تلقائي</option><option value="high">عالية</option><option value="lite">خفيفة</option></select></label>
        <div className="seg">{CAMS.map((c) => <button key={c.k} className={cam === c.k ? "on" : ""} onClick={() => setCam(c.k)}>{c.ar}</button>)}</div>
      </header>

      <nav className="b3tools glass" aria-label="أدوات الرسم">
        {TOOLS.map((t) => (
          <button key={t.k} className={tool === t.k ? "on" : ""} onClick={() => setTool(t.k)} title={`${t.ar} · ${t.en}`} style={{ "--c": t.k in MARK_COLOR ? MARK_COLOR[t.k as keyof typeof MARK_COLOR] : "var(--teal)" } as React.CSSProperties}>
            <svg viewBox="0 0 24 24"><path d={t.d} /></svg><span>{t.ar}</span>
          </button>
        ))}
        <hr />
        <button onClick={() => api.current?.undo()} disabled={!api.current?.canUndo()} title="تراجع Ctrl+Z"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></svg><span>تراجع</span></button>
        <button onClick={() => api.current?.redo()} disabled={!api.current?.canRedo()} title="إعادة Ctrl+Y"><svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" /></svg><span>إعادة</span></button>
        <button onClick={clearMarks} title="مسح الرسم"><svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" /></svg><span>مسح الرسم</span></button>
        <button onClick={() => replace(newBoard(st.mode, st.form))} title="لوحة جديدة"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg><span>لوحة جديدة</span></button>
        <button onClick={exportPng} title="صورة PNG"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 19h16" /></svg><span>صورة</span></button>
      </nav>

      {tool === "equip" && <div className="b3txt glass"><b>اختار الأداة ثم اضغط مكانها على الملعب · الممحاة تشيلها</b>
        <div className="eqs">{EQUIP.map((e) => <button key={e.k} className={eq === e.k ? "on" : ""} onClick={() => setEq(e.k)}>{e.ar}<span className="en">{e.en}</span></button>)}</div></div>}
      {tool === "text" && <div className="b3txt glass"><b>اكتب الملاحظة ثم اضغط مكانها على الملعب</b><input autoFocus value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="مثال: ضغط عالي هنا" /></div>}
      {playing && st.caps?.[fi] && <div className="b3cap">{st.caps[fi]}</div>}
      <footer className="b3tl glass">
        <button className="pp" onClick={() => setPlaying((p) => !p)} disabled={st.frames.length < 2} aria-label={playing ? "إيقاف" : "تشغيل"}>
          <svg viewBox="0 0 24 24">{playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4l13 8-13 8z" />}</svg></button>
        <div className="frames">
          <b>مراحل الحركة <span className="en">Frames</span></b>
          {st.frames.map((_, i) => <button key={i} className={i === fi ? "on" : ""} onClick={() => { setPlaying(false); setFi(i); api.current?.frame(i, true) }}>{i + 1}</button>)}
          <button className="add" onClick={() => setFi(api.current?.addFrame() ?? fi)}>+ مرحلة</button>
        </div>
        <input className="cap" value={st.caps?.[fi] ?? ""} onChange={(e) => api.current?.setCaption(fi, e.target.value)} placeholder={`شرح المرحلة ${fi + 1} (يظهر أثناء التشغيل)`} />
        <span className="hint">اسحب الملعب للدوران · العجلة للتقريب · Ctrl+Z تراجع</span>
      </footer>
    </div>
  )
}
