// خريطة المعرفة (Knowledge map) — a skill in the centre, the drills that build it and the plays it appears in around it.
// Every line is a real link from the content; clicking any node makes it the centre.
import { useEffect, useMemo, useState } from "react"
import cfg from "./library-config.json"
import { ADJ, DRILLS, PLAYS, SKILLS, SPORTS, byKey, type NodeKey, type Sport } from "./content"
import type { View } from "./LibraryScreen"

const M = cfg.map
const G = M.gal
const HALF = 2
const TAU = Math.PI * HALF
type T = "s" | "d" | "p"
const COL: Record<T, string> = { s: "var(--royal)", d: "var(--teal)", p: "var(--amber)" }
const TN: Record<T, string> = { s: "مهارة", d: "تمرين", p: "خطة متحركة" }
const GROUP: Record<T, string> = { d: "تمارين تبني المهارة", p: "خطط تظهر فيها", s: "مهارات مرتبطة" }
const LEVEL_OPACITY = M.levelOpacity
const LEVEL_WEIGHT = M.levelWeight
const EDGE = M.edge
const SHAPE_CLASS: Record<T, string> = { s: "", d: "sq", p: "dm" }
// Sport short label: removes a leading "كرة " / "الكرة " — "كرة القدم" → "القدم"; leaves "الصالات" unchanged.
const SPORT_PREFIX_RE = /^(?:ال)?كرة /

function useSize(): [number, number] {
  const [s, set] = useState<[number, number]>([window.innerWidth, window.innerHeight])
  useEffect(() => { const on = (): void => set([window.innerWidth, window.innerHeight]); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on) }, [])
  return s
}

function describe(k: NodeKey): { text: string; sport: string } {
  const [t, id] = k.split(":") as [T, string]
  if (t === "s") { const x = SKILLS.find((s) => s.id === id); return { text: x?.ar.w ?? "", sport: x ? SPORTS[x.sp].ar : "" } }
  if (t === "d") { const x = DRILLS.find((s) => s.id === id); return { text: x?.ar.obj ?? "", sport: x ? x.sp.map((s: Sport) => SPORTS[s].ar).join(" · ") : "" } }
  const x = PLAYS.find((s) => s.id === id); return { text: x?.desc.ar ?? "", sport: "" }
}

function Shape({ t, r }: { t: T; r: number }): React.JSX.Element {
  if (t === "s") return <circle r={r} fill={COL[t]} />
  if (t === "d") return <rect x={-r} y={-r} width={r * HALF} height={r * HALF} rx={r / HALF / HALF} fill={COL[t]} />
  return <rect x={-r * G.squash} y={-r * G.squash} width={r * G.squash * HALF} height={r * G.squash * HALF} rx="2" transform="rotate(45)" fill={COL[t]} />
}

export function SkillMap({ start, open, flip }: { start: NodeKey; open: (v: View) => void; flip: () => void }): React.JSX.Element {
  const [center, setCenter] = useState<NodeKey>(start)
  const [hist, setHist] = useState<NodeKey[]>([start])
  const [W, H] = useSize()
  const go = (k: NodeKey): void => { if (k === center) return; setCenter(k); setHist((h) => [...h, k].slice(-M.hist)) }
  const n1 = useMemo(() => [...(ADJ.get(center) ?? [])], [center])
  const n2 = useMemo(() => {
    const s = new Set<NodeKey>()
    n1.forEach((a) => ADJ.get(a)?.forEach((b) => { if (b !== center && !n1.includes(b)) s.add(b) }))
    return [...s].slice(0, M.maxOuter)
  }, [n1, center])
  const cx = (W - M.dock - M.panel) / HALF + M.panel - M.gap
  const cy = H / HALF + M.top
  const r1 = Math.min(W, H) * M.r1, r2 = Math.min(W, H) * M.r2
  const P = new Map<NodeKey, [number, number, number]>([[center, [cx, cy, 0]]])
  n1.forEach((k, i) => { const a = (i / n1.length) * TAU - Math.PI / HALF; P.set(k, [cx + r1 * M.sx * Math.cos(a), cy + r1 * Math.sin(a), 1]) })
  n2.forEach((k, i) => { const a = (i / n2.length) * TAU - Math.PI / HALF + M.skew; P.set(k, [cx + r2 * M.sx2 * Math.cos(a), cy + r2 * Math.sin(a), HALF]) })
  const edges: { a: NodeKey; b: NodeKey }[] = []
  P.forEach((_, a) => ADJ.get(a)?.forEach((b) => { if (P.has(b) && a < b) edges.push({ a, b }) }))
  const me = byKey.get(center)
  const info = describe(center)
  const group = (t: T): NodeKey[] => n1.filter((k) => byKey.get(k)?.t === t)
  const playId = center.startsWith("p:") ? center.slice(HALF) : null

  return (
    <div className="map mapbg">
      <svg id="map" viewBox={`0 0 ${W} ${H}`}>
        <ellipse cx={cx} cy={cy} rx={r1 * M.sx} ry={r1} fill="none" stroke="var(--ln)" strokeDasharray="3 6" />
        <ellipse cx={cx} cy={cy} rx={r2 * M.sx2} ry={r2} fill="none" stroke="var(--ln)" strokeDasharray="2 8" />
        {edges.map(({ a, b }) => {
          const [ax, ay] = P.get(a) ?? [0, 0, 0], [bx, by] = P.get(b) ?? [0, 0, 0]
          const hot = a === center || b === center
          const other = byKey.get(b === center ? a : b)?.t ?? "s"
          return <path key={a + b} className="edge" d={`M${ax},${ay} Q${(ax + bx) / HALF + (ay - by) * M.bend},${(ay + by) / HALF} ${bx},${by}`} fill="none" stroke={hot ? COL[other] : "var(--mu)"} strokeOpacity={hot ? EDGE.hot : EDGE.cold} strokeWidth={hot ? HALF : 1} />
        })}
        {[...P.entries()].map(([k, [x, y, l]]) => {
          const n = byKey.get(k); if (!n) return null
          const r = M.node[l]; const nm = l === HALF && n.name.length > M.cut ? `${n.name.slice(0, M.cut)}…` : n.name
          return (
            <g key={k} className="node" style={{ transform: `translate(${x}px,${y}px)` }} onClick={() => go(k)}>
              {l === 0 && <><circle className="pulse" r={r} fill={COL[n.t]} /><circle r={r + M.halo} fill={COL[n.t]} opacity=".12" /></>}
              <Shape t={n.t} r={r} />
              <text textAnchor="middle" y={r + M.labelGap} fontSize={M.label[l]} fontWeight={LEVEL_WEIGHT[l]} opacity={LEVEL_OPACITY[l]}>{nm}</text>
            </g>
          )
        })}
      </svg>

      <div className="hud glass top"><h1>المكتبة <span className="en">Knowledge map</span></h1>
        <div className="path"><b onClick={() => open({ v: "cmd" })} style={{ cursor: "pointer" }}>← الطلب</b>
          {hist.map((k, i) => <span key={k + i} style={{ display: "contents" }}><i>←</i><b className={k === center ? "cur" : ""} onClick={() => go(k)} style={{ cursor: "pointer" }}>{byKey.get(k)?.name}</b></span>)}</div>
        <button className="chip" onClick={flip}>◐</button></div>
      <div className="hud glass legend">
        {(["s", "d", "p"] as T[]).map((t) => <div key={t}><i className={SHAPE_CLASS[t]} style={{ "--c": COL[t] } as React.CSSProperties} />{TN[t]}<b>{{ s: SKILLS.length, d: DRILLS.length, p: PLAYS.length }[t]}</b></div>)}
        <div className="hint">الخط = علاقة علمية · اضغط أي نقطة تبقى هي المركز</div></div>
      <Galaxy center={center} go={go} />
      <div className="hud glass det">
        <span className="k">● {me ? TN[me.t] : ""}{info.sport ? ` · ${info.sport}` : ""}</span>
        <h2>{me?.name}</h2><div className="e2">{me?.en}</div><p>{info.text}</p>
        <div className="stat"><div><b>{group("s").length}</b><span>مهارات</span></div><div><b>{group("d").length}</b><span>تمارين</span></div><div><b>{group("p").length}</b><span>خطط</span></div></div>
        <div className="nb">{(["d", "p", "s"] as T[]).map((t) => group(t).length ? (
          <div key={t} style={{ display: "contents" }}><h4>{GROUP[t]}</h4>
            {group(t).map((k) => <button key={k} style={{ "--c": COL[t] } as React.CSSProperties} onClick={() => go(k)}><i />{byKey.get(k)?.name}</button>)}</div>) : null)}</div>
        <div className="act">{playId ? <button className="p" onClick={() => open({ v: "play", id: playId })}>افتح في الملعب 3D</button> : <button className="p" onClick={() => open({ v: "cmd" })}>ارجع للطلب</button>}</div>
      </div>
    </div>
  )
}

function Galaxy({ center, go }: { center: NodeKey; go: (k: NodeKey) => void }): React.JSX.Element {
  const sps = Object.keys(SPORTS) as Sport[]
  return (
    <div className="hud glass galaxy"><h3>مجرّة المهارات <span className="en">{SKILLS.length} skills</span></h3>
      <svg id="gal" viewBox="0 0 200 150">{sps.map((sp, i) => (
        <g key={sp}><text x={G.cx[i]} y={G.cy[i] + G.lblY} textAnchor="middle" fontSize="8.5" fill="var(--mu)">{SPORTS[sp].ar.replace(SPORT_PREFIX_RE, "")}</text>
          {SKILLS.filter((x) => x.sp === sp).map((x, j) => {
            const a = j * G.step, r = G.r0 + Math.sqrt(j) * G.rk, k: NodeKey = `s:${x.id}`, on = k === center
            return <circle key={x.id} cx={G.cx[i] + r * Math.cos(a)} cy={G.cy[i] + r * Math.sin(a) * G.squash} r={on ? G.on : G.off} fill={on ? "var(--royal)" : "var(--mu)"} opacity={on ? 1 : G.dim} style={{ cursor: "pointer" }} onClick={() => go(k)}><title>{x.ar.n}</title></circle>
          })}</g>))}</svg></div>
  )
}
