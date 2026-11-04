/* eslint-disable ts-patterns/no-magic-numbers, ts-patterns/no-param-reassign -- renderer setup: light intensities, shadow sizes and image sizes */
// One shared WebGL renderer draws every drill picture (queued, cached in memory and in the browser's IndexedDB),
// and an interactive stage lets the coach orbit the same scene.
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { buildScene, frameCamera, type Built } from "./build"
import { specFor, type DrillLike } from "./templates"

export const IMAGE_VERSION = "v1"
const THUMB = { w: 640, h: 400 }
/** players are drawn smaller for the youngest age groups */
const YOUTH = [{ upTo: 8, scale: 0.82 }, { upTo: 11, scale: 0.9 }]
function skyOf(dark: boolean, close: boolean): number {
  if (dark) return 0x07101b
  return close ? 0xe9eef2 : 0xdfe8ee
}

function lights(scene: THREE.Scene, b: Built, dark: boolean): void {
  const hemi = new THREE.HemisphereLight(0xeef5ff, 0x2a3a2e, dark ? 0.45 : 0.85)
  const sun = new THREE.DirectionalLight(0xfff6ea, dark ? 1.6 : 2.6)
  const r = Math.max(6, b.close ? 4 : Math.hypot(b.focus.w, b.focus.d) * 0.75)
  sun.position.set(b.target.x - r * 0.6, r * 1.6, b.target.z + r * 0.9)
  sun.target.position.copy(b.target)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.02
  const sc = sun.shadow.camera
  sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 0.5; sc.far = r * 6
  scene.add(hemi, sun, sun.target)
  const fill = new THREE.DirectionalLight(0xcfe2ff, dark ? 0.25 : 0.5); fill.position.set(b.target.x + r, r * 0.6, b.target.z - r); scene.add(fill)
}

function makeScene(drill: DrillLike, ctx: string | undefined, rn: THREE.WebGLRenderer, pmrem: THREE.PMREMGenerator, dark: boolean): { scene: THREE.Scene; built: Built } {
  const scene = new THREE.Scene()
  const youth = YOUTH.find((y) => drill.age <= y.upTo)?.scale ?? 1
  const built = buildScene(specFor(drill, ctx), rn.capabilities.getMaxAnisotropy(), youth)
  scene.add(built.root)
  scene.environment = envMap(pmrem)
  const sky = skyOf(dark, built.close)
  scene.background = new THREE.Color(sky)
  scene.fog = new THREE.Fog(sky, built.close ? 30 : Math.max(60, built.radius * 5), built.close ? 60 : Math.max(160, built.radius * 12))
  lights(scene, built, dark)
  return { scene, built }
}
let env: THREE.Texture | null = null
function envMap(pmrem: THREE.PMREMGenerator): THREE.Texture {
  if (!env) env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  return env
}
function setupRenderer(rn: THREE.WebGLRenderer): void {
  rn.shadowMap.enabled = true
  rn.shadowMap.type = THREE.PCFSoftShadowMap
  rn.toneMapping = THREE.ACESFilmicToneMapping
  rn.toneMappingExposure = 1.05
  rn.outputColorSpace = THREE.SRGBColorSpace
}

/* ------------------------------------------------------------------ thumbnails */
let shared: { rn: THREE.WebGLRenderer; pmrem: THREE.PMREMGenerator; cam: THREE.PerspectiveCamera } | null = null
function sharedRenderer(): NonNullable<typeof shared> {
  if (!shared) {
    const rn = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" })
    setupRenderer(rn)
    rn.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    rn.setSize(THUMB.w, THUMB.h, false)
    shared = { rn, pmrem: new THREE.PMREMGenerator(rn), cam: new THREE.PerspectiveCamera(34, THUMB.w / THUMB.h, 0.1, 600) }
  }
  return shared
}
function dispose(o: THREE.Object3D): void {
  o.traverse((x) => { const m = x as THREE.Mesh; if (m.isMesh) { m.geometry.dispose() } })
}

const mem = new Map<string, string>()
const DB = "im-library-images", STORE = "img"
function idb(): Promise<IDBDatabase | null> {
  return new Promise((res) => {
    try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => res(null) } catch { res(null) }
  })
}
async function idbGet(k: string): Promise<Blob | null> {
  const db = await idb(); if (!db) return null
  return new Promise((res) => { try { const q = db.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = () => res((q.result as Blob) ?? null); q.onerror = () => res(null) } catch { res(null) } })
}
async function idbPut(k: string, b: Blob): Promise<void> {
  const db = await idb(); if (!db) return
  try { db.transaction(STORE, "readwrite").objectStore(STORE).put(b, k) } catch { /* storage full or blocked: the picture is simply drawn again next time */ }
}

/** let the page paint and respond between two pictures */
const idle = (): Promise<void> => new Promise((r) => { if ("requestIdleCallback" in window) window.requestIdleCallback(() => r(), { timeout: 120 }); else setTimeout(r, 16) })
let busy: Promise<void> = Promise.resolve()
/** Run jobs one after another on the shared renderer. */
async function serial<T>(fn: () => Promise<T>): Promise<T> {
  const prev = busy
  let release: () => void = () => undefined
  busy = new Promise<void>((r) => { release = r })
  try { await prev; return await fn() } finally { release() }
}
/** The drill's 3D picture as an image URL (drawn once, then served from cache). */
export async function drillImage(drill: DrillLike, ctx: string | undefined, dark: boolean): Promise<string> {
  const key = `${IMAGE_VERSION}|${drill.id}|${ctx ?? ""}|${dark ? "d" : "l"}`
  const hit = mem.get(key)
  if (hit) return hit
  return serial(async () => {
    await idle()
    const again = mem.get(key); if (again) return again
    const cached = await idbGet(key)
    if (cached) { const u = URL.createObjectURL(cached); mem.set(key, u); return u }
    const { rn, pmrem, cam } = sharedRenderer()
    const { scene, built } = makeScene(drill, ctx, rn, pmrem, dark)
    frameCamera(cam, built, THUMB.w / THUMB.h)
    rn.render(scene, cam)
    const blob = await new Promise<Blob | null>((r) => rn.domElement.toBlob(r, "image/webp", 0.86))
    dispose(scene)
    if (!blob) return ""
    void idbPut(key, blob)
    const u = URL.createObjectURL(blob); mem.set(key, u); return u
  })
}

/* ------------------------------------------------------------------ interactive stage */
export function mountStage(canvas: HTMLCanvasElement, drill: DrillLike, ctx: string | undefined, dark: boolean): () => void {
  const rn = new THREE.WebGLRenderer({ canvas, antialias: true })
  setupRenderer(rn)
  rn.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  const pmrem = new THREE.PMREMGenerator(rn)
  const { scene, built } = makeScene(drill, ctx, rn, pmrem, dark)
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 600)
  const ctl = new OrbitControls(cam, canvas)
  ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * 0.48; ctl.minDistance = 1.5; ctl.maxDistance = 220
  let raf = 0, t0 = performance.now(), intro = true
  const goal = new THREE.Vector3()
  const resize = (): void => {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return
    rn.setSize(r.width, r.height, false); frameCamera(cam, built, r.width / r.height)
    goal.copy(cam.position); ctl.target.set(built.target.x, built.close ? built.target.y * 0.92 : 0.4, built.target.z)
    if (intro) cam.position.multiplyScalar(1.12)
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize()
  ctl.addEventListener("start", () => { intro = false })
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const tick = (now: number): void => {
    if (intro && !reduce) { const k = Math.min(1, (now - t0) / 1400); cam.position.lerp(goal, 0.06 + k * 0.1); if (k >= 1) intro = false }
    ctl.update(); rn.render(scene, cam); raf = requestAnimationFrame(tick)
  }
  t0 = performance.now(); raf = requestAnimationFrame(tick)
  return () => { cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); dispose(scene); pmrem.dispose(); env = null; rn.dispose() }
}
