// The list of sports the platform knows about. Data-driven: adding a sport pack
// means adding an entry here (and its court in courts.ts) — nothing else changes.
// No sport is "default" or first: screens that rotate through sports start at a random one.
export interface Sport {
  id: string
  nameAr: string
  nameEn: string
  /** Illustrative name of the movement path drawn on the login screen */
  motionAr: string
  /** Illustrative movement path: 7 control points, x/y in 0..1, travelling right → left */
  motion: readonly (readonly [number, number])[]
}

export const SPORTS: readonly Sport[] = [
  { id: "athletics", nameAr: "ألعاب القوى", nameEn: "Athletics", motionAr: "انطلاقة السرعة",
    motion: [[.96, .66], [.80, .64], [.64, .60], [.48, .52], [.32, .42], [.18, .32], [.05, .20]] },
  { id: "basketball", nameAr: "كرة السلة", nameEn: "Basketball", motionAr: "تصويبة قفز",
    motion: [[.96, .80], [.84, .62], [.70, .34], [.54, .20], [.38, .26], [.24, .46], [.08, .70]] },
  { id: "football", nameAr: "كرة القدم", nameEn: "Football", motionAr: "تمريرة طويلة",
    motion: [[.96, .72], [.82, .56], [.66, .38], [.50, .30], [.34, .38], [.18, .58], [.05, .76]] },
  { id: "handball", nameAr: "كرة اليد", nameEn: "Handball", motionAr: "رمية قفز",
    motion: [[.96, .70], [.82, .58], [.66, .36], [.52, .28], [.38, .30], [.22, .34], [.06, .38]] },
  { id: "taekwondo", nameAr: "التايكوندو", nameEn: "Taekwondo", motionAr: "ركلة دائرية",
    motion: [[.96, .80], [.78, .78], [.60, .60], [.46, .34], [.30, .26], [.18, .40], [.07, .28]] },
  { id: "tennis", nameAr: "التنس", nameEn: "Tennis", motionAr: "إرسال",
    motion: [[.96, .86], [.86, .52], [.74, .22], [.60, .30], [.46, .54], [.30, .72], [.08, .44]] },
  { id: "volleyball", nameAr: "الكرة الطائرة", nameEn: "Volleyball", motionAr: "ضربة ساحقة",
    motion: [[.96, .84], [.84, .60], [.72, .34], [.60, .22], [.46, .30], [.32, .60], [.06, .88]] },
]
