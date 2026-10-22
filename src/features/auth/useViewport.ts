import { useEffect, useState } from "react"
import { computeLayout, type LayoutMetrics } from "./layout"

/** Layout metrics that follow the real window size (resize, rotation, browser zoom). */
export function useViewportLayout(): LayoutMetrics {
  const [layout, setLayout] = useState<LayoutMetrics>(() => computeLayout(window.innerWidth, window.innerHeight))
  useEffect(() => {
    let raf = 0
    const update = (): void => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setLayout(computeLayout(window.innerWidth, window.innerHeight)))
    }
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])
  return layout
}
