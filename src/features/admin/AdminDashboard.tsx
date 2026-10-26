// لوحة المدير — Admin command center. Built on the approved design admin-concept-v4 (26 Oct 2026):
// dark, no pitches, every number live from Supabase + the migrated v28 content.
import { useEffect, useMemo, useRef, useState } from "react"
import "./admin.css"
import cfg from "./sections.json"
import { Icons, Icon } from "./icons"
import { countryAr, CONTENT_BY_SPORT, CONTENT_TOTAL, ORG_TYPES, SPORT_LABELS, inviteLive, useAdminData, type AdminData } from "./data"
import { READY_SECTIONS, TILES, briefing, greeting, journey, orgHealth, pct100, smartAlerts, snapshotAt, timeline, type Alert, type TileStatus } from "./model"
import { gaugeSvg, geoSvg, healthSvg, startNetwork, startPulse } from "./viz"
import { DrawerBody, type DrawerKind } from "./Drawers"

const BAR_FILL = 0.82
const MOBILE_PX = 760
const COUNT_STEPS = 20
const COUNT_MS = 40
const BAR_DELAY_MS = 30
const HR_AT = 4
const WAVE_PHASES = 7
export type View = "overview" | "orgs" | "members" | "content" | "activity"
const VIEWS: readonly { id: View; ar: string; en: string; ic: string }[] = [
  { id: "overview", ar: "نظرة عامة", en: "Overview", ic: "home" },
  { id: "orgs", ar: "الجهات", en: "Organizations", ic: "org" },
  { id: "members", ar: "الأعضاء والطلبات", en: "Members", ic: "user" },
  { id: "content", ar: "المحتوى والأقسام", en: "Content", ic: "book" },
  { id: "activity", ar: "النبض والسجل", en: "Activity", ic: "clock" },
]
type SportKey = keyof typeof CONTENT_BY_SPORT
const SEG: readonly [SportKey, string][] = [["skills", "مهارات"], ["plays", "خطط متحركة"], ["roles", "مراكز"]]
const NAV_ST = cfg.navStatus as Record<string, string>

/** Animated count-up to a live number. */
function Count({ n }: { n: number }): React.JSX.Element {
  const [v, setV] = useState(0)
  useEffect(() => {
    let k = 0
    const id = window.setInterval(() => { k += 1; setV(Math.round((n * k) / COUNT_STEPS)); if (k >= COUNT_STEPS) window.clearInterval(id) }, COUNT_MS)
    return () => window.clearInterval(id)
  }, [n])
  return <>{v}</>
}

function Svg({ html, className, viewBox, w, h }: { html: string; className?: string; viewBox: string; w?: string; h?: string }): React.JSX.Element {
  return <svg className={className} width={w} height={h} viewBox={viewBox} dangerouslySetInnerHTML={{ __html: html }} />
}

function Canvas({ start }: { start: (c: HTMLCanvasElement) => () => void }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => (ref.current ? start(ref.current) : undefined), [start])
  return <canvas ref={ref} />
}

function Sidebar({ view, setView }: { view: View; setView: (v: View) => void }): React.JSX.Element {
  const [open, setOpen] = useState<number>(-1)
  const [adm, setAdm] = useState(true)
  const logo = `${import.meta.env.BASE_URL}icon-192.png`
  return (
    <aside className="side">
      <div className="brand"><span className="mark"><img src={logo} alt="IM Training" /></span><div><b>IM <span>Training</span></b><small>منصة التدريب · by Instructor Motion</small></div></div>
      <div className={`grp${adm ? " open" : ""}`}>
        <button className="nav-a on" onClick={() => setAdm(!adm)}><Icon id="shield" /><span>لوحة المدير</span><Icon id="chev" className="ch" /></button>
        <div className="sub"><div>{VIEWS.map((v) => (
          <a key={v.id} className={view === v.id ? "cur" : ""} onClick={() => setView(v.id)}><span className="vn"><Icon id={v.ic} />{v.ar}</span><span className="en">{v.en}</span></a>
        ))}</div></div>
      </div>
      <div className="lbl">المنصة · كل الأقسام</div>
      {cfg.nav.map((g, i) => (
        <div key={g.ar} className={`grp${open === i ? " open" : ""}`}>
          <button className="nav-a" onClick={() => setOpen(open === i ? -1 : i)}><Icon id={g.icon.replace("i-", "")} /><span>{g.ar}</span><Icon id="chev" className="ch" /></button>
          <div className="sub"><div>{g.items.map((x) => <a key={x.ar} href={(x as { href?: string }).href}>{x.ar}<span className={`st ${x.st === "b" ? "d" : x.st}`}>{NAV_ST[x.st]}</span></a>)}</div></div>
        </div>
      ))}
    </aside>
  )
}

function Search({ data, open }: { data: AdminData; open: (k: DrawerKind) => void }): React.JSX.Element {
  const [q, setQ] = useState("")
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const key = (e: KeyboardEvent): void => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus() } }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [])
  const t = q.trim()
  const hits = t ? [
    ...data.orgs.filter((o) => `${o.name_ar} ${o.name_en}`.toLowerCase().includes(t.toLowerCase())).map((o) => ({ label: o.name_ar ?? "", kind: "جهة", go: (): void => open({ k: "inv", orgId: o.id }) })),
    ...TILES.filter((s) => s.ar.includes(t) || s.to.includes(t)).map((s) => ({ label: s.ar, kind: "قسم", go: (): void => open({ k: "sec", title: s.ar, to: s.to, ready: s.st !== "w" }) })),
  ] : []
  return (
    <div className="search"><Icon id="search" />
      <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن جهة، قسم…" />
      <kbd>Ctrl K</kbd>
      {t && <div className="sres">{hits.length ? hits.map((h) => <a key={h.kind + h.label} onClick={() => { h.go(); setQ("") }}>{h.label}<small>{h.kind}</small></a>) : <a>لا نتائج<small>No results</small></a>}</div>}
    </div>
  )
}

const CREATE: readonly { ic: string; ar: string; sub: string; k?: DrawerKind }[] = [
  { ic: "org", ar: "جهة جديدة", sub: "نادي · أكاديمية · مدرسة · جامعة", k: { k: "org" } },
  { ic: "team", ar: "فريق", sub: "داخل أي جهة، بأي لعبة" },
  { ic: "whistle", ar: "وحدة تدريبية", sub: "من المكتبة مباشرة" },
  { ic: "cup", ar: "بطولة", sub: "دوري · خروج المغلوب · مختلط" },
  { ic: "key", ar: "رمز دعوة", sub: "لشخص أو لجهة كاملة", k: { k: "inv" } },
  { ic: "user", ar: "عضو / مدرب", sub: "برمز دعوة بدور محدد", k: { k: "inv" } },
]

function AlertsList({ alerts, act }: { alerts: Alert[]; act: (a: Alert) => void }): React.JSX.Element {
  return <>{alerts.map((a) => <div key={a.title} className={`al ${a.tone}`}><span className="k">{a.icon}</span><div>{a.title}<small>{a.note}</small></div><button onClick={() => act(a)}>{a.action}</button></div>)}</>
}

export function Board({ data }: { data: AdminData }): React.JSX.Element {
  const [drawer, setDrawer] = useState<DrawerKind | null>(null)
  const [menu, setMenu] = useState(false)
  const [nav, setNav] = useState<"" | "mini" | "mob">("")
  const [seg, setSeg] = useState<SportKey>("skills")
  const [grow, setGrow] = useState(false)
  const [present, setPresent] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [aiNote, setAiNote] = useState(false)
  const [view, setView] = useState<View>("overview")
  const days = useMemo(() => timeline(data), [data])
  const [dayIdx, setDayIdx] = useState<number | null>(null)
  const idx = dayIdx ?? days.length - 1
  const live = idx === days.length - 1
  const snap = snapshotAt(data, days[idx])
  const alerts = useMemo(() => smartAlerts(data), [data])
  const j = journey(data)
  const pending = data.members.filter((m) => m.status === "pending").length
  const invitesLive = data.invites.filter((i) => inviteLive(i)).length
  const name = data.me.name.split(" ")[0] || "المدير"
  const brief = briefing(data, name)
  const geo = useMemo(() => geoSvg(data.orgs.filter((o) => o.is_active).map((o) => ({ name: o.name_ar ?? "", country: countryAr(o.country) }))), [data.orgs])
  const pulse = useRef<{ spike: () => void } | null>(null)
  const lastEvents = useRef(data.audit.length)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setGrow(false); const id = window.setTimeout(() => setGrow(true), BAR_DELAY_MS); return () => window.clearTimeout(id) }, [seg])
  useEffect(() => { if (data.audit.length !== lastEvents.current) { lastEvents.current = data.audit.length; pulse.current?.spike() } }, [data.audit.length])
  useEffect(() => {
    const esc = (e: KeyboardEvent): void => { if (e.key === "Escape") { setPresent(false); setDrawer(null) } }
    window.addEventListener("keydown", esc)
    return () => window.removeEventListener("keydown", esc)
  }, [])
  useEffect(() => {
    const toggle = async (): Promise<void> => {
      try {
        if (present) await document.documentElement.requestFullscreen()
        else if (document.fullscreenElement) await document.exitFullscreen()
      } catch { /* fullscreen not allowed — presentation still works in the window */ }
    }
    void toggle()
  }, [present])
  useEffect(() => () => speechSynthesis.cancel(), [])

  const open = (k: DrawerKind): void => { setMenu(false); setDrawer(k) }
  const actAlert = (a: Alert): void => {
    if (a.to === "map") mapRef.current?.scrollIntoView({ behavior: "smooth" })
    else open({ k: a.to })
  }
  const speak = (): void => {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); setSpeaking(false); return }
    const u = new SpeechSynthesisUtterance(brief)
    u.lang = "ar-SA"
    const ar = speechSynthesis.getVoices().find((x) => x.lang.startsWith("ar"))
    if (ar) u.voice = ar
    u.onend = (): void => setSpeaking(false)
    setSpeaking(true)
    speechSynthesis.speak(u)
  }
  const startPulseRef = useMemo(() => (c: HTMLCanvasElement): (() => void) => { const p = startPulse(c); pulse.current = p; return p.stop }, [])
  const vals = CONTENT_BY_SPORT[seg]
  const maxV = Math.max(...vals)
  const activeOrgs = snap.orgs.filter((o) => o.is_active)
  const lastEvent = data.audit[0]

  return (
    <div className={`adm${present ? " present" : ""}`} dir="rtl" lang="ar">
      <Icons />
      <div className={`app ${nav}${live ? "" : " past"}`}>
        <Sidebar view={view} setView={(v) => { setView(v); setNav(nav === "mob" ? "" : nav) }} />
        <main>
          <div className="top">
            <button className="ib" onClick={() => { const want = window.innerWidth < MOBILE_PX ? "mob" : "mini"; setNav(nav === want ? "" : want) }} title="طيّ القائمة"><Icon id="menu" /></button>
            <Search data={data} open={open} />
            <div className="sp" />
            <button className={`pres-b${speaking ? " live" : ""}`} onClick={speak} title="الملخص الصوتي"><Icon id="bell" /><span>{speaking ? "■ إيقاف" : "الملخص الصوتي"}</span></button>
            <button className="pres-b" onClick={() => setView("activity")} title="المساعد الذكي"><Icon id="screen" /><span>المساعد</span></button>
            <button className="pres-b" onClick={() => setPresent(true)} title="وضع العرض"><Icon id="screen" /><span>وضع العرض</span></button>
            <div className="create"><button onClick={() => setMenu(!menu)}><Icon id="plus" />إنشاء <span className="en dark">Create</span></button>
              <div className={`menu${menu ? " open" : ""}`}>
                {CREATE.map((c, i) => (
                  <div key={c.ar}>
                    {i === HR_AT && <hr />}
                    <a className={c.k ? "" : "soon"} onClick={() => { if (c.k) open(c.k) }}><span className="ic"><Icon id={c.ic} /></span><div>{c.ar}<small>{c.sub}</small></div></a>
                  </div>
                ))}
              </div></div>
            <button className="ib" onClick={() => open({ k: "app" })}><Icon id="bell" />{(pending > 0 || alerts.some((a) => a.tone !== "i")) && <span className="dot" />}</button>
            <div className="me"><div><b>{data.me.name || "المالك"}</b><small>المالك · كل الصلاحيات</small></div><span className="av">{(data.me.name || "IM").split(" ").map((w) => w[0]).join("").slice(0, "MA".length)}</span></div>
          </div>

          <div className="vhead"><h2>{VIEWS.find((v) => v.id === view)?.ar}</h2><span className="en">{VIEWS.find((v) => v.id === view)?.en}</span></div>
          <div className={`agrid v-${view}`}>
            <div data-v="overview" className="c hero"><Canvas start={startNetwork} /><div className="in">
              <span className="pulse"><i />المنظومة تعمل · <span className="en">All systems live</span></span>
              <small className="greet">{greeting()}، كابتن {name}</small>
              <h1>كل المنظومة<br />تحت <em>عينك</em>.</h1>
              <p>{activeOrgs.length} جهة نشطة، و{pending ? `${pending} طلب مستني قرارك` : "ولا يوجد طلبات مستنية قرارك"}. المحتوى القديم كله اتنقل، و{READY_SECTIONS} أقسام من {TILES.length} بياناتها جاهزة جوه المنصة الجديدة.</p>
              <div className="acts"><button className="btn p" onClick={() => open({ k: "inv" })}>+ رمز دعوة</button><button className="btn" onClick={() => open({ k: "org" })}>+ جهة</button><button className="btn" onClick={() => mapRef.current?.scrollIntoView({ behavior: "smooth" })}>خريطة النقل</button></div></div></div>
            <div data-v="overview" className="c kpi"><span className="ic"><Icon id="org" /></span><div className="v"><Count n={activeOrgs.length} /></div><div className="l">جهات نشطة <span className="en">Orgs</span></div></div>
            <div data-v="overview" className="c kpi ro"><span className="ic"><Icon id="user" /></span><div className="v"><Count n={snap.members.filter((m) => m.status === "approved").length} /></div><div className="l">أعضاء <span className="en">Members</span></div></div>
            <div data-v="overview" className="c gauge span2"><h3>المحتوى المنقول <span className="en">Migrated</span></h3>
              <Svg key={`g1${idx}`} viewBox="0 0 250 150" w="250" h="150" html={gaugeSvg("g1", snap.migrated, CONTENT_TOTAL, "#1FB5A8", String(snap.migrated))} /><div className="sub2">عنصر من v28 — لا شيء ضاع</div>
              <Svg key={`g2${idx}`} className="g2" viewBox="0 0 250 150" w="250" h="150" html={gaugeSvg("g2", snap.ready, TILES.length, "#5b6fe0", `${snap.ready}/${TILES.length}`)} /><div className="sub2">قسم بياناته جاهزة من {TILES.length}</div></div>
            <div data-v="overview members" className="c kpi am"><span className="ic"><Icon id="clock" /></span><div className="v"><Count n={pending} /></div><div className="l">بانتظار موافقتك <span className="en">Pending</span></div><span className="go" onClick={() => open({ k: "app" })}>↗</span></div>
            <div data-v="overview members" className="c kpi"><span className="ic"><Icon id="key" /></span><div className="v"><Count n={invitesLive} /></div><div className="l">رموز دعوة نشطة <span className="en">Invites</span></div><span className="go" onClick={() => open({ k: "inv" })}>↗</span></div>

            <div data-v="content" className="c chart"><div className="row"><h3>تغطية المحتوى حسب اللعبة <span className="en">Content by sport</span></h3>
              <div className="seg">{SEG.map(([k, l]) => <button key={k} className={seg === k ? "on" : ""} onClick={() => setSeg(k)}>{l}</button>)}</div></div>
              <div className="bars"><div className="gl q1" /><div className="gl q2" /><div className="gl q3" />
                {vals.map((v, i) => <div className="bar" key={SPORT_LABELS[i]}><b>{v}</b><div className="f" style={{ height: grow ? `${(v / maxV) * BAR_FILL * pct100}%` : "0%" }} /></div>)}</div>
              <div className="xl">{SPORT_LABELS.map((s) => <span key={s}>{s}</span>)}</div></div>
            <div data-v="members" className="c jc span2"><h3>رحلة العضو <span className="en">Member journey</span></h3>
              <div className="flow"><span className="dotrun" />
                <div className="fs"><b>{j.issued}</b><span>رموز صادرة</span><small>Issued</small></div>
                <div className="fs"><b>{j.signed}</b><span>سجّلوا</span><small>Signed up</small></div>
                <div className="fs h"><b>{j.pending}</b><span>بانتظار موافقتك</span><small>Pending</small></div>
                <div className="fs on"><b>{j.active}</b><span>أعضاء نشطون</span><small>Active</small></div>
                <div className="fs"><b>{j.suspended}</b><span>موقوفون</span><small>Suspended</small></div></div>
              <h3 className="mt">الأدوار <span className="en">Roles</span></h3>
              <div className="rl"><span className="ok">المالك · 1</span>
                {(["org_admin", "coach", "player"] as const).map((r) => <span key={r}>{({ org_admin: "مدير جهة", coach: "مدرب", player: "لاعب" })[r]} · {data.members.filter((m) => m.role === r && m.status === "approved").length}</span>)}</div></div>

            <div data-v="content" className="c mapc" ref={mapRef}><h3>خريطة المنصة — أقسام v28 الـ{TILES.length} <span className="en">Platform map</span></h3>
              <div className="tiles">{TILES.map((t) => {
                const v = (cfg.progress as Record<TileStatus, number>)[t.st]
                const stage = (cfg.stageAr as Record<TileStatus, string>)[t.st]
                const cls = t.st === "b" ? "d" : t.st
                return (
                  <div key={t.ar} className={`tile ${cls}`} onClick={() => open({ k: "sec", title: t.ar, to: t.to, ready: t.st !== "w" })}><i />{t.ar}
                    <span className="pc">{v}% · {stage}</span><div className="pr"><b style={{ width: `${v}%` }} /></div>
                    <div className="tip"><b>{t.ar}</b><br />المكان الجديد: {t.to}<br />التقدم: {v}% ({stage})</div></div>
                )
              })}</div>
              <div className="leg"><span><i className="lg-g" />بياناته جاهزة / مبني</span><span><i className="lg-a" />تصميم تحت المراجعة</span><span><i className="lg-w" />قيد البناء · مُخطَّط</span></div></div>
            <div data-v="members" className="c reqc">
              <DrawerBody kind={{ k: "app" }} data={data} alerts={[]} close={() => undefined} /></div>
            <div data-v="members" className="c reqc">
              <DrawerBody kind={{ k: "inv" }} data={data} alerts={[]} close={() => undefined} /></div>
            <div data-v="orgs" className="c orgc"><h3>الجهات <span className="en">Organizations</span></h3>
              {snap.orgs.map((o) => {
                const h = orgHealth(data, o)
                const mem = data.members.filter((m) => m.org_id === o.id && m.status === "approved")
                return (
                  <div className={`org${o.is_active ? "" : " off"}`} key={o.id} onClick={() => open({ k: "inv", orgId: o.id })}>
                    <div className="t"><span className="bd">{(o.name_en ?? o.name_ar ?? "").split(" ").map((w) => w[0]).join("").slice(0, "AQ".length).toUpperCase()}</span><div><h4>{o.name_ar}</h4><p>{ORG_TYPES[o.org_type]} · {countryAr(o.country)}{o.city ? ` · ${o.city}` : ""} · {o.is_active ? "نشطة" : "موقوفة"}</p></div></div>
                    <div className="rl"><span className="ok">{mem.length} عضو</span><span>{mem.filter((m) => m.role.includes("coach")).length} مدربين</span><span>{data.invites.filter((i) => i.org_id === o.id && inviteLive(i)).length} رمز نشط</span></div>
                    <div className="health"><Svg viewBox="0 0 96 96" w="96" h="96" html={healthSvg(h.parts, h.score)} />
                      <div className="hl"><b>صحة الجهة <span className="en">Health {h.score}/100</span></b>{h.parts.map((p) => <span key={p.label}><i style={{ background: p.color }} />{p.label} · {p.value}%</span>)}</div></div>
                    <button className="edit" title="تعديل بيانات الجهة" onClick={(e) => { e.stopPropagation(); open({ k: "org", org: o }) }}>✎ تعديل بيانات الجهة <span className="en">Edit</span></button>
                  </div>
                )
              })}
              <div className="addorg" onClick={() => open({ k: "org" })}>+ جهة جديدة</div></div>

            <div data-v="activity" className="c pulsec"><h3>نبض المنظومة <span className="en">System pulse — live</span></h3>
              <Canvas start={startPulseRef} />
              <div className="pmeta"><span>أحداث مسجّلة <b>{snap.events}</b></span><span>آخر حدث <b>{lastEvent ? lastEvent.action : "—"}</b></span><span>الاتصال <b>Live</b></span><span>كل نبضة عالية = حدث حقيقي في سجل العمليات</span></div></div>
            <div data-v="activity" className={`c voice${speaking ? " on" : ""}`}><h3>الملخص الصوتي <span className="en">Voice briefing</span></h3>
              <div className="wave">{Array.from({ length: COUNT_STEPS }, (_, i) => <i key={i} className={`w${i % WAVE_PHASES}`} />)}</div>
              <p>{brief}</p><button className="btn p wide" onClick={speak}>{speaking ? "■ إيقاف" : "▶ اسمع ملخص اليوم"}</button></div>
            <div data-v="orgs" className="c geo"><h3>خريطة الجهات <span className="en">Organizations map</span></h3><Svg viewBox={geo.viewBox} html={geo.html} />
              <div className="leg"><span><i className="lg-t" />جهة نشطة · {activeOrgs.length}</span><span><i className="lg-s" />السعودية</span><span><i className="lg-r" />الخليج ومصر — جاهزة لاستقبال جهات</span></div></div>
            <div data-v="overview" className="c alerts"><h3>تنبيهات ذكية <span className="en">Smart alerts</span></h3><AlertsList alerts={alerts} act={actAlert} /></div>
            <div data-v="activity" className="c logc"><h3>سجل العمليات <span className="en">Audit log — live</span></h3>
              <div className="tl">
                {data.audit.slice(0, cfg.rules.auditShown).reverse().map((a) => <div className="ev" key={a.id}>{a.action}<small>{a.target_table ?? ""} · {new Date(a.created_at).toLocaleString("ar")}</small></div>)}
                {data.orgs.slice(0, cfg.rules.auditShown).map((o) => <div className="ev" key={o.id}>تسجيل جهة: {o.name_ar}<small>جهة · {new Date(o.created_at).toLocaleDateString("ar")}</small></div>)}
                <div className="ev">نقل محتوى v28 ({CONTENT_TOTAL} عنصر)<small>محتوى · 2026-10-25</small></div>
                <div className="ev nx">الحدث الجاي هيظهر هنا<small>مباشر · Live</small></div></div></div>
            <div data-v="activity" className="c aic"><h3 className="center">المساعد الذكي <span className="en">AI Assistant</span></h3><div className="orb" /><b>اسأل عن أي حاجة في المنظومة</b><p>«مين الجهات اللي ما فيهاش مدرب؟»</p>
              <div className="ask" onClick={() => setAiNote(true)}><span>اكتب سؤالك…</span><button>➤</button></div>
              {aiNote && <p className="ok-msg soon-note">المساعد قيد البناء — هيتربط ببيانات المنظومة في مرحلة لاحقة. <span className="en">Coming soon</span></p>}</div>
          </div>
          {view === "activity" && <div className="tbar"><span>⟲ آلة الزمن <span className="en">Time machine</span></span>
            <input type="range" min="0" max={days.length - 1} step="1" value={idx} onChange={(e) => setDayIdx(Number(e.target.value))} />
            <b>{days[idx]}</b><span className="tag">{live ? "الآن · Live" : "لقطة من الماضي"}</span></div>}
          <div className="note"><span>IM Training · لوحة المدير — كل الأرقام حقيقية: قاعدة البيانات + المحتوى المنقول.</span><span className="en">Instructor: Mohamed Ayad</span></div>
          <button className="btn exitp" onClick={() => setPresent(false)}>✕ خروج من العرض (Esc)</button>
        </main>
      </div>
      <div className={`scrim${drawer ? " open" : ""}`} onClick={() => setDrawer(null)} />
      <aside className={`drawer${drawer ? " open" : ""}`}><button className="ib x" onClick={() => setDrawer(null)}>✕</button>
        {drawer && <DrawerBody kind={drawer} data={data} alerts={alerts} close={() => setDrawer(null)} />}</aside>
    </div>
  )
}

export function AdminDashboard(): React.JSX.Element {
  const { data, error, reload } = useAdminData()
  if (error) return <div className="adm"><div className="loading"><p>تعذّر تحميل بيانات المنظومة. <button className="btn" onClick={reload}>إعادة المحاولة</button></p></div></div>
  if (!data) return <div className="adm"><div className="loading">جارٍ تحميل المنظومة… <span className="en">Loading</span></div></div>
  return <Board data={data} />
}
