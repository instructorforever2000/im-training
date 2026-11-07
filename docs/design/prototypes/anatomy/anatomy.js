// IM Training anatomy figure — loads the CC0 MakeHuman-based body (figure.json), poses it, and paints target muscles.
// Pose = world rotations per bone (degrees) or aim directions; unspecified bones follow their parent.
import * as THREE from "three"

const DEG = Math.PI / 180
const dec = (s, T) => { const b = Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); return new T(b.buffer) }
export const PAINT = { skin: [0.72, 0.725, 0.735], red: [0.86, 0.19, 0.15], blue: [0.27, 0.47, 0.82], shorts: [0.1, 0.105, 0.115], hair: [0.12, 0.12, 0.13] }
const ARM = /^(upperarm|lowerarm|wrist|finger|metacarpal)/

export async function loadFigureData(url) { return (await fetch(url)).json() }

/** Builds a posable figure. hi: { muscleKey(without side): "red" | "blue" }. ghost: white outline-only arms. */
export function createFigure(d, { hi = {}, ghost = false } = {}) {
  const bones = d.bones.map((b) => Object.assign(new THREE.Bone(), { name: b.name }))
  const by = Object.fromEntries(bones.map((b, i) => [b.name, i]))
  d.bones.forEach((b, i) => { const p = b.parent ? d.bones[by[b.parent]].head : [0, 0, 0]; bones[i].position.set(b.head[0] - p[0], b.head[1] - p[1], b.head[2] - p[2]); if (b.parent) bones[by[b.parent]].add(bones[i]) })
  const skeleton = new THREE.Skeleton(bones)
  const P = d.parts.body, n = P.n
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(dec(P.pos, Float32Array), 3))
  g.setIndex(new THREE.BufferAttribute(dec(P.idx, Uint32Array), 1))
  const si = dec(P.si, Uint16Array), sw = dec(P.sw, Float32Array)
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4))
  g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4))
  g.setAttribute("fib", new THREE.BufferAttribute(dec(P.fib, Float32Array), 1))
  relaxToes(d, g)
  g.computeVertexNormals()
  // outline thickness per vertex: off over the toes (the gaps between toes would otherwise fill with outline)
  g.setAttribute("olw", new THREE.BufferAttribute(toeOutline(d, g), 1))
  // paint: skin, shorts, hair, then highlighted muscles (red primary / blue secondary)
  const col = new Float32Array(n * 3), hl = new Float32Array(n), edgeA = new Float32Array(n)
  for (let i = 0; i < n; i++) col.set(PAINT.skin, i * 3)
  const mix = (i, c, a) => { for (let k = 0; k < 3; k++) col[i * 3 + k] = col[i * 3 + k] * (1 - a) + c[k] * a }
  dec(P.shorts, Uint8Array).forEach((w, i) => { if (w) mix(i, PAINT.shorts, w / 255) })
  dec(P.hair, Uint32Array).forEach((i) => mix(i, PAINT.hair, 1))
  const anchors = {}
  for (const [key, [ids, ws]] of Object.entries(d.masks)) {
    const base = key.slice(0, -1), tone = hi[base]
    if (!tone) continue
    const I = dec(ids, Uint32Array), W = dec(ws, Uint8Array)
    let bestW = -1
    I.forEach((i, q) => { const a = W[q] / 255; mix(i, PAINT[tone], a); hl[i] = Math.max(hl[i], a); edgeA[i] = Math.max(edgeA[i], Math.exp(-(((a - 0.5) / 0.17) ** 2))); if (W[q] > bestW) { bestW = W[q]; anchors[key] = i } })
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3))
  g.setAttribute("hl", new THREE.BufferAttribute(hl, 1))
  g.setAttribute("edge", new THREE.BufferAttribute(edgeA, 1))
  if (ghost) {
    const arm = new Float32Array(n)
    for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) if (ARM.test(d.bones[si[i * 4 + k]].name)) arm[i] += sw[i * 4 + k]
    g.setAttribute("arm", new THREE.BufferAttribute(arm, 1))
  }
  const mesh = new THREE.SkinnedMesh(g, ghost ? ghostMat() : skinMat())
  mesh.add(bones[0]); mesh.bind(skeleton)
  mesh.castShadow = !ghost; mesh.receiveShadow = !ghost; mesh.frustumCulled = false
  const edge = new THREE.SkinnedMesh(g, outlineMat(ghost ? 0x5f666f : 0x2a2f36, ghost ? 0.0042 : 0.0026, ghost))
  edge.bind(skeleton); edge.frustumCulled = false
  const root = new THREE.Group(); root.add(mesh, edge)
  if (ghost) { mesh.renderOrder = 3; edge.renderOrder = 2 }
  const rest = Object.fromEntries(d.bones.map((b) => [b.name, new THREE.Vector3(...b.tail).sub(new THREE.Vector3(...b.head)).normalize()]))
  const bone = (name) => bones[by[name]]
  return { root, mesh, bones, bone, anchors, rest, data: d, pose: (spec) => applyPose(bones, d, rest, spec) }
}

/** spec: { boneName: { aim:[x,y,z], roll:deg } | { rot:[x,y,z] (world euler deg) } | { curl: deg } }.
 *  World orientation of every bone = its spec, or its parent's world orientation. */
function applyPose(bones, d, rest, spec) {
  const world = {}
  d.bones.forEach((b, i) => {
    const s = spec[b.name], parentQ = b.parent ? world[b.parent] : new THREE.Quaternion()
    let q = parentQ.clone()
    if (s?.rot) q = new THREE.Quaternion().setFromEuler(new THREE.Euler(s.rot[0] * DEG, s.rot[1] * DEG, s.rot[2] * DEG, "YXZ"))
    if (s?.aim) {
      const r = rest[b.name], t = new THREE.Vector3(...s.aim).normalize()
      q = new THREE.Quaternion().setFromUnitVectors(r, t)
      if (s.roll) q.premultiply(new THREE.Quaternion().setFromAxisAngle(t, s.roll * DEG))
    }
    if (s?.curl !== undefined) q = parentQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.curl * DEG))
    world[b.name] = q
    bones[i].quaternion.copy(parentQ.clone().invert().multiply(q))
  })
}

function skinMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.0 })
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute float fib; attribute float hl; attribute float edge; varying float vFib; varying float vHl; varying float vEdge;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvFib = fib; vHl = hl; vEdge = edge;")
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vFib; varying float vHl; varying float vEdge;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float f = 0.5 + 0.5 * sin(vFib * 760.0);
        float f2 = 0.5 + 0.5 * sin(vFib * 2300.0 + 1.7);
        diffuseColor.rgb *= mix(1.0, 0.8 + 0.22 * f + 0.08 * f2, smoothstep(0.15, 0.6, vHl));
        diffuseColor.rgb *= 1.0 - 0.38 * smoothstep(0.35, 0.95, vEdge);`)
  }
  return m
}
function outlineMat(color, push, ghost) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: ghost, opacity: ghost ? 0.9 : 1, depthWrite: !ghost })
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute float olw;" + (ghost ? "attribute float arm; varying float vArm;" : ""))
      .replace("#include <skinning_vertex>", `#include <skinning_vertex>\n transformed += normalize(objectNormal) * ${push.toFixed(4)} * olw;` + (ghost ? "\nvArm = arm;" : ""))
    if (ghost) s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vArm;").replace("void main() {", "void main() {\n if (vArm < 0.55) discard;")
  }
  return m
}
function ghostMat() {
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false })
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nattribute float arm; varying float vArm;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvArm = arm;")
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vArm;").replace("void main() {", "void main() {\n if (vArm < 0.55) discard;")
  }
  return m
}

/** 1 everywhere, fading to 0 over the toes (in front of the ball of each foot, near the floor). */
function toeOutline(d, g) {
  const pos = g.getAttribute("position"), out = new Float32Array(pos.count).fill(1)
  const ankles = ["L", "R"].map((s) => d.bones.find((b) => b.name === "foot." + s).head)
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    if (y > 0.06) continue
    const a = Math.abs(x - ankles[0][0]) < Math.abs(x - ankles[1][0]) ? ankles[0] : ankles[1]
    out[i] = 1 - sstep(a[2] + 0.115, a[2] + 0.135, z) * sstep(0.045, 0.03, y)
  }
  return out
}

/** Natural toes: the source mesh has deep slits and folded faces between the toes. Relax the toe region
 *  (Taubin smoothing — keeps volume) and close the slits a little, so the foot reads clean at any zoom. */
function relaxToes(d, g) {
  const pos = g.getAttribute("position"), P = pos.array, n = pos.count, I = g.getIndex().array
  const ankles = ["L", "R"].map((s) => d.bones.find((b) => b.name === "foot." + s).head)
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  const w = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]
    if (y > 0.06) continue
    const a = Math.abs(x - ankles[0][0]) < Math.abs(x - ankles[1][0]) ? ankles[0] : ankles[1]
    w[i] = sstep(a[2] + 0.085, a[2] + 0.115, z) * sstep(0.055, 0.04, y)
  }
  const nb = new Map()
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
    const p = I[t + e], q = I[t + (e + 1) % 3]
    if (!w[p] && !w[q]) continue
    for (const [u, v] of [[p, q], [q, p]]) { if (!nb.has(u)) nb.set(u, new Set()); nb.get(u).add(v) }
  }
  const floor = new Float32Array(n); for (let i = 0; i < n; i++) floor[i] = P[i * 3 + 1]
  for (let it = 0; it < 30; it++) for (const lam of [0.6, -0.62]) {
    const nx = []
    for (const [i, set] of nb) {
      if (!w[i]) continue
      let sx = 0, sy = 0, sz = 0
      for (const j of set) { sx += P[j * 3]; sy += P[j * 3 + 1]; sz += P[j * 3 + 2] }
      const c = set.size, k = lam * w[i]
      nx.push(i, P[i * 3] + (sx / c - P[i * 3]) * k, P[i * 3 + 1] + (sy / c - P[i * 3 + 1]) * k, P[i * 3 + 2] + (sz / c - P[i * 3 + 2]) * k)
    }
    for (let q = 0; q < nx.length; q += 4) { const i = nx[q]; P[i * 3] = nx[q + 1]; P[i * 3 + 1] = Math.max(Math.min(floor[i], 0.005), nx[q + 2]); P[i * 3 + 2] = nx[q + 3] }
  }
}
