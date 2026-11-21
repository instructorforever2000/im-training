// السبورة التكتيكية 3D — the pitch is the screen: draw passes, runs, dribbles and zones on the grass, move players,
// add movement frames and play them like a broadcast replay. Saved on this device.
import { useEffect, useRef, useState } from "react"
import { fromPlay, opensIn3D, type RoleInfo, PLAY_MODES, autoQuality, type QualityPref, mountBoard3D, newBoard, formsOf, setFormation, MARK_COLOR, TEAM_COLOR, type Board3D as Api, type BoardState, type Cam, type Mode, type Side, type Tool, type Equip } from "./engine"
import "./board3d.css"
import { can, guard } from "@/features/auth/caps"
import { PLAYS, PLAY_CAT } from "@/features/library/content"

const KEY = "im-board3d-v1"
const QKEY = "im-board3d-quality"
const LKEY = "im-board3d-library"
interface Saved { id: string; name: string; at: string; state: BoardState }
const readLib = (): Saved[] => { try { return JSON.parse(localStorage.getItem(LKEY) ?? "[]") as Saved[] } catch { return [] } }
const writeLib = (l: Saved[]): void => { try { localStorage.setItem(LKEY, JSON.stringify(l)) } catch { /* storage full */ } }
const PLAYS3D = PLAYS.filter((p) => opensIn3D(p.mode))
const modeKey = (m: string): string => (m.startsWith("a-") ? "area" : m)
const MODE_AR: Record<string, string> = { fb11: "قدم 11", fb7: "قدم 7", futsal: "صالات", bb: "سلة", hb: "يد", vb: "طائرة", area: "أنشطة عامة" }
const readQ = (): QualityPref => { try { const v = localStorage.getItem(QKEY); return v === "high" || v === "lite" ? v : "auto" } catch { return "auto" } }
const resolveQ = (p: QualityPref): "high" | "lite" => (p === "auto" ? autoQuality() : p)
const MODES: readonly { k: Mode; ar: string; en: string }[] = [
  { k: "fb11", ar: "قدم 11", en: "11v11" }, { k: "fb7", ar: "قدم 7", en: "7v7" }, { k: "futsal", ar: "صالات", en: "Futsal" },
  { k: "bb", ar: "سلة", en: "Basketball" }, { k: "hb", ar: "يد", en: "Handball" }, { k: "vb", ar: "طائرة", en: "Volleyball" },
  { k: "area", ar: "مساحة تمرين", en: "Drill area" },
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
const CAMS: readonly { k: Cam; ar: string }[] = [{ k: "broadcast", ar: "البث" }, { k: "half", ar: "نص الملعب" }, { k: "top", ar: "علوي" }, { k: "vertical", ar: "طولي" }, { k: "goal", ar: "خلف المرمى" }]

function load(): BoardState {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) as BoardState } catch { /* first visit */ }
  return newBoard("fb11", { A: "4-3-3", B: "4-4-2" })
}

export function Board3D({ dark, playId }: { readonly dark: boolean; readonly playId?: string }): React.JSX.Element {
  const cv = useRef<HTMLCanvasElement>(null)
  const api = useRef<Api | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  useEffect(() => {
    const f = (): void => setFull(document.fullscreenElement === root.current)
    document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f)
  }, [])
  // ملء الشاشة بالعرض — Android locks landscape; iPhone only enlarges (rotate by hand)
  const toggleFull = async (): Promise<void> => {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); return }
      await root.current?.requestFullscreen?.()
      const o = screen.orientation as ScreenOrientation & { lock?: (t: string) => Promise<void> }
      await o.lock?.("landscape")
    } catch { /* not supported on this device — the board still works in the window */ }
  }
  const [b, setB] = useState<BoardState>(() => {
    const pl = playId ? PLAYS.find((p) => p.id === playId) : undefined
    return (pl && fromPlay(pl)) || load()
  })
  const [panel, setPanel] = useState(false)
  const [lib, setLib] = useState<Saved[]>(readLib)
  const [name, setName] = useState("")
  const [pf, setPf] = useState<string>("all")
  const [del, setDel] = useState<string | null>(null)
  const saveAs = (): void => {
    const s = api.current?.state(); if (!s || !name.trim()) return
    const ex = lib.find((x) => x.name === name.trim())
    const item: Saved = { id: ex?.id ?? `l${Date.now().toString(36)}`, name: name.trim(), at: new Date().toISOString().slice(0, 10), state: JSON.parse(JSON.stringify(s)) as BoardState }
    const n = [item, ...lib.filter((x) => x.id !== item.id)]; setLib(n); writeLib(n); setName("")
  }
  const remove = (id: string): void => { if (del !== id) { setDel(id); return } const n = lib.filter((x) => x.id !== id); setLib(n); writeLib(n); setDel(null) }
  const openPlay = (id: string): void => { const pl = PLAYS.find((p) => p.id === id); const st2 = pl && fromPlay(pl); if (st2) { replace(st2); setPanel(false); setCam("broadcast") } }
  const [tool, setTool] = useState<Tool>("move")
  const [cam, setCam] = useState<Cam>("broadcast")
  const [fi, setFi] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [, tick] = useState(0)
  const [txt, setTxt] = useState("")
  const [menu, setMenu] = useState(false)
  const [role, setRole] = useState<(RoleInfo & { num?: number }) | null>(null)
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
    const a = mountBoard3D(c, b, (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* full */ } tick((n) => n + 1) }, resolveQ(readQ()), setRole)
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
  const [rec, setRec] = useState(false)
  /** Video of the movement frames (WebM): the pitch + each frame's caption + platform mark, recorded while it plays. */
  const exportVideo = (): void => {
    if (!can("download")) { guard("download", () => {}); return }
    const gl = cv.current, a = api.current; if (!gl || !a || rec) return
    const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m))
    if (!mime) { alert("تصدير الفيديو غير مدعوم في هذا المتصفح — جرّب Chrome أو Edge"); return }
    const c = document.createElement("canvas"); c.width = gl.width; c.height = gl.height
    const x = c.getContext("2d"); if (!x) return
    const r = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6e6 }), chunks: Blob[] = []
    r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    let cur = 0, raf = 0, done = false
    const k = c.width / 1440
    const draw = (): void => {
      x.drawImage(gl, 0, 0)
      const cap = a.state().caps?.[cur]
      if (cap) {
        x.font = `600 ${Math.round(26 * k)}px "IBM Plex Sans Arabic", sans-serif`; x.direction = "rtl"; x.textAlign = "center"
        const w = x.measureText(cap).width + 48 * k, h = 52 * k, cx = c.width / 2, y = c.height - 90 * k
        x.fillStyle = "#0b1b33e6"; x.beginPath(); x.roundRect(cx - w / 2, y - h / 2, w, h, 14 * k); x.fill()
        x.fillStyle = "#fff"; x.textBaseline = "middle"; x.fillText(cap, cx, y + 2 * k)
      }
      x.font = `700 ${Math.round(18 * k)}px Outfit, sans-serif`; x.textAlign = "left"; x.direction = "ltr"; x.fillStyle = "#0b1b33bb"
      x.fillText("IM TRAINING · Instructor Motion", 24 * k, 36 * k)
      x.fillStyle = "#e0564f"; x.beginPath(); x.arc(c.width - 40 * k, 34 * k, 8 * k, 0, Math.PI * 2); x.fill()
      if (!done) raf = requestAnimationFrame(draw)
    }
    setRec(true); setPlaying(false); r.start(); draw()
    const stop = a.play((i) => { cur = i; setFi(i) }, () => {
      window.setTimeout(() => {
        done = true; cancelAnimationFrame(raf); r.stop(); stop()
      }, 900)
    })
    r.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: "video/webm" })), l = document.createElement("a")
      l.href = url; l.download = "IM-tactical-board-3d.webm"; l.click(); window.setTimeout(() => URL.revokeObjectURL(url), 4000); setRec(false)
    }
  }
  const exportPng = (): void => {
    if (!can("download")) { guard("download", () => {}); return } const u = api.current?.png(); if (!u) return; const a = document.createElement("a"); a.href = u; a.download = "IM-tactical-board-3d.png"; a.click() }

  return (
    <div className={`b3${full ? " full" : ""}`} ref={root}>
      <canvas ref={cv} className="b3gl" />
      <header className={`b3top glass ${menu ? "open" : ""}`}>
        <div className="ttl"><h1>السبورة التكتيكية <span className="en">3D tactical board</span></h1><span className="live">LIVE 3D</span><button className="mtog" onClick={() => setMenu((v) => !v)} aria-expanded={menu}>{menu ? "إخفاء ✕" : "الإعدادات ☰"}</button><button className="fsb" onClick={() => void toggleFull()} title="ملء الشاشة بالعرض — Fullscreen landscape">{full ? "خروج ⤡" : "بالعرض ⤢"}</button></div>
        <div className="seg">{MODES.map((m) => <button key={m.k} className={st.mode === m.k ? "on" : ""} onClick={() => replace(newBoard(m.k))}>{m.ar}<span className="en">{m.en}</span></button>)}</div>
        {(["A", "B"] as const).map((s) => (
          <label key={s} className="frm"><i style={{ background: TEAM_COLOR[s] }} />{s === "A" ? "فريقنا" : "المنافس"}
            <select value={st.form[s]} onChange={(e) => form(s, e.target.value)}>{st.form[s] === "—" && <option value="—">من الخطة</option>}{formsOf(st.mode, s).map((f) => <option key={f}>{f}</option>)}</select></label>
        ))}
        <label className="frm" title="جودة العرض — «تلقائي» يختار حسب قوة الجهاز">جودة العرض
          <select value={qp} onChange={(e) => setQp(e.target.value as QualityPref)}><option value="auto">تلقائي</option><option value="high">عالية</option><option value="lite">خفيفة</option></select></label>
        <button className="chip on" onClick={() => setPanel((v) => !v)}>اللوحات والخطط <span className="en">Library</span></button>
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
        <button onClick={exportVideo} disabled={rec || st.frames.length < 2} title="فيديو للمراحل (WebM)"><svg viewBox="0 0 24 24"><path d="M3 6h12v12H3zM15 10l6-3v10l-6-3" /></svg><span>{rec ? "جاري التسجيل…" : "فيديو"}</span></button>
        <button onClick={exportPng} title="صورة PNG"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 19h16" /></svg><span>صورة</span></button>
      </nav>

      {panel && (
        <aside className="b3lib glass" aria-label="اللوحات والخطط">
          <div className="hd"><b>اللوحات المحفوظة <span className="en">My boards</span></b><button onClick={() => setPanel(false)}>✕</button></div>
          <div className="save"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم اللوحة الحالية" onKeyDown={(e) => e.key === "Enter" && saveAs()} /><button disabled={!name.trim()} onClick={saveAs}>حفظ</button></div>
          {lib.length === 0 && <p className="mu">لسه مفيش لوحات محفوظة — اكتب اسم واضغط «حفظ».</p>}
          <ul>{lib.map((x) => (
            <li key={x.id}><button className="op" onClick={() => { replace(JSON.parse(JSON.stringify(x.state)) as BoardState); setPanel(false) }}><b>{x.name}</b><small>{MODE_AR[x.state.mode]} · {x.state.frames.length} مراحل · {x.at}</small></button>
              <button className={`rm ${del === x.id ? "sure" : ""}`} onClick={() => remove(x.id)} title="حذف">{del === x.id ? "تأكيد الحذف" : "حذف"}</button></li>))}</ul>
          <div className="hd"><b>خطط المكتبة <span className="en">Library plays · {PLAYS3D.length}</span></b></div>
          <div className="chips">{["all", ...PLAY_MODES].map((m) => <button key={m} className={pf === m ? "on" : ""} onClick={() => setPf(m)}>{m === "all" ? "الكل" : MODE_AR[m]}</button>)}</div>
          <ul>{PLAYS3D.filter((p) => pf === "all" || modeKey(p.mode) === pf).map((p) => (
            <li key={p.id}><button className="op" onClick={() => openPlay(p.id)} style={{ "--c": PLAY_CAT[p.cat]?.color } as React.CSSProperties}><b><i />{p.name.ar}</b><small>{MODE_AR[modeKey(p.mode)]} · {p.steps.length} خطوات · {PLAY_CAT[p.cat]?.ar}</small></button></li>))}</ul>
          
        </aside>
      )}
      {role && tool === "move" && (
        <div className="b3role glass"><button className="x" onClick={() => api.current?.select(null)}>✕</button>
          <b>{role.num ? `${role.num} · ` : ""}{role.ar} {role.en && <span className="en">{role.en}</span>}</b>
          {role.desc && <p>{role.desc}</p>}
          <div className="lg"><span><i style={{ background: "#F4D03F" }} />منطقة التحرك بالكرة</span><span><i style={{ background: "#4FD1C5" }} />بدون كرة</span></div>
        </div>
      )}
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
        <span className="hint">اضغط لاعب لعرض دوره ومنطقة تحركه · اسحب الملعب للدوران · Ctrl+Z تراجع</span>
      </footer>
    </div>
  )
}
