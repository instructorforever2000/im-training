// Articulated 3D athlete — one figure that takes every drill pose (stand, run, squat, plank, lie, hang…).
// Conventions: the athlete faces +Z, its left side is +X. Pose angles are in degrees. Body sizes live in rig.json.
import * as THREE from "three"
import R from "./rig.json"

export type J3 = readonly [number, number, number]
/** A pose: joint angles + how the body sits in the world. */
export interface Pose {
  /** whole body [pitch, yaw, roll]: pitch 90 = face-down horizontal (head forward), -90 = face-up. */
  readonly root?: J3
  /** explicit pelvis height (m); when absent the lowest body point is seated on the ground. */
  readonly h?: number
  /** extra height above the ground (jumps). */
  readonly air?: number
  /** spine [flex forward, bend to the left, twist to the left] */
  readonly sp?: J3
  readonly nk?: J3
  /** shoulders [flex (forward raise), abduction (side raise), horizontal swing outward] */
  readonly shL?: J3
  readonly shR?: J3
  readonly elL?: number
  readonly elR?: number
  /** hips [flex (knee forward), abduction, outward rotation] */
  readonly hpL?: J3
  readonly hpR?: J3
  readonly knL?: number
  readonly knR?: number
  /** ankle plantar-flexion (toes down) */
  readonly anL?: number
  readonly anR?: number
}

export interface Kit { readonly shirt: number; readonly shorts: number; readonly socks: number; readonly skin: number; readonly hair: number; readonly shoes: number }

type V3 = readonly number[]
interface Limb { readonly a: THREE.Group; readonly b: THREE.Group; readonly c?: THREE.Group; readonly end: THREE.Object3D }
export interface Rig {
  readonly root: THREE.Group
  readonly handL: THREE.Object3D
  readonly handR: THREE.Object3D
  readonly footL: THREE.Object3D
  readonly footR: THREE.Object3D
  readonly head: THREE.Object3D
  readonly chest: THREE.Object3D
  readonly back: THREE.Object3D
  /** Pose the body and seat it on the ground (or at pose.h). */
  readonly pose: (p: Pose) => void
}

const DEG = R.deg
const HALF = R.half
const ZERO: J3 = [0, 0, 0]
const std = (color: number, roughness: number): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness, metalness: R.rough.metal })
const at = (o: THREE.Object3D, p: V3): THREE.Object3D => { o.position.set(p[0], p[1], p[2]); return o }
const scaled = (o: THREE.Object3D, s: V3): THREE.Object3D => { o.scale.set(s[0], s[1], s[2]); return o }

function cap(r: number, len: number, m: THREE.Material, down: boolean): THREE.Mesh {
  const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, R.capSeg[0], R.capSeg[1]), m)
  const off = len / HALF + r * R.capInset
  x.position.y = down ? -off : off
  x.castShadow = true
  x.receiveShadow = true
  return x
}
function sphere(r: number, seg: V3, m: THREE.Material): THREE.Mesh {
  const x = new THREE.Mesh(new THREE.SphereGeometry(r, seg[0], seg[1]), m)
  x.castShadow = true
  return x
}
function joint(parent: THREE.Object3D, p: V3): THREE.Group {
  const g = new THREE.Group()
  g.rotation.order = "YXZ"
  at(g, p)
  parent.add(g)
  return g
}

export function buildAthlete(kit: Kit, scale: number): Rig {
  const m = {
    shirt: std(kit.shirt, R.rough.shirt), shorts: std(kit.shorts, R.rough.shorts), skin: std(kit.skin, R.rough.skin),
    socks: std(kit.socks, R.rough.socks), shoe: std(kit.shoes, R.rough.shoe), hair: std(kit.hair, R.rough.hair),
  }
  const root = new THREE.Group()
  root.rotation.order = "YXZ"
  const body = new THREE.Group()
  body.scale.setScalar(scale)
  root.add(body)

  const pelvis = joint(body, ZERO)
  pelvis.add(scaled(sphere(R.pelvis.r, R.pelvis.seg, m.shorts), R.pelvis.scale))
  const spine = joint(pelvis, [0, R.spineY, 0])
  spine.add(scaled(cap(R.torso.r, R.torso.len, m.shirt, false), R.torso.scale))
  const chest = at(new THREE.Object3D(), R.chest); spine.add(chest)
  const back = at(new THREE.Object3D(), R.back); spine.add(back)
  const neck = joint(spine, [0, R.neck.y, 0])
  neck.add(cap(R.neck.r, R.neck.len, m.skin, false))
  neck.add(scaled(at(sphere(R.head.r, R.head.seg, m.skin), [0, R.head.y, 0]), R.head.scale))
  const hair = new THREE.Mesh(new THREE.SphereGeometry(R.hair.r, R.hair.seg[0], R.hair.seg[1], 0, Math.PI * HALF, 0, Math.PI * R.hair.cut), m.hair)
  neck.add(scaled(at(hair, R.hair.pos), R.hair.scale))
  const head = at(new THREE.Object3D(), [0, R.head.anchorY, 0]); neck.add(head)

  const arm = (side: number): Limb => {
    const a = joint(spine, [side * R.shoulder.x, R.shoulder.y, 0])
    a.add(sphere(R.shoulder.delt, R.shoulder.deltSeg, m.shirt))
    a.add(cap(R.upperArm.r, R.upperArm.len, m.shirt, true))
    const b = joint(a, [0, R.elbowY, 0])
    b.add(cap(R.forearm.r, R.forearm.len, m.skin, true))
    b.add(scaled(at(sphere(R.hand.r, R.hand.seg, m.skin), [0, R.hand.y, 0]), R.hand.scale))
    const end = at(new THREE.Object3D(), [0, R.hand.anchorY, 0]); b.add(end)
    return { a, b, end }
  }
  const leg = (side: number): Limb => {
    const a = joint(pelvis, [side * R.hip.x, R.hip.y, 0])
    const short = cap(R.shortLeg.r, R.shortLeg.len, m.shorts, true)
    short.scale.y = R.shortLeg.scaleY
    a.add(short, cap(R.thigh.r, R.thigh.len, m.skin, true))
    const b = joint(a, [0, R.kneeY, 0])
    b.add(cap(R.shank.r, R.shank.len, m.socks, true))
    const c = joint(b, [0, R.ankleY, 0])
    const s = R.shoe.size
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(s[0], s[1], s[2]), m.shoe)
    shoe.castShadow = true
    c.add(at(shoe, R.shoe.pos))
    const end = at(new THREE.Object3D(), R.footAnchor); c.add(end)
    return { a, b, c, end }
  }
  const aL = arm(1), aR = arm(-1), lL = leg(1), lR = leg(-1)

  const pose = (p: Pose): void => {
    const set = (o: THREE.Object3D, x: number, y: number, z: number): void => { o.rotation.set(x * DEG, y * DEG, z * DEG) }
    const r = p.root ?? ZERO; set(root, r[0], r[1], r[2])
    const s = p.sp ?? ZERO; set(spine, s[0], s[2], -s[1])
    const n = p.nk ?? ZERO; set(neck, n[0], n[2], -n[1])
    const l = p.shL ?? ZERO; set(aL.a, -l[0], l[2], l[1])
    const q = p.shR ?? ZERO; set(aR.a, -q[0], -q[2], -q[1])
    set(aL.b, -(p.elL ?? R.elbowRest), 0, 0); set(aR.b, -(p.elR ?? R.elbowRest), 0, 0)
    const h = p.hpL ?? ZERO; set(lL.a, -h[0], h[2], h[1])
    const g = p.hpR ?? ZERO; set(lR.a, -g[0], -g[2], -g[1])
    set(lL.b, p.knL ?? 0, 0, 0); set(lR.b, p.knR ?? 0, 0, 0)
    if (lL.c) set(lL.c, p.anL ?? 0, 0, 0)
    if (lR.c) set(lR.c, p.anR ?? 0, 0, 0)
    if (p.h != null) { root.position.y = p.h * scale; root.updateMatrixWorld(true); return }
    root.position.y = R.probeY
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    root.position.y = R.probeY - box.min.y + (p.air ?? 0) * scale
    root.updateMatrixWorld(true)
  }
  return { root, handL: aL.end, handR: aR.end, footL: lL.end, footR: lR.end, head, chest, back, pose }
}

export const worldOf = (o: THREE.Object3D): THREE.Vector3 => o.getWorldPosition(new THREE.Vector3())
