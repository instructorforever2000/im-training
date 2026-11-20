// السبورة التكتيكية (Tactical board) — one board, fully 3D (src/features/board3d).
// "#/board?play=<id>" opens a library play on the 3D field with all its steps.
// The old 2D board (v28) was retired on the owner's decision (Nov 2026); its source stays read-only in legacy/v28.
import { Dock } from "@/components/ui/Dock"
import { Board3D } from "@/features/board3d/Board3D"
import "./board.css"

// Play id in the route: "board?play=f-overlap" → "f-overlap"; "board" → no match.
const PLAY_RE = /[?&]play=([^&#]+)/

export function BoardScreen(): React.JSX.Element {
  const pid = PLAY_RE.exec(window.location.hash)?.[1]
  return (
    <div className="bdscr" dir="rtl" lang="ar">
      <Dock active="board" />
      <Board3D dark={false} playId={pid ? decodeURIComponent(pid) : undefined} />
    </div>
  )
}
