// صور وفيديو حقيقية للتمرين (Real photos & video) — uploaded by the platform owner from his own sessions,
// shown to everyone beside the 3D scene. Data: training.drill_media + the public storage bucket "drill-media".
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

interface Media { id: string; kind: "image" | "video"; path: string; caption: string | null }
const BUCKET = "drill-media"
const db = (): ReturnType<typeof supabase.schema> => supabase.schema("training")
const urlOf = (path: string): string => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
// File extension: "squat.JPG" → "JPG"; "noext" → no match.
// https://regex101.com/?flavor=javascript&regex=%5C.(%5Ba-z0-9%5D%2B)%24&flags=i&testString=squat.JPG
const EXT_RE = /\.([a-z0-9]+)$/i

export function DrillMedia({ drillId }: { drillId: string }): React.JSX.Element | null {
  const [items, setItems] = useState<Media[]>([])
  const [owner, setOwner] = useState(false)
  const [msg, setMsg] = useState("")
  const [tick, setTick] = useState(0)
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let alive = true
    const run = async (): Promise<void> => {
      const [m, o] = await Promise.all([db().from("drill_media").select("id,kind,path,caption").eq("drill_id", drillId).eq("is_active", true).order("sort"), supabase.rpc("is_owner")])
      if (!alive) return
      setItems((m.data ?? []) as Media[]); setOwner(o.data === true)
    }
    void run()
    return () => { alive = false }
  }, [drillId, tick])
  const upload = async (f: File): Promise<void> => {
    setMsg("جارٍ رفع الملف…")
    const ext = EXT_RE.exec(f.name)?.[1]?.toLowerCase() ?? "bin"
    const path = `${drillId}/${crypto.randomUUID()}.${ext}`
    const up = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type })
    if (up.error) { setMsg("تعذّر الرفع: " + up.error.message); return }
    const r = await db().from("drill_media").insert({ drill_id: drillId, kind: f.type.startsWith("video") ? "video" : "image", path, sort: items.length }).select("id")
    setMsg(r.error ? "تعذّر الحفظ: " + r.error.message : "✓ أُضيف الملف")
    setTick((n) => n + 1)
  }
  const hide = async (id: string): Promise<void> => { await db().from("drill_media").update({ is_active: false }).eq("id", id); setTick((n) => n + 1) }
  if (!items.length && !owner) return null
  return (
    <section className="media"><h2>صور وفيديو من التطبيق الفعلي <span className="en">Real footage</span></h2>
      <div className="mgrid">{items.map((m) => (
        <figure key={m.id}>{m.kind === "video" ? <video src={urlOf(m.path)} controls preload="metadata" /> : <img src={urlOf(m.path)} alt={m.caption ?? "صورة التمرين"} loading="lazy" />}
          {owner && <button className="mhide" onClick={() => void hide(m.id)} title="إخفاء">✕</button>}</figure>))}</div>
      {owner && <div className="mup"><input ref={file} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = "" }} />
        <button onClick={() => file.current?.click()}>＋ أضف صورة أو فيديو حقيقي</button><span>{msg || "صور أو فيديو قصير (حتى 50 ميجابايت) من تطبيقك الفعلي للتمرين."}</span></div>}
    </section>
  )
}
