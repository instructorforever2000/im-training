// تنظيم الشاشة v5 — Layout v5: الملعب هو المسرح، لوحة واحدة بتبويبات، شريط مراحل واحد، إعدادات مطوية، وعدسات (لاعب / مدرب / محاضر).
// طبقة عرض فقط فوق الاستوديو المعتمد: لا تغيّر المحرك ثلاثي الأبعاد ولا المحتوى.
type Lens = "player" | "coach" | "lect"

const TABS: ReadonlyArray<readonly [string, string, string]> = [
  ["role", "الشرح", "Explanation"],
  ["vars", "الأدوار والمقارنة", "Roles & compare"],
  ["steps", "الخطوات", "Steps"],
]
const LENSES: ReadonlyArray<readonly [Lens, string, string]> = [
  ["player", "لاعب", "Player"],
  ["coach", "مدرب", "Coach"],
  ["lect", "محاضر", "Lecturer"],
]

const read = (k: string, d: string): string => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const write = (k: string, v: string): void => { try { localStorage.setItem(k, v) } catch { /* private mode */ } }

export function mountV5(host: HTMLElement): () => void {
  const $ = <T extends Element = HTMLElement>(s: string): T | null => host.querySelector<T>(s)
  const main = $("main")
  const hud = $(".hud"), hud2 = $(".hud2"), steps = $("#steps"), role = $("#role"), vars = $("#vars")
  if (!main || !hud || !hud2 || !steps || !role || !vars) return () => {}
  host.classList.add("v5")
  const refit = (): void => { requestAnimationFrame(() => window.dispatchEvent(new Event("resize"))) }

  /* 1) لوحة جانبية واحدة بتبويبات — one docked sheet with tabs */
  const sheet = document.createElement("aside")
  sheet.id = "sheet"
  sheet.className = "glass"
  const tabs = document.createElement("nav")
  tabs.className = "stabs"
  tabs.innerHTML = TABS.map(([id, ar, en]) => `<button data-tab="${id}">${ar} <span class="en">${en}</span></button>`).join("")
  sheet.append(tabs, role, vars, steps)
  main.append(sheet)
  /* إخفاء اللوحة وتغيير عرضها — hide the panel / drag its edge to resize (saved per device) */
  const hideB = document.createElement("button")
  hideB.className = "shide"
  hideB.title = "إخفاء / إظهار اللوحة"
  tabs.append(hideB)
  const grip = document.createElement("div")
  grip.className = "sgrip"
  grip.title = "اسحب لتغيير عرض اللوحة"
  sheet.append(grip)
  const setHidden = (h: boolean): void => {
    host.classList.toggle("shut", h)
    hideB.innerHTML = h ? "◧ إظهار اللوحة" : "⇥"
    write("im-v5-shut", h ? "1" : "")
    refit()
  }
  hideB.addEventListener("click", () => setHidden(!host.classList.contains("shut")))
  const sw0 = Number(read("im-v5-sw", "0"))
  if (sw0) host.style.setProperty("--sw", sw0 + "px")
  let drag: number | null = null
  grip.addEventListener("pointerdown", e => { drag = e.clientX; grip.setPointerCapture(e.pointerId) })
  grip.addEventListener("pointermove", e => {
    if (drag == null) return
    const r = sheet.getBoundingClientRect()
    const w = Math.round(Math.max(280, Math.min(620, r.right - e.clientX)))
    host.style.setProperty("--sw", w + "px")
  })
  grip.addEventListener("pointerup", () => { if (drag == null) return; drag = null; write("im-v5-sw", String(Math.round(sheet.getBoundingClientRect().width))); refit() })
  setHidden(read("im-v5-shut", "") === "1")

  let tab = read("im-v5-tab", "role")
  const setTab = (t: string): void => {
    tab = t
    write("im-v5-tab", t)
    for (const p of [role, vars, steps]) p.classList.toggle("act", p.id === t)
    tabs.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === t))
  }
  tabs.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-tab]")
    if (!b?.dataset.tab) return
    if (b.dataset.tab === "steps" && steps.classList.contains("off")) { $<HTMLButtonElement>("#stepsBtn")?.click(); return }
    if (b.dataset.tab !== "steps" && !steps.classList.contains("off")) $<HTMLButtonElement>("#stepsBtn")?.click()
    setTab(b.dataset.tab)
  })
  // الخطوات تفتح تبويبها تلقائيًا — steps mode opens its own tab
  const mo = new MutationObserver(() => {
    const on = !steps.classList.contains("off")
    if (on && tab !== "steps") setTab("steps")
    if (!on && tab === "steps") setTab("role")
  })
  mo.observe(steps, { attributes: true, attributeFilter: ["class"] })
  setTab(steps.classList.contains("off") && tab === "steps" ? "role" : tab)

  /* 2) الإعدادات مطوية في زر واحد — settings folded into one drawer */
  const setd = document.createElement("div")
  setd.id = "setd"
  setd.className = "glass"
  const grp = (ar: string, en: string, ...els: (Element | null)[]): HTMLElement => {
    const g = document.createElement("section")
    g.className = "sg"
    g.innerHTML = `<h4>${ar} <span class="en">${en}</span></h4>`
    els.forEach(x => { if (x) g.append(x) })
    return g
  }
  setd.append(
    grp("الرياضة", "Sport", $("#sports")),
    grp("الخطة والفريق", "Formation & team", hud2),
    grp("زاوية الكاميرا", "Camera", $("#camv")),
    grp("العرض", "Display", $("#lang"), $("#th"), $("#card")),
  )
  const setBtn = document.createElement("button")
  setBtn.className = "chip setb"
  setBtn.innerHTML = `⚙ الإعدادات <span class="en">Settings</span>`
  const sp = hud.querySelector(".sp")
  const lensSeg = document.createElement("div")
  lensSeg.className = "seg2 lens"
  lensSeg.title = "طريقة العرض حسب المستخدم"
  lensSeg.innerHTML = LENSES.map(([id, ar, en]) => `<button data-lens="${id}">${ar} <span class="en">${en}</span></button>`).join("")
  sp?.after(lensSeg, setBtn)
  main.append(setd)
  const closeSet = (e: MouseEvent): void => { if (!(e.target as HTMLElement).closest("#setd,.setb")) setd.classList.remove("open") }
  setBtn.addEventListener("click", () => setd.classList.toggle("open"))
  document.addEventListener("click", closeSet)

  /* 3) العدسات — lenses */
  const setLens = (l: Lens): void => {
    write("im-v5-lens", l)
    host.dataset.lens = l
    lensSeg.querySelectorAll<HTMLButtonElement>("[data-lens]").forEach(b => b.classList.toggle("on", b.dataset.lens === l))
    if (l === "player" && tab === "vars") setTab("role")
    refit()
  }
  lensSeg.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-lens]")
    if (!b?.dataset.lens) return
    const l = b.dataset.lens as Lens
    setLens(l)
    // المحاضر: يبدأ وضع الشرح إن وُجدت دروس لهذه المرحلة
    if (l === "lect" && steps.classList.contains("off")) $<HTMLButtonElement>("#teachBtn")?.click()
  })
  setLens((read("im-v5-lens", "coach") as Lens))

  /* 4) تلميح الاستخدام مرة واحدة فقط — usage hint shown once */
  const hint = $(".hint")
  if (hint && read("im-v5-hint", "") !== "1") {
    hint.classList.add("once")
    setTimeout(() => { hint.classList.remove("once"); write("im-v5-hint", "1") }, 6000)
  }

  refit()
  return () => {
    mo.disconnect()
    document.removeEventListener("click", closeSet)
    host.classList.remove("v5")
  }
}
