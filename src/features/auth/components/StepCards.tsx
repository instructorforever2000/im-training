import { useState } from "react"
import { T } from "../strings"
import { InviteCodeInput } from "./InviteCodeInput"
import type { AccessApi } from "../useAccess"

type StepState = "active" | "done" | "locked"

interface Props { access: AccessApi }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function StepCards({ access }: Props): React.JSX.Element {
  const { phase } = access
  const activeIdx = phase === "signedOut" || phase === "loading" || phase === "error" ? 0 : phase === "needInvite" ? 1 : 2
  const stateOf = (i: number): StepState => (i === activeIdx ? "active" : i < activeIdx ? "done" : "locked")

  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
  const [code, setCode] = useState("")
  const [codeErr, setCodeErr] = useState<string | null>(null)

  const run = async (fn: () => Promise<string | null>, onOk?: () => void): Promise<void> => {
    setBusy(true)
    const err = await fn()
    setBusy(false)
    if (err) setMsg({ kind: "err", text: err })
    else onOk?.()
  }

  const submitCode = async (): Promise<void> => {
    if (code.length < 8) { setCodeErr(T.inviteIncomplete); return }
    setBusy(true)
    setCodeErr(null)
    const err = await access.redeem(code)
    setBusy(false)
    if (err) setCodeErr(err)
  }

  const sendEmail = (): void => {
    if (!EMAIL_RE.test(email.trim())) { setMsg({ kind: "err", text: T.emailInvalid }); return }
    setMsg(null)
    void run(() => access.signInEmail(email.trim()), () => setMsg({ kind: "ok", text: T.emailSent }))
  }

  return (
    <ol className="lg-cards">
      {T.steps.map((s, i) => {
        const st = stateOf(i)
        return (
          <li key={s.en} className="lg-card" data-state={st} aria-current={st === "active" ? "step" : undefined}>
            <div className="lg-plate" aria-hidden="true"><i /><i /><i /></div>
            <div className="lg-glass">
              <header className="lg-card-head">
                <span className="lg-num" aria-hidden="true">{st === "done" ? "✓" : i + 1}</span>
                <h2>
                  <span className="ar">{s.ar}</span>
                  <span className="en">{s.en}</span>
                </h2>
              </header>

              {st === "done" && <p className="lg-note">{s.doneAr}</p>}
              {st === "locked" && <p className="lg-note lg-dim">{s.lockAr}</p>}

              {st === "active" && i === 0 && (
                <div className="lg-body">
                  {phase === "loading" && <p className="lg-note">{T.loading}</p>}
                  {phase === "error" && (
                    <>
                      <p className="lg-note"><b>{T.errorTitle}</b><br />{T.errorBody}</p>
                      <button className="lg-btn" onClick={access.retry}>{T.retry}</button>
                    </>
                  )}
                  {phase === "signedOut" && (
                    <>
                      <button className="lg-btn lg-google" disabled={busy} onClick={() => void run(access.signInGoogle)}>
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9a6 6 0 0 1 0-12c1.9 0 3.1.8 3.8 1.5l2.6-2.5A9.6 9.6 0 0 0 12 2.4a9.6 9.6 0 1 0 0 19.2c5.5 0 9.2-3.9 9.2-9.3 0-.6-.1-1.1-.2-1.6z" />
                        </svg>
                        <span>{T.google}</span>
                        <small>{T.googleEn}</small>
                      </button>
                      <div className="lg-or"><span>{T.or}</span></div>
                      <label className="lg-field">
                        <span>{T.emailLabel} <small>{T.emailEn}</small></span>
                        <input type="email" dir="ltr" autoComplete="email" inputMode="email" value={email}
                          onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendEmail() }} />
                      </label>
                      <button className="lg-btn lg-ghost" disabled={busy} onClick={sendEmail}>{T.emailSend}</button>
                      {msg && <p className="lg-msg" data-kind={msg.kind} role="status">{msg.text}</p>}
                    </>
                  )}
                </div>
              )}

              {st === "active" && i === 1 && (
                <div className="lg-body">
                  <p className="lg-note">{T.inviteHelp}</p>
                  <InviteCodeInput value={code} onChange={(v) => { setCode(v); setCodeErr(null) }} onSubmit={() => void submitCode()} disabled={busy} invalid={!!codeErr} />
                  {codeErr && <p className="lg-msg" data-kind="err" role="alert">{codeErr}</p>}
                  <button className="lg-btn" disabled={busy} onClick={() => void submitCode()}>{T.inviteSubmit}</button>
                  <button className="lg-link" onClick={() => void access.signOut()}>{T.signOut} · {T.signOutEn}</button>
                </div>
              )}

              {st === "active" && i === 2 && (
                <div className="lg-body">
                  {phase === "suspended" ? (
                    <p className="lg-note"><b>{T.suspendedTitle}</b><br />{T.suspendedBody}</p>
                  ) : (
                    <>
                      <p className="lg-note"><b>{T.pendingTitle}</b><br />{T.pendingBody}</p>
                      <div className="lg-pulse" aria-hidden="true"><i /><i /><i /></div>
                    </>
                  )}
                  <button className="lg-link" onClick={() => void access.signOut()}>{T.signOut} · {T.signOutEn}</button>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
