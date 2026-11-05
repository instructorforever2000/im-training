// A button for an action that needs a capability (print, download, reports, certificates…).
// Without it the button stays visible with a small lock, and pressing it shows a polite note.
import { guard, useCan, type Cap } from "@/features/auth/caps"

export function CapButton({ cap, onClick, className, disabled, children, title }: {
  readonly cap: Cap; readonly onClick: () => void; readonly className?: string; readonly disabled?: boolean; readonly children: React.ReactNode; readonly title?: string
}): React.JSX.Element {
  const ok = useCan(cap)
  return (
    <button type="button" className={`${className ?? ""}${ok ? "" : " cap-locked"}`} disabled={disabled} title={title} onClick={() => guard(cap, onClick)}>
      {children}{!ok && <span className="cap-lock" aria-label="للأعضاء">🔒</span>}
    </button>
  )
}
