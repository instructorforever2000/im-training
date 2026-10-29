// Draws the arena (court lines per sport), the selected role's zones and its phase movement as SVG markup.
import { CFG, FORMATIONS, PHASES, SPORTS, type PhaseKey, type Role, type RoleSport } from "./formations"

const P = CFG.pitch
const C = P.colors
/** Court line geometry as fractions of the inner arena (FIFA / FIBA / IHF / FIVB proportions). */
const G = CFG.court
const SL = CFG.slot
const TWO = G.twice
const ENDS = [0, 1] as const


export interface Scene { readonly rs: RoleSport; readonly form: string; readonly slot: number; readonly role: Role | null; readonly ph: PhaseKey; readonly dark: boolean; readonly width: number }

export function sceneSize(rs: RoleSport, width: number): { W: number; H: number } {
  const S = SPORTS[rs]
  const W = Math.max(P.minW, width)
  return { W, H: (W * S.W) / S.L }
}

function court(rs: RoleSport, dark: boolean, W: number, H: number): string {
  const S = SPORTS[rs]
  const grass = dark ? C.grassDark : C.grass
  const wood = dark ? C.woodDark : C.wood
  let s = `<rect width="${W}" height="${H}" fill="${S.wood ? wood : grass}"/>`
  if (!S.wood) s += Array.from({ length: P.stripes }, (_, i) => i).filter((i) => i % TWO).map((i) => `<rect x="${(i * W) / P.stripes}" width="${W / P.stripes}" height="${H}" fill="#fff" opacity="${G.stripeOpacity}"/>`).join("")
  const L = (d: string): void => { s += `<path d="${d}" fill="none" stroke="${G.line}" stroke-width="${G.lineW}"/>` }
  const w = W - P.pad * TWO, h = H - P.pad * TWO
  const X = (x: number): number => P.pad + x * w, Y = (y: number): number => P.pad + y * h
  L(`M${P.pad},${P.pad}H${W - P.pad}V${H - P.pad}H${P.pad}Z`)
  if (rs === "vb") {
    L(`M${X(G.half)},${Y(-G.vb.net)}V${Y(1 + G.vb.net)}`)
    L(`M${X(G.vb.attack)},${Y(0)}V${Y(1)}M${X(1 - G.vb.attack)},${Y(0)}V${Y(1)}`)
    return s
  }
  L(`M${X(G.half)},${Y(0)}V${Y(1)}`)
  const ring = (r: number): void => L(`M${X(G.half)},${Y(G.half)}m-${r},0a${r},${r} 0 1,0 ${r * TWO},0a${r},${r} 0 1,0 -${r * TWO},0`)
  ENDS.forEach((e) => {
    const x0 = X(e), dir = e ? -1 : 1
    if (rs === "fb") {
      L(`M${x0},${Y(G.fb.boxY)}h${dir * w * G.fb.boxD}V${Y(1 - G.fb.boxY)}H${x0}`)
      L(`M${x0},${Y(G.fb.smallY)}h${dir * w * G.fb.smallD}V${Y(1 - G.fb.smallY)}H${x0}`)
    } else if (rs === "bb") {
      L(`M${x0},${Y(G.bb.keyY)}h${dir * w * G.bb.keyD}V${Y(1 - G.bb.keyY)}H${x0}`)
      L(`M${x0},${Y(G.bb.cornerY)}h${dir * w * G.bb.cornerD}A${h * G.bb.three} ${h * G.bb.three} 0 0 ${e ? 0 : 1} ${x0 + dir * w * G.bb.cornerD},${Y(1 - G.bb.cornerY)}H${x0}`)
      s += `<circle cx="${x0 + dir * w * G.bb.hoopD}" cy="${Y(G.half)}" r="${G.bb.hoopR}" fill="none" stroke="${C.hoop}" stroke-width="${G.bb.hoopW}"/>`
    } else {
      const r = h * G.arc.area
      L(`M${x0},${Y(G.half) - r * G.arc.stretch}A${r} ${r} 0 0 ${e ? 0 : 1} ${x0},${Y(G.half) + r * G.arc.stretch}`)
    }
  })
  if (rs === "fb") ring(h * G.fb.circle)
  if (rs === "fs" || rs === "hb") ring(h * G.arc.r)
  return s
}

/** The selected player's zones (with / without the ball) and the arrow of where he moves in this phase. */
function roleLayer(sc: Scene, X: (x: number) => number, Y: (y: number) => number, w: number, h: number): string {
  const sel = FORMATIONS[sc.rs][sc.form][sc.slot]
  const role = sc.role
  if (!sel || !role?.z) return ""
  const yf = sel[3]
  const side = Number(yf > P.sideHigh) - Number(yf < P.sideLow)
  const zone = (z: readonly number[], col: string, dashed: boolean): string => {
    const [zx = 0, dy = 0, rx = 0, ry = 0] = z
    const cy = Math.min(1 - ry * P.zoneEdge, Math.max(ry * P.zoneEdge, yf + dy * side))
    return `<ellipse class="zone" cx="${X(zx)}" cy="${Y(cy)}" rx="${rx * w}" ry="${ry * h}" fill="${col}" fill-opacity="${G.zoneOpacity}" stroke="${col}" stroke-width="${G.zoneW}"${dashed ? ' stroke-dasharray="7 5"' : ""}/>`
  }
  let s = zone(role.z.nb, C.noBall, true) + zone(role.z.wb, C.withBall, false)
  const mv = role.mv?.[sc.ph]
  if (mv) {
    const mx = mv[0] ?? 0, my = mv[1] ?? null
    const ty = my === null || !side ? yf : G.half + side * my
    const tx = X(mx), tyy = Y(ty), sx = X(sel[2]), sy = Y(yf)
    const c = PHASES.find((p) => p.k === sc.ph)?.c ?? C.noBall
    s += `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="${c}"/></marker></defs>`
    s += `<path class="arrow" d="M${sx},${sy} Q${(sx + tx) / TWO},${(sy + tyy) / TWO - P.arrowLift} ${tx},${tyy}" fill="none" stroke="${c}" stroke-width="${G.arrowW}" marker-end="url(#ah)"/>`
    s += `<circle cx="${tx}" cy="${tyy}" r="${G.targetR}" fill="none" stroke="${c}" stroke-width="${G.targetW}" stroke-dasharray="4 3"/>`
  }
  return s
}

export function drawScene(sc: Scene): { svg: string; W: number; H: number } {
  const { W, H } = sceneSize(sc.rs, sc.width)
  const w = W - P.pad * TWO, h = H - P.pad * TWO
  const X = (x: number): number => P.pad + x * w, Y = (y: number): number => P.pad + y * h
  let s = court(sc.rs, sc.dark, W, H) + roleLayer(sc, X, Y, w, h)
  s += FORMATIONS[sc.rs][sc.form].map(([c, num, x, y], i) => {
    const on = i === sc.slot
    return `<g class="slot${on ? " on" : ""}" data-i="${i}" transform="translate(${X(x)},${Y(y)})"><circle class="halo" r="16" fill="none" stroke="#fff" stroke-width="2"/><circle class="b" r="${on ? SL.rOn : SL.r}" fill="${on ? C.slotOn : C.slot}" stroke="rgba(255,255,255,.7)" stroke-width="1.5"/><text text-anchor="middle" y="4">${c}</text><text class="num" text-anchor="middle" y="${on ? SL.numOn : SL.num}">${num}</text></g>`
  }).join("")
  return { svg: s, W, H }
}
