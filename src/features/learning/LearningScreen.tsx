// مركز التعلّم (Learning centre) — role learning paths with detailed lessons, applied 3D cases, tests and certificates,
// and the laws bank organised by sport and law chapter.
import { useState } from "react"
import { Dock } from "@/components/ui/Dock"
import "@fontsource/outfit/500.css"
import "./learning.css"
import "./paths.css"
import { Paths } from "./Paths"
import { LawBank, LAW_BANK } from "./LawBank"

type Tab = "paths" | "bank"
export function LearningScreen(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>("paths")
  return (
    <div className="lc" dir="rtl">
      <Dock active="learning" />
      <main>
        <header className="top">
          <div><h1>مركز التعلّم <span className="en">Learning centre</span></h1>
            <p>مسارات تعلّم حسب الدور بمستويات متدرجة، وحالات تطبيقية على الملعب ثلاثي الأبعاد، وشهادة لكل مستوى · بنك قوانين من {LAW_BANK.length} سؤالًا مرتبة حسب مواد القانون</p></div>
          <div className="seg"><button className={tab === "paths" ? "on" : ""} onClick={() => setTab("paths")}>المسارات</button><button className={tab === "bank" ? "on" : ""} onClick={() => setTab("bank")}>بنك القوانين</button></div>
        </header>
        {tab === "paths" ? <Paths /> : <LawBank />}
      </main>
    </div>
  )
}
