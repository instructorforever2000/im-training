import { useRef } from "react"
import { INVITE_CODE_LENGTH } from "../strings"

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  invalid?: boolean
}

/** Boxes for display only; ONE real input underneath (paste, SMS autofill and keyboards all work). */
export function InviteCodeInput({ value, onChange, onSubmit, disabled, invalid }: Props): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  const clean = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, INVITE_CODE_LENGTH)
  return (
    <div className="lg-code" dir="ltr" onClick={() => ref.current?.focus()} data-invalid={invalid ? "" : undefined}>
      <input
        ref={ref}
        className="lg-code-input"
        value={value}
        inputMode="text"
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={INVITE_CODE_LENGTH}
        disabled={disabled}
        aria-label="Invite code"
        onChange={(e) => onChange(clean(e.target.value))}
        onKeyDown={(e) => { if (e.key === "Enter") onSubmit() }}
      />
      {Array.from({ length: INVITE_CODE_LENGTH }, (_, i) => (
        <span key={i} className="lg-code-box" data-filled={value[i] ? "" : undefined} data-active={i === Math.min(value.length, INVITE_CODE_LENGTH - 1) ? "" : undefined}>
          {value[i] ?? ""}
        </span>
      ))}
    </div>
  )
}
