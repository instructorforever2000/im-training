// جولة في المنصة (Platform tour) — the visitor's front door: what IM Training is, the sections open to try now,
// and the member sections that open with an invite code or the annual subscription.
import "@fontsource/outfit/500.css"
import { useEffect } from "react"
import "./visitor.css"

interface Sec { ar: string; en: string; p: string; href?: string; icon: string }
const OPEN: readonly Sec[] = [
  { ar: "المراكز والأدوار", en: "Positions & roles", icon: "◎", href: "#/roles", p: "ملعب ثلاثي الأبعاد لـ6 ألعاب: كل مركز ودوره ومهامه في كل مرحلة، ووضع الشرح لقطة بلقطة." },
  { ar: "المكتبة", en: "Library", icon: "▤", href: "#/library", p: "أكثر من 400 تمرين و100 خطة متحركة ومهارات بالتصنيف والمرحلة السنية." },
  { ar: "مركز التعلّم", en: "Learning centre", icon: "✓", href: "#/learning", p: "اختبارات في قوانين الألعاب بإجابات مشروحة، وبطاقات مراجعة." },
]
const MEMBERS: readonly Sec[] = [
  { ar: "البطولات", en: "Tournaments", icon: "🏆", p: "161 لعبة · دوري وخروج المغلوب ومجموعات · جدول وترتيب يُحتسبان تلقائيًا." },
  { ar: "الفرق واللاعبين", en: "Teams & players", icon: "👥", p: "فرق الجهة وملف كل لاعب وحالته." },
  { ar: "لوحة المدير", en: "Command centre", icon: "◈", p: "متابعة الجهات والأعضاء والنشاط لحظة بلحظة." },
  { ar: "البرنامج اليومي والوحدة التدريبية", en: "Daily program", icon: "◷", p: "خطة اليوم والوحدة التدريبية من المكتبة مباشرة." },
  { ar: "التقييم والحالة البدنية", en: "Assessment", icon: "◔", p: "اختبارات بدنية ومهارية وتطوّر كل لاعب." },
  { ar: "التقارير", en: "Reports", icon: "▦", p: "تقارير بشعار الجهة وتوقيع المدرب." },
]
const CYCLE = ["خطِّطْ", "درِّبْ", "قِسْ", "طوِّرْ"]
const AUDIENCE = ["الأندية", "الأكاديميات", "المدارس", "الجامعات", "المراكز الرياضية"]
const logo = `${import.meta.env.BASE_URL}icon-192.png`

const JOIN_ID = "join"
function toJoin(e?: React.MouseEvent): void {
  e?.preventDefault()
  document.getElementById(JOIN_ID)?.scrollIntoView({ behavior: "smooth" })
}

export function TourScreen(): React.JSX.Element {
  useEffect(() => { if (window.location.hash.endsWith(`#${JOIN_ID}`)) setTimeout(toJoin, 300) }, [])
  return (
    <div className="vt" dir="rtl">
      <div className="dark">
      <header className="vt-top">
        <a className="brand" href="#/tour"><img src={logo} alt="IM Training" /><div><b>IM Training</b><span>منصة التدريب <i>Instructor Motion Training</i></span></div></a>
        <a className="btn ghost" href="#/">دخول المشتركين</a>
      </header>
      <section className="hero">
        <h1>علم الحركة وتطوير الأداء الرياضي</h1>
        <div className="cycle">{CYCLE.map((c, k) => <span key={c} style={{ "--k": k } as React.CSSProperties}>{c}</span>)}</div>
        <p>منصة تدريب رياضي متعددة الألعاب للمدرب واللاعب والإدارة، بالعربية والإنجليزية.</p>
        <div className="aud">{AUDIENCE.map((a) => <span key={a}>{a}</span>)}</div>
        <div className="cta"><a className="btn p" href="#/roles">جرّب المنصة الآن</a><a className="btn" href="#/tour#join" onClick={toJoin}>كيف أشترك؟</a></div>
      </section>
      </div>
      <section className="blk">
        <h2>مفتوح للتجربة <span className="en">Open to try</span></h2>
        <div className="grid">{OPEN.map((s) => (
          <a key={s.ar} className="sec open" href={s.href}><i>{s.icon}</i><b>{s.ar}</b><span className="en">{s.en}</span><p>{s.p}</p><em>افتح ←</em></a>
        ))}</div>
      </section>
      <section className="blk">
        <h2>للمشتركين <span className="en">Members</span></h2>
        <div className="grid">{MEMBERS.map((s) => (
          <a key={s.ar} className="sec lock" href="#/tour#join" onClick={toJoin}><i>{s.icon}</i><b>{s.ar}</b><span className="en">{s.en}</span><p>{s.p}</p><em>🔒 للمشتركين</em></a>
        ))}</div>
      </section>
      <section className="blk join" id="join">
        <h2>طريقتان للدخول الكامل <span className="en">Full access</span></h2>
        <div className="two">
          <div><i>🔑</i><b>عضوية جهتك</b><p>إذا كانت جهتك (نادٍ أو أكاديمية أو مدرسة) مشتركة، تضيفك إدارة الجهة عضوًا. سجّل الدخول بحساب Google أو ببريدك الإلكتروني، وتُفتح الأقسام حسب دورك.</p><a className="btn p" href="#/">دخول الأعضاء</a></div>
          <div><i>★</i><b>الاشتراك السنوي</b><p>اشتراك سنوي بسعر مناسب للأفراد والجهات. وإلى حين تفعيل الدفع الإلكتروني، يتم الاشتراك عبر إدارة المنصة.</p><span className="soon">الدفع الإلكتروني قريبًا <i>Coming soon</i></span></div>
        </div>
      </section>
      <footer className="vt-foot">Instructor: Mohamed Ayad · مشرف التربية البدنية</footer>
    </div>
  )
}

/** Thin strip shown on open sections while browsing as a visitor. */
export function VisitorBar(): React.JSX.Element {
  return (
    <div className="vbar" dir="rtl">
      <span>أنت تتصفّح بصفة زائر <i>Visitor</i> — هذا المحتوى متاح للتجربة.</span>
      <a href="#/tour">جولة المنصة</a><a className="p" href="#/">دخول المشتركين</a>
    </div>
  )
}
