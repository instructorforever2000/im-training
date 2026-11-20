// السبورة التكتيكية ثلاثية الأبعاد (3D tactical board) — scene, players, drawing on the pitch, camera and frames.
// Formations and pitch sizes come from the roles engine (same data as the 2D board), so both boards agree.
import * as THREE from "three"
import { ENG } from "@/features/roles/engine/engine"
import { buildAthlete, type Pose, type Rig } from "@/features/library/arena3d/athlete"
import POSES from "@/features/library/arena3d/poses.json"

/** Display quality: "high" = real athletes + shadows, "lite" = simple figures, no shadows (weak devices). */
export type Quality = "high" | "lite"
export type QualityPref = "auto" | Quality
const POSE = POSES as unknown as Record<string, Pose>
const LOW_CORES = 4, LOW_MEM = 4, SMALL_SCREEN = 760
/** Weak device guess: few CPU cores, little memory, or a small touch screen. */
export function autoQuality(): Quality {
  const n = navigator as Navigator & { deviceMemory?: number }
  const weak = (n.hardwareConcurrency ?? 8) <= LOW_CORES || (n.deviceMemory ?? 8) <= LOW_MEM || (matchMedia("(pointer:coarse)").matches && innerWidth < SMALL_SCREEN)
  return weak ? "lite" : "high"
}

export type Mode = "fb11" | "fb7" | "futsal"
export type Tool = "move" | "pass" | "run" | "dribble" | "zone" | "text" | "equip" | "erase"
export type Equip = "cone" | "ladder" | "hurdle" | "pole" | "flag" | "minigoal" | "mannequin"
export type Side = "A" | "B"
export type Cam = "broadcast" | "top" | "goal"
type XZ = [number, number]
export interface Token { id: string; kind: "p" | "ball" | "eq"; eq?: Equip; rot?: number; team?: Side; num?: number; code?: string; x: number; z: number }
export interface Mark { id: string; kind: Exclude<Tool, "move" | "erase" | "equip">; pts: XZ[]; text?: string }
export interface BoardState { mode: Mode; form: Record<Side, string>; tokens: Token[]; marks: Mark[]; frames: Record<string, XZ>[]; caps?: string[] }

interface ModeDef { L: number; W: number }
const MODES = ENG.MODES as unknown as Record<string, ModeDef>
const FORM = ENG.FORM as unknown as Record<string, Record<string, [string, number, number, number][]>>
export const formsOf = (m: Mode): string[] => Object.keys(FORM[m])
export const TEAM_COLOR: Record<Side, string> = { A: "#E6BE3A", B: "#E0564F" }
export const MARK_COLOR: Record<Mark["kind"], string> = { pass: "#ffffff", run: "#f2c14e", dribble: "#1FB5A8", zone: "#5b6fe0", text: "#ffffff" }

const Y_LINE = 0.04, Y_MARK = 0.08, HALF = 2, TAU = Math.PI * 2
const STRIPES = 12, MIN_STEP = 0.6, ARROW_HEAD = 1.4, TUBE_R = 0.18, WAVE_A = 0.45, WAVE_L = 1.6
const FRAME_MS = 1400, PICK_R = 2.2

let seq = 0
const uid = (p: string): string => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

export function newBoard(mode: Mode, form?: Partial<Record<Side, string>>): BoardState {
  const M = MODES[mode], fa = form?.A ?? formsOf(mode)[0], fb = form?.B ?? formsOf(mode)[0]
  const tokens: Token[] = []
  const put = (side: Side, key: string): void => FORM[mode][key].forEach(([c, n, x, y]) => {
    const fx = side === "A" ? x : 1 - x, fy = side === "A" ? y : 1 - y
    tokens.push({ id: uid("p"), kind: "p", team: side, num: n, code: c, x: fx * M.L - M.L / HALF, z: fy * M.W - M.W / HALF })
  })
  put("A", fa); put("B", fb)
  tokens.push({ id: uid("b"), kind: "ball", x: 0, z: 0 })
  const b: BoardState = { mode, form: { A: fa, B: fb }, tokens, marks: [], frames: [] }
  b.frames = [snap(b)]
  return b
}
export const PLAY_MODES: readonly string[] = ["fb11", "fb7", "futsal"]
interface PlayLike { id: string; mode: string; desc: { ar: string }; tokens: [string, string, number | string, number, number][]; ball0: string; steps: { c: { ar: string }; m: Record<string, [number, number]>; b?: string }[] }
const BALL_DX = 1.1, BALL_DZ = 0.6
/** A library play (football modes) as a 3D board: one frame per step, the step text as the frame caption. */
export function fromPlay(p: PlayLike): BoardState | null {
  if (!PLAY_MODES.includes(p.mode)) return null
  const M = MODES[p.mode], cx = M.L / HALF, cz = M.W / HALF
  const tokens: Token[] = p.tokens.map(([id, code, num, x, z]) => ({ id, kind: "p", team: id.startsWith("a") ? "A" : "B", code, num: Number(num) || undefined, x: x - cx, z: z - cz }))
  const ball: Token = { id: "ball", kind: "ball", x: 0, z: 0 }; tokens.push(ball)
  const at: Record<string, XZ> = Object.fromEntries(tokens.map((t) => [t.id, [t.x, t.z] as XZ]))
  let holder = p.ball0
  const frameNow = (): Record<string, XZ> => { const h = at[holder]; return { ...at, ball: h ? [h[0] + BALL_DX, h[1] + BALL_DZ] : [0, 0] } }
  const frames = [frameNow()], caps = [p.desc.ar]
  p.steps.forEach((s) => { Object.entries(s.m).forEach(([id, [x, z]]) => { at[id] = [x - cx, z - cz] }); if (s.b) holder = s.b; frames.push(frameNow()); caps.push(s.c.ar) })
  ball.x = frames[0].ball[0]; ball.z = frames[0].ball[1]
  return { mode: p.mode as Mode, form: { A: "—", B: "—" }, tokens, marks: [], frames, caps }
}
export const snap = (b: BoardState): Record<string, XZ> => Object.fromEntries(b.tokens.map((t) => [t.id, [t.x, t.z] as XZ]))

/** Re-place one team on a new formation, keeping the same token ids. */
export function setFormation(b: BoardState, side: Side, key: string): void {
  const M = MODES[b.mode], mine = b.tokens.filter((t) => t.kind === "p" && t.team === side)
  FORM[b.mode][key].forEach(([c, n, x, y], i) => {
    const t = mine[i]; if (!t) return
    const fx = side === "A" ? x : 1 - x, fy = side === "A" ? y : 1 - y
    t.code = c; t.num = n; t.x = fx * M.L - M.L / HALF; t.z = fy * M.W - M.W / HALF
  })
  b.form[side] = key
}

function numberSprite(n: string, bg: string): THREE.Sprite {
  const px = 128, c = document.createElement("canvas"); c.width = c.height = px
  const x = c.getContext("2d")
  if (x) {
    x.fillStyle = bg; x.beginPath(); x.arc(px / HALF, px / HALF, px / HALF - 4, 0, TAU); x.fill()
    x.lineWidth = 6; x.strokeStyle = "#0b1b33"; x.stroke()
    x.fillStyle = "#0b1b33"; x.font = `bold ${px / HALF}px Outfit, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(n, px / HALF, px / HALF + 4)
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }))
  s.scale.set(2.6, 2.6, 1); s.renderOrder = 5
  return s
}

function pitch(M: ModeDef): THREE.Group {
  const g = new THREE.Group(), { L, W } = M
  const plane = (w: number, h: number, color: string, x: number, y: number): void => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }))
    m.rotation.x = -Math.PI / HALF; m.position.set(x, y, 0); m.receiveShadow = true; g.add(m)
  }
  plane(L + 16, W + 14, "#256f4c", 0, 0)
  for (let i = 0; i < STRIPES; i++) plane(L / STRIPES, W, i % HALF ? "#2d8a5e" : "#33966a", -L / HALF + L / STRIPES / HALF + (i * L) / STRIPES, 0.01)
  const lm = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9 })
  const ln = (pts: XZ[]): void => { g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, Y_LINE, z))), lm)) }
  const hl = L / HALF, hw = W / HALF
  ln([[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]]); ln([[0, -hw], [0, hw]])
  const circ = (cx: number, cz: number, r: number, a0 = 0, a1 = TAU): void => ln(Array.from({ length: 49 }, (_, i): XZ => { const a = a0 + ((a1 - a0) * i) / 48; return [cx + r * Math.cos(a), cz + r * Math.sin(a)] }))
  const s = L / 105
  circ(0, 0, 9.15 * s)
  ;[-1, 1].forEach((d) => {
    const e = d * hl, bx = 16.5 * s, bz = 20.16 * s, sx = 5.5 * s, sz = 9.16 * s
    ln([[e, -bz], [e - d * bx, -bz], [e - d * bx, bz], [e, bz]])
    ln([[e, -sz], [e - d * sx, -sz], [e - d * sx, sz], [e, sz]])
    const gw = 3.66 * s, gh = 2.44, post = new THREE.MeshStandardMaterial({ color: "#ffffff" })
    ;[-gw, gw].forEach((z) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, gh), post); p.position.set(e, gh / HALF, z); g.add(p) })
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, gw * HALF), post); bar.rotation.x = Math.PI / HALF; bar.position.set(e, gh, 0); g.add(bar)
    const net = new THREE.Mesh(new THREE.PlaneGeometry(gw * HALF, gh), new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.18, side: THREE.DoubleSide }))
    net.rotation.y = Math.PI / HALF; net.position.set(e + d * 1.6, gh / HALF, 0); g.add(net)
  })
  return g
}

const hex = (c: string): number => parseInt(c.slice(1), 16)
const SKINS = [0xc68e64, 0x8d5a3b, 0xe0b48f, 0xa8744f, 0x6f4630], HAIRS = [0x15110e, 0x2b1d14, 0x0e0c0b]
const ATH_SCALE = 2.3
function athleteObj(t: Token, i: number): THREE.Group {
  const g = new THREE.Group(), col = TEAM_COLOR[t.team ?? "A"], gk = t.code === "GK"
  const shirt = gk ? 0x2a8be0 : hex(col)
  const rig = buildAthlete({ shirt, shorts: t.team === "A" ? 0x0b1b33 : 0xffffff, socks: shirt, skin: SKINS[i % SKINS.length], hair: HAIRS[i % HAIRS.length], shoes: 0x111111 }, ATH_SCALE)
  rig.pose(POSE.athletic ?? POSE.stand)
  const body = new THREE.Group(); body.add(rig.root); body.rotation.y = t.team === "B" ? -Math.PI / HALF : Math.PI / HALF
  g.add(body); g.userData.rig = rig; g.userData.body = body
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.2, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 }))
  ring.rotation.x = -Math.PI / HALF; ring.position.y = Y_LINE; g.add(ring)
  const sp = numberSprite(String(t.num ?? ""), col); sp.position.y = 5.2; g.add(sp)
  return g
}

function playerObj(t: Token): THREE.Group {
  const g = new THREE.Group(), col = TEAM_COLOR[t.team ?? "A"], gk = t.code === "GK"
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.1, 6, 14), new THREE.MeshStandardMaterial({ color: gk ? "#2a8be0" : col, roughness: 0.45 }))
  body.position.y = 1.2; body.castShadow = true; g.add(body)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), new THREE.MeshStandardMaterial({ color: "#c68e64", roughness: 0.6 }))
  head.position.y = 2.35; head.castShadow = true; g.add(head)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.2, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 }))
  ring.rotation.x = -Math.PI / HALF; ring.position.y = Y_LINE; ring.name = "ring"; g.add(ring)
  const sp = numberSprite(String(t.num ?? ""), col); sp.position.y = 3.6; g.add(sp)
  return g
}

function textSprite(t: string): THREE.Sprite {
  const fs = 56, c = document.createElement("canvas"), x0 = c.getContext("2d")
  if (x0) x0.font = `700 ${fs}px "IBM Plex Sans Arabic", sans-serif`
  const w = Math.ceil((x0?.measureText(t).width ?? fs * t.length) + fs), h = fs * 1.6
  c.width = w; c.height = h
  const x = c.getContext("2d")
  if (x) {
    x.fillStyle = "#0b1b33d9"; x.beginPath(); x.roundRect(0, 0, w, h, h / 3); x.fill()
    x.fillStyle = "#ffffff"; x.font = `700 ${fs}px "IBM Plex Sans Arabic", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.direction = "rtl"; x.fillText(t, w / HALF, h / HALF + 3)
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }))
  const k = 1.6 / h * 1.6; s.scale.set(w * k, h * k, 1); s.renderOrder = 6
  return s
}

function equipObj(e: Equip): THREE.Group {
  const g = new THREE.Group(), m = (c: string, r = 0.5): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: c, roughness: r })
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o }
  const orange = m("#ff7a1a", 0.45), yellow = m("#f2c14e"), white = m("#ffffff"), red = m("#d9483b"), blue = m("#2a6fe0")
  if (e === "cone") { add(new THREE.ConeGeometry(0.32, 0.6, 18), orange, 0, 0.3); add(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 18), orange, 0, 0.02) }
  if (e === "ladder") { [-0.3, 0.3].forEach((z) => add(new THREE.BoxGeometry(4.2, 0.04, 0.05), yellow, 0, 0.03, z)); for (let i = 0; i <= 8; i++) add(new THREE.BoxGeometry(0.05, 0.04, 0.6), yellow, -2.1 + (i * 4.2) / 8, 0.03, 0) }
  if (e === "hurdle") { [-0.45, 0.45].forEach((z) => add(new THREE.CylinderGeometry(0.03, 0.03, 0.45), red, 0, 0.22, z)); add(new THREE.CylinderGeometry(0.035, 0.035, 0.95), white, 0, 0.45, 0).rotation.x = Math.PI / 2 }
  if (e === "pole") { add(new THREE.CylinderGeometry(0.04, 0.04, 1.7), yellow, 0, 0.85); add(new THREE.CylinderGeometry(0.15, 0.15, 0.06), m("#333"), 0, 0.03) }
  if (e === "flag") { add(new THREE.CylinderGeometry(0.03, 0.03, 1.5), white, 0, 0.75); add(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshStandardMaterial({ color: "#f2c14e", side: THREE.DoubleSide }), 0.25, 1.32) }
  if (e === "minigoal") { const w = 1.8, h = 0.9; [-w / 2, w / 2].forEach((z) => add(new THREE.CylinderGeometry(0.04, 0.04, h), white, 0, h / 2, z)); add(new THREE.CylinderGeometry(0.04, 0.04, w), white, 0, h, 0).rotation.x = Math.PI / 2; add(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: "#fff", transparent: true, opacity: 0.25, side: THREE.DoubleSide }), 0.5, h / 2).rotation.y = Math.PI / 2 }
  if (e === "mannequin") { add(new THREE.CapsuleGeometry(0.32, 1.1, 6, 12), blue, 0, 1.0); add(new THREE.SphereGeometry(0.25, 14, 10), blue, 0, 1.95); add(new THREE.CylinderGeometry(0.4, 0.45, 0.08, 16), m("#333"), 0, 0.04) }
  return g
}

function markObj(m: Mark): THREE.Object3D {
  if (m.kind === "text") { const s = textSprite(m.text ?? ""); s.position.set(m.pts[0][0], 1.4, m.pts[0][1]); return s }
  const col = MARK_COLOR[m.kind], mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, transparent: m.kind === "zone", opacity: m.kind === "zone" ? 0.28 : 1 })
  if (m.kind === "zone") {
    const [a, b] = [m.pts[0], m.pts[m.pts.length - 1]], r = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]))
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 48), mat); d.rotation.x = -Math.PI / HALF; d.position.set(a[0], Y_MARK, a[1])
    const edge = new THREE.Mesh(new THREE.RingGeometry(r - 0.15, r, 64), new THREE.MeshBasicMaterial({ color: col })); edge.rotation.x = -Math.PI / HALF; edge.position.set(a[0], Y_MARK + 0.01, a[1])
    const g = new THREE.Group(); g.add(d, edge); return g
  }
  let pts = m.pts.map(([x, z]) => new THREE.Vector3(x, Y_MARK + 0.15, z))
  if (m.kind === "dribble" && pts.length > 1) {
    const base = new THREE.CatmullRomCurve3(pts), len = base.getLength(), n = Math.max(8, Math.round(len / 0.4))
    pts = Array.from({ length: n + 1 }, (_, i) => {
      const u = i / n, p = base.getPointAt(u), tg = base.getTangentAt(u), nx = -tg.z, nz = tg.x
      const w = Math.sin((u * len * TAU) / WAVE_L) * WAVE_A * Math.min(1, (1 - u) * 6)
      return new THREE.Vector3(p.x + nx * w, p.y, p.z + nz * w)
    })
  }
  const g = new THREE.Group()
  if (pts.length < 2) return g
  const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength()
  if (m.kind === "pass") {
    const dash = 1.1, n = Math.floor(len / (dash * HALF))
    for (let i = 0; i < n; i++) {
      const a = (i * dash * HALF) / len, b = Math.min(1, (i * dash * HALF + dash) / len)
      const seg = new THREE.CatmullRomCurve3([curve.getPointAt(a), curve.getPointAt((a + b) / HALF), curve.getPointAt(b)])
      g.add(new THREE.Mesh(new THREE.TubeGeometry(seg, 4, TUBE_R, 6), mat))
    }
  } else g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), TUBE_R, 8), mat))
  const end = curve.getPointAt(1), dir = curve.getTangentAt(1)
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.55, ARROW_HEAD, 14), mat)
  head.position.copy(end); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); g.add(head)
  return g
}

export interface Board3D {
  undo: () => void
  redo: () => void
  readonly canUndo: () => boolean
  readonly canRedo: () => boolean
  setText: (t: string) => void
  setEquip: (e: Equip) => void
  setCaption: (i: number, t: string) => void
  readonly state: () => BoardState
  load: (b: BoardState) => void
  setTool: (t: Tool) => void
  setCam: (c: Cam) => void
  frame: (i: number, animate: boolean) => void
  addFrame: () => number
  play: (onStep: (i: number) => void, onEnd: () => void) => () => void
  dark: (on: boolean) => void
  png: () => string
  dispose: () => void
  setQuality: (q: Quality) => void
}

export function mountBoard3D(canvas: HTMLCanvasElement, init: BoardState, onChange: (b: BoardState) => void, quality: Quality = "high"): Board3D {
  let q = quality
  let still = 0
  const wake = (): void => { still = 0 }
  let st: BoardState = init, tool: Tool = "move", fi = 0, text = "", equip: Equip = "cone"
  const hist: string[] = [], fut: string[] = [], HIST_MAX = 80
  const remember = (): void => { hist.push(JSON.stringify(st)); if (hist.length > HIST_MAX) hist.shift(); fut.length = 0 }
  const rn = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  const applyQ = (): void => { rn.setPixelRatio(q === "high" ? Math.min(window.devicePixelRatio, HALF) : 1); rn.shadowMap.enabled = q === "high" }
  applyQ()
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.5, 900)
  sc.add(new THREE.HemisphereLight("#ffffff", "#5a6a5a", 1.15))
  const sun = new THREE.DirectionalLight("#ffffff", 1.6); sun.position.set(30, 80, 40); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 50, bottom: -50 }); sc.add(sun)
  const world = new THREE.Group(); sc.add(world)
  let field = new THREE.Group(), marks = new THREE.Group()
  const objs = new Map<string, { o: THREE.Group; to: THREE.Vector3 }>()
  const ballMesh = (): THREE.Group => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.35 })); m.position.y = 0.42; m.castShadow = true; g.add(m); return g }

  const build = (): void => {
    still = 0
    world.clear(); objs.clear()
    field = pitch(MODES[st.mode]); world.add(field)
    marks = new THREE.Group(); world.add(marks); st.marks.forEach((m) => marks.add(Object.assign(markObj(m), { name: m.id })))
    st.tokens.forEach((t, i) => { const o = t.kind === "ball" ? ballMesh() : t.kind === "eq" ? equipObj(t.eq ?? "cone") : q === "high" ? athleteObj(t, i) : playerObj(t); if (q !== "high") o.traverse((m) => { m.castShadow = false }); o.rotation.y = t.rot ?? 0; o.position.set(t.x, 0, t.z); o.userData.id = t.id; world.add(o); objs.set(t.id, { o, to: o.position.clone() }) })
  }

  // camera — orbit around the pitch centre; presets ease to their angles
  const M0 = (): ModeDef => MODES[st.mode]
  const view = { az: -0.35, el: 0.82, dist: 1, tx: 0, tz: 0 }, goal = { ...view }
  const presets = (c: Cam): typeof view => {
    const L = M0().L
    if (c === "top") return { az: 0, el: 1.5, dist: L * 1.32, tx: 0, tz: 0 }
    if (c === "goal") return { az: -Math.PI / HALF, el: 0.3, dist: L * 0.42, tx: -L * 0.2, tz: 0 }
    return { az: -0.3, el: 0.86, dist: L * 1.42, tx: 0, tz: 4 }
  }
  const setCam = (c: Cam): void => { Object.assign(goal, presets(c)); wake() }
  Object.assign(view, presets("broadcast")); Object.assign(goal, view)

  const size = (): void => { const r = canvas.getBoundingClientRect(); rn.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix() }
  const ro = new ResizeObserver(size); ro.observe(canvas)

  // picking on the ground plane
  const ray = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2()
  const onGround = (e: PointerEvent): XZ | null => {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * HALF - 1, -((e.clientY - r.top) / r.height) * HALF + 1)
    ray.setFromCamera(ndc, cam); const p = new THREE.Vector3(); return ray.ray.intersectPlane(ground, p) ? [p.x, p.z] : null
  }
  const nearest = (p: XZ): Token | null => {
    let best: Token | null = null, bd = PICK_R
    st.tokens.forEach((t) => { const d = Math.hypot(t.x - p[0], t.z - p[1]); if (d < bd) { bd = d; best = t } })
    return best
  }
  const commit = (): void => { st.frames[fi] = snap(st); onChange(st) }

  type Drag = { k: "tok"; t: Token } | { k: "draw"; m: Mark; o: THREE.Object3D } | { k: "orbit"; x: number; y: number; az: number; el: number }
  let drag: Drag | null = null
  const down = (e: PointerEvent): void => {
    canvas.setPointerCapture(e.pointerId)
    const p = onGround(e)
    if (e.button === HALF || e.button === 1 || !p) { drag = { k: "orbit", x: e.clientX, y: e.clientY, az: goal.az, el: goal.el }; return }
    if (tool === "equip") {
      remember(); const t: Token = { id: uid("e"), kind: "eq", eq: equip, x: p[0], z: p[1], rot: equip === "ladder" || equip === "minigoal" ? 0 : 0 }
      st.tokens.push(t); st.frames.forEach((f) => { f[t.id] = [t.x, t.z] })
      const o = equipObj(equip); o.position.set(t.x, 0, t.z); world.add(o); objs.set(t.id, { o, to: o.position.clone() }); onChange(st); return
    }
    if (tool === "text") { if (!text.trim()) return; remember(); const m: Mark = { id: uid("m"), kind: "text", pts: [p], text: text.trim() }; st.marks.push(m); marks.add(Object.assign(markObj(m), { name: m.id })); onChange(st); return }
    if (tool === "move") { const t = nearest(p); if (t) remember(); drag = t ? { k: "tok", t } : { k: "orbit", x: e.clientX, y: e.clientY, az: goal.az, el: goal.el }; return }
    if (tool === "erase") {
      const hit = st.marks.findIndex((m) => m.pts.some(([x, z]) => Math.hypot(x - p[0], z - p[1]) < PICK_R))
      const eq = st.tokens.find((t) => t.kind === "eq" && Math.hypot(t.x - p[0], t.z - p[1]) < PICK_R)
      if (eq) { remember(); st.tokens = st.tokens.filter((t) => t !== eq); st.frames.forEach((f) => { delete f[eq.id] }); const ob = objs.get(eq.id); if (ob) world.remove(ob.o); objs.delete(eq.id); onChange(st); return }
      if (hit >= 0) { remember(); const [m] = st.marks.splice(hit, 1); const o = marks.getObjectByName(m.id); if (o) marks.remove(o); onChange(st) }
      return
    }
    const m: Mark = { id: uid("m"), kind: tool, pts: [p, p] }; const o = new THREE.Group(); marks.add(o); drag = { k: "draw", m, o }
  }
  const move = (e: PointerEvent): void => {
    if (!drag) return
    if (drag.k === "orbit") { goal.az = drag.az - (e.clientX - drag.x) * 0.006; goal.el = Math.max(0.25, Math.min(1.52, drag.el + (e.clientY - drag.y) * 0.005)); return }
    const p = onGround(e); if (!p) return
    if (drag.k === "tok") { const M = M0(); drag.t.x = Math.max(-M.L / HALF - 4, Math.min(M.L / HALF + 4, p[0])); drag.t.z = Math.max(-M.W / HALF - 4, Math.min(M.W / HALF + 4, p[1])); const ob = objs.get(drag.t.id); if (ob) { ob.to.set(drag.t.x, 0, drag.t.z); ob.o.position.copy(ob.to) }; return }
    const last = drag.m.pts[drag.m.pts.length - 1]
    if (drag.m.kind === "zone" || drag.m.kind === "pass") drag.m.pts = [drag.m.pts[0], p]
    else if (Math.hypot(p[0] - last[0], p[1] - last[1]) > MIN_STEP) drag.m.pts.push(p)
    marks.remove(drag.o); drag.o = markObj(drag.m); drag.o.name = drag.m.id; marks.add(drag.o)
  }
  const up = (): void => {
    if (drag?.k === "tok") commit()
    if (drag?.k === "draw") { const [a, b] = [drag.m.pts[0], drag.m.pts[drag.m.pts.length - 1]]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 1) { remember(); st.marks.push(drag.m); onChange(st) } else marks.remove(drag.o) }
    drag = null
  }
  const wheel = (e: WheelEvent): void => { e.preventDefault(); const L = M0().L; goal.dist = Math.max(L * 0.25, Math.min(L * 1.6, goal.dist * (1 + e.deltaY * 0.0012))) }
  ;["pointerdown", "pointermove", "wheel"].forEach((ev) => canvas.addEventListener(ev, wake))
  canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up)
  canvas.addEventListener("wheel", wheel, { passive: false }); canvas.addEventListener("contextmenu", (e) => e.preventDefault())

  let raf = 0
  const IDLE_FRAMES = 30, MOVING = 0.02, RUN_POSE = POSE.jog ?? POSE.athletic, READY = POSE.athletic ?? POSE.stand
  const loop = (): void => {
    raf = requestAnimationFrame(loop)
    let busy = drag !== null
    ;(Object.keys(view) as (keyof typeof view)[]).forEach((k) => { const d = goal[k] - view[k]; if (Math.abs(d) > 1e-4) busy = true; view[k] += d * 0.12 })
    objs.forEach(({ o, to }) => {
      const dx = to.x - o.position.x, dz = to.z - o.position.z, moving = Math.hypot(dx, dz) > MOVING
      if (moving) busy = true
      o.position.lerp(to, 0.14)
      const rig = o.userData.rig as Rig | undefined, body = o.userData.body as THREE.Group | undefined
      if (rig && body && o.userData.run !== moving) { o.userData.run = moving; rig.pose(moving ? RUN_POSE : READY) }
      if (body && moving) body.rotation.y = Math.atan2(dx, dz)
    })
    still = busy ? 0 : still + 1
    if (still > IDLE_FRAMES) return // battery: nothing moves → no redraw
    cam.position.set(view.tx + view.dist * Math.cos(view.el) * Math.sin(view.az), view.dist * Math.sin(view.el), view.tz + view.dist * Math.cos(view.el) * Math.cos(view.az))
    cam.lookAt(view.tx, 0, view.tz); rn.render(sc, cam)
  }
  const dark = (on: boolean): void => { const bg = on ? "#060b13" : "#dfe7ee"; rn.setClearColor(bg); sc.fog = new THREE.Fog(bg, 160, 320); wake() }
  build(); size(); dark(false); loop()

  const frame = (i: number, animate: boolean): void => {
    fi = Math.max(0, Math.min(st.frames.length - 1, i)); const f = st.frames[fi]; wake()
    st.tokens.forEach((t) => { const p = f[t.id]; if (!p) return; t.x = p[0]; t.z = p[1]; const ob = objs.get(t.id); if (ob) { ob.to.set(p[0], 0, p[1]); if (!animate) ob.o.position.copy(ob.to) } })
  }
  const restore = (from: string[], to: string[]): void => { const s = from.pop(); if (!s) return; to.push(JSON.stringify(st)); st = JSON.parse(s) as BoardState; fi = Math.min(fi, st.frames.length - 1); build(); frame(fi, false); onChange(st) }
  return {
    undo: () => restore(hist, fut),
    redo: () => restore(fut, hist),
    canUndo: () => hist.length > 0,
    canRedo: () => fut.length > 0,
    setText: (t) => { text = t },
    setEquip: (e) => { equip = e },
    setCaption: (i, t) => { st.caps = st.caps ?? []; st.caps[i] = t; onChange(st) },
    state: () => st,
    load: (b) => { remember(); st = b; fi = 0; build(); Object.assign(goal, presets("broadcast")); onChange(st) },
    setTool: (t) => { tool = t; canvas.style.cursor = t === "move" ? "grab" : "crosshair" },
    setCam,
    frame,
    addFrame: () => { remember(); st.caps?.splice(fi + 1, 0, ""); st.frames.splice(fi + 1, 0, snap(st)); fi += 1; onChange(st); return fi },
    play: (onStep, onEnd) => {
      let i = 0; frame(0, false); onStep(0)
      const t = window.setInterval(() => { i += 1; if (i >= st.frames.length) { window.clearInterval(t); onEnd(); return } frame(i, true); onStep(i) }, FRAME_MS)
      return () => window.clearInterval(t)
    },
    dark,
    png: () => rn.domElement.toDataURL("image/png"),
    setQuality: (nq) => { q = nq; applyQ(); build(); frame(fi, false); wake() },
    dispose: () => { cancelAnimationFrame(raf); ro.disconnect(); rn.dispose() },
  }
}
