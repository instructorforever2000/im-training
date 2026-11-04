// A drill's 3D picture: drawn by the shared 3D engine when the card scrolls into view, then cached.
import { useEffect, useRef, useState } from "react"
import type { Drill } from "./content"

const NEAR = "300px"

export function DrillImage({ d, ctx, dark, alt }: { d: Drill; ctx?: string; dark: boolean; alt: string }): React.JSX.Element {
  const box = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState("")
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() } }, { rootMargin: NEAR })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!seen) return
    let live = true
    const draw = async (): Promise<void> => {
      const { drillImage } = await import("./arena3d/render")
      const u = await drillImage(d, ctx, dark)
      if (live) setSrc(u)
    }
    void draw()
    return () => { live = false }
  }, [seen, d, ctx, dark])
  return (
    <div ref={box} className={`dimg${src ? " ok" : ""}`}>
      {src ? <img src={src} alt={alt} loading="lazy" decoding="async" /> : <span className="shim" aria-hidden="true" />}
    </div>
  )
}
