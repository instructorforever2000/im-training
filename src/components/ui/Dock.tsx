// Floating side dock shared by the platform's field screens (links to the built sections).
import "./dock.css"

export type DockKey = "admin" | "library" | "roles" | "squad"
const logo = `${import.meta.env.BASE_URL}icon-192.png`
const ITEMS: readonly { k: DockKey; ar: string; href: string; d: string }[] = [
  { k: "admin", ar: "لوحة المدير", href: "#/", d: "M3 11l9-7 9 7v9H3z" },
  { k: "library", ar: "المكتبة", href: "#/library", d: "M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.8 1-3.6 14-3.8-1z" },
  { k: "roles", ar: "المراكز", href: "#/roles", d: "M12 3v18M3 12h18M16 12a4 4 0 11-8 0 4 4 0 018 0z" },
  { k: "squad", ar: "اللاعبون", href: "#/squad", d: "M9 4.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7" },
]

export function Dock({ active }: { readonly active: DockKey }): React.JSX.Element {
  return (
    <nav className="dock"><img src={logo} alt="IM Training" />
      {ITEMS.map((r) => <a key={r.k} className={r.k === active ? "on" : ""} href={r.href}><svg viewBox="0 0 24 24"><path d={r.d} /></svg>{r.ar}</a>)}
      <span className="sp" />
      <a title="المساعد الذكي — قريبًا" aria-disabled="true"><svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.4L20 9l-4.4 3.8L17 18.5 12 15.6 7 18.5l1.4-5.7L4 9l5.8-.6z" /></svg>المساعد</a>
    </nav>
  )
}
