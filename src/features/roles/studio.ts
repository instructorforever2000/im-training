// @ts-nocheck — 3D studio for المراكز والأدوار (approved design roles-concept-v4), mounted inside a host element.
// Behaviour is unchanged from the approved design; this wrapper only scopes it to the host and cleans up on leave.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ENG } from './engine/engine';

/* =====================================================================
   المراكز والأدوار — 3D studio.
   Content + layout logic = the platform's own Roles Studio engine (window.ENG, ported verbatim).
   This file only renders it in 3D and adds the new tools (cameras, panels, compare, bilingual).
   ===================================================================== */

export function mountStudio(host: HTMLElement): () => void {
let dead = false, raf = 0;
const offs = [], obs = [];
const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); offs.push(() => t.removeEventListener(ev, fn, o)) };
const track = ro => { obs.push(ro); return ro };
const E = ENG, C = E.S.ui.st, $ = s => host.querySelector(s), $$ = (s, r = host) => [...r.querySelectorAll(s)], root = host;
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch (e) { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { } } };
Object.assign(C, store.get('im-roles-st', {}));
if (store.get('im-theme-v', null)) root.dataset.theme = store.get('im-theme-v');
const X = { cmp: null, play: true, cam: 'broadcast', tab: store.get('im-roles-tab', 'now'), speed: 1 };
const L = (ar, en) => E.L(ar, en), T = v => E.T(v), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const M = () => E.MODES[C.mode], RS = () => M().rs, PHS = () => E.stPhases(RS()), PHN = () => E.phasesOf(RS());
const PHC = { att: '#1FB5A8', def: '#5b6fe0', ta: '#d9483b', td: '#e09a1c', sp: '#9a6be0' };
const CMPC = '#a77bf3', saveSt = () => store.set('im-roles-st', { mode: C.mode, form: C.form, oppForm: C.oppForm, def: C.def, oppDef: C.oppDef, rv: C.rv, rot: C.rot, phase: C.phase, sel: C.sel, opp: C.opp, trails: C.trails });
const formKey = () => C.mode === 'vb' ? '' : E.stForm(C.mode);
const layout = (ph = C.phase) => E.stLayout(C.mode, ph, false);
const selP = (lay = layout()) => C.sel == null ? null : lay.players.find(p => String(p.id) === String(C.sel));
const roleOfP = p => p ? (E.roleById(C.rv[E.rvKey(C.mode, formKey(), p.id)] || p.rv)) : null;
const famOf = p => p && E.FAM[RS()][p.fam];
const COURT = { fb11: 'fb', fb7: 'fb', futsal: 'fs', bb: 'bb', hb: 'hb', vb: 'vb' }, KIND = { fb: 'grass', fs: 'floor', bb: 'wood', hb: 'floor', vb: 'wood' };

/* ---------- renderer ---------- */
const canvas = $('#gl');
const rn = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
rn.setPixelRatio(Math.min(devicePixelRatio, 2)); rn.shadowMap.enabled = true; rn.shadowMap.type = THREE.PCFSoftShadowMap; rn.toneMapping = THREE.ACESFilmicToneMapping; rn.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, .5, 900);
const ctl = new OrbitControls(cam, canvas); ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * .47; ctl.minDistance = 5; ctl.maxDistance = 260;
const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x1d3020, .95); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; scene.add(sun, sun.target);
const spot = new THREE.SpotLight(0xffffff, 0, 45, .3, .6, 1.2); scene.add(spot, spot.target);
let arena, zonesG, trailG, usG, oppG, ballM, dims, us = [], them = [];

function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647 }
/** Surface texture: real mowing stripes + per-pixel blade grain for grass, varnished planks for indoor floors. */
function surface(S, dark) {
  const ppm = S.kind === 'grass' ? 22 : 48, cw = Math.round((S.L + 8) * ppm), ch = Math.round((S.W + 8) * ppm);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'), r = rnd(7);
  const M = v => v * ppm, ox = M(4), oy = M(4);
  if (S.kind === 'grass') {
    const a = dark ? [24, 78, 40] : [52, 128, 62], b = dark ? [30, 92, 48] : [64, 146, 72];
    const N = 18; for (let i = 0; i < N; i++) { const col = i % 2 ? b : a; g.fillStyle = `rgb(${col})`; g.fillRect(ox + i * M(S.L) / N, 0, M(S.L) / N + 1, ch) }
    g.fillStyle = `rgb(${a.map(v => v * .82)})`; g.fillRect(0, 0, cw, oy); g.fillRect(0, ch - oy, cw, oy); g.fillRect(0, 0, ox, ch); g.fillRect(cw - ox, 0, ox, ch);
    // wear: goalmouths and centre circle slightly worn (as on any match pitch)
    [[ox + M(5), ch / 2, M(7)], [cw - ox - M(5), ch / 2, M(7)], [cw / 2, ch / 2, M(10)]].forEach(([x, y, rr]) => { const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(150,140,80,.16)'); gr.addColorStop(1, 'rgba(150,140,80,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2) });
    const im = g.getImageData(0, 0, cw, ch), d = im.data;
    for (let y = 0; y < ch; y++) { let streak = 0; for (let x = 0; x < cw; x++) { if (x % 3 === 0) streak = (r() - .5) * 22; const n0 = (r() - .5) * 26 + streak, p = (y * cw + x) * 4; d[p] += n0 * .55; d[p + 1] += n0; d[p + 2] += n0 * .45 } }
    g.putImageData(im, 0, 0);
  } else {
    const base = S.kind === 'wood' ? (dark ? [92, 62, 38] : [214, 162, 104]) : (dark ? [26, 52, 72] : [52, 108, 150]);
    g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, cw, ch);
    const pw = M(.12), pl = M(2.4);
    for (let y = 0; y < ch; y += pw) { let x = -r() * pl; while (x < cw) { const t = (r() - .5) * (S.kind === 'wood' ? 26 : 10); g.fillStyle = `rgb(${base.map(v => v + t)})`; g.fillRect(x, y, pl, pw); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y, 1.2, pw); x += pl } g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y, cw, 1) }
    if (S.kind === 'wood') for (let i = 0; i < 2600; i++) { g.strokeStyle = `rgba(80,45,20,${r() * .08})`; g.lineWidth = 1; const x = r() * cw, y = r() * ch; g.beginPath(); g.moveTo(x, y); g.lineTo(x + M(.6 + r()), y + (r() - .5) * 2); g.stroke() }
    if (S.kind === 'floor') { g.fillStyle = dark ? 'rgba(10,30,45,.55)' : 'rgba(30,80,120,.45)'; g.fillRect(0, 0, cw, oy); g.fillRect(0, ch - oy, cw, oy); g.fillRect(0, 0, ox, ch); g.fillRect(cw - ox, 0, ox, ch) }
    if (S.court === 'bb') { g.fillStyle = dark ? 'rgba(20,90,95,.55)' : 'rgba(31,181,168,.42)';[0, 1].forEach(e => { const x0 = e ? ox + M(S.L) - M(5.8) : ox; g.fillRect(x0, oy + M(S.W / 2 - 2.45), M(5.8), M(4.9)) }) }
    if (S.court === 'hb' || S.court === 'fs') { g.fillStyle = dark ? 'rgba(20,90,95,.45)' : 'rgba(31,181,168,.35)';[0, 1].forEach(e => { const x0 = e ? ox + M(S.L) : ox, dir = e ? -1 : 1, rr = M(6); g.beginPath(); g.moveTo(x0, oy + M(S.W / 2 - 1.5) - rr); g.arc(x0, oy + M(S.W / 2 - 1.5), rr, -Math.PI / 2, 0, !!e); g.lineTo(x0 + dir * rr, oy + M(S.W / 2 + 1.5)); g.arc(x0, oy + M(S.W / 2 + 1.5), rr, 0, Math.PI / 2, !!e); g.closePath(); g.fill() }) }
  }
  // court lines (official dimensions)
  g.strokeStyle = 'rgba(255,255,255,.93)'; g.lineWidth = Math.max(2, M(S.kind === 'grass' ? .12 : .05)); g.lineCap = 'round';
  const P = (x, y) => [ox + M(x), oy + M(y)], line = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b) }); g.stroke() };
  const arc = (x, y, rr, a0, a1, ccw) => { const [a, b] = P(x, y); g.beginPath(); g.arc(a, b, M(rr), a0, a1, ccw); g.stroke() };
  const { L, W } = S; line([[0, 0], [L, 0], [L, W], [0, W], [0, 0]]); if (S.court !== 'vb') line([[L / 2, 0], [L / 2, W]]);
  if (S.court === 'fb') { const q = S.L / 105;
    arc(L / 2, W / 2, 9.15 * q, 0, 7);[0, 1].forEach(e => { const x0 = e ? L : 0, d = e ? -1 : 1; line([[x0, W / 2 - 20.16 * q], [x0 + d * 16.5 * q, W / 2 - 20.16 * q], [x0 + d * 16.5 * q, W / 2 + 20.16 * q], [x0, W / 2 + 20.16 * q]]); line([[x0, W / 2 - 9.16 * q], [x0 + d * 5.5 * q, W / 2 - 9.16 * q], [x0 + d * 5.5 * q, W / 2 + 9.16 * q], [x0, W / 2 + 9.16 * q]]);
      const a = Math.acos(5.5 / 9.15); arc(x0 + d * 11 * q, W / 2, 9.15 * q, e ? Math.PI - a : -a, e ? Math.PI + a : a, false); g.fillStyle = '#fff'; const [sx, sy] = P(x0 + d * 11 * q, W / 2); g.beginPath(); g.arc(sx, sy, M(.2), 0, 7); g.fill() });
    [[0, 0, 0], [L, 0, 1], [L, W, 2], [0, W, 3]].forEach(([x, y, q]) => arc(x, y, 1, q * Math.PI / 2, (q + 1) * Math.PI / 2));
    const [cx, cy] = P(L / 2, W / 2); g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, M(.25), 0, 7); g.fill();
  }
  if (S.court === 'fs' || S.court === 'hb') {
    arc(L / 2, W / 2, 3, 0, 7);[0, 1].forEach(e => { const x0 = e ? L : 0, d = e ? -1 : 1, rr = 6; arc(x0, W / 2 - 1.5, rr, e ? Math.PI : -Math.PI / 2, e ? Math.PI * 1.5 : 0); arc(x0, W / 2 + 1.5, rr, e ? Math.PI / 2 : 0, e ? Math.PI : Math.PI / 2); line([[x0 + d * rr, W / 2 - 1.5], [x0 + d * rr, W / 2 + 1.5]]);
      if (S.court === 'hb') { g.setLineDash([M(.3), M(.3)]); arc(x0, W / 2 - 1.5, 9, e ? Math.PI * 1.08 : -Math.PI / 2 * .84, e ? Math.PI * 1.5 : -.08); arc(x0, W / 2 + 1.5, 9, e ? Math.PI / 2 : .08, e ? Math.PI * .92 : Math.PI / 2 * .84); line([[x0 + d * 9, W / 2 - 1.5], [x0 + d * 9, W / 2 + 1.5]]); g.setLineDash([]) } })
  }
  if (S.court === 'bb') {
    arc(L / 2, W / 2, 1.8, 0, 7);[0, 1].forEach(e => { const x0 = e ? L : 0, d = e ? -1 : 1, hx = x0 + d * 1.575; line([[x0, W / 2 - 2.45], [x0 + d * 5.8, W / 2 - 2.45], [x0 + d * 5.8, W / 2 + 2.45], [x0, W / 2 + 2.45]]); arc(x0 + d * 5.8, W / 2, 1.8, e ? Math.PI / 2 : -Math.PI / 2, e ? Math.PI * 1.5 : Math.PI / 2);
      const a = Math.asin((W / 2 - .9) / 6.75), ex = hx + d * 6.75 * Math.cos(a); line([[x0, .9], [ex, .9]]); line([[x0, W - .9], [ex, W - .9]]); arc(hx, W / 2, 6.75, e ? Math.PI - a : -a, e ? Math.PI + a : a, false) })
  }
  if (S.court === 'vb') { line([[L / 2 - 3, 0], [L / 2 - 3, W]]); line([[L / 2 + 3, 0], [L / 2 + 3, W]]); g.lineWidth *= 1.6; line([[L / 2, 0], [L / 2, W]]) }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = rn.capabilities.getMaxAnisotropy(); return tx;
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .05, ...o });
function goal(w, h, d, x, dir) {
  const gg = new THREE.Group(), m = mat(0xffffff, { roughness: .3 }), r = .06 * (w > 5 ? 1.6 : 1);
  const post = (len, rot, px, py, pz) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m); p.rotation.set(...rot); p.position.set(px, py, pz); p.castShadow = true; gg.add(p) };
  post(h, [0, 0, 0], 0, h / 2, -w / 2); post(h, [0, 0, 0], 0, h / 2, w / 2); post(w, [Math.PI / 2, 0, 0], 0, h, 0);
  const net = new THREE.Mesh(new THREE.BoxGeometry(d, h, w), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .14, wireframe: true })); net.position.set(dir * d / 2, h / 2, 0); gg.add(net);
  gg.position.set(x, 0, 0); return gg;
}
function buildArena() {
  const m = M(), court = COURT[C.mode], S = { L: m.L, W: m.W, court, kind: KIND[court] }, dark = root.dataset.theme === 'dark';
  if (arena) { scene.remove(arena); arena.traverse(o => { o.geometry && o.geometry.dispose(); if (o.material) { o.material.map && o.material.map.dispose(); o.material.dispose() } }) }
  arena = new THREE.Group(); scene.add(arena); dims = S;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(S.L * 6, S.W * 8), mat(dark ? 0x05080c : 0xcfd8df, { roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.05; ground.receiveShadow = true; arena.add(ground);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(S.L + 8, S.W + 8), new THREE.MeshStandardMaterial({ map: surface(S, dark), roughness: S.kind === 'grass' ? .95 : .38 })); surf.rotation.x = -Math.PI / 2; surf.receiveShadow = true; arena.add(surf);
  const bm = mat(dark ? 0x0b1b33 : 0x16304f, { roughness: .4 }), strip = new THREE.MeshBasicMaterial({ color: 0x1FB5A8 });
  const board = (w, x, z, ry) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .9, .15), bm); b.position.set(x, .45, z); b.rotation.y = ry; b.castShadow = true; arena.add(b); const s = new THREE.Mesh(new THREE.BoxGeometry(w, .05, .16), strip); s.position.set(x, .82, z); s.rotation.y = ry; arena.add(s) };
  const ex = S.L / 2 + 4.2, ez = S.W / 2 + 4.2; board(S.L + 8.4, 0, -ez, 0); board(S.L * .38, -S.L * .3, ez, 0); board(S.L * .38, S.L * .3, ez, 0); board(S.W + 8.4, -ex, 0, Math.PI / 2); board(S.W + 8.4, ex, 0, Math.PI / 2);
  if (court === 'fb') { const q = S.L / 105, gw = q > .7 ? 7.32 : 5; arena.add(goal(gw, q > .7 ? 2.44 : 2, 2, -S.L / 2, -1), goal(gw, q > .7 ? 2.44 : 2, 2, S.L / 2, 1)) }
  if (court === 'fs' || court === 'hb') arena.add(goal(3, 2, 1, -S.L / 2, -1), goal(3, 2, 1, S.L / 2, 1));
  if (court === 'bb') [-1, 1].forEach(e => { const pole = new THREE.Mesh(new THREE.BoxGeometry(.3, 3.4, .3), mat(0x22303f)); pole.position.set(e * (S.L / 2 + .8), 1.7, 0); const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, .2, .2), mat(0x22303f)); arm.position.set(e * (S.L / 2), 3.3, 0);
    const bd = new THREE.Mesh(new THREE.BoxGeometry(.05, 1.05, 1.8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .55, roughness: .1 })); bd.position.set(e * (S.L / 2 - 1.2), 3.4, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.23, .02, 8, 24), mat(0xff6a1a)); rim.rotation.x = Math.PI / 2; rim.position.set(e * (S.L / 2 - 1.575), 3.05, 0);[pole, arm, bd, rim].forEach(x => { x.castShadow = true; arena.add(x) }) });
  if (court === 'vb') { [-1, 1].forEach(e => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.55, 10), mat(0xdfe6ee)); p.position.set(0, 1.27, e * (S.W / 2 + .8)); p.castShadow = true; arena.add(p) });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(S.W + 1.6, 1), new THREE.MeshStandardMaterial({ color: 0x0b1b33, transparent: true, opacity: .35, side: THREE.DoubleSide })); net.rotation.y = Math.PI / 2; net.position.y = 1.93; arena.add(net);
    const band = new THREE.Mesh(new THREE.BoxGeometry(.04, .07, S.W + 1.6), mat(0xffffff)); band.position.y = 2.43; arena.add(band) }
  const big = Math.max(S.L, S.W); sun.position.set(-big * .35, big * .9, big * .45); const sc = sun.shadow.camera; sc.left = -S.L * .7; sc.right = S.L * .7; sc.top = S.W * 1.1; sc.bottom = -S.W * 1.1; sc.near = 1; sc.far = big * 3; sc.updateProjectionMatrix();
  sun.intensity = dark ? 1.25 : 2.3; hemi.intensity = dark ? .35 : .95; rn.setClearColor(dark ? 0x04070c : 0xe4eaf0); scene.fog = new THREE.Fog(dark ? 0x04070c : 0xe4eaf0, big * 1.6, big * 4.2);
  zonesG = new THREE.Group(); trailG = new THREE.Group(); usG = new THREE.Group(); oppG = new THREE.Group(); arena.add(zonesG, trailG, usG, oppG);
  const br = court === 'fb' ? .3 * S.L / 105 * 1.6 : court === 'bb' ? .24 : court === 'vb' ? .21 : .2;
  ballM = new THREE.Mesh(new THREE.SphereGeometry(br, 24, 16), mat(court === 'bb' ? 0xe0701e : court === 'vb' ? 0xf2d34a : 0xffffff, { roughness: .45 })); ballM.castShadow = true; ballM.userData = { r: br, to: new THREE.Vector3(), from: new THREE.Vector3() }; arena.add(ballM);
  buildTeams(); setCam(X.cam, true);
}
const W3 = (x, y) => new THREE.Vector3(x - dims.L / 2, 0, y - dims.W / 2);

/* ---------- athletes ---------- */
const SKIN = [0xc68e64, 0x8d5a3b, 0xe0b48f, 0xa8744f], KIT = { us: 0x2b5fa8, usGK: 0xe0a21c, them: 0xc7413a, themGK: 0x2e7d4f, on: 0x13c2b0 };
function label(txt, opp) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = opp ? 'rgba(120,24,20,.85)' : 'rgba(8,18,32,.86)'; g.beginPath(); g.roundRect(opp ? 64 : 8, 14, opp ? 128 : 240, 68, 34); g.fill(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#fff'; g.font = '700 40px Outfit, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 50);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true })); s.renderOrder = 10; return s;
}
function athlete(p, opp, idx) {
  const k = dims.L > 80 ? 2.3 : dims.L > 45 ? 1.7 : dims.L > 30 ? 1.25 : .9, gk = p.code === 'GK' || p.code === 'L', base = opp ? (gk ? KIT.themGK : KIT.them) : (gk ? KIT.usGK : KIT.us);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shirt = mat(base, { roughness: .7 }), shorts = mat(opp ? 0x1a1d24 : 0xf3f5f8, { roughness: .75 }), skin = mat(SKIN[idx % 4], { roughness: .6 }), sock = mat(base, { roughness: .8 }), boot = mat(0x111418, { roughness: .4 });
  const cap = (r, l, m) => { const x = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), m); x.castShadow = true; return x };
  const limb = (r, l, m, m2) => { const q = new THREE.Group(), u = cap(r, l, m); u.position.y = -l / 2 - r; q.add(u); if (m2) { const lo = cap(r * .85, l * .9, m2); lo.position.y = -l * 1.5 - r * 2.4; q.add(lo) } return q };
  const legL = limb(.075, .33, shorts, sock), legR = limb(.075, .33, shorts, sock); legL.position.set(0, .95, -.11); legR.position.set(0, .95, .11);
  [legL, legR].forEach(l => { const b = new THREE.Mesh(new THREE.BoxGeometry(.24, .08, .11), boot); b.position.set(.05, -.9, 0); b.castShadow = true; l.add(b) });
  const torso = cap(.17, .42, shirt); torso.position.y = 1.28; torso.scale.set(.82, 1, 1.15);
  const armL = limb(.055, .26, shirt, skin), armR = limb(.055, .26, shirt, skin); armL.position.set(0, 1.56, -.25); armR.position.set(0, 1.56, .25);
  const neck = cap(.05, .06, skin); neck.position.y = 1.64; const head = new THREE.Mesh(new THREE.SphereGeometry(.12, 20, 16), skin); head.position.y = 1.8; head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.125, 20, 12, 0, Math.PI * 2, 0, Math.PI * .5), mat(0x15110e, { roughness: .9 })); hair.position.y = 1.82; hair.rotation.z = -.25;
  body.add(legL, legR, torso, armL, armR, neck, head, hair); body.scale.setScalar(k);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.55 * k, .72 * k, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
  const tag = label(opp ? String(p.n) : `${p.code} · ${p.n}`, opp); tag.position.y = 2.45 * k; tag.scale.set((opp ? 1.2 : 1.9) * k, .72 * k * (opp ? .9 : 1), 1); g.add(tag);
  g.userData = { id: p.id, opp, k, legL, legR, armL, armR, body, ring, shirt, base, tag, from: new THREE.Vector3(), to: new THREE.Vector3(), prev: null, phase: Math.random() * 6 };
  return g;
}
function buildTeams() {
  usG.clear(); oppG.clear(); const lay = layout(); us = lay.players.map((p, i) => { const a = athlete(p, false, i); usG.add(a); return a });
  const op = C.opp ? E.stOpp(C.mode, C.phase) : null; them = (op || []).map((p, i) => { const a = athlete(p, true, i + 3); oppG.add(a); return a }); oppG.visible = !!op;
  place(true); highlight();
}
let tw = { t0: 0, dur: 1100 };
/** Move every player (and the ball) to the current phase layout, tweening from where they stand. */
function place(instant) {
  const lay = layout(), op = C.opp ? E.stOpp(C.mode, C.phase) : null;
  const set = (arr, pl) => arr.forEach(a => { const p = pl && pl.find(q => String(q.id) === String(a.userData.id)) || pl && pl[arr.indexOf(a)]; if (!p) return; a.userData.from.copy(a.position); a.userData.to.copy(W3(p.x, p.y)); if (instant) { a.position.copy(a.userData.to); a.userData.from.copy(a.userData.to) } });
  set(us, lay.players); oppG.visible = !!op; if (op) { if (them.length !== op.length) { buildTeams(); return } set(them, op) }
  ballM.userData.from.copy(ballM.position); ballM.userData.to.copy(W3(lay.ball[0], lay.ball[1])).setY(ballM.userData.r); if (instant) ballM.position.copy(ballM.userData.to);
  tw.t0 = performance.now(); if (!instant) trails(); else trailG.clear(); zones();
}
function highlight() { us.forEach(a => { const on = String(a.userData.id) === String(C.sel); a.userData.shirt.color.set(on ? KIT.on : a.userData.base); a.userData.ring.material.opacity = on ? .9 : 0 }) }

/* ---------- zones & trails painted on the surface ---------- */
function glowTex(col) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, col + 'aa'); gr.addColorStop(.6, col + '44'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }
const GLOW = { nb: glowTex('#4FD1C5'), wb: glowTex('#F4D03F') };
function ellipseLine(cx, cz, rx, rz, col, dashed, y = .04) {
  const pts = new THREE.EllipseCurve(0, 0, rx, rz).getPoints(80).map(p => new THREE.Vector3(cx + p.x, y, cz + p.y));
  const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dashed ? new THREE.LineDashedMaterial({ color: col, dashSize: rx * .12, gapSize: rx * .08 }) : new THREE.LineBasicMaterial({ color: col })); if (dashed) ln.computeLineDistances(); return ln
}
/** Same rule as the studio: with-ball zone in attack phases, without-ball zone otherwise; both when the role defines its own half. */
function zoneSet(role, baseY, cmp) {
  if (!role || !role.z) return; const m = M(), yf = baseY / m.W, sign = yf > .56 ? 1 : yf < .44 ? -1 : 0, which = (m.mirror || role.z.own) ? 'both' : (['att', 'ta', 'sp'].includes(C.phase) ? 'wb' : 'nb');
  ['nb', 'wb'].filter(k => which === 'both' || which === k).forEach(k => {
    const [zx, dy, rx, ry] = role.z[k], cy = Math.min(1 - ry * .6, Math.max(ry * .6, yf + dy * sign)), c = W3(zx * m.L, cy * m.W), RX = rx * m.L, RZ = ry * m.W;
    if (!cmp) { const g = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2.5, RZ * 2.5), new THREE.MeshBasicMaterial({ map: GLOW[k], transparent: true, depthWrite: false })); g.rotation.x = -Math.PI / 2; g.position.set(c.x, .025, c.z); zonesG.add(g) }
    zonesG.add(ellipseLine(c.x, c.z, RX, RZ, cmp ? CMPC : k === 'wb' ? '#F4D03F' : '#4FD1C5', cmp || k === 'nb', cmp ? .05 : .04))
  })
}
function zones() { zonesG.clear(); const p = selP(); if (!p) return; zoneSet(roleOfP(p), p.by, false); if (X.cmp) zoneSet(E.roleById(X.cmp), p.by, true) }
function trails() {
  trailG.clear(); if (!C.trails) return; us.forEach(a => { const f = a.userData.from, t = a.userData.to; if (f.distanceTo(t) < Math.max(1, dims.L / 60)) return; const hi = String(a.userData.id) === String(C.sel);
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([f.clone().setY(.07), t.clone().setY(.07)]), new THREE.LineDashedMaterial({ color: hi ? 0xF4D03F : 0xffffff, dashSize: dims.L / 90, gapSize: dims.L / 130, transparent: true, opacity: hi ? .95 : .5 })); ln.computeLineDistances(); trailG.add(ln);
    const head = new THREE.Mesh(new THREE.ConeGeometry(dims.L / 160 + .2, dims.L / 70 + .4, 12), new THREE.MeshBasicMaterial({ color: hi ? 0xF4D03F : 0xffffff, transparent: true, opacity: hi ? .95 : .55 })); const d = t.clone().sub(f).normalize(); head.position.copy(t).setY(.08); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); head.rotateX(0); trailG.add(head) })
}

/* ---------- camera: presets framed in the free area between panels ---------- */
const camGoal = { p: new THREE.Vector3(), t: new THREE.Vector3(), on: false };
function freeRect() {
  const sb = $('#stage').getBoundingClientRect(); let l = sb.left, r = sb.right, t = sb.top, b = sb.bottom;
  if (innerWidth > 900) { const hb = $('.hud').getBoundingClientRect(); t = Math.max(t, hb.bottom + 8);
    $$('.pnl').forEach(p => { if (p.classList.contains('hidden')) return; const q = p.getBoundingClientRect(); if (q.width > sb.width * .6) { if (q.top > sb.top + sb.height / 2) b = Math.min(b, q.top - 8); return } if (p.classList.contains('min')) return; const cx = q.left + q.width / 2; if (cx > sb.left + sb.width / 2) r = Math.min(r, q.left - 8); else l = Math.max(l, q.right + 8) }) }
  if (r - l < sb.width * .3) { l = sb.left; r = sb.right } return { sb, l, r, t, b }
}
function frame() { const { sb, l, r, t, b } = freeRect(); cam.setViewOffset(sb.width, sb.height, (sb.left + sb.width / 2) - (l + r) / 2, (sb.top + sb.height / 2) - (t + b) / 2, sb.width, sb.height); return { fw: (r - l) / sb.width, fh: (b - t) / sb.height, asp: sb.width / sb.height } }
function setCam(k, now) {
  X.cam = k; $$('#camv button').forEach(b => b.classList.toggle('on', b.dataset.v === k)); const S = dims, f = frame(), th = Math.tan(cam.fov * Math.PI / 360);
  const fit = el => { const dw = (S.L / 2 + 4) / (th * f.asp * f.fw), dh = ((S.W / 2 + 4) * Math.sin(el) + 2.4 * Math.cos(el)) / (th * f.fh); return Math.max(dw, dh) * 1.06 };
  const p = us.find(a => String(a.userData.id) === String(C.sel)) || us[0];
  if (k === 'player' && p) { camGoal.t.copy(p.userData.to); camGoal.p.copy(p.userData.to).add(new THREE.Vector3(-S.L * .14 - 4, S.L * .08 + 5, S.W * .28 + 6)) }
  else if (k === 'goal') { camGoal.t.set(S.L * .1, 0, 0); camGoal.p.set(-S.L * .5 - S.W * .9, S.W * .5 + 3, 0) }
  else { const el = k === 'top' ? Math.PI / 2 - .001 : .6, d = fit(el); camGoal.t.set(0, 0, 0); camGoal.p.set(0, d * Math.sin(el), d * Math.cos(el)) }
  camGoal.on = true; if (now) { cam.position.copy(camGoal.p); ctl.target.copy(camGoal.t); camGoal.on = false }
}
const refit = () => { if (dims) setCam(X.cam, false) }; ctl.addEventListener('start', () => { camGoal.on = false });

/* ---------- picking ---------- */
const ray = new THREE.Raycaster(), mp = new THREE.Vector2(); let down = null;
canvas.addEventListener('pointerdown', e => down = [e.clientX, e.clientY]);
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; const b = canvas.getBoundingClientRect(); mp.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1); ray.setFromCamera(mp, cam);
  const h = ray.intersectObjects(usG.children, true)[0]; if (!h) return; let o = h.object; while (o && o.userData.id == null) o = o.parent; if (o) selectSlot(o.userData.id)
});
function selectSlot(id) { C.sel = id; X.cmp = null; saveSt(); highlight(); zones(); panels(); if (X.cam === 'player') setCam('player') }

/* ---------- animation loop ---------- */
let last = performance.now(), nextAt = performance.now() + 2800; const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
function tick(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (X.play && now > nextAt) { const ps = PHS(); setPhase(ps[(ps.indexOf(C.phase) + 1) % ps.length], true) }
  const f = reduce ? 1 : Math.min(1, (now - tw.t0) / tw.dur), e = f * f * (3 - 2 * f);
  [...us, ...them].forEach(a => { const u = a.userData, w = u.from.clone().lerp(u.to, e), prev = u.prev || w.clone(), v = w.clone().sub(prev), sp = v.length() / Math.max(dt, 1e-3); a.position.copy(w); u.prev = w.clone();
    const dir = u.opp ? Math.PI : 0, face = sp > .3 ? Math.atan2(-v.z, v.x) : dir; let d = face - a.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); a.rotation.y += d * .12;
    const run = Math.min(1, sp / 6); u.phase += dt * (3 + run * 9); const sw = Math.sin(u.phase) * (.1 + run * .75); u.legL.rotation.z = sw; u.legR.rotation.z = -sw; u.armL.rotation.z = -sw * .8; u.armR.rotation.z = sw * .8; u.body.position.y = Math.abs(Math.sin(u.phase)) * .04 * (1 + run) * u.k; u.body.rotation.z = -run * .12 });
  const bu = ballM.userData; ballM.position.copy(bu.from.clone().lerp(bu.to, e)); ballM.position.y = bu.r + Math.sin(e * Math.PI) * Math.min(4, bu.from.distanceTo(bu.to) * .12); ballM.rotation.z -= dt * 4 * (1 - e);
  const p = us.find(a => String(a.userData.id) === String(C.sel)); if (p) { spot.position.set(p.position.x, 14, p.position.z + 2); spot.target.position.copy(p.position); spot.intensity = root.dataset.theme === 'dark' ? 160 : 70; p.userData.ring.rotation.z += dt } else spot.intensity = 0;
  $('#prog').style.width = X.play ? `${Math.min(100, 100 - (nextAt - now) / (2800 / X.speed) * 100)}%` : '0%';
  if (camGoal.on) { if (X.cam === 'player' && p) camGoal.t.copy(p.position); cam.position.lerp(camGoal.p, .06); ctl.target.lerp(camGoal.t, .08); if (cam.position.distanceTo(camGoal.p) < .2 && X.cam !== 'player') camGoal.on = false }
  if (dead) return; ctl.update(); rn.render(scene, cam); raf = requestAnimationFrame(tick);
}
function resize() { const b = $('#stage').getBoundingClientRect(); rn.setSize(b.width, b.height, false); cam.aspect = b.width / b.height; cam.updateProjectionMatrix(); refit() }
track(new ResizeObserver(resize)).observe($('#stage'));

/* ---------- phases & playback ---------- */
function setPhase(ph, auto) { C.phase = ph; saveSt(); place(false); phaseBar(); panels(); nextAt = performance.now() + 2800 / X.speed; if (!auto) pause() }
function pause() { X.play = false; playBtns() }
function playBtns() { $$('[data-play]').forEach(b => { b.innerHTML = X.play ? `❚❚ <span>${L('إيقاف', 'Pause')}</span>` : `▶ <span>${L('تشغيل الدورة', 'Play cycle')}</span>`; b.classList.toggle('on', X.play) }) }
function togglePlay() { X.play = !X.play; nextAt = performance.now() + 2800 / X.speed; playBtns() }
function step(d) { const ps = PHS(); setPhase(ps[(ps.indexOf(C.phase) + d + ps.length) % ps.length]) }
function phaseBar() {
  const ps = PHS(), n = PHN(); $('#segs').innerHTML = ps.map((p, i) => `<button class="seg ${p === C.phase ? 'on' : ''}" data-ph="${p}" style="--c:${PHC[p]}"><b><i>${i + 1}</i>${esc(T(n[p]))}</b><em class="en">${esc(n[p].en)}</em></button>`).join('');
  $$('#segs [data-ph]').forEach(b => b.onclick = () => setPhase(b.dataset.ph));
}
on(window, 'keydown', e => { if (e.target.closest('input,select,textarea')) return; if (e.code === 'Space') { e.preventDefault(); togglePlay() } if (e.key === 'ArrowLeft') step(1); if (e.key === 'ArrowRight') step(-1) });

/* ---------- panels: draggable · collapsible · hideable · resizable ---------- */
const PANELS = { role: bi('الشرح', 'Explanation'), vars: bi('أدوار المركز والمقارنة', 'Role variants & compare'), tl: bi('مراحل اللعب', 'Game phases') };
function bi(ar, en) { return { ar, en } }
const lay = store.get('im-roles-layout', {});
function placePanels() {
  if (innerWidth > 900) $('.hud2').style.top = ($('.hud').getBoundingClientRect().bottom + 6) + 'px'; else $('.hud2').style.top = '';
  $$('.pnl').forEach(p => { const id = p.dataset.id, s = lay[id] || {}; p.classList.toggle('hidden', !!s.hidden); p.classList.toggle('min', !!s.min);
    if (s.x != null && innerWidth > 900) Object.assign(p.style, { left: Math.min(s.x, innerWidth - 120) + 'px', top: Math.min(s.y, innerHeight - 60) + 'px', right: 'auto', bottom: 'auto' }); else Object.assign(p.style, { left: '', top: innerWidth > 900 && id !== 'tl' ? ($('.hud2').getBoundingClientRect().bottom + 10) + 'px' : '', right: '', bottom: '' });
    p.style.width = s.w && innerWidth > 900 ? s.w + 'px' : '' });
  $('#pmenu').innerHTML = Object.entries(PANELS).map(([id, t]) => `<label><input type="checkbox" data-id="${id}" ${(lay[id] || {}).hidden ? '' : 'checked'}> ${esc(T(t))}</label>`).join('') + `<button id="preset">↺ ${L('الترتيب الافتراضي', 'Reset layout')}</button>`;
  $$('#pmenu input').forEach(c => c.onchange = () => { (lay[c.dataset.id] ||= {}).hidden = !c.checked; saveLay() }); $('#preset').onclick = () => { Object.keys(lay).forEach(k => delete lay[k]); saveLay() };
  $('#pdock').innerHTML = Object.entries(PANELS).filter(([id]) => (lay[id] || {}).hidden).map(([id, t]) => `<button class="chip" data-show="${id}">＋ ${esc(T(t))}</button>`).join('');
  $$('#pdock [data-show]').forEach(b => b.onclick = () => { lay[b.dataset.show].hidden = false; saveLay() });
}
function saveLay() { store.set('im-roles-layout', lay); placePanels(); setTimeout(refit, 30) }
$$('.pnl').forEach(p => {
  const id = p.dataset.id, h = p.querySelector('.ph-h');
  h.querySelector('.min-b').onclick = () => { (lay[id] ||= {}).min = !lay[id].min; saveLay() }; h.querySelector('.hide-b').onclick = () => { (lay[id] ||= {}).hidden = true; saveLay() };
  let d = null; h.addEventListener('pointerdown', e => { if (e.target.closest('button,select,input') || innerWidth <= 900) return; const b = p.getBoundingClientRect(); d = [e.clientX - b.left, e.clientY - b.top]; h.setPointerCapture(e.pointerId); p.classList.add('drag') });
  h.addEventListener('pointermove', e => { if (!d) return; Object.assign(p.style, { left: Math.max(0, Math.min(innerWidth - 80, e.clientX - d[0])) + 'px', top: Math.max(0, Math.min(innerHeight - 40, e.clientY - d[1])) + 'px', right: 'auto', bottom: 'auto' }) });
  h.addEventListener('pointerup', () => { if (!d) return; d = null; p.classList.remove('drag'); const b = p.getBoundingClientRect(); Object.assign(lay[id] ||= {}, { x: b.left, y: b.top }); store.set('im-roles-layout', lay); refit() });
  track(new ResizeObserver(() => { if (!p.dataset.ready || p.classList.contains('drag') || innerWidth <= 900 || p.classList.contains('min')) return; const w = Math.round(p.getBoundingClientRect().width); if ((lay[id] || {}).w === w) return; (lay[id] ||= {}).w = w; store.set('im-roles-layout', lay); refit() })).observe(p);
  setTimeout(() => p.dataset.ready = 1, 600);
});
$('#pbtn').onclick = e => { e.stopPropagation(); $('#pmenu').classList.toggle('open') }; on(document, 'click', e => { if (!e.target.closest('#pmenu')) $('#pmenu').classList.remove('open') });
on(window, 'resize', placePanels);

/* ---------- controls bar (every option the studio had) ---------- */
function controls() {
  const m = M(), mode = C.mode;
  $('#sports').innerHTML = Object.entries(E.MODES).map(([k, v]) => `<button class="chip ${k === mode ? 'on' : ''}" data-m="${k}">${esc(T(v.name))}</button>`).join('');
  $$('#sports [data-m]').forEach(b => b.onclick = () => { C.mode = b.dataset.m; X.cmp = null; C.phase = PHS()[0]; { const pl = layout().players; C.sel = (pl[C.mode === 'fb11' ? 1 : 0] || pl[0]).id } saveSt(); buildArena(); all() });
  const opt = (k, label, cur) => `<option value="${esc(k)}" ${String(k) === String(cur) ? 'selected' : ''}>${esc(label)}</option>`; let h = '';
  if (E.FORM[mode]) { const ks = Object.keys(E.FORM[mode]); h += `<label class="fld">${L('خطة فريقنا', 'Our formation')}<select data-k="form">${ks.map(k => opt(k, E.fname(mode, 'A', k), E.stForm(mode))).join('')}</select></label>`;
    h += `<label class="fld opp">${L('خطة المنافس', 'Opponent formation')}<select data-k="oppForm">${ks.map(k => opt(k, E.fname(mode, 'A', k), E.stOppForm(mode))).join('')}</select></label>` }
  else if (mode === 'vb') h += `<label class="fld">${L('الدوران', 'Rotation')}<select data-k="rot">${[1, 2, 3, 4, 5, 6].map(k => opt(k, L(`الدوران ${k} (المعد في المركز ${[1, 6, 5, 4, 3, 2][k - 1]})`, `Rotation ${k} (setter in zone ${[1, 6, 5, 4, 3, 2][k - 1]})`), C.rot)).join('')}</select></label>`;
  else { const offs = mode === 'bb' ? E.BB_OFF : E.HB_OFF, defs = mode === 'bb' ? E.BB_DEF : E.HB_DEF;
    h += `<label class="fld">${L('خطة الهجوم', 'Attacking set')}<select data-k="form">${Object.keys(offs).map(k => opt(k, E.fname(mode, 'A', k), E.stForm(mode))).join('')}</select></label>`;
    h += `<label class="fld">${L('نظام الدفاع', 'Defensive system')}<select data-k="def">${Object.keys(defs).map(k => opt(k, E.fname(mode, 'B', k), E.stDef(mode))).join('')}</select></label>`;
    h += `<label class="fld opp">${L('دفاع المنافس', 'Opponent defence')}<select data-k="oppDef">${Object.keys(defs).map(k => opt(k, E.fname(mode, 'B', k), E.stDef(mode, true))).join('')}</select></label>` }
  h += `<label class="sw"><input type="checkbox" data-t="opp" ${C.opp ? 'checked' : ''}><span></span>${L('الفريق المنافس', 'Opponent')}</label><label class="sw"><input type="checkbox" data-t="trails" ${C.trails ? 'checked' : ''}><span></span>${L('مسارات الحركة', 'Movement trails')}</label>`;
  $('#ctl').innerHTML = h;
  $$('#ctl select').forEach(s => s.onchange = () => { const k = s.dataset.k; if (k === 'rot') C.rot = +s.value; else (C[k] ||= {})[mode] = s.value; if (k === 'form') { C.sel = null; X.cmp = null } saveSt(); buildTeams(); panels() });
  $$('#ctl [data-t]').forEach(c => c.onchange = () => { C[c.dataset.t] = c.checked; saveSt(); if (c.dataset.t === 'opp') buildTeams(); else trailG.clear() });
  $('.legend').innerHTML = `<span><i class="us"></i>${L('فريقنا — اضغط أي لاعب', 'Our team — tap a player')}</span>${C.opp ? `<span><i class="op"></i>${L('المنافس', 'Opponent')}</span>` : ''}<span><i class="z nb"></i>${L('دون الكرة', 'Without ball')}</span><span><i class="z wb"></i>${L('مع الكرة', 'With ball')}</span><span><i class="z cm"></i>${L('دور للمقارنة', 'Compared role')}</span>`;
}

/* ---------- explanation panel: everything the studio panel had, in tabs ---------- */
const TABS_TEAM = [['now', bi('المرحلة الآن', 'Phase now')], ['plan', bi('تحليل الخطة', 'Formation')], ['players', bi('اللاعبون', 'Players')]];
const TABS_ROLE = [['now', bi('الآن', 'Now')], ['phases', bi('كل المراحل', 'All phases')], ['qual', bi('الصفات والأخطاء', 'Qualities & mistakes')], ['drills', bi('التمارين', 'Drills')]];
const list = (a, cls = 'tick') => `<ul class="${cls}">${(a || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
function swBlock(x, title, sub) { return x ? `<section class="card"><div class="eyebrow">${esc(title)}</div><h3>${esc(sub)}</h3><p class="desc">${esc(T(x).p)}</p><div class="sw2"><div><div class="lbl good">✓ ${L('نقاط القوة', 'Strengths')}</div>${list(T(x).s, 'plain')}</div><div><div class="lbl bad">! ${L('نقاط الضعف', 'Weaknesses')}</div>${list(T(x).w, 'plain')}</div></div></section>` : '' }
function rolePanel() {
  const el = $('#role .pb'), mode = C.mode, rs = RS(), n = PHN(), ps = PHS(), lay0 = layout(), p = selP(lay0); let h = '', tabs;
  el.dir = E.getLang() === 'en' ? 'ltr' : 'rtl';
  if (!p) {
    tabs = TABS_TEAM; $('#role .ttl').innerHTML = `${L('الفريق كله', 'Whole team')} <em class="en">Team view</em>`;
    const fk = E.FORM[mode] ? E.stForm(mode) : mode === 'vb' ? 'vb51' : E.stForm(mode), fi = E.FINFO[fk], dk = mode === 'bb' || mode === 'hb' ? E.stDef(mode) : null, di = dk ? E.FINFO[dk] : null;
    h += `<section class="card accent" data-tab="now" style="--c:${PHC[C.phase]}"><div class="eyebrow">${L('المرحلة الحالية', 'Current phase')} · ${ps.indexOf(C.phase) + 1}/${ps.length}</div><h3>${esc(T(n[C.phase]))}</h3>${list(T(E.PHASE_INFO[rs][C.phase]))}</section>`;
    h += `<section class="card" data-tab="now"><div class="eyebrow">${L('كل المراحل', 'All phases')}</div><div class="pmini">${ps.map(q => `<button class="${q === C.phase ? 'on' : ''}" data-ph2="${q}" style="--c:${PHC[q]}"><b>${esc(T(n[q]))}</b><span>${esc(T(E.PHASE_INFO[rs][q])[0] || '')}</span></button>`).join('')}</div></section>`;
    h += swBlock(fi, L('تحليل الخطة', 'Formation analysis'), mode === 'vb' ? L('نظام 5-1', '5-1 system') : E.fname(mode, 'A', fk)).replace('<section class="card">', '<section class="card" data-tab="plan">');
    if (di) h += swBlock(di, L('نظام الدفاع', 'Defensive system'), E.fname(mode, 'B', dk)).replace('<section class="card">', '<section class="card" data-tab="plan">');
    h += `<section class="card" data-tab="players"><div class="eyebrow">${L('اللاعبون في الخطة — اضغط لاعب', 'Players in the shape — tap one')}</div><div class="slots">${lay0.players.map(q => { const r = roleOfP(q); return `<button data-slot="${q.id}"><span class="num">${esc(q.n)}</span><span class="g"><b>${esc(E.codeName(rs, q.code))}</b><small>${esc(r ? T(r.name) : '')}</small></span><span class="ar">‹</span></button>` }).join('')}</div></section>`;
  } else {
    tabs = TABS_ROLE; const F = famOf(p), role = roleOfP(p), variants = E.ROLES.filter(r => r.rs === rs && r.fam === p.fam), cur = C.phase === 'sp' ? T(role.sp) : T(role.ph[C.phase]);
    $('#role .ttl').innerHTML = `<b class="tag">${esc(p.code)} · ${esc(p.n)}</b> ${esc(T(F.name))}`;
    h += `<div class="headr"><button class="back" data-back title="${L('كل الفريق', 'Whole team')}">→ ${L('كل الفريق', 'Team')}</button><span class="num big">${esc(p.n)}</span><div><div class="eyebrow">${esc(p.code)} · ${esc(T(F.name))}</div><h3>${esc(E.codeName(rs, p.code))}</h3></div></div>`;
    if (variants.length > 1) h += `<section class="card" data-tab="now"><div class="eyebrow">${L('اختر الدور — يتغير التحرك على الملعب', 'Choose the role — movement updates on the pitch')}</div><div class="chips">${variants.map(v => `<button class="chip ${v.id === role.id ? 'on' : ''}" data-rv="${v.id}">${esc(T(v.name))}</button>`).join('')}</div></section>`;
    h += `<section class="card" data-tab="now"><h2>${esc(T(role.name))}</h2><div class="e2">${esc(E.getLang() === 'ar' ? role.name.en : role.name.ar)}</div><p class="desc">${esc(T(role.desc))}</p></section>`;
    h += `<section class="card accent" data-tab="now" style="--c:${PHC[C.phase]}"><div class="eyebrow">${L('مهمته الآن', 'His job right now')} — ${esc(T(n[C.phase]))}</div>${list(cur)}</section>`;
    h += `<section class="card" data-tab="phases"><div class="eyebrow">${L('المهام في كل المراحل', 'Tasks in every phase')}</div>${ps.map(q => `<div class="phx ${q === C.phase ? 'on' : ''}" data-ph2="${q}" style="--c:${PHC[q]}"><div class="phh"><i></i>${esc(T(n[q]))} <em class="en">${esc(n[q].en)}</em>${q === C.phase ? `<span class="now">${L('الآن', 'Now')}</span>` : ''}</div>${list(q === 'sp' ? T(role.sp) : T(role.ph[q]), 'plain')}</div>`).join('')}</section>`;
    h += `<section class="card" data-tab="qual"><div class="eyebrow">${L('الصفات المطلوبة', 'Key attributes')}</div><div class="attrs">${F.qual.map(([a, v]) => `<div><span>${esc(T(E.ATTR[a]))}</span><span class="dots">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}</div></section>`;
    h += `<section class="card" data-tab="qual"><div class="eyebrow">${L('مؤشرات الأداء (KPIs)', 'Performance indicators (KPIs)')}</div><div class="kpi">${T(role.kpi).map(x => `<div>${esc(x)}</div>`).join('')}</div></section>`;
    h += `<section class="card" data-tab="qual"><div class="sw2"><div><div class="lbl bad">! ${L('أخطاء شائعة', 'Common mistakes')}</div>${list(T(F.mistakes), 'plain')}</div><div><div class="lbl good">🗣 ${L('تعليمات المدرب', 'Coaching cues')}</div>${list(T(F.cues), 'plain cues')}</div></div></section>`;
    h += `<section class="card" data-tab="qual"><div class="eyebrow">${L('للفئات السنية', 'For youth groups')}</div><p class="desc">${esc(T(F.youth))}</p></section>`;
    h += `<section class="card" data-tab="drills"><div class="eyebrow">${L('تمارين لتطوير الدور', 'Drills to develop the role')}</div><div class="dr">${role.drills.map(id => { const d = E.drillById(id); return d ? `<button><span class="pill">${esc(T(E.CATS[d.cat]))}</span><span class="g">${esc((d[E.getLang()] || d.ar).name)}</span><span class="mut">${d.dur} ${L('د', 'min')}</span></button>` : '' }).join('')}</div></section>`;
    if (C.phase === 'sp' && T(role.sp).length) { }
  }
  const keys = tabs.map(t => t[0]); if (!keys.includes(X.tab)) X.tab = keys[0];
  el.innerHTML = `<div class="tabs">${tabs.map(([k, t]) => `<button data-tb="${k}" class="${k === X.tab ? 'on' : ''}">${esc(T(t))}</button>`).join('')}<button data-tb="all" class="${X.tab === 'all' ? 'on' : ''}">${L('الكل', 'All')}</button></div>` + h;
  const show = () => { $$('[data-tab]', el).forEach(c => c.hidden = X.tab !== 'all' && c.dataset.tab !== X.tab); $$('[data-tb]', el).forEach(b => b.classList.toggle('on', b.dataset.tb === X.tab)) }; show();
  $$('[data-tb]', el).forEach(b => b.onclick = () => { X.tab = b.dataset.tb; store.set('im-roles-tab', X.tab); show() });
  $$('[data-slot]', el).forEach(b => b.onclick = () => selectSlot(b.dataset.slot)); $$('[data-ph2]', el).forEach(b => b.onclick = () => setPhase(b.dataset.ph2));
  $$('[data-rv]', el).forEach(b => b.onclick = () => chooseRole(b.dataset.rv)); const bk = el.querySelector('[data-back]'); if (bk) bk.onclick = () => { C.sel = null; X.cmp = null; saveSt(); highlight(); zones(); panels() };
}
function chooseRole(id) { const p = selP(); if (!p) return; C.rv[E.rvKey(C.mode, formKey(), p.id)] = id; X.cmp = null; saveSt(); place(false); panels() }

/* ---------- variants & visual comparison (new) ---------- */
function axes(r) { if (!r) return [0, 0, 0, 0, 0]; const z = r.z?.wb || [0, 0, 0, 0], cnt = k => ((r.ph[k] || {}).ar || []).length; return [z[0], Math.min(1, z[3] * 3), Math.min(1, z[2] * 3.5), Math.min(1, (cnt('att') + cnt('ta')) / 5), Math.min(1, (cnt('def') + cnt('td')) / 5)] }
function radar(a, b) {
  const AX = [L('التقدم', 'Depth'), L('الاتساع', 'Width'), L('المساحة', 'Range'), L('الحمل الهجومي', 'Attack load'), L('الحمل الدفاعي', 'Defence load')], c = [100, 92], R0 = 62, pt = (v, i) => { const an = -Math.PI / 2 + i * 2 * Math.PI / 5; return [c[0] + Math.cos(an) * R0 * v, c[1] + Math.sin(an) * R0 * v] };
  const poly = (vs, col, op) => `<polygon points="${vs.map((v, i) => pt(Math.max(.08, v), i).join(',')).join(' ')}" fill="${col}" fill-opacity="${op}" stroke="${col}" stroke-width="2"/>`;
  let s = [.33, .66, 1].map(v => `<polygon class="gr" points="${AX.map((_, i) => pt(v, i).join(',')).join(' ')}"/>`).join('') + AX.map((t, i) => { const [x, y] = pt(1, i), [lx, ly] = pt(1.3, i); return `<line class="gr" x1="${c[0]}" y1="${c[1]}" x2="${x}" y2="${y}"/><text x="${lx}" y="${ly + 4}">${t}</text>` }).join('');
  if (b) s += poly(axes(b), CMPC, .18); s += poly(axes(a), '#1FB5A8', .28); return `<svg viewBox="0 -2 200 190">${s}</svg>`
}
function varsPanel() {
  const el = $('#vars .pb'), rs = RS(), p = selP();
  if (!p) { $('#vars .ttl').innerHTML = `${L('أدوار المركز', 'Role variants')} <em class="en">Compare</em>`; el.innerHTML = `<p class="mut">${L('اختار لاعب من الملعب أو من قائمة «اللاعبون» عشان تشوف أدوار مركزه وتقارن بينها.', 'Pick a player on the pitch or in the Players list to see and compare the roles of his position.')}</p>` + allRoles(); bindAll(); return }
  const role = roleOfP(p), vs = E.ROLES.filter(r => r.rs === rs && r.fam === p.fam), cmp = X.cmp && E.roleById(X.cmp);
  const rate = r => { const z = r.z?.wb || [0, 0, 0, 0]; return [[L('التقدم', 'Depth'), z[0]], [L('الاتساع', 'Width'), Math.min(1, (z[3] || 0) * 3)], [L('المساحة', 'Range'), Math.min(1, (z[2] || 0) * 3.5)]] };
  $('#vars .ttl').innerHTML = `${L('أدوار المركز', 'Role variants')} ${esc(p.code)} <em class="en">· ${vs.length}</em>`;
  el.innerHTML = vs.map(r => `<div class="vc ${r.id === role.id ? 'on' : ''} ${r.id === X.cmp ? 'cm' : ''}" data-id="${r.id}"><div class="vh"><b>${esc(T(r.name))}</b>${r.id !== role.id ? `<button class="vsb" data-c="${r.id}">${r.id === X.cmp ? '✕ ' + L('إلغاء', 'Clear') : L('قارن', 'Compare')}</button>` : `<span class="cur">${L('المختار', 'Selected')}</span>`}</div><small>${esc(E.getLang() === 'ar' ? r.name.en : r.name.ar)}</small><p>${esc(T(r.desc))}</p><div class="cmp">${rate(r).map(([a, v]) => `<div><span>${a}</span><i><b style="width:${Math.round(v * 100)}%"></b></i></div>`).join('')}</div></div>`).join('')
    + `<div class="rad">${radar(role, cmp)}<div class="lg"><span><i style="background:#1FB5A8"></i>${esc(T(role.name))}</span>${cmp ? `<span><i style="background:${CMPC}"></i>${esc(T(cmp.name))}</span>` : `<span class="mut">${L('اضغط «قارن» على دور تاني يترسم فوقه في الملعب', 'Press Compare on another role to overlay it on the pitch')}</span>`}</div></div>`
    + (cmp ? `<section class="card"><div class="eyebrow">${L('الفرق في المهام', 'Difference in tasks')} — ${esc(T(PHN()[C.phase]))}</div><div class="sw2"><div><div class="lbl" style="color:#1FB5A8">${esc(T(role.name))}</div>${list(C.phase === 'sp' ? T(role.sp) : T(role.ph[C.phase]), 'plain')}</div><div><div class="lbl" style="color:${CMPC}">${esc(T(cmp.name))}</div>${list(C.phase === 'sp' ? T(cmp.sp) : T(cmp.ph[C.phase]), 'plain')}</div></div></section>` : '') + allRoles(role);
  $$('#vars .vc', document).forEach(b => b.onclick = e => { const c = e.target.closest('.vsb'); if (c) { X.cmp = X.cmp === c.dataset.c ? null : c.dataset.c; zones(); varsPanel() } else chooseRole(b.dataset.id) }); bindAll();
}
function allRoles(role) { const rs = RS(), all = E.ROLES.filter(r => r.rs === rs); return `<div class="all"><span class="mut">${L('كل أدوار', 'All roles in')} ${esc(T(E.MODES[C.mode].name))} · ${all.length}</span>${all.map(r => `<button class="chip ${role && r.id === role.id ? 'on' : ''}" data-r="${r.id}">${esc(T(r.name))}</button>`).join('')}</div>` }
function bindAll() { $$('#vars [data-r]').forEach(b => b.onclick = () => { const r = E.roleById(b.dataset.r), q = layout().players.find(x => x.fam === r.fam); if (!q) { toast(L('الدور ده لمركز مش موجود في الخطة الحالية — غيّر الخطة', 'This role belongs to a position not in the current shape — change the formation')); return } C.sel = q.id; C.rv[E.rvKey(C.mode, formKey(), q.id)] = r.id; X.cmp = null; saveSt(); highlight(); place(false); panels() }) }
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 2800) }
function panels() { rolePanel(); varsPanel(); $('#tlnote').textContent = `${T(E.MODES[C.mode].name)} · ${L('المرحلة', 'Phase')} ${PHS().indexOf(C.phase) + 1}/${PHS().length}` }

/* ---------- infographic card (print / PDF) ---------- */
function printCard() {
  const img = rn.domElement.toDataURL('image/jpeg', .9), p = selP(), n = PHN(), ps = PHS(), rs = RS(), mode = C.mode, dir = E.getLang() === 'en' ? 'ltr' : 'rtl'; let body;
  if (p) { const F = famOf(p), r = roleOfP(p); body = `<h1>${esc(p.n)} — ${esc(E.codeName(rs, p.code))} · ${esc(T(r.name))}</h1><p class="s">${esc(T(r.desc))}</p><img src="${img}"><div class="g"><section><h3>${L('الصفات المطلوبة', 'Key attributes')}</h3>${F.qual.map(([a, v]) => `<div class="a"><span>${esc(T(E.ATTR[a]))}</span><b>${'●'.repeat(v)}${'○'.repeat(5 - v)}</b></div>`).join('')}</section><section><h3>${L('مؤشرات الأداء', 'KPIs')}</h3>${list(T(r.kpi))}</section><section><h3>${L('أخطاء شائعة', 'Common mistakes')}</h3>${list(T(F.mistakes))}</section><section><h3>${L('تعليمات المدرب', 'Coaching cues')}</h3>${list(T(F.cues))}</section></div><div class="ph">${ps.map(q => `<section class="${q === C.phase ? 'on' : ''}"><h3>${esc(T(n[q]))}</h3>${list(q === 'sp' ? T(r.sp) : T(r.ph[q]))}</section>`).join('')}</div><section><h3>${L('للفئات السنية', 'For youth groups')}</h3><p>${esc(T(F.youth))}</p></section>` }
  else { const fk = E.FORM[mode] ? E.stForm(mode) : mode === 'vb' ? 'vb51' : E.stForm(mode), fi = E.FINFO[fk]; body = `<h1>${esc(T(E.MODES[mode].name))} · ${esc(mode === 'vb' ? L('نظام 5-1', '5-1 system') : E.fname(mode, 'A', fk))}</h1><p class="s">${esc(T(n[C.phase]))}</p><img src="${img}"><div class="g">${fi ? `<section><h3>${L('تحليل الخطة', 'Formation analysis')}</h3><p>${esc(T(fi).p)}</p></section><section><h3>${L('نقاط القوة', 'Strengths')}</h3>${list(T(fi).s)}</section><section><h3>${L('نقاط الضعف', 'Weaknesses')}</h3>${list(T(fi).w)}</section>` : ''}<section><h3>${L('مبادئ المرحلة', 'Phase principles')}</h3>${list(T(E.PHASE_INFO[rs][C.phase]))}</section></div>` }
  const w = open('', '_blank'); if (!w) { toast(L('المتصفح منع فتح نافذة البطاقة — اسمح بالنوافذ المنبثقة', 'The browser blocked the card window — allow pop-ups')); return }
  w.document.write(`<!doctype html><html lang="${E.getLang()}" dir="${dir}"><head><meta charset="utf-8"><title>${L('بطاقة الدور', 'Role card')}</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:"IBM Plex Sans Arabic",sans-serif;color:#0b1726;margin:24px;max-width:1000px}h1{font-size:22px;margin:0}.s{color:#566;margin:4px 0 12px}img{width:100%;border-radius:12px}.g{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}.ph{display:grid;grid-template-columns:repeat(${ps.length},1fr);gap:8px}section{border:1px solid #dde4ec;border-radius:10px;padding:10px;break-inside:avoid}section.on{border-color:#1FB5A8;background:#e6f7f5}h3{font-size:13px;margin:0 0 6px;color:#0f8f84}li,p{font-size:12.5px;line-height:1.7}.a{display:flex;justify-content:space-between;font-size:12.5px}.a b{color:#1FB5A8;letter-spacing:2px}footer{margin-top:14px;font-size:11px;color:#677;display:flex;justify-content:space-between}</style></head><body>${body}<footer><span>IM Training · ${L('المراكز والأدوار', 'Positions & Roles')}</span><b>Instructor: Mohamed Ayad</b></footer><script>setTimeout(()=>print(),600)<\/script></body></html>`); w.document.close();
}

/* ---------- top bar wiring ---------- */
$$('#camv button').forEach(b => b.onclick = () => setCam(b.dataset.v));
$$('#lang button').forEach(b => b.onclick = () => { E.setLang(b.dataset.l); $$('#lang button').forEach(x => x.classList.toggle('on', x === b)); all() });
$('#th').onclick = () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; store.set('im-theme-v', root.dataset.theme); buildArena() };
$('#card').onclick = printCard; $$('[data-play]').forEach(b => b.onclick = togglePlay); $('#prev').onclick = () => step(-1); $('#next').onclick = () => step(1);
$('#speed').onchange = e => { X.speed = +e.target.value; nextAt = performance.now() + 2800 / X.speed };
function all() { controls(); phaseBar(); panels(); playBtns(); placePanels() }

/* ---------- boot ---------- */
const H = location.hash; if (H.includes('dark')) root.dataset.theme = 'dark';
const hm = (H.match(/mode=(\w+)/) || [])[1]; if (hm && E.MODES[hm]) { C.mode = hm; C.phase = PHS()[0] }
if (!H.includes('team') && !selP()) { const pl = layout().players; C.sel = (pl[C.mode === 'fb11' ? 1 : 0] || pl[0]).id } if (H.includes('team')) C.sel = null;
const hp = (H.match(/ph=(\w+)/) || [])[1]; if (hp) { C.phase = hp; X.play = false } const ht = (H.match(/tab=(\w+)/) || [])[1]; if (ht) X.tab = ht;
resize(); buildArena(); all();
if (H.includes('cmp')) { const p = selP(); const v = E.ROLES.filter(r => r.rs === RS() && r.fam === p.fam); X.cmp = (v[1] || v[0]).id; zones(); varsPanel() }
['top', 'goal', 'player'].forEach(v => H.includes('cam=' + v) && setCam(v, true)); if (H.includes('still')) X.play = false; playBtns();
raf = requestAnimationFrame(tick);
return () => { dead = true; cancelAnimationFrame(raf); offs.forEach(f => f()); obs.forEach(o => o.disconnect()); try { ctl.dispose() } catch (e) { } scene.traverse(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { x.map?.dispose?.(); x.dispose?.() }) }); rn.dispose(); rn.forceContextLoss?.() };
}
