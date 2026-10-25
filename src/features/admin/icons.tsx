// Line icons of لوحة المدير (from the approved design), as one inline SVG sprite.
const SPRITE = `<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9H3z"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h16"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0"/></symbol>
<symbol id="i-org" viewBox="0 0 24 24"><path d="M4 21V5h10v16M14 9h6v12M7 9h3M7 13h3M7 17h3"/></symbol>
<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></symbol>
<symbol id="i-team" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.5c2 .7 3.2 2.6 3.5 5.5"/></symbol>
<symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
<symbol id="i-cup" viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 01-10 0zM7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 21h8"/></symbol>
<symbol id="i-whistle" viewBox="0 0 24 24"><circle cx="9" cy="14" r="5"/><path d="M13 11l8-4v4l-6 2"/></symbol>
<symbol id="i-dumb" viewBox="0 0 24 24"><path d="M6 7v10M3 10v4M18 7v10M21 10v4M6 12h12"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16"/></symbol>
<symbol id="i-box" viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
<symbol id="i-screen" viewBox="0 0 24 24"><path d="M3 4h18v12H3zM8 20h8M12 16v4"/></symbol>`

export function Icons(): React.JSX.Element {
  return <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><defs dangerouslySetInnerHTML={{ __html: SPRITE }} /></svg>
}

export function Icon({ id, className }: { id: string; className?: string }): React.JSX.Element {
  return <svg className={`i${className ? ` ${className}` : ""}`} aria-hidden="true"><use href={`#i-${id}`} /></svg>
}
