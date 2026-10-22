import { useRef, useState } from "react"
import { SPORTS } from "../sports/registry"
import { StepCards } from "./components/StepCards"
import { useMotionEngine } from "./motion/useMotionEngine"
import { useViewportLayout } from "./useViewport"
import type { AccessApi } from "./useAccess"
import { T } from "./strings"
import "./auth.css"

export function LoginScreen({ access }: { access: AccessApi }): React.JSX.Element {
  const layout = useViewportLayout()
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sportIdx, setSportIdx] = useState(0)
  const engineRef = useMotionEngine(canvasRef, rootRef, layout, setSportIdx)
  const logo = `${import.meta.env.BASE_URL}icon-192.png`
  const sport = SPORTS[sportIdx]

  return (
    <div
      ref={rootRef}
      className="lg-root"
      data-layout={layout.mode}
      data-compact={layout.compact ? "" : undefined}
      style={{ "--k": layout.k, "--pt": `${layout.pt}px`, "--court": `${layout.courtH}px` } as React.CSSProperties}
    >
      <div className="lg-bg" aria-hidden="true" />
      <canvas ref={canvasRef} className="lg-canvas" aria-hidden="true" />

      <header className="lg-top">
        <img src={logo} alt="Instructor Motion" width={40} height={40} />
        <div className="lg-brand">
          <b>{T.brand}</b>
          <span>{T.platformAr} <small>{T.platformEn}</small></span>
        </div>
      </header>

      <main className="lg-main">
        <StepCards access={access} />
      </main>

      <footer className="lg-foot">
        <p className="lg-caption">
          {T.motionLabel} · {sport.motionAr} · {sport.nameAr} <small>{sport.nameEn}</small>
        </p>
        <div className="lg-chips" role="group" aria-label={T.pickSport}>
          {SPORTS.map((s, i) => (
            <button key={s.id} className="lg-chip" aria-pressed={i === sportIdx} onClick={() => engineRef.current?.select(i)}>
              {s.nameAr} <small>{s.nameEn}</small>
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
