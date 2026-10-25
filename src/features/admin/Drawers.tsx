// The side drawer of لوحة المدير: new organisation, new invite code, join requests, section info.
// Every form writes to the shared Supabase core (RLS: owner only) and the board refreshes live.
import { useState } from "react"
import cfg from "./sections.json"
import {
  COUNTRIES, ORG_TYPES, ROLE_AR, createInvite, createOrg, deactivateInvite, inviteLive, setMemberStatus,
  type AdminData, type MemberRole, type OrgType,
} from "./data"
import type { Alert } from "./model"

export type DrawerKind = { k: "org" } | { k: "inv"; orgId?: string } | { k: "app" } | { k: "sec"; title: string; to: string; ready: boolean }

const R = cfg.rules
const GAP: React.CSSProperties = { marginTop: "20px" }
const INVITE_ROLES: readonly MemberRole[] = ["org_admin", "technical_director", "coach", "fitness_coach", "supervisor", "player", "parent"]

function Pills<T extends string | number>({ items, value, label, onPick }: { items: readonly T[]; value: T; label: (v: T) => string; onPick: (v: T) => void }): React.JSX.Element {
  return <div>{items.map((v) => <button type="button" key={String(v)} className={`pill${v === value ? " on" : ""}`} onClick={() => onPick(v)}>{label(v)}</button>)}</div>
}

function NewOrg({ done }: { done: () => void }): React.JSX.Element {
  const [f, setF] = useState({ name_ar: "", name_en: "", org_type: "school" as OrgType, country: "SA", city: "" })
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!f.name_ar.trim()) { setErr("اكتب اسم الجهة بالعربي."); return }
    setBusy(true)
    const r = await createOrg({ ...f, name_ar: f.name_ar.trim(), name_en: f.name_en.trim(), city: f.city.trim() })
    setBusy(false)
    if (r) setErr(`ما اتسجّلتش: ${r}`); else done()
  }
  return (
    <form onSubmit={(e) => void submit(e)}>
      <h3>جهة جديدة<span className="en">New organization</span></h3>
      <p className="fld">نوع الجهة <span className="en">Type</span></p>
      <Pills items={Object.keys(ORG_TYPES) as OrgType[]} value={f.org_type} label={(v) => ORG_TYPES[v]} onPick={(v) => setF({ ...f, org_type: v })} />
      <label className="fld">الاسم بالعربي <span className="en">Arabic name</span><input value={f.name_ar} onChange={(e) => setF({ ...f, name_ar: e.target.value })} required /></label>
      <label className="fld">الاسم بالإنجليزي <span className="en">English name</span><input dir="ltr" value={f.name_en} onChange={(e) => setF({ ...f, name_en: e.target.value })} /></label>
      <label className="fld">الدولة <span className="en">Country</span>
        <select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>{Object.entries(COUNTRIES).map(([c, ar]) => <option key={c} value={c}>{ar}</option>)}</select></label>
      <label className="fld">المدينة <span className="en">City</span><input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
      {err && <p className="err">{err}</p>}
      <button className="btn p" style={GAP} disabled={busy}>{busy ? "جارٍ الحفظ…" : "تسجيل الجهة"}</button>
    </form>
  )
}

function NewInvite({ data, orgId }: { data: AdminData; orgId?: string }): React.JSX.Element {
  const orgs = data.orgs.filter((o) => o.is_active)
  const [org, setOrg] = useState(orgId ?? orgs[0]?.id ?? "")
  const [role, setRole] = useState<MemberRole>("coach")
  const [days, setDays] = useState(R.inviteDays[1])
  const [uses, setUses] = useState(R.inviteUses[0])
  const [code, setCode] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const orgName = orgs.find((o) => o.id === org)?.name_ar ?? ""
  const msg = code ? `رمز دعوتك لمنصة IM Training (${orgName}): ${code}\n${window.location.origin}${import.meta.env.BASE_URL}` : ""
  const issue = async (): Promise<void> => {
    setErr(null)
    const r = await createInvite({ org_id: org, role, days, max_uses: uses })
    if (r.error) setErr(`ما اتصدرش: ${r.error}`); else setCode(r.code ?? null)
  }
  const copy = async (): Promise<void> => { await navigator.clipboard.writeText(msg); setCopied(true) }
  if (!orgs.length) return <><h3>رمز دعوة جديد<span className="en">New invite code</span></h3><div className="empty">سجّل جهة الأول — كل رمز مربوط بجهة واحدة.</div></>
  const live = data.invites.filter((i) => inviteLive(i))
  return (
    <>
      <h3>رمز دعوة جديد<span className="en">New invite code</span></h3>
      <p className="fld">الجهة <span className="en">Organization</span></p>
      <Pills items={orgs.map((o) => o.id)} value={org} label={(id) => orgs.find((o) => o.id === id)?.name_ar ?? ""} onPick={setOrg} />
      <p className="fld">الدور <span className="en">Role</span></p>
      <Pills items={INVITE_ROLES} value={role} label={(r) => ROLE_AR[r]} onPick={setRole} />
      <p className="fld">الصلاحية <span className="en">Valid for</span></p>
      <Pills items={R.inviteDays} value={days} label={(d) => `${d} يوم`} onPick={setDays} />
      <p className="fld">عدد مرات الاستخدام <span className="en">Max uses</span></p>
      <Pills items={R.inviteUses} value={uses} label={(u) => (u === 1 ? "استخدام واحد" : `${u} شخص`)} onPick={setUses} />
      {code ? (
        <>
          <div className="code">{code}</div>
          <div className="codebox">
            <button className="btn p" onClick={() => void copy()}>{copied ? "اتنسخ ✓" : "نسخ الرسالة"}</button>
            <a className="btn" style={{ display: "inline-flex", alignItems: "center" }} href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">واتساب</a>
            <button className="btn" onClick={() => { setCode(null); setCopied(false) }}>رمز تاني</button>
          </div>
        </>
      ) : <button className="btn p" style={GAP} onClick={() => void issue()}>إصدار الرمز</button>}
      {err && <p className="err">{err}</p>}
      <h3 className="subh">الرموز النشطة <span className="en">Active codes · {live.length}</span></h3>
      {live.length ? live.map((i) => (
        <div className="req" key={i.id}><div><b className="en" style={{ color: "#b9c3ff" }}>{i.code}</b>
          <small>{ROLE_AR[i.default_role]} · {i.uses}/{i.max_uses ?? "∞"} · ينتهي {i.expires_at ? new Date(i.expires_at).toLocaleDateString("ar") : "—"}</small></div>
          <div className="act"><button className="btn" onClick={() => void deactivateInvite(i.id)}>إيقاف</button></div></div>
      )) : <div className="empty">مفيش رموز نشطة.</div>}
    </>
  )
}

function Approvals({ data, alerts }: { data: AdminData; alerts: Alert[] }): React.JSX.Element {
  const pending = data.members.filter((m) => m.status === "pending")
  const orgName = (id: string): string => data.orgs.find((o) => o.id === id)?.name_ar ?? ""
  return (
    <>
      <h3>التنبيهات والطلبات<span className="en">Alerts & approvals</span></h3>
      {pending.length ? pending.map((m) => (
        <div className="req" key={m.id}>
          <div>{data.names[m.user_id] ?? "عضو جديد"}<small>{orgName(m.org_id)} · {ROLE_AR[m.role]} · {new Date(m.created_at).toLocaleDateString("ar")}</small></div>
          <div className="act">
            <button className="btn p" onClick={() => void setMemberStatus(m.id, "approved")}>موافقة</button>
            <button className="btn" onClick={() => void setMemberStatus(m.id, "suspended")}>رفض</button>
          </div>
        </div>
      )) : <div className="empty">لا توجد طلبات انضمام الآن.<br />أول ما حد يسجّل برمز دعوة يظهر هنا: الاسم، والجهة، والدور — وقدامه <b>موافقة</b> أو <b>رفض</b>.</div>}
      {alerts.map((a) => <div key={a.title} className={`al ${a.tone}`}><span className="k">{a.icon}</span><div>{a.title}<small>{a.note}</small></div></div>)}
    </>
  )
}

export function DrawerBody({ kind, data, alerts, close }: { kind: DrawerKind; data: AdminData; alerts: Alert[]; close: () => void }): React.JSX.Element {
  if (kind.k === "org") return <NewOrg done={close} />
  if (kind.k === "inv") return <NewInvite data={data} orgId={kind.orgId} />
  if (kind.k === "app") return <Approvals data={data} alerts={alerts} />
  return (
    <>
      <h3>{kind.title}<span className="en">Section</span></h3>
      <div className="empty">المكان الجديد: {kind.to}<br />{kind.ready ? "البيانات منقولة وجاهزة — شاشة القسم هتتبني بعد اعتماد تصميمها." : "القسم في الانتظار حسب ترتيب خريطة النقل."}</div>
    </>
  )
}
