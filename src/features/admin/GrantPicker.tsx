// اختيار الصلاحيات (Grant picker): what an invited person may do (capabilities) and which sections open for them.
// Used when issuing an invite and when changing an existing member's access.
import { CAPS, SECTIONS } from "@/features/auth/caps"

export interface GrantValue { caps: string[]; sections: string[] }
const toggle = (list: readonly string[], k: string): string[] => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k])

export function GrantPicker({ value, onChange }: { readonly value: GrantValue; readonly onChange: (v: GrantValue) => void }): React.JSX.Element {
  const allSections = value.sections.length === 0
  return (
    <div className="grant">
      <p className="fld">ماذا يستطيع أن يفعل؟ <span className="en">Permissions</span></p>
      <div className="gcaps">
        <label className="gcap on fixed"><input type="checkbox" checked disabled /><b>👁 المشاهدة</b><small>تصفّح الأقسام المفتوحة له — دائمًا</small></label>
        {CAPS.map((c) => {
          const on = value.caps.includes(c.k)
          return (
            <label key={c.k} className={`gcap${on ? " on" : ""}`}>
              <input type="checkbox" checked={on} onChange={() => onChange({ ...value, caps: toggle(value.caps, c.k) })} />
              <b>{c.ar} <span className="en">{c.en}</span></b><small>{c.note}</small>
            </label>
          )
        })}
      </div>
      <p className="fld">الأقسام المتاحة له <span className="en">Sections</span></p>
      <div>
        <button type="button" className={`pill${allSections ? " on" : ""}`} onClick={() => onChange({ ...value, sections: [] })}>كل الأقسام</button>
        {SECTIONS.map((s) => {
          const on = !allSections && value.sections.includes(s.k)
          return <button type="button" key={s.k} className={`pill${on ? " on" : ""}`} onClick={() => onChange({ ...value, sections: toggle(value.sections, s.k) })}>{s.ar}</button>
        })}
      </div>
    </div>
  )
}
