// السبورة التكتيكية (Tactical board) — the v28 board inside the platform: draw, write, set formations, animate frames.
// "#/board?play=<id>" opens an animated play from the library on the board with all its frames.
import { useEffect, useRef, useState } from "react"
import { Board3D } from "@/features/board3d/Board3D"
import { Dock } from "@/components/ui/Dock"
import { PLAYS } from "@/features/library/content"
import { mountBoard } from "./board.js"
import "./board.css"

// Play id in the route: "board?play=f-overlap" → "f-overlap"; "board" → no match.
// https://regex101.com/?flavor=javascript&regex=%5B%3F%26%5Dplay%3D(%5B%5E%26%23%5D%2B)&testString=board%3Fplay%3Df-overlap
const PLAY_RE = /[?&]play=([^&#]+)/

export function BoardScreen(): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null)
  // 3D is the default; the 2D board stays available (and is used for a play opened from the library) until 3D has every feature.
  const [three, setThree] = useState(() => !PLAY_RE.test(window.location.hash))
  useEffect(() => {
    if (three) return
    const el = host.current
    if (!el) return
    const id = PLAY_RE.exec(window.location.hash)?.[1]
    const play = id ? PLAYS.find((p) => p.id === decodeURIComponent(id)) : undefined
    return mountBoard(el, play)
  }, [three])
  const sw = <button className="bd3sw" onClick={() => setThree((t) => !t)}>{three ? "السبورة 2D" : "السبورة 3D"}</button>
  if (three) return <div className="bd" dir="rtl" lang="ar"><Dock active="board" /><Board3D dark={false} />{sw}</div>
  return (
    <div className="bd" dir="rtl" lang="ar">
      <Dock active="board" />
      <header className="bdtop"><div><h1>السبورة التكتيكية <span>Tactical board</span></h1>
        <p>ارسم التمريرات والجري والمراوغة، واكتب الملاحظات، وغيّر خطط الفريقين، ثم أضف مراحل للحركة وشغّلها أو صدّرها صورةً أو فيديو.</p></div></header>
      <div className="bdhost" ref={host} />
      {sw}
    </div>
  )
}
