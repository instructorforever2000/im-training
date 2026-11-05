// Floating side dock shared by the platform's field screens (links to the built sections).
import "./dock.css"

export type DockKey = "admin" | "library" | "board" | "roles" | "squad" | "tournaments" | "learning" | "assessment" | "program"
const logo = `${import.meta.env.BASE_URL}icon-192.png`
/** Sections that need membership; a visitor sees them locked and is sent to the tour's "how to join". */
const MEMBERS_ONLY: ReadonlySet<DockKey> = new Set(["admin", "tournaments", "squad", "assessment", "program"])
const isVisitor = (): boolean => document.documentElement.dataset.visitor !== undefined
const ITEMS: readonly { k: DockKey; ar: string; href: string; d: string }[] = [
  { k: "admin", ar: "لوحة المدير", href: "#/", d: "M3 11l9-7 9 7v9H3z" },
  { k: "program", ar: "البرنامج", href: "#/program", d: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4M8 14h3v3H8z" },
  { k: "library", ar: "المكتبة", href: "#/library", d: "M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.8 1-3.6 14-3.8-1z" },
  { k: "board", ar: "السبورة", href: "#/board", d: "M3 4h18v13H3zM8 21l4-4 4 4M7 8l3 3M10 8l-3 3M14 12c2-4 4-4 4-2" },
  { k: "roles", ar: "المراكز", href: "#/roles", d: "M12 3v18M3 12h18M16 12a4 4 0 11-8 0 4 4 0 018 0z" },
  { k: "tournaments", ar: "البطولات", href: "#/tournaments", d: "M7 4h10v4a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 13v4M8 20h8M10 17h4" },
  { k: "assessment", ar: "التقييم", href: "#/assessment", d: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { k: "learning", ar: "التعلّم", href: "#/learning", d: "M3 8l9-4 9 4-9 4zM7 10v5c3 2 7 2 10 0v-5M21 8v6" },
  { k: "squad", ar: "اللاعبون", href: "#/squad", d: "M9 4.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7" },
]

export function Dock({ active }: { readonly active: DockKey }): React.JSX.Element {
  return (
    <nav className="dock"><img src={logo} alt="IM Training" />
      {ITEMS.map((r) => { const lock = isVisitor() && MEMBERS_ONLY.has(r.k); return <a key={r.k} className={`${r.k === active ? "on" : ""}${lock ? " lock" : ""}`} href={lock ? "#/tour#join" : r.href}><svg viewBox="0 0 24 24"><path d={r.d} /></svg>{r.ar}</a> })}
      <span className="sp" />
      <a title="المساعد الذكي — قريبًا" aria-disabled="true"><svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.4L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.6z" /></svg>المساعد</a>
    </nav>
  )
}
