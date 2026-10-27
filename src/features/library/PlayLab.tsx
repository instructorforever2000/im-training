// المختبر ثلاثي الأبعاد (3D play lab) — the play runs on a real 3D field, step by step; drag to orbit, wheel to zoom.
// Loaded only when a play is opened (three.js is heavy).
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import cfg from "./library-config.json"
import { PLAYS, PLAY_CAT, SPORTS, playSport, skillsForPlay, type Play } from "./content"
import type { View } from "./LibraryScreen"

const L = cfg.lab
const C = L.colors
const HALF = 2
const PAD_BBOX = 2
const WIDE = 1.6
const DIMS = L.dims as unknown as Record<string, [number, number]>
const WOOD_SPORTS = new Set(["basketball", "handball", "volleyball"])
const SIDE_TAKE = 14
const Q = L.look
const WHITE = "#ffffff"
const CAPTION_WORDS = 4
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)

/** Field size: the real court for known modes, otherwise the area the play uses. */
function fieldOf(p: Play): { x0: number; z0: number; w: number; h: number } {
  const d = DIMS[p.mode]
  if (d) return { x0: 0, z0: 0, w: d[0], h: d[1] }
  const xs: number[] = [], zs: number[] = []
  p.tokens.forEach((t) => { xs.push(t[3]); zs.push(t[4]) })
  p.steps.forEach((s) => Object.values(s.m).forEach(([x, z]) => { xs.push(x); zs.push(z) }))
  const x0 = Math.min(...xs) - PAD_BBOX, x1 = Math.max(...xs) + PAD_BBOX, z0 = Math.min(...zs) - PAD_BBOX, z1 = Math.max(...zs) + PAD_BBOX
  const w = Math.max(x1 - x0, (z1 - z0) * WIDE)
  return { x0: x0 - (w - (x1 - x0)) / HALF, z0, w, h: Math.max(z1 - z0, w / WIDE) }
}

function positions(p: Play, upto: number): { at: Record<string, [number, number]>; ball: string } {
  const at: Record<string, [number, number]> = {}
  p.tokens.forEach((t) => { at[t[0]] = [t[3], t[4]] })
  const ball = p.steps.slice(0, upto).reduce((hold, s) => { Object.assign(at, s.m); return s.b ?? hold }, p.ball0)
  return { at, ball }
}

function label(txt: string, bg: string, scale: number): THREE.Sprite {
  const px = L.label.px, c = document.createElement("canvas"); c.width = c.height = px
  const x = c.getContext("2d")
  if (x) {
    x.fillStyle = bg; x.beginPath(); x.arc(px / HALF, px / HALF, px / HALF - HALF, 0, Math.PI * HALF); x.fill()
    x.fillStyle = "#fff"; x.font = `bold ${px / HALF}px Outfit, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(txt, px / HALF, px / HALF + HALF * HALF)
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }))
  s.scale.set(L.label.s * scale, L.label.s * scale, 1)
  return s
}

export function PlayLab({ id, open, flip, theme }: { id: string; open: (v: View) => void; flip: () => void; theme: string }): React.JSX.Element {
  const play = useMemo(() => PLAYS.find((p) => p.id === id) ?? PLAYS[0], [id])
  const sport = playSport(play)
  const [cur, setCur] = useState(0)
  const [running, setRunning] = useState(false)
  const [sportFilter, setSportFilter] = useState<string>(sport ?? "all")
  const cv = useRef<HTMLCanvasElement>(null)
  const api = useRef<{ go: (i: number) => void; theme: (dark: boolean) => void } | null>(null)

  // ---- build the 3D scene once per play ----
  useEffect(() => {
    const canvas = cv.current; if (!canvas) return
    const rn = new THREE.WebGLRenderer({ canvas, antialias: true }); rn.setPixelRatio(Math.min(window.devicePixelRatio, HALF))
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(L.fov, 1, L.near, L.far)
    const size = (): void => { rn.setSize(window.innerWidth, window.innerHeight); cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix() }
    size(); window.addEventListener("resize", size)
    sc.add(new THREE.HemisphereLight(WHITE, Q.ground, Q.hemi))
    const dl = new THREE.DirectionalLight(WHITE, Q.sun); dl.position.set(L.light[0], L.light[1], L.light[2]); sc.add(dl)
    const f = fieldOf(play), W = f.w, H = f.h, k = W / L.scaleRef
    const wood = sport ? WOOD_SPORTS.has(sport) : false
    const g = new THREE.Group(); sc.add(g)
    const plane = (w: number, h: number, color: string, x: number, y: number): void => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color })); m.rotation.x = -Math.PI / HALF; m.position.set(x, y, 0); g.add(m)
    }
    plane(W + L.pad * k * HALF, H + L.pad * k * HALF, wood ? C.woodB : C.turfA, 0, 0)
    range(L.stripes).forEach((i) => plane(W / L.stripes, H, i % HALF ? C.turfA : C.turfB, -W / HALF + W / L.stripes / HALF + (i * W) / L.stripes, L.stripeY))
    if (wood) plane(W, H, C.woodA, 0, L.stripeY * HALF)
    const lm = new THREE.LineBasicMaterial({ color: C.line, transparent: true, opacity: Q.lineOpacity })
    const ln = (pts: [number, number][]): void => { g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x - W / HALF, L.lineY, z - H / HALF))), lm)) }
    ln([[0, 0], [W, 0], [W, H], [0, H], [0, 0]]); ln([[W / HALF, 0], [W / HALF, H]])
    ln(range(L.circle + 1).map((i): [number, number] => { const a = (i / L.circle) * Math.PI * HALF; return [W / HALF + H * L.circleR * Math.cos(a), H / HALF + H * L.circleR * Math.sin(a)] }))
    if (DIMS[play.mode] && !wood) {
      const bx = W * L.box[0], bz = H * (HALF * L.box[1]), sx = W * L.six[0], sz = H * L.six[1]
      ;[0, W].forEach((e) => { const s = e ? -1 : 1
        ln([[e, H / HALF - bz], [e + s * bx, H / HALF - bz], [e + s * bx, H / HALF + bz], [e, H / HALF + bz]])
        ln([[e, H / HALF - sz], [e + s * sx, H / HALF - sz], [e + s * sx, H / HALF + sz], [e, H / HALF + sz]]) })
    }
    const toks: Record<string, { g: THREE.Group; to: THREE.Vector3 }> = {}
    play.tokens.forEach((t) => {
      const a = t[0].startsWith("a"), gr = new THREE.Group()
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(L.body.r * k, L.body.len * k, Q.capSeg, Q.radialSeg), new THREE.MeshStandardMaterial({ color: a ? C.a : C.b, roughness: Q.rough }))
      body.position.y = L.body.y * k; gr.add(body)
      const ring = new THREE.Mesh(new THREE.RingGeometry(L.ring[0] * k, L.ring[1] * k, Q.ringSeg), new THREE.MeshBasicMaterial({ color: a ? C.a : C.b, transparent: true, opacity: Q.ringOpacity }))
      ring.rotation.x = -Math.PI / HALF; ring.position.y = L.lineY; gr.add(ring)
      const sp = label(String(t[2] ?? ""), a ? C.aLbl : C.bLbl, k); sp.position.y = L.label.y * k; gr.add(sp)
      gr.position.set(t[3] - f.x0 - W / HALF, 0, t[4] - f.z0 - H / HALF); g.add(gr)
      toks[t[0]] = { g: gr, to: gr.position.clone() }
    })
    const ball = new THREE.Mesh(new THREE.SphereGeometry(L.ball.r * k, Q.ballSeg, Q.ballSeg), new THREE.MeshStandardMaterial({ color: WHITE })); ball.position.y = L.ball.r * k; g.add(ball)
    const trail = new THREE.Group(); g.add(trail)
    let holder = play.ball0
    const go = (i: number): void => {
      const { at, ball: b } = positions(play, i); holder = b
      trail.clear()
      if (i > 0) Object.entries(play.steps[i - 1].m).forEach(([tid, [x, z]]) => {
        const from = toks[tid]?.g.position.clone(); if (!from) return
        const geo = new THREE.BufferGeometry().setFromPoints([from.setY(L.lineY * HALF), new THREE.Vector3(x - f.x0 - W / HALF, L.lineY * HALF, z - f.z0 - H / HALF)])
        const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: C.trail, dashSize: k, gapSize: k / HALF })); line.computeLineDistances(); trail.add(line)
      })
      Object.entries(at).forEach(([tid, [x, z]]) => toks[tid]?.to.set(x - f.x0 - W / HALF, 0, z - f.z0 - H / HALF))
    }
    const zoom = window.innerWidth < L.mobile.bp ? L.mobile.zoom : 1
    const paint = (dark: boolean): void => { const bg = dark ? C.dark : C.light; rn.setClearColor(bg); sc.fog = new THREE.Fog(bg, L.fogNear * k * zoom, L.fogFar * k * zoom) }
    api.current = { go, theme: paint }
    const small = window.innerWidth < L.mobile.bp
    let az = L.az, el = L.el, dist = L.dist * k * (small ? L.mobile.zoom : 1), drag: [number, number, number, number] | null = null
    const down = (e: PointerEvent): void => { drag = [e.clientX, e.clientY, az, el] }
    const up = (): void => { drag = null }
    const move = (e: PointerEvent): void => { if (!drag) return; az = drag[2] - (e.clientX - drag[0]) * L.rotK; el = Math.max(L.minEl, Math.min(L.maxEl, drag[3] + (e.clientY - drag[1]) * L.elK)) }
    const wheel = (e: WheelEvent): void => { dist = Math.max(L.minDist * k, Math.min(L.maxDist * k, dist + e.deltaY * L.wheelK * k)) }
    canvas.addEventListener("pointerdown", down); window.addEventListener("pointerup", up); window.addEventListener("pointermove", move); canvas.addEventListener("wheel", wheel, { passive: true })
    g.position.x = small ? 0 : L.shift * k
    let raf = 0
    const loop = (): void => {
      raf = requestAnimationFrame(loop)
      Object.values(toks).forEach((o) => o.g.position.lerp(o.to, L.lerp))
      const h = toks[holder]?.g.position
      if (h) { ball.position.x += (h.x + L.ball.dx * k - ball.position.x) * L.ballLerp; ball.position.z += (h.z + L.ball.dz * k - ball.position.z) * L.ballLerp }
      cam.position.set(g.position.x + dist * Math.cos(el) * Math.sin(az), dist * Math.sin(el), dist * Math.cos(el) * Math.cos(az))
      cam.lookAt(g.position.x, 0, L.lookZ * k * zoom * zoom); rn.render(sc, cam)
    }
    loop(); go(0)
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener("resize", size); window.removeEventListener("pointerup", up); window.removeEventListener("pointermove", move)
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("wheel", wheel); rn.dispose(); api.current = null
    }
  }, [play, sport])

  useEffect(() => { api.current?.theme(theme === "dark") }, [theme, play])
  useEffect(() => { setCur(0); setRunning(false) }, [id])
  useEffect(() => { api.current?.go(cur) }, [cur])
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => setCur((c) => { if (c >= play.steps.length) { setRunning(false); return c } return c + 1 }), L.stepMs)
    return () => window.clearInterval(t)
  }, [running, play])

  const list = PLAYS.filter((p) => sportFilter === "all" || (playSport(p) ?? "general") === sportFilter).slice(0, SIDE_TAKE)
  const counts = (s: string): number => PLAYS.filter((p) => (playSport(p) ?? "general") === s).length
  const sk = skillsForPlay(play.id)
  const a = play.tokens.filter((t) => t[0].startsWith("a")).length, b = play.tokens.length - a
  const cat = PLAY_CAT[play.cat]
  const toggle = (): void => { if (!running && cur >= play.steps.length) setCur(0); setRunning(!running) }

  return (
    <div className="lab">
      <canvas ref={cv} id="gl" />
      <div className="hud glass title"><h1>المكتبة <span className="en">3D play lab</span></h1>
        <button className="chip" onClick={() => open({ v: "cmd" })}>← ارجع للطلب</button><span className="live">LIVE 3D</span></div>
      <div className="hud glass modes"><button className="on">ملعب</button><button onClick={flip}>◐</button></div>
      <div className="hud glass shelf"><h3>الخطط المتحركة <span className="en">Plays · {PLAYS.length}</span></h3>
        <div className="chips">{[...Object.keys(SPORTS), "general"].map((s) => counts(s) ? (
          <button key={s} className={`chip${sportFilter === s ? " on" : ""}`} onClick={() => setSportFilter(s)}>{s === "general" ? "أنشطة عامة" : SPORTS[s as keyof typeof SPORTS].ar} {counts(s)}</button>) : null)}</div>
        <div className="list">{list.map((p) => (
          <button key={p.id} className={`row${p.id === play.id ? " on" : ""}`} style={{ "--c": PLAY_CAT[p.cat]?.color } as React.CSSProperties} onClick={() => open({ v: "play", id: p.id })}>
            <span className="ic">{p.tokens.length}</span><span><b>{p.name.ar}</b><small>{p.name.en}</small></span></button>))}</div></div>
      <div className="hud glass insp">
        <span className="tag">● {cat?.ar} · {sport ? SPORTS[sport].ar : "أنشطة عامة"} · <span className="en">{cat?.en}</span></span>
        <h2>{play.name.ar}</h2><div className="e2">{play.name.en}</div>
        <p className="desc">{play.desc.ar}</p>
        <div className="load"><div><b>{play.steps.length}</b><span>خطوات</span></div><div><b dir="ltr">{a}v{b}</b><span>اللاعبين</span></div><div><b>{sport ? SPORTS[sport].short : "—"}</b><span>اللعبة</span></div></div>
        <div><h3 className="lk">مرتبطة بـ <span className="en">Linked skills</span></h3>
          <div className="lkc">{sk.length ? sk.map((s) => <button key={s.id} className="chip" onClick={() => open({ v: "map", key: `s:${s.id}` })}>مهارة · {s.ar.n}</button>) : <span className="chip">—</span>}</div></div>
        <div className="act"><button className="p" onClick={() => open({ v: "map", key: `p:${play.id}` })}>خريطة المعرفة</button><button disabled title="بعد بناء السبورة التكتيكية">السبورة · قريبًا</button></div>
      </div>
      <div className="hud glass tl"><div className="top">
        <button className="pp" onClick={toggle} aria-label={running ? "إيقاف" : "تشغيل"}><svg viewBox="0 0 24 24">{running ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4l13 8-13 8z" />}</svg></button>
        <div className="cap">{cur ? play.steps[cur - 1].c.ar : "اضغط ▶ — الخطة بتتحرك على الملعب خطوة بخطوة، واسحب بالماوس عشان تلف الكاميرا"}</div><span className="sig" dir="ltr">{cur} / {play.steps.length}</span></div>
        <div className="steps">{play.steps.map((s, i) => <button key={i} className={i < cur ? "d" : ""} onClick={() => { setRunning(false); setCur(i + 1) }}>{i + 1} · {s.c.ar.split(" ").slice(0, CAPTION_WORDS).join(" ")}…</button>)}</div></div>
    </div>
  )
}
