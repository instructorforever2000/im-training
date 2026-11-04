/* eslint-disable ts-patterns/no-magic-numbers, ts-patterns/no-loop-statements, ts-patterns/no-switch-statement, ts-patterns/no-nested-ternary, ts-patterns/no-param-reassign -- imperative rendering code: per-pixel canvas loops, three.js scene-graph mutation, real field dimensions (FIFA/FIBA/IHF/FIVB) and equipment sizes in metres */
// Turns a drill Spec into a lit three.js scene: real field surface + markings, equipment, posed athletes, movement arrows.
import * as THREE from "three"
import { buildAthlete, worldOf, type Kit, type Pose } from "./athlete"
import POSES from "./poses.json"
import type { Area, Arrow, BallKind, Player, Prop, Spec, Team, Venue } from "./spec"

const POSE = POSES as unknown as Record<string, Pose>
const D2R = Math.PI / 180

/* ------------------------------------------------------------------ colours */
export const PAL = {
  royal: 0x1f2e7a, teal: 0x1fb5a8, navy: 0x042142, orange: 0xe4572e, yellow: 0xf2c14e, green: 0x2e9e5b,
  white: 0xf4f6f8, black: 0x15181d, cone: 0xf28c28, disc: 0xf2c14e, steel: 0xb9c2cc, rubber: 0x2a2f36,
}
const SKINS = [0xc68e64, 0x8d5a3b, 0xe0b48f, 0xa8744f, 0x6f4630]
const HAIRS = [0x15110e, 0x2b1d14, 0x0e0c0b]
function kitOf(team: Team, i: number): Kit {
  const skin = SKINS[i % SKINS.length], hair = HAIRS[i % HAIRS.length]
  switch (team) {
    case "a": return { shirt: PAL.royal, shorts: PAL.white, socks: PAL.royal, skin, hair, shoes: PAL.black }
    case "b": return { shirt: PAL.orange, shorts: PAL.black, socks: PAL.orange, skin, hair, shoes: PAL.black }
    case "n": return { shirt: PAL.yellow, shorts: PAL.navy, socks: PAL.yellow, skin, hair, shoes: PAL.black }
    case "gk": return { shirt: PAL.green, shorts: PAL.black, socks: PAL.green, skin, hair, shoes: PAL.black }
    case "gkb": return { shirt: 0x7a3fb5, shorts: PAL.black, socks: 0x7a3fb5, skin, hair, shoes: PAL.black }
    case "coach": return { shirt: PAL.navy, shorts: PAL.navy, socks: PAL.navy, skin, hair, shoes: PAL.white }
    default: return { shirt: PAL.teal, shorts: PAL.navy, socks: PAL.white, skin, hair, shoes: 0x30343b }
  }
}

/* ------------------------------------------------------------------ venues */
interface VenueDef { L: number; W: number; kind: "grass" | "floor" | "wood" | "rubber"; margin: number }
export const VENUES: Record<Venue, VenueDef> = {
  football: { L: 105, W: 68, kind: "grass", margin: 6 },
  futsal: { L: 40, W: 20, kind: "floor", margin: 4 },
  basketball: { L: 28, W: 15, kind: "wood", margin: 4 },
  handball: { L: 40, W: 20, kind: "floor", margin: 4 },
  volleyball: { L: 18, W: 9, kind: "wood", margin: 5 },
  hall: { L: 24, W: 14, kind: "wood", margin: 3 },
  gym: { L: 14, W: 10, kind: "rubber", margin: 1 },
}

function rnd(seed: number): () => number { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }

const texCache = new Map<string, THREE.CanvasTexture>()
function surfaceTexture(v: Venue, maxAniso: number): THREE.CanvasTexture {
  const hit = texCache.get(v)
  if (hit) return hit
  const S = VENUES[v], ppm = S.kind === "grass" ? 16 : S.kind === "rubber" ? 48 : 40
  const cw = Math.round((S.L + S.margin * 2) * ppm), ch = Math.round((S.W + S.margin * 2) * ppm)
  const c = document.createElement("canvas"); c.width = cw; c.height = ch
  const g = c.getContext("2d") as CanvasRenderingContext2D, r = rnd(11)
  const M = (x: number): number => x * ppm, ox = M(S.margin), oy = M(S.margin)
  if (S.kind === "grass") {
    const a = [50, 124, 60], b = [62, 142, 70], N = 18
    for (let i = 0; i < N; i++) { g.fillStyle = `rgb(${i % 2 ? b : a})`; g.fillRect(ox + (i * M(S.L)) / N, 0, M(S.L) / N + 1, ch) }
    g.fillStyle = "rgb(44,108,54)"; g.fillRect(0, 0, cw, oy); g.fillRect(0, ch - oy, cw, oy); g.fillRect(0, 0, ox, ch); g.fillRect(cw - ox, 0, ox, ch)
    const im = g.getImageData(0, 0, cw, ch), d = im.data
    for (let y = 0; y < ch; y++) { let streak = 0; for (let x = 0; x < cw; x++) { if (x % 3 === 0) streak = (r() - 0.5) * 18; const n0 = (r() - 0.5) * 22 + streak, p = (y * cw + x) * 4; d[p] += n0 * 0.5; d[p + 1] += n0; d[p + 2] += n0 * 0.4 } }
    g.putImageData(im, 0, 0)
  } else if (S.kind === "rubber") {
    g.fillStyle = "#2b3036"; g.fillRect(0, 0, cw, ch)
    const im = g.getImageData(0, 0, cw, ch), d = im.data
    for (let i = 0; i < d.length; i += 4) { const n0 = (r() - 0.5) * 16; d[i] += n0; d[i + 1] += n0; d[i + 2] += n0 }
    g.putImageData(im, 0, 0)
    g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 2
    for (let x = 0; x < cw; x += M(1)) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke() }
    for (let y = 0; y < ch; y += M(1)) { g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke() }
    g.fillStyle = "rgba(31,181,168,.55)"; g.fillRect(M(S.margin + 4), 0, M(0.08), ch)
  } else {
    const base = S.kind === "wood" ? [214, 164, 106] : v === "futsal" ? [40, 104, 150] : [52, 112, 160]
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, cw, ch)
    const pw = M(0.12), pl = M(2.4)
    for (let y = 0; y < ch; y += pw) { let x = -r() * pl; while (x < cw) { const t = (r() - 0.5) * (S.kind === "wood" ? 24 : 9); g.fillStyle = `rgb(${base.map((q) => q + t)})`; g.fillRect(x, y, pl, pw); g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(x, y, 1.2, pw); x += pl } }
    if (S.kind === "floor") { g.fillStyle = "rgba(14,40,60,.5)"; g.fillRect(0, 0, cw, oy); g.fillRect(0, ch - oy, cw, oy); g.fillRect(0, 0, ox, ch); g.fillRect(cw - ox, 0, ox, ch) }
    if (v === "basketball") { g.fillStyle = "rgba(31,46,122,.55)"; [0, 1].forEach((e) => { const x0 = e ? ox + M(S.L) - M(5.8) : ox; g.fillRect(x0, oy + M(S.W / 2 - 2.45), M(5.8), M(4.9)) }) }
    if (v === "handball" || v === "futsal") {
      g.fillStyle = "rgba(31,181,168,.42)"
      ;[0, 1].forEach((e) => { const x0 = e ? ox + M(S.L) : ox, rr = M(6), cy = oy + M(S.W / 2); g.beginPath(); g.moveTo(x0, cy - M(1.5) - rr); g.arc(x0, cy - M(1.5), rr, -Math.PI / 2, 0, !!e); g.lineTo(x0 + (e ? -rr : rr), cy + M(1.5)); g.arc(x0, cy + M(1.5), rr, 0, Math.PI / 2, !!e); g.closePath(); g.fill() })
    }
    if (v === "volleyball") { g.fillStyle = "rgba(31,46,122,.5)"; g.fillRect(ox, oy, M(S.L), M(S.W)); g.fillStyle = "rgba(228,87,46,.55)"; g.fillRect(ox + M(S.L / 2 - 3), oy, M(6), M(S.W)) }
  }
  // official lines
  g.strokeStyle = "rgba(255,255,255,.94)"; g.lineWidth = Math.max(2, M(S.kind === "grass" ? 0.12 : 0.05)); g.lineCap = "round"
  const P = (x: number, y: number): [number, number] => [ox + M(x), oy + M(y)]
  const line = (pts: [number, number][]): void => { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P(x, y); if (i) g.lineTo(a, b); else g.moveTo(a, b) }); g.stroke() }
  const arc = (x: number, y: number, rr: number, a0: number, a1: number, ccw = false): void => { const [a, b] = P(x, y); g.beginPath(); g.arc(a, b, M(rr), a0, a1, ccw); g.stroke() }
  const { L, W } = S
  if (v === "hall" || v === "gym") { texCache.set(v, finish(c, maxAniso)); return texCache.get(v) as THREE.CanvasTexture }
  line([[0, 0], [L, 0], [L, W], [0, W], [0, 0]])
  if (v !== "volleyball") line([[L / 2, 0], [L / 2, W]])
  if (v === "football") {
    arc(L / 2, W / 2, 9.15, 0, 7)
    ;[0, 1].forEach((e) => {
      const x0 = e ? L : 0, d = e ? -1 : 1
      line([[x0, W / 2 - 20.16], [x0 + d * 16.5, W / 2 - 20.16], [x0 + d * 16.5, W / 2 + 20.16], [x0, W / 2 + 20.16]])
      line([[x0, W / 2 - 9.16], [x0 + d * 5.5, W / 2 - 9.16], [x0 + d * 5.5, W / 2 + 9.16], [x0, W / 2 + 9.16]])
      const a = Math.acos(5.5 / 9.15); arc(x0 + d * 11, W / 2, 9.15, e ? Math.PI - a : -a, e ? Math.PI + a : a)
      g.fillStyle = "#fff"; const [sx, sy] = P(x0 + d * 11, W / 2); g.beginPath(); g.arc(sx, sy, M(0.22), 0, 7); g.fill()
    })
  }
  if (v === "futsal" || v === "handball") {
    arc(L / 2, W / 2, 3, 0, 7)
    ;[0, 1].forEach((e) => {
      const x0 = e ? L : 0, d = e ? -1 : 1, rr = 6
      arc(x0, W / 2 - 1.5, rr, e ? Math.PI : -Math.PI / 2, e ? Math.PI * 1.5 : 0); arc(x0, W / 2 + 1.5, rr, e ? Math.PI / 2 : 0, e ? Math.PI : Math.PI / 2)
      line([[x0 + d * rr, W / 2 - 1.5], [x0 + d * rr, W / 2 + 1.5]])
      if (v === "handball") { g.setLineDash([M(0.3), M(0.3)]); arc(x0, W / 2 - 1.5, 9, e ? Math.PI * 1.08 : -Math.PI / 2 * 0.84, e ? Math.PI * 1.5 : -0.08); arc(x0, W / 2 + 1.5, 9, e ? Math.PI / 2 : 0.08, e ? Math.PI * 0.92 : Math.PI / 2 * 0.84); line([[x0 + d * 9, W / 2 - 1.5], [x0 + d * 9, W / 2 + 1.5]]); g.setLineDash([]); line([[x0 + d * 7, W / 2 - 0.5], [x0 + d * 7, W / 2 + 0.5]]) }
    })
  }
  if (v === "basketball") {
    arc(L / 2, W / 2, 1.8, 0, 7)
    ;[0, 1].forEach((e) => {
      const x0 = e ? L : 0, d = e ? -1 : 1, hx = x0 + d * 1.575
      line([[x0, W / 2 - 2.45], [x0 + d * 5.8, W / 2 - 2.45], [x0 + d * 5.8, W / 2 + 2.45], [x0, W / 2 + 2.45]])
      arc(x0 + d * 5.8, W / 2, 1.8, e ? Math.PI / 2 : -Math.PI / 2, e ? Math.PI * 1.5 : Math.PI / 2)
      const a = Math.asin((W / 2 - 0.9) / 6.75), ex = hx + d * 6.75 * Math.cos(a)
      line([[x0, 0.9], [ex, 0.9]]); line([[x0, W - 0.9], [ex, W - 0.9]]); arc(hx, W / 2, 6.75, e ? Math.PI - a : -a, e ? Math.PI + a : a)
    })
  }
  if (v === "volleyball") { line([[L / 2 - 3, 0], [L / 2 - 3, W]]); line([[L / 2 + 3, 0], [L / 2 + 3, W]]); g.lineWidth *= 1.6; line([[L / 2, 0], [L / 2, W]]) }
  texCache.set(v, finish(c, maxAniso))
  return texCache.get(v) as THREE.CanvasTexture
}
function finish(c: HTMLCanvasElement, aniso: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t
}

/* ------------------------------------------------------------------ materials */
const matCache = new Map<string, THREE.MeshStandardMaterial>()
function mat(color: number, rough = 0.55, metal = 0.05, extra?: Partial<THREE.MeshStandardMaterialParameters>): THREE.MeshStandardMaterial {
  const k = `${color}|${rough}|${metal}|${extra ? JSON.stringify(extra) : ""}`
  let m = matCache.get(k)
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }); matCache.set(k, m) }
  return m
}
const shadow = <T extends THREE.Object3D>(o: T): T => { o.traverse((x) => { if ((x as THREE.Mesh).isMesh) { x.castShadow = true; x.receiveShadow = true } }); return o }
function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o }
const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z)
function cyl(r: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, axis: "x" | "y" | "z" = "y", r2 = r): THREE.Mesh {
  const o = mesh(new THREE.CylinderGeometry(r2, r, h, 16), m, x, y, z)
  if (axis === "x") o.rotation.z = Math.PI / 2
  if (axis === "z") o.rotation.x = Math.PI / 2
  return o
}

/* ------------------------------------------------------------------ balls */
const ballTex = new Map<BallKind, THREE.CanvasTexture>()
function ballMaterial(k: BallKind): THREE.MeshStandardMaterial {
  if (k === "med") return mat(0x3a3f47, 0.85)
  if (k === "light") return mat(0xf2c14e, 0.6)
  let t = ballTex.get(k)
  if (!t) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d") as CanvasRenderingContext2D
    if (k === "basketball") {
      g.fillStyle = "#d9661f"; g.fillRect(0, 0, 512, 256); g.strokeStyle = "#1b120c"; g.lineWidth = 6
      ;[0, 128, 256, 384].forEach((x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke() }); g.beginPath(); g.moveTo(0, 128); g.lineTo(512, 128); g.stroke()
      ;[64, 320].forEach((x) => { g.beginPath(); g.ellipse(x, 128, 50, 128, 0, 0, 7); g.stroke() })
    } else if (k === "volleyball") {
      for (let i = 0; i < 6; i++) { g.fillStyle = i % 3 === 0 ? "#1f4fa8" : i % 3 === 1 ? "#f2d34a" : "#f4f6f8"; g.fillRect(0, (i * 256) / 6, 512, 256 / 6 + 1) }
    } else if (k === "handball") {
      g.fillStyle = "#f4f6f8"; g.fillRect(0, 0, 512, 256); g.fillStyle = "#1f4fa8"; for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(32 + i * 64, 128, 22, 90, 0, 0, 7); g.fill() }
    } else {
      g.fillStyle = "#f6f7f9"; g.fillRect(0, 0, 512, 256); g.fillStyle = k === "futsal" ? "#1f2e7a" : "#15181d"
      const hex = (x: number, y: number, r: number): void => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9) } g.closePath(); g.fill() }
      for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) hex((i * 512) / 6 + (row % 2) * 42, 40 + row * 88, 24)
    }
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; ballTex.set(k, t)
  }
  return mat(0xffffff, 0.42, 0, { map: t })
}
const BALL_R: Record<BallKind, number> = { football: 0.11, futsal: 0.1, basketball: 0.12, volleyball: 0.105, handball: 0.095, med: 0.14, light: 0.1 }
export function ball(k: BallKind, x: number, z: number, y?: number): THREE.Mesh {
  const r = BALL_R[k], o = mesh(new THREE.SphereGeometry(r, 24, 16), ballMaterial(k), x, y ?? r, z)
  o.rotation.set(x * 3.1, z * 2.3, 0.4)
  return o
}

/* ------------------------------------------------------------------ equipment */
function netMaterial(): THREE.MeshStandardMaterial {
  const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d") as CanvasRenderingContext2D
  g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping
  return new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: t, map: t, transparent: true, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false })
}
function goal(w: number, h: number, depth: number, color = PAL.white): THREE.Group {
  const gg = new THREE.Group(), m = mat(color, 0.3, 0.1), r = w > 5 ? 0.06 : 0.04
  gg.add(cyl(r, h, m, 0, h / 2, -w / 2), cyl(r, h, m, 0, h / 2, w / 2), cyl(r, w + r * 2, m, 0, h, 0, "z"))
  gg.add(cyl(r * 0.6, w, m, -depth, 0.02, 0, "z"), cyl(r * 0.6, Math.hypot(h, depth), m, -depth / 2, h / 2, -w / 2), cyl(r * 0.6, Math.hypot(h, depth), m, -depth / 2, h / 2, w / 2))
  ;(gg.children.at(-1) as THREE.Mesh).rotation.z = Math.atan2(depth, h); (gg.children.at(-2) as THREE.Mesh).rotation.z = Math.atan2(depth, h)
  const nm = netMaterial(); const nmap = nm.map as THREE.Texture; nmap.repeat.set(w * 6, h * 6)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(h, depth), w), nm); back.rotation.set(0, Math.PI / 2, 0); back.rotation.order = "YXZ"; back.rotation.x = 0
  back.rotation.set(Math.PI / 2 - Math.atan2(depth, h), Math.PI / 2, 0, "YXZ"); back.position.set(-depth / 2, h / 2, 0); gg.add(back)
  ;[-1, 1].forEach((s) => { const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, h), new THREE.Vector2(-depth, 0)]); const side = new THREE.Mesh(new THREE.ShapeGeometry(sh), nm); side.position.z = (s * w) / 2; gg.add(side) })
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.01, w), nm); top.position.set(0, h, 0); gg.add(top)
  return gg
}
function hoop(): THREE.Group {
  const g = new THREE.Group(), dark = mat(0x22303f, 0.5, 0.3)
  g.add(box(0.3, 3.4, 0.3, dark, -1.4, 1.7, 0), box(1.3, 0.16, 0.16, dark, -0.75, 3.3, 0))
  const bd = box(0.04, 1.05, 1.8, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.05, transmission: 0.4 }), -0.05, 3.4, 0); g.add(bd)
  g.add(box(0.045, 0.45, 0.59, mat(0xffffff, 0.6), -0.02, 3.2, 0))
  const rim = mesh(new THREE.TorusGeometry(0.23, 0.018, 8, 32), mat(0xff6a1a, 0.4, 0.4), 0.26, 3.05, 0); rim.rotation.x = Math.PI / 2; g.add(rim)
  const net = mesh(new THREE.CylinderGeometry(0.23, 0.15, 0.42, 16, 1, true), netMaterial(), 0.26, 2.84, 0); g.add(net)
  return g
}
function vbNet(width: number): THREE.Group {
  const g = new THREE.Group(), post = mat(0xdfe6ee, 0.4, 0.3)
  ;[-1, 1].forEach((e) => g.add(cyl(0.05, 2.55, post, 0, 1.27, e * (width / 2 + 0.8))))
  const nm = netMaterial(); (nm.map as THREE.Texture).repeat.set((width + 1.6) * 10, 10)
  const net = new THREE.Mesh(new THREE.PlaneGeometry(width + 1.6, 1), nm); net.rotation.y = Math.PI / 2; net.position.y = 1.93; g.add(net)
  g.add(box(0.03, 0.07, width + 1.6, mat(0xffffff), 0, 2.43, 0), box(0.03, 0.05, width + 1.6, mat(0xffffff), 0, 1.44, 0))
  ;[-1, 1].forEach((e) => g.add(cyl(0.01, 1.8, mat(0xe4572e), 0, 2.5, (e * width) / 2)))
  return g
}

function propObject(p: Prop): THREE.Object3D {
  const col = p.color
  switch (p.kind) {
    case "cone": return shadow(cyl(0.11, 0.3, mat(col ?? PAL.cone, 0.6), 0, 0.15, 0, "y", 0.015))
    case "disc": { const o = mesh(new THREE.CylinderGeometry(0.025, 0.1, 0.05, 18), mat(col ?? PAL.disc, 0.6), 0, 0.025, 0); return o }
    case "pole": { const g = new THREE.Group(); g.add(cyl(0.016, 1.6, mat(col ?? PAL.yellow, 0.5), 0, 0.8, 0), cyl(0.12, 0.05, mat(0x22262c), 0, 0.025, 0)); return g }
    case "hurdle": { const g = new THREE.Group(), m = mat(col ?? PAL.orange, 0.5); g.add(box(0.6, 0.04, 0.04, m, 0, 0.3, 0), box(0.04, 0.3, 0.04, m, -0.3, 0.15, 0), box(0.04, 0.3, 0.04, m, 0.3, 0.15, 0)); return g }
    case "ladder": { const g = new THREE.Group(), n = Math.round((p.size ?? 4) / 0.45), m = mat(PAL.yellow, 0.6); g.add(box(0.03, 0.01, n * 0.45, m, -0.25, 0.006, 0), box(0.03, 0.01, n * 0.45, m, 0.25, 0.006, 0)); for (let i = 0; i <= n; i++) g.add(box(0.5, 0.012, 0.03, m, 0, 0.007, -(n * 0.45) / 2 + i * 0.45)); return g }
    case "miniGoal": { const g = goal(p.size ?? 1.5, 1, 0.6, col ?? 0xe8ecef); return g }
    case "goal": { const s = p.size ?? 7.32; return goal(s, s > 5 ? 2.44 : 2, s > 5 ? 2 : 1, s > 5 ? PAL.white : col ?? 0xe4572e) }
    case "mannequin": { const g = new THREE.Group(), m = mat(0x30363e, 0.6); g.add(cyl(0.18, 1.3, m, 0, 0.85, 0, "y", 0.14), mesh(new THREE.SphereGeometry(0.12, 16, 12), m, 0, 1.62, 0), cyl(0.04, 0.3, mat(0x777), 0, 0.15, 0), cyl(0.28, 0.04, m, 0, 0.02, 0)); return shadow(g) }
    case "ball": return ball(p.ball ?? "football", 0, 0, p.y)
    case "hoop": { const o = mesh(new THREE.TorusGeometry(0.4, 0.018, 8, 40), mat(col ?? PAL.teal, 0.5), 0, 0.02, 0); o.rotation.x = Math.PI / 2; return o }
    case "rope": { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3, 0.9, 0), new THREE.Vector3(-0.42, 0.3, 0.25), new THREE.Vector3(0, 0.02, 0.45), new THREE.Vector3(0.42, 0.3, 0.25), new THREE.Vector3(0.3, 0.9, 0)]); return mesh(new THREE.TubeGeometry(curve, 40, 0.008, 6), mat(PAL.orange)) }
    case "bench": { const g = new THREE.Group(), pad = mat(0x1d232b, 0.7), steel = mat(PAL.steel, 0.35, 0.7); g.add(box(1.25, 0.08, 0.3, pad, 0, 0.44, 0), box(0.06, 0.4, 0.26, steel, -0.5, 0.2, 0), box(0.06, 0.4, 0.26, steel, 0.5, 0.2, 0), box(1.2, 0.04, 0.06, steel, 0, 0.06, 0)); return g }
    case "box": { const s = p.size ?? 0.45; return box(0.6, s, 0.5, mat(col ?? 0x2f6db3, 0.7), 0, s / 2, 0) }
    case "barbell": return barbell(p.size ?? 2.2)
    case "dumbbell": return dumbbell()
    case "rack": { const g = new THREE.Group(), steel = mat(0x2a2f36, 0.4, 0.6); [-0.6, 0.6].forEach((x) => [-0.55, 0.55].forEach((z) => g.add(box(0.07, 2.2, 0.07, steel, x, 1.1, z)))); [-0.6, 0.6].forEach((x) => g.add(box(0.07, 0.07, 1.17, steel, x, 2.2, 0))); g.add(box(1.27, 0.07, 0.07, steel, 0, 2.2, -0.55)); return g }
    case "cable": { const g = new THREE.Group(), steel = mat(0x2a2f36, 0.4, 0.6); g.add(box(0.5, 2.3, 0.5, steel, 0, 1.15, 0), box(0.35, 0.9, 0.12, mat(0x9aa4ad, 0.3, 0.8), 0, 0.7, 0.25), cyl(0.06, 0.04, mat(PAL.teal), 0, 2.1, 0.3, "x")); return g }
    case "machine": { const g = new THREE.Group(), steel = mat(0x2a2f36, 0.4, 0.6), pad = mat(0x1d232b, 0.7); g.add(box(0.5, 0.1, 0.55, pad, 0, 0.5, 0), box(0.5, 0.75, 0.1, pad, 0, 0.95, -0.3), box(0.08, 1.4, 0.08, steel, 0.4, 0.7, -0.4), box(0.08, 1.4, 0.08, steel, -0.4, 0.7, -0.4), box(0.7, 0.08, 0.08, steel, 0, 1.4, -0.4), box(0.3, 0.6, 0.12, mat(0x9aa4ad, 0.3, 0.8), 0.6, 0.4, -0.4)); return g }
    case "bars": { const g = new THREE.Group(), steel = mat(0x2a2f36, 0.4, 0.6); g.add(box(0.07, 2.5, 0.07, steel, -0.7, 1.25, 0), box(0.07, 2.5, 0.07, steel, 0.7, 1.25, 0), cyl(0.018, 1.45, mat(PAL.steel, 0.25, 0.9), 0, p.y ?? 2.3, 0, "x")); return g }
    case "dipBars": { const g = new THREE.Group(), steel = mat(0x2a2f36, 0.4, 0.6); [-0.27, 0.27].forEach((x) => { g.add(cyl(0.02, 1.0, mat(PAL.steel, 0.25, 0.9), x, 1.2, 0, "z"), box(0.05, 1.2, 0.05, steel, x, 0.6, -0.45), box(0.05, 1.2, 0.05, steel, x, 0.6, 0.45)) }); return g }
    case "swissBall": return mesh(new THREE.SphereGeometry(0.32, 32, 20), mat(col ?? 0x2f6db3, 0.35), 0, 0.32, 0)
    case "mat": { const l = p.size ?? 1.8; return box(0.6, 0.015, l, mat(col ?? 0x2b6f74, 0.9), 0, 0.008, 0) }
    case "wall": return box(p.size ?? 4, 2.6, 0.2, mat(0xd6dde3, 0.9), 0, 1.3, 0)
    case "stick": return cyl(0.012, 1.4, mat(0xc9a36a, 0.6), 0, 0.02, 0, "x")
    case "beam": return box(3, 0.12, 0.12, mat(0xc9a36a, 0.6), 0, 0.06, 0)
    case "pad": return box(0.45, 0.06, 0.45, mat(0x2b6f74, 0.9), 0, 0.03, 0)
    case "band": return mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 30), mat(0xe4572e, 0.7), 0, 0.012, 0)
    case "board": { const g = new THREE.Group(); g.add(box(1.2, 0.8, 0.04, mat(0x101820, 0.4), 0, 1.4, 0), box(0.04, 1.0, 0.04, mat(0x444b55), 0, 0.5, 0)); return g }
  }
}
function barbell(len: number): THREE.Group {
  const g = new THREE.Group(), bar = mat(PAL.steel, 0.25, 0.9), plate = mat(0x1d232b, 0.6, 0.2), rim = mat(PAL.teal, 0.5)
  g.add(cyl(0.014, len, bar, 0, 0, 0, "x"))
  ;[-1, 1].forEach((s) => { g.add(cyl(0.225, 0.05, plate, (s * len) / 2 - s * 0.28, 0, 0, "x"), cyl(0.226, 0.012, rim, (s * len) / 2 - s * 0.25, 0, 0, "x"), cyl(0.03, 0.04, bar, (s * len) / 2 - s * 0.36, 0, 0, "x")) })
  return g
}
function dumbbell(): THREE.Group {
  const g = new THREE.Group(), steel = mat(PAL.steel, 0.3, 0.85), plate = mat(0x1d232b, 0.55, 0.2)
  g.add(cyl(0.016, 0.3, steel, 0, 0, 0, "x"), cyl(0.07, 0.08, plate, -0.12, 0, 0, "x"), cyl(0.07, 0.08, plate, 0.12, 0, 0, "x"))
  return g
}

/* ------------------------------------------------------------------ arrows */
const ARROW_COL = { pass: 0xffffff, run: 0xf2c14e, dribble: 0x1fb5a8, shot: 0xe4572e }
function arrow(a: Arrow): THREE.Group {
  const g = new THREE.Group(), [x0, z0] = a.from, [x1, z1] = a.to, dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz) || 1
  const nx = -dz / len, nz = dx / len, bend = (a.bend ?? 0) * len * 0.25, pts: THREE.Vector2[] = []
  const N = 48
  for (let i = 0; i <= N; i++) {
    const t = i / N, b = Math.sin(t * Math.PI) * bend, w = a.type === "dribble" ? Math.sin(t * Math.PI * Math.max(2, Math.round(len / 1.2)) * 2) * 0.22 * Math.min(1, t * 5, (1 - t) * 5) : 0
    pts.push(new THREE.Vector2(x0 + dx * t + nx * (b + w), z0 + dz * t + nz * (b + w)))
  }
  const width = a.type === "shot" ? 0.16 : len > 20 ? 0.16 : 0.1, m = new THREE.MeshBasicMaterial({ color: ARROW_COL[a.type], transparent: true, opacity: 0.92, depthWrite: false })
  const head = Math.min(0.9, len * 0.18) + width * 2
  let acc = 0
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[i + 1], seg = p.distanceTo(q); acc += seg
    if (acc > len - head * 0.8) break
    if (a.type === "pass" && Math.floor(acc / 0.55) % 2 === 1) continue
    const s = new THREE.Mesh(new THREE.PlaneGeometry(seg + 0.01, width), m)
    s.rotation.set(-Math.PI / 2, 0, -Math.atan2(q.y - p.y, q.x - p.x)); s.position.set((p.x + q.x) / 2, 0.035, (p.y + q.y) / 2); s.renderOrder = 2; g.add(s)
  }
  const e = pts[N], pe = pts[N - 3], ang = Math.atan2(e.y - pe.y, e.x - pe.x)
  const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-head, head * 0.45), new THREE.Vector2(-head, -head * 0.45)])
  const h = new THREE.Mesh(new THREE.ShapeGeometry(tri), m); h.rotation.set(-Math.PI / 2, 0, -ang); h.position.set(e.x, 0.036, e.y); h.renderOrder = 2; g.add(h)
  return g
}

/* ------------------------------------------------------------------ areas (cones + paint) */
function area(A: Area): THREE.Group {
  const g = new THREE.Group(), col = A.color ?? PAL.disc, x0 = A.x - A.w / 2, z0 = A.z - A.d / 2
  const step = Math.max(2.5, Math.min(A.w, A.d) / 4)
  const edge = (ax: number, az: number, bx: number, bz: number): void => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step)); for (let i = 0; i < n; i++) { const t = i / n; const d = propObject({ kind: "disc", x: 0, z: 0, color: col }); d.position.set(ax + (bx - ax) * t, d.position.y, az + (bz - az) * t); g.add(d) } }
  edge(x0, z0, x0 + A.w, z0); edge(x0 + A.w, z0, x0 + A.w, z0 + A.d); edge(x0 + A.w, z0 + A.d, x0, z0 + A.d); edge(x0, z0 + A.d, x0, z0)
  const paint = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false })
  const strip = (x: number, z: number, w: number, d: number): void => { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), paint); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.02, z); g.add(s) }
  strip(A.x, z0, A.w, 0.06); strip(A.x, z0 + A.d, A.w, 0.06); strip(x0, A.z, 0.06, A.d); strip(x0 + A.w, A.z, 0.06, A.d)
  if (A.zones && A.zones > 1) for (let i = 1; i < A.zones; i++) { const x = x0 + (A.w * i) / A.zones; strip(x, A.z, 0.06, A.d); edge(x, z0, x, z0 + A.d) }
  if (A.ends) { [x0 + A.ends, x0 + A.w - A.ends].forEach((x) => { strip(x, A.z, 0.06, A.d); edge(x, z0, x, z0 + A.d) }); const fill = new THREE.MeshBasicMaterial({ color: PAL.teal, transparent: true, opacity: 0.16, depthWrite: false }); [x0 + A.ends / 2, x0 + A.w - A.ends / 2].forEach((x) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(A.ends as number, A.d), fill); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.018, A.z); g.add(s) }) }
  return g
}

/* ------------------------------------------------------------------ athletes */
function athlete(p: Player, i: number, ballKind: BallKind, youth: number): THREE.Group {
  const holder = new THREE.Group(), team = p.team, scale = (p.scale ?? 1) * youth
  const rig = buildAthlete(kitOf(team, i), scale)
  rig.pose(POSE[p.pose] ?? POSE.stand)
  holder.add(rig.root)
  holder.rotation.y = (90 - p.face) * D2R
  holder.position.set(p.x, 0, p.z)
  holder.updateMatrixWorld(true)
  const local = (v: THREE.Vector3): THREE.Vector3 => holder.worldToLocal(v.clone())
  const hL = local(worldOf(rig.handL)), hR = local(worldOf(rig.handR)), mid = hL.clone().add(hR).multiplyScalar(0.5)
  const across = hL.clone().sub(hR); across.y = 0
  const yaw = Math.atan2(-across.z, across.x)
  if (p.hold === "barbell" || p.hold === "stick") {
    const b = p.hold === "barbell" ? barbell(2.0) : cyl(0.012, 1.5, mat(0xc9a36a, 0.6), 0, 0, 0, "x")
    b.position.copy(mid); b.rotation.y = yaw; holder.add(b)
  } else if (p.hold === "dumbbells" || p.hold === "dumbbell") {
    ;(p.hold === "dumbbells" ? [hL, hR] : [hR]).forEach((h) => { const d = dumbbell(); d.position.copy(h); d.rotation.y = yaw; holder.add(d) })
  } else if (p.hold === "med") {
    const mb = ball("med", 0, 0); mb.position.copy(mid).add(new THREE.Vector3(0, 0, 0.08)); holder.add(mb)
  } else if (p.hold === "cable") {
    const hd = box(0.3, 0.03, 0.03, mat(PAL.steel, 0.3, 0.8)); hd.position.copy(mid); hd.rotation.y = yaw; holder.add(hd)
  }
  if (p.ball === "hands") { const b = ball(ballKind, 0, 0); b.position.copy(mid).add(new THREE.Vector3(0, 0.02, 0.1)); holder.add(b) }
  if (p.ball === "hand") { const b = ball(ballKind, 0, 0); b.position.copy(hR).add(new THREE.Vector3(0, ballKind === "basketball" ? -0.12 : 0.1, 0.05)); if (ballKind === "basketball" && b.position.y > 0.6) b.position.y = Math.max(BALL_R.basketball, b.position.y - 0.45); holder.add(b) }
  if (p.ball === "feet") { const f = local(worldOf(rig.footR)); const b = ball(ballKind, 0, 0); b.position.set(f.x - 0.05, BALL_R[ballKind], f.z + 0.3); holder.add(b) }
  return holder
}

/* ------------------------------------------------------------------ the scene */
export interface Built { readonly root: THREE.Group; readonly focus: Spec["focus"]; readonly close: boolean; readonly target: THREE.Vector3; readonly radius: number }

export function buildScene(s: Spec, maxAniso: number, youth = 1): Built {
  const root = new THREE.Group(), V = VENUES[s.venue]
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(V.L + V.margin * 2, V.W + V.margin * 2), new THREE.MeshStandardMaterial({ map: surfaceTexture(s.venue, maxAniso), roughness: V.kind === "grass" ? 0.95 : V.kind === "rubber" ? 0.9 : 0.36, metalness: 0 }))
  surf.rotation.x = -Math.PI / 2; surf.receiveShadow = true; root.add(surf)
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(V.L * 4 + 60, V.W * 4 + 60), mat(V.kind === "grass" ? 0x3b6b45 : 0xc9d2d9, 1)); apron.rotation.x = -Math.PI / 2; apron.position.y = -0.02; apron.receiveShadow = true; root.add(apron)
  if (s.venue === "gym" || s.venue === "hall") {
    const wm = mat(s.venue === "gym" ? 0x39414b : 0xe3e8ec, 0.9)
    root.add(box(V.L + V.margin * 2, 4, 0.2, wm, 0, 2, -V.W / 2 - V.margin), box(0.2, 4, V.W + V.margin * 2, wm, -V.L / 2 - V.margin, 2, 0))
    if (s.venue === "gym") root.add(box(V.L + V.margin * 2, 0.08, 0.05, mat(PAL.teal), 0, 1.2, -V.W / 2 - V.margin + 0.12))
  }
  // fixed sport equipment
  if (s.venue === "football") { const g1 = goal(7.32, 2.44, 2); g1.position.x = -V.L / 2; root.add(g1); const g2 = goal(7.32, 2.44, 2); g2.rotation.y = Math.PI; g2.position.x = V.L / 2; root.add(g2) }
  if (s.venue === "futsal" || s.venue === "handball") { const c = s.venue === "handball" ? 0xe4572e : 0xf4f6f8; const g1 = goal(3, 2, 1, c); g1.position.x = -V.L / 2; const g2 = goal(3, 2, 1, c); g2.rotation.y = Math.PI; g2.position.x = V.L / 2; root.add(g1, g2) }
  if (s.venue === "basketball") { const h1 = hoop(); h1.position.x = -V.L / 2 + 1.4 - 0.25; const h2 = hoop(); h2.rotation.y = Math.PI; h2.position.x = V.L / 2 - 1.4 + 0.25; root.add(shadow(h1), shadow(h2)) }
  if (s.venue === "volleyball") root.add(shadow(vbNet(V.W)))
  s.areas.forEach((a) => root.add(area(a)))
  s.props.forEach((p) => { const o = propObject(p); o.position.x += p.x; o.position.z += p.z; if (p.y != null && p.kind !== "ball" && p.kind !== "bars") o.position.y += p.y; o.rotation.y = (p.rot ?? 0) * D2R; root.add(shadow(o)) })
  s.arrows.forEach((a) => root.add(arrow(a)))
  const people = new THREE.Group(); s.players.forEach((p, i) => people.add(athlete(p, i, s.ball, youth))); root.add(people)
  const bb = new THREE.Box3().setFromObject(s.close ? people : new THREE.Group())
  const target = s.close && !bb.isEmpty() ? bb.getCenter(new THREE.Vector3()) : new THREE.Vector3(s.focus.x, 0, s.focus.z)
  const radius = s.close && !bb.isEmpty() ? bb.getSize(new THREE.Vector3()).length() / 2 : Math.hypot(s.focus.w, s.focus.d) / 2
  return { root, focus: s.focus, close: !!s.close, target, radius }
}

/** Camera that frames the drill: broadcast-style 3/4 view for fields, eye-level 3/4 for an exercise. */
export function frameCamera(cam: THREE.PerspectiveCamera, b: Built, aspect: number): void {
  cam.aspect = aspect
  if (b.close) {
    const r = Math.max(0.9, b.radius), d = (r / Math.tan((cam.fov * D2R) / 2)) * (aspect < 1 ? 1.5 : 1.12)
    const dir = new THREE.Vector3(0.62, 0.42, 0.66).normalize()
    cam.position.copy(b.target).addScaledVector(dir, d)
    cam.lookAt(b.target.x, b.target.y * 0.92, b.target.z)
  } else {
    const { w, d } = b.focus, el = 40 * D2R, az = 16 * D2R, vf = (cam.fov * D2R) / 2, hf = Math.atan(Math.tan(vf) * aspect)
    const dist = Math.max((w * 0.5) / Math.tan(hf), (d * 0.5 * Math.sin(el) + 0.9) / Math.tan(vf)) * 0.98 + 1.5
    cam.position.set(b.target.x - Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, b.target.z + Math.cos(az) * Math.cos(el) * dist)
    cam.lookAt(b.target.x, 0.4, b.target.z)
  }
  cam.near = 0.1; cam.far = 600; cam.updateProjectionMatrix()
}
