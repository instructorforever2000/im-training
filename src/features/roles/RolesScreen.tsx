// المراكز والأدوار — Positions & Roles studio (approved design roles-concept-v4).
import { useEffect, useRef } from "react"
import { Dock } from "@/components/ui/Dock"
import { MARKUP } from "./markup"
import { mountStudio } from "./studio"
import "@fontsource/outfit/500.css"
import "./roles.css"
import "./v5.css"
import { mountV5 } from "./v5"

export function RolesScreen(): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = host.current
    if (!el) return
    el.insertAdjacentHTML("beforeend", MARKUP)
    const stop = mountStudio(el)
    const stopV5 = mountV5(el)
    return () => { stopV5(); stop(); el.querySelector(":scope > main")?.remove() }
  }, [])
  return (
    <div ref={host} className="rs" data-theme="light" dir="rtl" lang="ar">
      <Dock active="roles" />
    </div>
  )
}
