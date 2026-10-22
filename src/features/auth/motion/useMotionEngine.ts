import { useEffect, useRef, type RefObject } from "react"
import { SPORTS } from "../../sports/registry"
import type { LayoutMetrics } from "../layout"
import { MotionEngine } from "./engine"

/** Owns the canvas engine for the lifetime of the login screen. */
export function useMotionEngine(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  rootRef: RefObject<HTMLElement | null>,
  layout: LayoutMetrics,
  onSportChange: (index: number) => void,
): RefObject<MotionEngine | null> {
  const engineRef = useRef<MotionEngine | null>(null)
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const cbRef = useRef(onSportChange)
  cbRef.current = onSportChange

  useEffect(() => {
    const canvas = canvasRef.current, root = rootRef.current
    if (!canvas || !root) return
    const engine = new MotionEngine(canvas, root, SPORTS, (i) => cbRef.current(i))
    engineRef.current = engine
    engine.setLayout(layoutRef.current)
    engine.start()
    const onMove = (e: PointerEvent): void => engine.setPointer(e.clientX, e.clientY)
    const onVis = (): void => { if (document.hidden) engine.stop(); else engine.start() }
    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("visibilitychange", onVis)
      engine.dispose()
      engineRef.current = null
    }
  }, [canvasRef, rootRef])

  useEffect(() => { engineRef.current?.setLayout(layout) }, [layout])
  return engineRef
}
