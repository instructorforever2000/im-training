import type { AccessApi } from "../auth/useAccess"
import { T } from "../auth/strings"

// Placeholder until the Daily Program (البرنامج اليومي) is built as the first real screen.
export function AccessGranted({ access }: { access: AccessApi }): React.JSX.Element {
  const m = access.membership
  const logo = `${import.meta.env.BASE_URL}icon-512.png`
  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <section className="text-center max-w-md">
        <img src={logo} alt="Instructor Motion" className="w-24 h-24 mx-auto mb-6" />
        <h1 className="text-2xl font-bold">{T.brand} · {T.platformAr}</h1>
        {m?.orgNameAr && <p className="mt-3 opacity-80">{m.orgNameAr}{m.orgNameEn ? ` · ${m.orgNameEn}` : ""}</p>}
        <p className="mt-3 text-sm opacity-60">البرنامج اليومي قيد البناء — Daily Program in progress</p>
        <button className="mt-8 underline text-sm" onClick={() => void access.signOut()}>{T.signOut} · {T.signOutEn}</button>
      </section>
    </main>
  )
}
