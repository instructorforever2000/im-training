// المراكز والأدوار (Positions & Roles) — approved concept roles-concept-v1 (28 Oct 2026):
// the arena is the screen · tap a player → his role, zones and phase movement · compare the position's role variants.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./roles.css"
import { Dock } from "@/components/ui/Dock"
import { CFG, FORMATIONS, PHASES, ROLES, SPORTS, drillName, familyOf, rolesFor, type PhaseKey, type Role, type RoleSport } from "./formations"
import { drawScene } from "./pitch"

type Theme = "light" | "dark"
const THEME_KEY = "im-theme"
const PCT = 100
const SPORT_KEYS = Object.keys(SPORTS) as RoleSport[]

function readTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light" } catch { return "light" }
}

function firstRole(rs: RoleSport, form: string, slot: number): string | null {
  const s = FORMATIONS[rs][form][slot]
  return s ? rolesFor(rs, familyOf(rs, s[0]))[0]?.id ?? null : null
}

/** Quick comparison bars from the role's with-ball zone: how far forward, how wide, how much space it covers. */
function rate(r: Role): readonly [string, number][] {
  const [x = 0, , rx = 0, ry = 0] = r.z?.wb ?? []
  return [["التقدم", x], ["الاتساع", Math.min(1, ry * CFG.compare.width)], ["المساحة", Math.min(1, rx * CFG.compare.space)]]
}

export function RolesScreen(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [rs, setRs] = useState<RoleSport>(CFG.start.rs as RoleSport)
  const [form, setForm] = useState(CFG.start.form)
  const [slot, setSlot] = useState(CFG.start.slot)
  const [roleId, setRoleId] = useState<string | null>(() => firstRole(CFG.start.rs as RoleSport, CFG.start.form, CFG.start.slot))
  const [ph, setPh] = useState<PhaseKey>(CFG.start.ph as PhaseKey)
  const [width, setWidth] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { if (e) setWidth(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const flip = useCallback((): void => {
    setTheme((t) => { const n: Theme = t === "dark" ? "light" : "dark"; try { localStorage.setItem(THEME_KEY, n) } catch { /* private mode */ } return n })
  }, [])

  const pick = (nrs: RoleSport, nform: string, nslot: number): void => {
    setRs(nrs); setForm(nform); setSlot(nslot); setRoleId(firstRole(nrs, nform, nslot))
  }
  const chooseSport = (k: RoleSport): void => {
    const f = Object.keys(FORMATIONS[k])[0] ?? ""
    pick(k, f, Math.min(slot, FORMATIONS[k][f].length - 1))
  }

  const sel = FORMATIONS[rs][form][slot]
  const role = ROLES.find((r) => r.id === roleId) ?? null
  const variants = sel ? rolesFor(rs, familyOf(rs, sel[0])) : []
  const phase = PHASES.find((p) => p.k === ph) ?? PHASES[0]
  const scene = useMemo(() => drawScene({ rs, form, slot, role, ph, dark: theme === "dark", width }), [rs, form, slot, role, ph, theme, width])

  const onPitch = (e: React.MouseEvent<SVGSVGElement>): void => {
    const g = (e.target as Element).closest(".slot")
    const i = g?.getAttribute("data-i")
    if (i != null) pick(rs, form, Number(i))
  }

  return (
    <div className="rol" data-theme={theme} dir="rtl">
      <Dock active="roles" />
      <div className="page">
        <section className="glass bar">
          <h1>المراكز والأدوار <span className="en">Positions & Roles</span></h1>
          <div className="grp">
            {SPORT_KEYS.map((k) => (
              <button key={k} className={`chip${rs === k ? " on" : ""}`} onClick={() => chooseSport(k)}>
                {SPORTS[k].ar} <span className="cnt">{ROLES.filter((r) => r.rs === k).length}</span>
              </button>
            ))}
          </div>
          <span className="sp" />
          <label className="chip">الرسم <span className="en">Formation</span>
            <select value={form} onChange={(e) => pick(rs, e.target.value, Math.min(slot, FORMATIONS[rs][e.target.value].length - 1))}>
              {Object.keys(FORMATIONS[rs]).map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <button className="chip" onClick={flip} title="فاتح / غامق">◐</button>
        </section>

        <section className="glass field">
          <div className="legend">
            <span><i className="d" style={{ "--c": CFG.pitch.colors.noBall } as React.CSSProperties} />بدون كرة</span>
            <span><i style={{ "--c": CFG.pitch.colors.withBall } as React.CSSProperties} />بالكرة</span>
            <span><i className="mv" />حركة المرحلة</span>
          </div>
          <div ref={box} className="pbox">
            {width > 0 && <svg className="pitch" viewBox={`0 0 ${scene.W} ${scene.H}`} onClick={onPitch} dangerouslySetInnerHTML={{ __html: scene.svg }} />}
          </div>
          <div className="phases">
            {PHASES.map((p) => (
              <button key={p.k} className={ph === p.k ? "on" : ""} style={{ "--c": p.c } as React.CSSProperties} onClick={() => setPh(p.k)}>
                <i />{p.ar} <span className="en">{p.en}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="glass det" key={`${roleId}-${ph}`}>
          {sel && !role && <><span className="k">{sel[0]}</span><h2>مركز {sel[0]}</h2><p className="k">لسه مفيش أدوار مشروحة للمركز ده — هتتضاف في التطوير.</p></>}
          {sel && role && <RoleDetail role={role} code={sel[0]} num={sel[1]} rs={rs} phase={phase} />}
        </aside>

        <aside className="glass var">
          <h3>أدوار المركز {sel?.[0]} <span className="en">Role variants · {variants.length}</span></h3>
          {variants.map((r) => (
            <button key={r.id} className={`vc${r.id === roleId ? " on" : ""}`} onClick={() => setRoleId(r.id)}>
              <b>{r.name.ar}</b><small>{r.name.en}</small><p>{r.desc.ar}</p>
              <div className="cmp">{rate(r).map(([a, v]) => <div key={a}><span>{a}</span><i><b style={{ width: `${Math.round(v * PCT)}%` }} /></i></div>)}</div>
            </button>
          ))}
          <div className="all">
            <span className="k">كل أدوار {SPORTS[rs].ar}</span>
            {ROLES.filter((r) => r.rs === rs).map((r) => <span key={r.id} className={`chip${r.id === roleId ? " on" : ""}`}>{r.name.ar}</span>)}
          </div>
        </aside>

        <div className="foot"><span>اضغط أي لاعب على الملعب · غيّر المرحلة وشوف حركته ومناطقه</span><span className="sig">Instructor: Mohamed Ayad</span></div>
      </div>
    </div>
  )
}

function RoleDetail({ role, code, num, rs, phase }: { readonly role: Role; readonly code: string; readonly num: number; readonly rs: RoleSport; readonly phase: (typeof PHASES)[number] }): React.JSX.Element {
  const duties = role.ph[phase.k]?.ar ?? []
  const sp = role.sp?.ar ?? []
  const drills = role.drills.map(drillName).filter((d): d is NonNullable<typeof d> => d !== null)
  return (
    <>
      <span className="k">● {SPORTS[rs].ar} · المركز {code} · رقم {num}</span>
      <h2>{role.name.ar}</h2><div className="e2">{role.name.en}</div>
      <p>{role.desc.ar}</p>
      <div>
        <h4 style={{ color: phase.c }}>● {phase.ar} <span className="en">{phase.en}</span></h4>
        <div className="duty" style={{ "--c": phase.c } as React.CSSProperties}>{duties.length ? duties.map((t) => <div key={t}>{t}</div>) : <div>—</div>}</div>
      </div>
      {sp.length > 0 && <div><h4>الكرات الثابتة <span className="en">Set pieces</span></h4><div className="duty" style={{ "--c": CFG.setPieceColor } as React.CSSProperties}>{sp.map((t) => <div key={t}>{t}</div>)}</div></div>}
      <div><h4>مؤشرات الأداء <span className="en">KPIs</span></h4><div className="kpi">{(role.kpi?.ar ?? []).map((t) => <div key={t}>{t}</div>)}</div></div>
      <div><h4>تمارين تبني الدور <span className="en">From the library</span></h4>
        <div className="dr">{drills.length ? drills.map((d) => <a key={d.ar} href="#/library">{d.ar}</a>) : <span className="k">—</span>}</div>
      </div>
    </>
  )
}
