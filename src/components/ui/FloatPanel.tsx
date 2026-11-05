// لوحة عائمة (Floating panel) — a glass panel over a 3D stage that the user can drag by its title bar,
// minimise to its title, or hide. Position and state are remembered per panel on this device.
import { useRef, useState } from "react"
import "./float.css"

interface Saved { readonly x?: number; readonly y?: number; readonly min?: boolean }
const PREFIX = "im-float-"
const DESKTOP = 900
const EDGE = 40
const EDGE_X = 80

function read(id: string): Saved {
  try { return JSON.parse(localStorage.getItem(PREFIX + id) ?? "{}") as Saved } catch { return {} }
}
function write(id: string, s: Saved): void {
  try { localStorage.setItem(PREFIX + id, JSON.stringify(s)) } catch { /* private mode */ }
}

export function FloatPanel({ id, title, className, children }: { id: string; title: React.ReactNode; className: string; children: React.ReactNode }): React.JSX.Element {
  const [st, setSt] = useState<Saved>(() => read(id))
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<[number, number] | null>(null)
  const save = (s: Saved): void => { setSt(s); write(id, s) }
  const down = (e: React.PointerEvent): void => {
    if (window.innerWidth <= DESKTOP || (e.target as HTMLElement).closest("button")) return
    const b = box.current?.getBoundingClientRect()
    if (!b) return
    drag.current = [e.clientX - b.left, e.clientY - b.top]
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent): void => {
    if (!drag.current) return
    setSt((s) => ({ ...s, x: Math.max(0, Math.min(window.innerWidth - EDGE_X, e.clientX - (drag.current?.[0] ?? 0))), y: Math.max(0, Math.min(window.innerHeight - EDGE, e.clientY - (drag.current?.[1] ?? 0))) }))
  }
  const up = (): void => { if (!drag.current) return; drag.current = null; write(id, st) }
  const placed = st.x !== undefined && st.y !== undefined && window.innerWidth > DESKTOP
  const style: React.CSSProperties = placed ? { left: st.x, top: st.y, right: "auto", bottom: "auto" } : {}
  return (
    <div ref={box} className={`hud glass fpanel ${className}${st.min ? " min" : ""}`} style={style}>
      <div className="fhead" onPointerDown={down} onPointerMove={move} onPointerUp={up} title="اسحب لتحريك اللوحة">
        <span className="grip" aria-hidden="true">⋮⋮</span><div className="ft">{title}</div>
        {placed && <button onClick={() => save({ min: st.min })} title="إعادة اللوحة إلى مكانها" aria-label="إعادة المكان">⤺</button>}
        <button onClick={() => save({ ...st, min: !st.min })} title={st.min ? "تكبير" : "تصغير"} aria-label={st.min ? "تكبير" : "تصغير"}>{st.min ? "▢" : "—"}</button>
      </div>
      {!st.min && <div className="fbody">{children}</div>}
    </div>
  )
}
