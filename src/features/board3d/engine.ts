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

export type Mode = "fb11" | "fb7" | "futsal" | "bb" | "hb" | "vb" | "area"
export type Tool = "move" | "pass" | "run" | "dribble" | "zone" | "text" | "equip" | "erase"
export type Equip = "cone" | "ladder" | "hurdle" | "pole" | "flag" | "minigoal" | "mannequin"
export type Side = "A" | "B"
export type Cam = "broadcast" | "top" | "goal" | "half" | "vertical"
type XZ = [number, number]
/** A token linked to a real player of the squad (فريقي): pid = players.id, nm = short name shown on the pitch, ps = status colour key. */
export interface Token { id: string; kind: "p" | "ball" | "eq"; eq?: Equip; rot?: number; team?: Side; num?: number; code?: string; pid?: string; nm?: string; ps?: string; x: number; z: number }
export interface Mark { id: string; kind: Exclude<Tool, "move" | "erase" | "equip">; pts: XZ[]; text?: string }
export interface BoardState { squad?: { id: string; name: string }; mode: Mode; form: Record<Side, string>; tokens: Token[]; marks: Mark[]; frames: Record<string, XZ>[]; caps?: string[]; dims?: { L: number; W: number } }

interface ModeDef { L: number; W: number }
const MODES = { ...(ENG.MODES as unknown as Record<string, ModeDef>), area: { L: 30, W: 20 } } as Record<string, ModeDef>
/** Size of the field of a board: a general activity area keeps its own size (from the play), every sport its court. */
export const dimsOf = (b: BoardState): ModeDef => b.dims ?? MODES[b.mode]
const FORM = ENG.FORM as unknown as Record<string, Record<string, [string, number, number, number][]>>
type Slot = [string, number, number, number]
const E = ENG as unknown as { BB_OFF: Record<string, Slot[]>; BB_DEF: Record<string, Slot[] | string>; HB_OFF: Record<string, Slot[]>; HB_DEF: Record<string, Slot[]>; VB_FORMS: Record<string, number>; vbFormation: (k: string) => Slot[] }
const FB = new Set(["fb11", "fb7", "futsal"])
export const SPORT_OF: Record<Mode, "football" | "basketball" | "handball" | "volleyball"> = { area: "football", fb11: "football", fb7: "football", futsal: "football", bb: "basketball", hb: "handball", vb: "volleyball" }
/** Formations for one side: football/futsal share; basketball and handball have attack (A) and defence (B) sets; volleyball rotations. */
export function formsOf(m: Mode, side: Side = "A"): string[] {
  if (FB.has(m)) return Object.keys(FORM[m])
  if (m === "area") return ["4v4"]
  if (m === "vb") return Object.keys(E.VB_FORMS)
  const src = m === "bb" ? (side === "A" ? E.BB_OFF : E.BB_DEF) : (side === "A" ? E.HB_OFF : E.HB_DEF)
  return Object.keys(src).filter((k) => Array.isArray(src[k]))
}
/** Slots of a formation as [code, number, x, z] in metres, centred on the court. */
function slotsOf(m: Mode, side: Side, key: string): Slot[] {
  const M = MODES[m], cx = M.L / HALF, cz = M.W / HALF
  const frac = (list: Slot[]): Slot[] => list.map(([c, n, x, y]) => [c, n, (side === "A" ? x : 1 - x) * M.L - cx, (side === "A" ? y : 1 - y) * M.W - cz])
  const abs = (list: Slot[]): Slot[] => list.map(([c, n, x, y]) => [c, n, x - cx, y - cz])
  if (FB.has(m)) return frac(FORM[m][key] ?? Object.values(FORM[m])[0])
  if (m === "area") return frac([1, 2, 3, 4].map((n): Slot => ["", n, 0.3, n / 5]))
  if (m === "vb") return frac(E.vbFormation(key in E.VB_FORMS ? key : "base|1"))
  const src = (m === "bb" ? (side === "A" ? E.BB_OFF : E.BB_DEF) : (side === "A" ? E.HB_OFF : E.HB_DEF)) as Record<string, Slot[] | string>
  const list = src[key]
  return abs(Array.isArray(list) ? list : (Object.values(src).find(Array.isArray) as Slot[]))
}
/** Size factor of a court relative to a full football pitch (figures, picking, labels). */
export const courtK = (m: Mode, d?: ModeDef): number => Math.max(0.42, Math.min(1, (d ?? MODES[m]).L / 105))
export const TEAM_COLOR: Record<Side, string> = { A: "#E6BE3A", B: "#E0564F" }
export const MARK_COLOR: Record<Mark["kind"], string> = { pass: "#ffffff", run: "#f2c14e", dribble: "#1FB5A8", zone: "#5b6fe0", text: "#ffffff" }

const Y_LINE = 0.04, Y_MARK = 0.08, HALF = 2, TAU = Math.PI * 2
const STRIPES = 12, MIN_STEP = 0.6, ARROW_HEAD = 1.4, TUBE_R = 0.18, WAVE_A = 0.45, WAVE_L = 1.6
const FRAME_MS = 1400, PICK_R = 2.2

let seq = 0
const uid = (p: string): string => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`

export function newBoard(mode: Mode, form?: Partial<Record<Side, string>>): BoardState {
  const ok = (side: Side, k?: string): string => (k && formsOf(mode, side).includes(k) ? k : formsOf(mode, side)[0])
  const fa = ok("A", form?.A), fb = ok("B", form?.B)
  const tokens: Token[] = []
  const put = (side: Side, key: string): void => slotsOf(mode, side, key).forEach(([c, n, x, z]) => {
    tokens.push({ id: uid("p"), kind: "p", team: side, num: n, code: c, x, z })
  })
  put("A", fa); put("B", fb)
  tokens.push({ id: uid("b"), kind: "ball", x: 0, z: 0 })
  const b: BoardState = { mode, form: { A: fa, B: fb }, tokens, marks: [], frames: [] }
  b.frames = [snap(b)]
  return b
}
export const PLAY_MODES: readonly string[] = ["fb11", "fb7", "futsal", "bb", "hb", "vb", "area"]
/** Every play opens in 3D: sports on their court, general activities ("a-…") on an area sized to the play. */
export const opensIn3D = (mode: string): boolean => PLAY_MODES.includes(mode) || mode.startsWith("a-")
const AREA_PAD = 4
interface PlayLike { id: string; mode: string; desc: { ar: string }; tokens: [string, string, number | string, number, number][]; ball0: string; steps: { c: { ar: string }; m: Record<string, [number, number]>; b?: string }[] }
const BALL_DX = 1.1, BALL_DZ = 0.6
/** A library play (football modes) as a 3D board: one frame per step, the step text as the frame caption. */
export function fromPlay(p: PlayLike): BoardState | null {
  if (!opensIn3D(p.mode)) return null
  const area = p.mode.startsWith("a-")
  let M = MODES[p.mode], ox = 0, oz = 0
  if (area) {
    const xs: number[] = [], zs: number[] = []
    p.tokens.forEach((t) => { xs.push(t[3]); zs.push(t[4]) }); p.steps.forEach((s) => Object.values(s.m).forEach(([x, z]) => { xs.push(x); zs.push(z) }))
    ox = Math.min(...xs) - AREA_PAD; oz = Math.min(...zs) - AREA_PAD
    M = { L: Math.max(Math.max(...xs) - ox + AREA_PAD, 12), W: Math.max(Math.max(...zs) - oz + AREA_PAD, 10) }
  }
  const cx = M.L / HALF + ox, cz = M.W / HALF + oz
  const tokens: Token[] = p.tokens.map(([id, code, num, x, z]) => ({ id, kind: "p", team: id.startsWith("a") ? "A" : "B", code, num: Number(num) || undefined, x: x - cx, z: z - cz }))
  const ball: Token = { id: "ball", kind: "ball", x: 0, z: 0 }; tokens.push(ball)
  const at: Record<string, XZ> = Object.fromEntries(tokens.map((t) => [t.id, [t.x, t.z] as XZ]))
  let holder = p.ball0
  const frameNow = (): Record<string, XZ> => { const h = at[holder]; return { ...at, ball: h ? [h[0] + BALL_DX, h[1] + BALL_DZ] : [0, 0] } }
  const frames = [frameNow()], caps = [p.desc.ar]
  p.steps.forEach((s) => { Object.entries(s.m).forEach(([id, [x, z]]) => { at[id] = [x - cx, z - cz] }); if (s.b) holder = s.b; frames.push(frameNow()); caps.push(s.c.ar) })
  ball.x = frames[0].ball[0]; ball.z = frames[0].ball[1]
  return { mode: area ? "area" : (p.mode as Mode), form: { A: "—", B: "—" }, tokens, marks: [], frames, caps, ...(area ? { dims: { L: M.L, W: M.W } } : {}) }
}
export const snap = (b: BoardState): Record<string, XZ> => Object.fromEntries(b.tokens.map((t) => [t.id, [t.x, t.z] as XZ]))

/** Re-place one team on a new formation, keeping the same token ids. */
export function setFormation(b: BoardState, side: Side, key: string): void {
  const mine = b.tokens.filter((t) => t.kind === "p" && t.team === side)
  slotsOf(b.mode, side, key).forEach(([c, n, x, z], i) => {
    const t = mine[i]; if (!t) return
    t.code = c; t.num = n; t.x = x; t.z = z
  })
  b.form[side] = key
}

export const STATUS_DOT: Record<string, string> = { ready: "#2fa36b", limited: "#e09a1c", injured: "#d9483b", absent: "#94a3b8" }
function numberSprite(n: string, bg: string, dot?: string): THREE.Sprite {
  const px = 128, c = document.createElement("canvas"); c.width = c.height = px
  const x = c.getContext("2d")
  if (x) {
    x.fillStyle = bg; x.beginPath(); x.arc(px / HALF, px / HALF, px / HALF - 4, 0, TAU); x.fill()
    x.lineWidth = 6; x.strokeStyle = "#0b1b33"; x.stroke()
    x.fillStyle = "#0b1b33"; x.font = `bold ${px / HALF}px Outfit, sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(n, px / HALF, px / HALF + 4)
    if (dot) { x.fillStyle = dot; x.beginPath(); x.arc(px * 0.8, px * 0.2, px * 0.2, 0, TAU); x.fill(); x.lineWidth = 5; x.strokeStyle = "#ffffff"; x.stroke() }
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }))
  s.scale.set(2.6, 2.6, 1); s.renderOrder = 5
  return s
}

function court(mode: Mode): THREE.Group {
  const M = MODES[mode], g = new THREE.Group(), { L, W } = M, hl = L / HALF, hw = W / HALF, sp = SPORT_OF[mode]
  const plane = (w: number, h: number, color: string, x: number, y: number, z = 0): void => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }))
    m.rotation.x = -Math.PI / HALF; m.position.set(x, y, z); m.receiveShadow = true; g.add(m)
  }
  const lm = new THREE.LineBasicMaterial({ color: "#ffffff" })
  const ln = (pts: XZ[]): void => { g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, Y_LINE, z))), lm)) }
  const arc = (cx: number, cz: number, r: number, a0 = 0, a1 = TAU): XZ[] => Array.from({ length: 49 }, (_, i): XZ => { const a = a0 + ((a1 - a0) * i) / 48; return [cx + r * Math.cos(a), cz + r * Math.sin(a)] })
  const white = new THREE.MeshStandardMaterial({ color: "#ffffff" }), steel = new THREE.MeshStandardMaterial({ color: "#5b6573", metalness: 0.5, roughness: 0.4 })
  const pole = (x: number, z: number, h: number, r: number, m: THREE.Material): void => { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h), m); p.position.set(x, h / HALF, z); p.castShadow = true; g.add(p) }
  plane(L + 6, W + 6, sp === "volleyball" ? "#2f6db0" : "#7a5236", 0, 0)
  plane(L, W, sp === "volleyball" ? "#e2864a" : "#c98a5a", 0, 0.01)
  ln([[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]]); ln([[0, -hw], [0, hw]])
  if (sp === "basketball") {
    ln(arc(0, 0, 1.8))
    ;[-1, 1].forEach((d) => {
      const e = d * hl, bx = e - d * 1.575
      ln([[e, -2.45], [e - d * 5.8, -2.45], [e - d * 5.8, 2.45], [e, 2.45]]); ln(arc(e - d * 5.8, 0, 1.8))
      const a = Math.acos(6.6 / 6.75)
      ln([[e, -6.6], [bx - d * 6.75 * Math.cos(a) + d * 0, -6.6]]); ln([[e, 6.6], [bx - d * 6.75 * Math.cos(a), 6.6]])
      ln(arc(bx, 0, 6.75, -Math.PI / HALF + a, Math.PI / HALF - a).map(([x, z]): XZ => [bx - d * (x - bx), z]))
      pole(e + d * 0.6, 0, 3.4, 0.08, steel)
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 1.8), new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.85 })); board.position.set(e - d * 1.2, 3.4, 0); g.add(board)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 8, 24), new THREE.MeshStandardMaterial({ color: "#ff6a1a" })); ring.rotation.x = Math.PI / HALF; ring.position.set(bx, 3.05, 0); g.add(ring)
    })
  } else if (sp === "handball") {
    ln(arc(0, 0, 1.5))
    ;[-1, 1].forEach((d) => {
      const e = d * hl
      const D = (r: number): XZ[] => [...arc(e, -1.5, r, Math.PI / HALF, Math.PI).map(([x, z]): XZ => [e - d * Math.abs(x - e), z]).reverse(), ...arc(e, 1.5, r, Math.PI, Math.PI * 1.5).map(([x, z]): XZ => [e - d * Math.abs(x - e), z]).reverse()]
      ln(D(6)); ln(D(9)); ln([[e - d * 7, -0.5], [e - d * 7, 0.5]])
      pole(e, -1.5, 2, 0.05, white); pole(e, 1.5, 2, 0.05, white)
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3), white); bar.rotation.x = Math.PI / HALF; bar.position.set(e, 2, 0); g.add(bar)
      const net = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshStandardMaterial({ color: "#fff", transparent: true, opacity: 0.2, side: THREE.DoubleSide })); net.rotation.y = Math.PI / HALF; net.position.set(e + d * 0.9, 1, 0); g.add(net)
    })
  } else {
    ln([[-3, -hw], [-3, hw]]); ln([[3, -hw], [3, hw]])
    pole(0, -hw - 1, 2.55, 0.06, steel); pole(0, hw + 1, 2.55, 0.06, steel)
    const net = new THREE.Mesh(new THREE.PlaneGeometry(W + 2, 1), new THREE.MeshStandardMaterial({ color: "#111", transparent: true, opacity: 0.35, side: THREE.DoubleSide })); net.rotation.y = Math.PI / HALF; net.position.set(0, 1.93, 0); g.add(net)
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, W + 2), white); tape.position.set(0, 2.43, 0); g.add(tape)
  }
  return g
}

/** General activity area: grass with a cone-marked boundary. */
function areaField(M: ModeDef): THREE.Group {
  const g = new THREE.Group(), hl = M.L / HALF, hw = M.W / HALF
  const base = new THREE.Mesh(new THREE.PlaneGeometry(M.L + 10, M.W + 10), new THREE.MeshStandardMaterial({ color: "#2d8a5e", roughness: 0.95 }))
  base.rotation.x = -Math.PI / HALF; base.receiveShadow = true; g.add(base)
  const lm = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.7 })
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]].map(([x, z]) => new THREE.Vector3(x, Y_LINE, z))), lm))
  ;[[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].forEach(([x, z]) => { const c = equipObj("cone"); c.position.set(x, 0, z); g.add(c) })
  return g
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

const NAME_H = 2.2
/** Short name under the shirt number — tagged so exports can hide it (privacy). */
function nameSprite(t: Token, y: number): THREE.Sprite | null {
  if (!t.nm) return null
  const s = textSprite(t.nm); s.scale.multiplyScalar(NAME_H / s.scale.y); s.position.y = y; s.userData.isName = true
  return s
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
  const sp = numberSprite(String(t.num ?? ""), col, t.ps && STATUS_DOT[t.ps]); sp.position.y = 5.2; g.add(sp)
  const nmS = nameSprite(t, 8.1); if (nmS) g.add(nmS)
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
  const sp = numberSprite(String(t.num ?? ""), col, t.ps && STATUS_DOT[t.ps]); sp.position.y = 3.6; g.add(sp)
  const nmS = nameSprite(t, 6.4); if (nmS) g.add(nmS)
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

/** The tactical role of a player (by position code) and its movement zones, from the roles engine. */
export interface RoleInfo { ar: string; en: string; desc: string }
const ENGX = ENG as unknown as { roleById: (id: string) => { name: { ar: string; en: string }; desc: { ar: string }; z?: { wb: number[]; nb: number[] } } | undefined; defaultVariant: (rs: string, code: string) => string | null }
const RS: Record<Mode, string> = { fb11: "fb", fb7: "fb", futsal: "fs", bb: "bb", hb: "hb", vb: "vb", area: "" }
function roleFor(mode: Mode, code?: string): ReturnType<typeof ENGX.roleById> {
  if (!code || !RS[mode]) return undefined
  const id = ENGX.defaultVariant(RS[mode], code); return id ? ENGX.roleById(id) : undefined
}

export interface Board3D {
  select: (id: string | null) => void
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
  png: (names?: boolean) => string
  /** Show/hide player names on the pitch (exports hide them unless asked). */
  setNames: (on: boolean) => void
  /** While exporting: names follow the coach's choice, never shown when the board hides them. */
  exportNames: (on: boolean) => void
  dispose: () => void
  setQuality: (q: Quality) => void
}

export function mountBoard3D(canvas: HTMLCanvasElement, init: BoardState, onChange: (b: BoardState) => void, quality: Quality = "high", onSelect: (r: (RoleInfo & { num?: number; pid?: string }) | null) => void = () => {}): Board3D {
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
  const zones = new THREE.Group(); let sel: string | null = null
  /** Movement zones of the selected player: yellow = with the ball, teal dashed = without it (same rules as the 2D board). */
  const drawZones = (): void => {
    zones.clear(); const t = st.tokens.find((x) => x.id === sel)
    if (!t || t.kind !== "p") { onSelect(null); return }
    const role = roleFor(st.mode, t.code)
    onSelect(role ? { ar: role.name.ar, en: role.name.en, desc: role.desc.ar, num: t.num, pid: t.pid } : { ar: t.code || "لاعب", en: "", desc: "", num: t.num, pid: t.pid })
    if (!role?.z) return
    const M = dimsOf(st), flip = t.team === "B", yf = flip ? 0.5 - t.z / M.W : 0.5 + t.z / M.W, sign = yf > 0.56 ? 1 : yf < 0.44 ? -1 : 0
    const ell = (z: number[], col: string, op: number): void => {
      const [zx, dy, rx, ry] = z; let cy = Math.max(ry * 0.6, Math.min(1 - ry * 0.6, yf + dy * sign)), cx = zx
      if (flip) { cx = 1 - cx; cy = 1 - cy }
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false }))
      m.rotation.x = -Math.PI / HALF; m.scale.set(rx * M.L, ry * M.W, 1); m.position.set(cx * M.L - M.L / HALF, Y_MARK - 0.02, cy * M.W - M.W / HALF); zones.add(m)
      const e = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: col })); e.rotation.x = -Math.PI / HALF; e.scale.set(rx * M.L, ry * M.W, 1); e.position.copy(m.position).setY(Y_MARK); zones.add(e)
    }
    ell(role.z.nb, "#4FD1C5", 0.16); ell(role.z.wb, "#F4D03F", 0.22)
  }
  const BALL_COL = { football: "#ffffff", basketball: "#e0661c", handball: "#d9483b", volleyball: "#f2c14e" }
  const ballMesh = (): THREE.Group => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), new THREE.MeshStandardMaterial({ color: BALL_COL[SPORT_OF[st.mode]], roughness: 0.35 })); m.position.y = 0.42; m.castShadow = true; g.add(m); return g }

  let namesOn = true
  const showNames = (on: boolean): void => { world.traverse((o) => { if (o.userData.isName) o.visible = on }) }
  const build = (): void => {
    still = 0
    world.clear(); objs.clear()
    field = st.mode === "area" ? areaField(dimsOf(st)) : FB.has(st.mode) ? pitch(MODES[st.mode]) : court(st.mode); world.add(field)
    world.add(zones); sel = null; zones.clear(); onSelect(null)
    marks = new THREE.Group(); world.add(marks); st.marks.forEach((m) => marks.add(Object.assign(markObj(m), { name: m.id })))
    st.tokens.forEach((t, i) => { const o = t.kind === "ball" ? ballMesh() : t.kind === "eq" ? equipObj(t.eq ?? "cone") : q === "high" ? athleteObj(t, i) : playerObj(t); if (q !== "high") o.traverse((m) => { m.castShadow = false }); o.rotation.y = t.rot ?? 0; if (t.kind !== "eq") o.scale.setScalar(courtK(st.mode, dimsOf(st))); o.position.set(t.x, 0, t.z); o.userData.id = t.id; world.add(o); objs.set(t.id, { o, to: o.position.clone() }) })
    showNames(namesOn)
  }

  // camera — orbit around the pitch centre; presets ease to their angles
  const M0 = (): ModeDef => dimsOf(st)
  const view = { az: -0.35, el: 0.82, dist: 1, tx: 0, tz: 0 }, goal = { ...view }
  const presets = (c: Cam): typeof view => {
    const L = M0().L
    if (c === "half") return { az: -0.25, el: 0.9, dist: L * 0.82, tx: L * 0.24, tz: 0 }
    if (c === "vertical") return { az: Math.PI / HALF, el: 1.32, dist: L * 1.12, tx: 0, tz: 0 }
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
    let best: Token | null = null, bd = PICK_R * courtK(st.mode, dimsOf(st))
    st.tokens.forEach((t) => { const d = Math.hypot(t.x - p[0], t.z - p[1]); if (d < bd) { bd = d; best = t } })
    return best
  }
  const commit = (): void => { st.frames[fi] = snap(st); onChange(st) }

  let moved = false
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
    if (tool === "move") { const t = nearest(p); moved = false; if (t) remember(); else if (sel) { sel = null; drawZones() } drag = t ? { k: "tok", t } : { k: "orbit", x: e.clientX, y: e.clientY, az: goal.az, el: goal.el }; return }
    if (tool === "erase") {
      const hit = st.marks.findIndex((m) => m.pts.some(([x, z]) => Math.hypot(x - p[0], z - p[1]) < PICK_R * courtK(st.mode, dimsOf(st))))
      const eq = st.tokens.find((t) => t.kind === "eq" && Math.hypot(t.x - p[0], t.z - p[1]) < PICK_R * courtK(st.mode, dimsOf(st)))
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
    if (drag.k === "tok") { moved = true; const M = M0(); drag.t.x = Math.max(-M.L / HALF - 4, Math.min(M.L / HALF + 4, p[0])); drag.t.z = Math.max(-M.W / HALF - 4, Math.min(M.W / HALF + 4, p[1])); const ob = objs.get(drag.t.id); if (ob) { ob.to.set(drag.t.x, 0, drag.t.z); ob.o.position.copy(ob.to) }; return }
    const last = drag.m.pts[drag.m.pts.length - 1]
    if (drag.m.kind === "zone" || drag.m.kind === "pass") drag.m.pts = [drag.m.pts[0], p]
    else if (Math.hypot(p[0] - last[0], p[1] - last[1]) > MIN_STEP) drag.m.pts.push(p)
    marks.remove(drag.o); drag.o = markObj(drag.m); drag.o.name = drag.m.id; marks.add(drag.o)
  }
  const up = (): void => {
    if (drag?.k === "tok") { if (!moved) { hist.pop(); sel = drag.t.id; drawZones() } else { commit(); if (sel === drag.t.id) drawZones() } }
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
    select: (id) => { sel = id; drawZones(); wake() },
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
    png: (names = true) => { showNames(names && namesOn); cam.lookAt(view.tx, 0, view.tz); rn.render(sc, cam); const u = rn.domElement.toDataURL("image/png"); showNames(namesOn); rn.render(sc, cam); return u },
    setNames: (on) => { namesOn = on; showNames(on); wake() },
    exportNames: (on) => { showNames(on && namesOn); wake() },
    setQuality: (nq) => { q = nq; applyQ(); build(); frame(fi, false); wake() },
    dispose: () => { cancelAnimationFrame(raf); ro.disconnect(); rn.dispose() },
  }
}
