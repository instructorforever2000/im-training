// السبورة التكتيكية (Tactical board) — ported verbatim from the platform v28 (legacy/v28/index.html):
// pitch engine (3341–3461), play compiler & player (4690–4837), tactical board (5277–5542), save as play (5916–).
// Free drawing (pass, run, dribble, line, freehand, zone, text, eraser, curved arrows, 6 colours), formations for both teams,
// equipment, roles & movement zones per player, frames with captions, playback, WebM video, PNG export, board library, undo/redo.
// Only the platform shell around it is new (state on this device, modal, toast); the behaviour is unchanged.
/* eslint-disable */
import { ENG } from "@/features/roles/engine/engine"
import { can, guard } from "@/features/auth/caps"
/** Image and video export need the "download" capability (new; the rest of the board is unchanged). */
const noDownload = () => { if (can("download")) return false; guard("download", () => {}); return true }

const { MODES, FORM, BB_OFF, BB_DEF, HB_OFF, HB_DEF, CODE_FAMILY, CODE_NAME, ROLES, VB_FORMS, vbFormation, phasesOf, roleById, defaultVariant, codeName, fname } = ENG
let LANG = "ar"
const L = (ar, en) => (LANG === "en" ? en : ar)
const T = (v) => (v == null ? "" : typeof v === "object" && !Array.isArray(v) && ("ar" in v || "en" in v) ? v[LANG] ?? v.ar : v)
const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
const pad = (n) => String(n).padStart(2, "0")
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const todayISO = () => toISO(new Date())

/* ---- platform shell: state kept on this device ---- */
const KEY = "im-board-v1"
const S = (() => { let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || "null") } catch { s = null }
  s = s || {}; s.ui = Object.assign({ view: "board", mode: "fb11", labels: "pos" }, s.ui || {}); s.work = s.work || {}; s.boards = s.boards || []; s.plays = s.plays || []; s.teams = []; s.players = []; return s })()
function save() { try { const { teams, players, ...keep } = S; localStorage.setItem(KEY, JSON.stringify(keep)) } catch { /* storage full or private mode */ } }
const teamById = () => undefined
const playerById = () => undefined
const teamPlayers = () => []
const teamMode = (t) => t.mode
function go(v) { if (v === "roles") location.hash = "#/roles" }
let modalStack = []
function toast(msg) { $$(".bd-toast").forEach((x) => x.remove()); const t = document.createElement("div"); t.className = "bd-toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600) }
function openModal({ title, body, foot = "", wide = false }) {
  const bg = document.createElement("div"); bg.className = "bd-modal-bg"
  bg.innerHTML = `<div class="bd-modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3><button class="btn ghost icon" data-close aria-label="${L("إغلاق", "Close")}">${icon("x")}</button></header><div class="body">${body}</div>${foot ? `<footer>${foot}</footer>` : ""}</div>`
  bg.addEventListener("pointerdown", (e) => { if (e.target === bg) closeModal() }); bg.querySelector("[data-close]").onclick = closeModal
  ;(document.querySelector(".bd") || document.body).appendChild(bg); modalStack.push(bg); const f = bg.querySelector("input:not([type=range]),select,textarea"); if (f) setTimeout(() => f.focus(), 30)
  return bg.querySelector(".bd-modal")
}
function closeModal() { const m = modalStack.pop(); if (m) m.remove() }
function confirmBox(msg, onYes, yesLabel, danger = true) {
  const m = openModal({ title: L("تأكيد", "Confirm"), body: `<p style="margin:0">${esc(msg)}</p>`, foot: `<button class="btn" data-no>${L("إلغاء", "Cancel")}</button><button class="btn ${danger ? "danger" : "primary"}" data-yes>${esc(yesLabel || L("تأكيد", "Confirm"))}</button>` })
  m.querySelector("[data-no]").onclick = closeModal; m.querySelector("[data-yes]").onclick = () => { closeModal(); onYes() }
}
const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? "selected" : ""}>${esc(l)}</option>`
async function downloadFile(name, data, type) {
  try { const blob = data instanceof Blob ? data : new Blob([data], { type }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 800); return true } catch { return false }
}

/* ---- legacy v28: icons ---- */
const IC = {
  home: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/><circle cx="12" cy="12" r="3"/><path d="M3 9h3v6H3M21 9h-3v6h3"/>',
  roles: '<circle cx="12" cy="6" r="2.4"/><circle cx="6" cy="14" r="2.4"/><circle cx="18" cy="14" r="2.4"/><path d="M10.5 8 7.5 12M13.5 8l3 4M8.4 14h7.2"/><path d="M12 19v2" />',
  drills: '<path d="M12 3 5 20h14L12 3z"/><path d="M8 13h8M6.5 17h11"/>',
  sessions: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h3v3H8z"/>',
  squad: '<circle cx="8" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M2.5 19.5c.5-3.3 2.8-5.5 5.5-5.5s5 2.2 5.5 5.5M14.5 14.4c.8-.3 1.6-.4 2.5-.4 2.4 0 4.3 1.8 4.7 4.5"/>',
  eval: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z"/>',
  reports: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7M9 8h3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="m5 12 5 5 9-10"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>', redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>', image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  play: '<path d="M7 4v16l13-8z"/>', pause: '<path d="M7 4h4v16H7zM14 4h4v16h-4z"/>',
  right: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>',
  select: '<path d="M5 3l6 17 2.5-7.5L21 10z"/>',
  pass: '<path d="M4 18 18 6" stroke-dasharray="3 3"/><path d="M11 6h7v7"/>', run: '<path d="M4 18 18 6"/><path d="M11 6h7v7"/>',
  dribble: '<path d="M3 17c2-3 3 1 5-2s3 1 5-2 3 1 5-3"/><path d="M14 6h5v5"/>', line: '<circle cx="5" cy="17" r="2"/><circle cx="19" cy="7" r="2"/><path d="M7 16 17 8"/>',
  pen: '<path d="M3 21c3-1 4-4 6-6l8-8 3 3-8 8c-2 2-5 3-6 6"/>', zone: '<rect x="4" y="5" width="16" height="14" rx="2" stroke-dasharray="3 2.5"/>',
  text: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>', eraser: '<path d="M16 3l5 5-11 11H5l-2-2z"/><path d="M9 9l6 6M13 21h8"/>',
  cone: '<path d="M12 4 7 19h10z"/><path d="M5 20h14M9.3 12h5.4"/>', ball: '<circle cx="12" cy="12" r="8"/><path d="m12 8 3 2.2-1.2 3.6h-3.6L9 10.2z"/>',
  pole: '<path d="M12 3v18"/><circle cx="12" cy="20" r="2"/>', dummy: '<rect x="9" y="3" width="6" height="18" rx="3"/>',
  goal: '<path d="M3 18V7h18v11"/><path d="M3 11h18M3 14.5h18M8 7v11M13 7v11M18 7v11" opacity=".5"/>', hurdle: '<path d="M5 18V9h14v9M5 12h14"/>',
  ladder: '<path d="M6 3v18M18 3v18M6 7h12M6 11h12M6 15h12M6 19h12"/>', player: '<circle cx="12" cy="12" r="7"/><path d="M12 9v6"/>',
  rotate: '<path d="M20 11a8 8 0 1 0-2.4 5.7"/><path d="M20 4v7h-7"/>', copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  download: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>', upload: '<path d="M12 20V9m-5 5 5-5 5 5M5 4h14"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>', layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>', bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  shield: '<path d="M12 3 4 6v6c0 4.4 3.4 7.9 8 9 4.6-1.1 8-4.6 8-9V6z"/>', swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  whistle: '<circle cx="9" cy="14" r="5"/><path d="M13 11l8-4v4l-7 3"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

/* ---- legacy v28: helpers ---- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const sum = a => a.reduce((x, y) => x + y, 0);

/* ---- legacy v28: pitch engine ---- */
/* ============================================================
   PITCH ENGINE — shared by the tactical board and the roles studio.
   Everything is drawn in metres inside an SVG; portrait screens rotate the world.
   ============================================================ */
const DRAW_COLORS = ['#FFFFFF', '#F4D03F', '#FF6B5E', '#4FD1C5', '#7DB4FF', '#111827'];
const lum = hex => { const c = hex.replace('#', ''); const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

function courtSVG(mode, lw) {
  const M = MODES[mode], L_ = M.L, W = M.W, m = M.m; const st = `stroke="#fff" stroke-width="${lw}" fill="none" stroke-linecap="round"`; let s = '';
  if (M.area) {
    const bg = { grass: ['#2B7A4B', '#2F8452'], orange: ['#2F6FA8', '#E0873D'], blue: ['#2E5E8E', '#3C79B5'] }[M.surface] || ['#2B7A4B', '#2F8452'];
    s += `<rect x="${-m}" y="${-m}" width="${L_ + 2 * m}" height="${W + 2 * m}" fill="${bg[0]}"/><rect x="0" y="0" width="${L_}" height="${W}" fill="${bg[1]}"/>`;
    if (M.surface === 'grass') for (let i = 0; i < 6; i++) if (i % 2) s += `<rect x="${i * L_ / 6}" y="0" width="${L_ / 6}" height="${W}" fill="#2B7A4B" opacity=".45"/>`;
    return s + `<rect x="0" y="0" width="${L_}" height="${W}" stroke="#fff" stroke-opacity=".75" stroke-width="${lw}" stroke-dasharray="${lw * 4} ${lw * 3}" fill="none"/>`;
  }
  if (mode === 'fb11' || mode === 'fb7') {
    const D = mode === 'fb11' ? { box: [16.5, 40.32], six: [5.5, 18.32], spot: 11, cc: 9.15, goal: 7.32, arc: true, corner: 1 } : { box: [9, 20], six: null, spot: 8, cc: 6, goal: 5, arc: false, corner: .8 };
    s += `<rect x="${-m}" y="${-m}" width="${L_ + 2 * m}" height="${W + 2 * m}" fill="#2B7A4B"/>`;
    for (let i = 0; i < 12; i++) if (i % 2) s += `<rect x="${i * L_ / 12}" y="0" width="${L_ / 12}" height="${W}" fill="#2F8452"/>`;
    s += `<rect x="0" y="0" width="${L_}" height="${W}" ${st}/><line x1="${L_ / 2}" y1="0" x2="${L_ / 2}" y2="${W}" ${st}/><circle cx="${L_ / 2}" cy="${W / 2}" r="${D.cc}" ${st}/><circle cx="${L_ / 2}" cy="${W / 2}" r="${lw * 1.6}" fill="#fff"/>`;
    for (const side of [0, 1]) {
      const X = x => side ? L_ - x : x;
      s += `<rect x="${side ? L_ - D.box[0] : 0}" y="${W / 2 - D.box[1] / 2}" width="${D.box[0]}" height="${D.box[1]}" ${st}/>`;
      if (D.six) s += `<rect x="${side ? L_ - D.six[0] : 0}" y="${W / 2 - D.six[1] / 2}" width="${D.six[0]}" height="${D.six[1]}" ${st}/>`;
      s += `<circle cx="${X(D.spot)}" cy="${W / 2}" r="${lw * 1.6}" fill="#fff"/>`;
      if (D.arc) { const dx = D.box[0] - D.spot, dy = Math.sqrt(D.cc * D.cc - dx * dx); s += `<path d="M${X(D.box[0])} ${W / 2 - dy} A${D.cc} ${D.cc} 0 0 ${side ? 0 : 1} ${X(D.box[0])} ${W / 2 + dy}" ${st}/>`; }
      s += `<rect x="${side ? L_ : -1.6}" y="${W / 2 - D.goal / 2}" width="1.6" height="${D.goal}" fill="rgba(255,255,255,.25)" ${st}/>`;
      const c = D.corner; s += `<path d="M${X(0)} ${c} A${c} ${c} 0 0 ${side ? 1 : 0} ${X(c)} 0" ${st}/><path d="M${X(c)} ${W} A${c} ${c} 0 0 ${side ? 1 : 0} ${X(0)} ${W - c}" ${st}/>`;
    }
  } else if (mode === 'futsal' || mode === 'hb') {
    const hb = mode === 'hb';
    s += `<rect x="${-m}" y="${-m}" width="${L_ + 2 * m}" height="${W + 2 * m}" fill="${hb ? '#2E5E8E' : '#27496E'}"/><rect x="0" y="0" width="${L_}" height="${W}" fill="${hb ? '#3C79B5' : '#3E7FB8'}"/>`;
    const area = (r, side, fill, dash) => { const c1 = W / 2 - 1.5, c2 = W / 2 + 1.5; const X = x => side ? L_ - x : x; const sw = side ? 0 : 1;
      return `<path d="M${X(0)} ${c1 - r} A${r} ${r} 0 0 ${sw} ${X(r)} ${c1} L${X(r)} ${c2} A${r} ${r} 0 0 ${sw} ${X(0)} ${c2 + r}" fill="${fill}" stroke="#fff" stroke-width="${lw}" ${dash ? `stroke-dasharray="${lw * 4} ${lw * 3}"` : ''}/>`; };
    for (const side of [0, 1]) {
      const X = x => side ? L_ - x : x;
      s += area(6, side, hb ? '#E0A93B' : '#E0873D', false);
      if (hb) s += area(9, side, 'none', true) + `<line x1="${X(7)}" y1="${W / 2 - .5}" x2="${X(7)}" y2="${W / 2 + .5}" ${st}/><line x1="${X(4)}" y1="${W / 2 - .08}" x2="${X(4)}" y2="${W / 2 + .08}" ${st}/>`;
      else s += `<circle cx="${X(6)}" cy="${W / 2}" r="${lw * 1.6}" fill="#fff"/><circle cx="${X(10)}" cy="${W / 2}" r="${lw * 1.6}" fill="#fff"/><line x1="${X(5)}" y1="${W + .25}" x2="${X(5)}" y2="${W - .2}" ${st}/><line x1="${X(5)}" y1="-.25" x2="${X(5)}" y2=".2" ${st}/>`;
      s += `<rect x="${side ? L_ : -1}" y="${W / 2 - 1.5}" width="1" height="3" fill="rgba(255,255,255,.3)" ${st}/>`;
    }
    s += `<rect x="0" y="0" width="${L_}" height="${W}" ${st}/><line x1="${L_ / 2}" y1="0" x2="${L_ / 2}" y2="${W}" ${st}/><circle cx="${L_ / 2}" cy="${W / 2}" r="3" ${st}/>`;
  } else if (mode === 'bb') {
    s += `<rect x="${-m}" y="${-m}" width="${L_ + 2 * m}" height="${W + 2 * m}" fill="#243B55"/><rect x="0" y="0" width="${L_}" height="${W}" fill="#C98E55"/>`;
    for (const side of [0, 1]) {
      const X = x => side ? L_ - x : x; const sw = side ? 0 : 1;
      s += `<rect x="${side ? L_ - 5.8 : 0}" y="${W / 2 - 2.45}" width="5.8" height="4.9" fill="#1F4E79" ${st}/><circle cx="${X(5.8)}" cy="${W / 2}" r="1.8" ${st}/>`;
      s += `<path d="M${X(0)} .9 L${X(2.99)} .9 A6.75 6.75 0 0 ${sw} ${X(2.99)} ${W - .9} L${X(0)} ${W - .9}" ${st}/><path d="M${X(1.575)} ${W / 2 - 1.25} A1.25 1.25 0 0 ${sw} ${X(1.575)} ${W / 2 + 1.25}" ${st}/>`;
      s += `<line x1="${X(1.2)}" y1="${W / 2 - .9}" x2="${X(1.2)}" y2="${W / 2 + .9}" stroke="#fff" stroke-width="${lw * 2}"/><circle cx="${X(1.575)}" cy="${W / 2}" r=".23" fill="none" stroke="#FF7A1A" stroke-width="${lw * 1.3}"/>`;
    }
    s += `<rect x="0" y="0" width="${L_}" height="${W}" ${st}/><line x1="${L_ / 2}" y1="0" x2="${L_ / 2}" y2="${W}" ${st}/><circle cx="${L_ / 2}" cy="${W / 2}" r="1.8" ${st}/>`;
  } else if (mode === 'vb') {
    s += `<rect x="${-m}" y="${-m}" width="${L_ + 2 * m}" height="${W + 2 * m}" fill="#2F6FA8"/><rect x="0" y="0" width="${L_}" height="${W}" fill="#E0873D"/><rect x="0" y="0" width="${L_}" height="${W}" ${st}/>`;
    for (const x of [6, 12]) s += `<line x1="${x}" y1="0" x2="${x}" y2="${W}" ${st}/><line x1="${x}" y1="-1.75" x2="${x}" y2="0" ${st} stroke-dasharray="${lw * 2} ${lw * 2.5}"/><line x1="${x}" y1="${W}" x2="${x}" y2="${W + 1.75}" ${st} stroke-dasharray="${lw * 2} ${lw * 2.5}"/>`;
    s += `<line x1="9" y1="-1" x2="9" y2="${W + 1}" stroke="#F5F7FA" stroke-width="${lw * 2.4}"/><line x1="9" y1="-1" x2="9" y2="${W + 1}" stroke="#0B1F3A" stroke-width="${lw * .8}" stroke-dasharray="${lw} ${lw}"/><circle cx="9" cy="-1" r="${lw * 3}" fill="#0B1F3A" stroke="#fff" stroke-width="${lw}"/><circle cx="9" cy="${W + 1}" r="${lw * 3}" fill="#0B1F3A" stroke="#fff" stroke-width="${lw}"/>`;
  }
  return s;
}
function viewRect(mode, view = 'full') { const M = MODES[mode], m = M.m; if (view === 'half') return { x0: M.L / 2 - m * .6, y0: -m, w: M.L / 2 + m * 1.6, h: M.W + 2 * m }; return { x0: -m, y0: -m, w: M.L + 2 * m, h: M.W + 2 * m }; }
/* Fit an svg to its container; returns {k, portrait}. world group rotates -90° in portrait. */
function fitSVG(svg, vr, allowPortrait = true) {
  const box = svg.parentElement.getBoundingClientRect(); const pw = Math.max(50, box.width - 20), ph = Math.max(50, box.height - 20);
  const portrait = allowPortrait && pw < ph * .95 && innerWidth < innerHeight; const vb = portrait ? [vr.y0, -(vr.x0 + vr.w), vr.h, vr.w] : [vr.x0, vr.y0, vr.w, vr.h];
  svg.setAttribute('viewBox', vb.join(' ')); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return { k: 1 / Math.min(pw / vb[2], ph / vb[3]), portrait };
}
function toWorldPt(e, svg, world) { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(world.getScreenCTM().inverse()); return [p.x, p.y]; }
function markerDefs(extra = '') { return `<defs>${DRAW_COLORS.map((c, i) => `<marker id="ah${i}${extra}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0 0 L10 5 L0 10 z" fill="${c}"/></marker>`).join('')}</defs>`; }
function smoothPath(pts) {
  if (pts.length < 2) return ''; if (pts.length === 2) return `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; } return d;
}
function wavyPath(pts, k) {
  const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; } if (tot < 1e-6) return '';
  const step = 2.5 * k, A = 4 * k, lam = 16 * k, tail = Math.min(14 * k, tot * .3), out = [];
  const at = d => { let acc = 0; for (let i = 0; i < seg.length; i++) { if (acc + seg[i] >= d || i === seg.length - 1) { const t = seg[i] ? (d - acc) / seg[i] : 0, a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / (seg[i] || 1), (b[1] - a[1]) / (seg[i] || 1)]; } acc += seg[i]; } };
  for (let d = 0; d <= tot - tail; d += step) { const [x, y, dx, dy] = at(d), o = Math.sin(d / lam * 2 * Math.PI) * A; out.push([x - dy * o, y + dx * o]); } out.push(pts[pts.length - 1]);
  return 'M' + out.map(p => p[0].toFixed(3) + ' ' + p[1].toFixed(3)).join(' L');
}
function drawingSVG(d, k, sel, portrait, mk = '') {
  const col = DRAW_COLORS[d.color ?? 1], sw = 2.6 * k, marker = `url(#ah${d.color ?? 1}${mk})`; let s = '';
  const hit = p => `<path d="${p}" stroke="transparent" stroke-width="${14 * k}" fill="none" data-drw="${d.id}"/>`;
  if (['pass', 'run', 'line', 'free'].includes(d.type)) {
    const p = smoothPath(d.pts); if (sel) s += `<path d="${p}" stroke="#F4D03F" stroke-opacity=".35" stroke-width="${sw * 3.2}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${p}" stroke="${col}" stroke-width="${d.type === 'line' ? sw * 1.3 : sw}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${d.type === 'pass' ? `stroke-dasharray="${7 * k} ${5 * k}"` : ''} ${d.type === 'pass' || d.type === 'run' ? `marker-end="${marker}"` : ''}/>`;
    if (d.type === 'line') { const a = d.pts[0], z = d.pts[d.pts.length - 1]; s += `<circle cx="${a[0]}" cy="${a[1]}" r="${3.5 * k}" fill="${col}"/><circle cx="${z[0]}" cy="${z[1]}" r="${3.5 * k}" fill="${col}"/>`; }
    s += hit(p);
  } else if (d.type === 'dribble') { const base = smoothPath(d.pts); if (sel) s += `<path d="${base}" stroke="#F4D03F" stroke-opacity=".35" stroke-width="${sw * 4}" fill="none"/>`; s += `<path d="${wavyPath(d.pts, k)}" stroke="${col}" stroke-width="${sw * .9}" fill="none" stroke-linejoin="round" marker-end="${marker}"/>` + hit(base); }
  else if (d.type === 'zone') { const [a, z] = d.pts; s += `<rect x="${Math.min(a[0], z[0])}" y="${Math.min(a[1], z[1])}" width="${Math.abs(z[0] - a[0])}" height="${Math.abs(z[1] - a[1])}" rx="${3 * k}" fill="${col}" fill-opacity=".22" stroke="${col}" stroke-width="${sw * (sel ? 1.4 : .8)}" stroke-dasharray="${6 * k} ${4 * k}" data-drw="${d.id}"/>`; }
  else if (d.type === 'text') { const [x, y] = d.pts[0]; s += `<g transform="translate(${x} ${y})${portrait ? ' rotate(90)' : ''}" data-drw="${d.id}"><text text-anchor="middle" dominant-baseline="central" font-size="${14 * k}" font-weight="700" font-family="IBM Plex Sans Arabic, system-ui, sans-serif" fill="${col}" stroke="rgba(0,0,0,.55)" stroke-width="${3 * k}" paint-order="stroke" ${sel ? 'text-decoration="underline"' : ''}>${esc(d.text)}</text></g>`; }
  return s;
}
function playerSVG({ id, x, y, num, label, color, k, portrait, sel, dim, gk, attr = 'data-tok', scale = 1, pulse }) {
  const r = 13 * k * scale, txt = lum(color) > .55 ? '#0B1F3A' : '#FFFFFF'; let s = '';
  if (pulse) s += `<circle r="${r + 6 * k}" fill="none" stroke="#F4D03F" stroke-width="${1.5 * k}" class="pulse-ring"/>`;
  s += `<circle r="${r + 1.5 * k}" fill="rgba(0,0,0,.35)" cy="${1.5 * k}"/><circle r="${r}" fill="${color}" stroke="#fff" stroke-width="${2 * k}"/>`;
  if (gk) s += `<circle r="${r - 3 * k}" fill="none" stroke="${txt}" stroke-opacity=".45" stroke-width="${1.2 * k}"/>`;
  s += `<text y="${.5 * k}" text-anchor="middle" dominant-baseline="central" font-size="${12 * k * scale}" font-weight="700" font-family="Readex Pro, IBM Plex Sans Arabic, system-ui, sans-serif" fill="${txt}">${esc(num ?? '')}</text>`;
  if (label) s += `<text y="${r + 9 * k}" text-anchor="middle" dominant-baseline="central" font-size="${9.5 * k}" font-weight="600" font-family="IBM Plex Sans Arabic, system-ui, sans-serif" fill="#fff" stroke="rgba(0,0,0,.7)" stroke-width="${2.6 * k}" paint-order="stroke">${esc(label)}</text>`;
  if (sel) s += `<circle r="${r + 4.5 * k}" fill="none" stroke="#F4D03F" stroke-width="${2.2 * k}" stroke-dasharray="${4 * k} ${3 * k}"/>`;
  return `<g ${attr}="${id}" transform="translate(${x} ${y})${portrait ? ' rotate(90)' : ''}" style="cursor:pointer" ${dim ? 'opacity=".55"' : ''}>${s}</g>`;
}
function ballSVG(sport, k) { const col = { football: '#FFFFFF', basketball: '#E07B2A', volleyball: '#F6E27A', handball: '#F2F2F2' }[sport]; return `<circle r="${6 * k}" fill="${col}" stroke="#111" stroke-width="${1.2 * k}"/><circle r="${2.2 * k}" fill="#111" opacity=".75"/>`; }
function equipSVG(t, sport, k, sel, portrait) {
  let g = ''; if (t.kind === 'ball') g = ballSVG(sport, k);
  if (t.kind === 'cone') g = `<path d="M0 ${-8 * k} L${7 * k} ${6 * k} L${-7 * k} ${6 * k}Z" fill="#FF8A1F" stroke="#fff" stroke-width="${1.2 * k}"/>`;
  if (t.kind === 'pole') g = `<circle r="${5 * k}" fill="#F7D43B" stroke="#111" stroke-width="${1.4 * k}"/><circle r="${1.6 * k}" fill="#111"/>`;
  if (t.kind === 'dummy') g = `<rect x="${-11 * k}" y="${-4 * k}" width="${22 * k}" height="${8 * k}" rx="${4 * k}" fill="#1E3A5F" stroke="#fff" stroke-width="${1.2 * k}"/>`;
  if (t.kind === 'minigoal') g = `<rect x="${-15 * k}" y="${-5 * k}" width="${30 * k}" height="${10 * k}" fill="rgba(255,255,255,.2)" stroke="#fff" stroke-width="${2 * k}"/><path d="M${-15 * k} 0 H${15 * k} M${-7.5 * k} ${-5 * k} V${5 * k} M0 ${-5 * k} V${5 * k} M${7.5 * k} ${-5 * k} V${5 * k}" stroke="#fff" stroke-width="${.8 * k}" opacity=".7"/>`;
  if (t.kind === 'hurdle') g = `<rect x="${-11 * k}" y="${-2 * k}" width="${22 * k}" height="${4 * k}" rx="${k}" fill="#FF6B3D" stroke="#fff" stroke-width="${k}"/>`;
  if (t.kind === 'ladder') { g = `<rect x="${-30 * k}" y="${-7 * k}" width="${60 * k}" height="${14 * k}" fill="none" stroke="#F7D43B" stroke-width="${1.6 * k}"/>`; for (let i = 1; i < 6; i++) g += `<line x1="${-30 * k + i * 10 * k}" x2="${-30 * k + i * 10 * k}" y1="${-7 * k}" y2="${7 * k}" stroke="#F7D43B" stroke-width="${1.4 * k}"/>`; }
  const ring = sel ? `<circle r="${(t.kind === 'ladder' ? 32 : 16) * k}" fill="none" stroke="#F4D03F" stroke-width="${2 * k}" stroke-dasharray="${4 * k} ${3 * k}"/>` : '';
  return `<g data-tok="${t.id}" transform="translate(${t.x} ${t.y})${portrait ? ' rotate(90)' : ''}" style="cursor:grab"><g transform="rotate(${t.rot || 0})">${g}</g>${ring}</g>`;
}
/* Role zones. flip = the token's team attacks toward x=0. which = 'both'|'wb'|'nb'. baseY = lateral reference in metres. */
function zonesSVG(mode, role, baseY, k, flip, which = 'both') {
  if (!role || !role.z) return ''; const M = MODES[mode]; const yf = flip ? 1 - baseY / M.W : baseY / M.W; const sign = yf > .56 ? 1 : yf < .44 ? -1 : 0;
  const shape = (z, col, dash) => { const [zx, dy, rx, ry] = z; let cy = clamp(yf + dy * sign, ry * .6, 1 - ry * .6), cx = zx; if (flip) { cx = 1 - cx; cy = 1 - cy; }
    return `<ellipse cx="${cx * M.L}" cy="${cy * M.W}" rx="${rx * M.L}" ry="${ry * M.W}" fill="${col}" fill-opacity=".2" stroke="${col}" stroke-width="${2 * k}" ${dash ? `stroke-dasharray="${6 * k} ${4 * k}"` : ''} class="zone-in"/>`; };
  return (which !== 'wb' ? shape(role.z.nb, '#4FD1C5', true) : '') + (which !== 'nb' ? shape(role.z.wb, '#F4D03F', false) : '');
}
/* Formation names */

/* ---- legacy v28: play categories ---- */
const PLAY_CATS = { build: { ar: 'البناء', en: 'Build-up' }, att: { ar: 'الهجوم المنظم', en: 'Attacking' }, press: { ar: 'الضغط', en: 'Pressing' }, counter: { ar: 'التحولات', en: 'Transitions' }, sp: { ar: 'الكرات الثابتة', en: 'Set pieces' }, def: { ar: 'الدفاع', en: 'Defending' }, drill: { ar: 'مخطط تمرين', en: 'Drill diagram' } };

/* ---- legacy v28: compile & player ---- */
const TEAM_COL = { a: '#E6BE3A', b: '#E0564F' };
const hashId = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const bez = (a, c2, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c2[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c2[1] + t * t * b[1]];
const bezPts = (a, c2, b, upto, n = 18) => { const o = []; for (let i = 0; i <= n; i++) o.push(bez(a, c2, b, upto * i / n)); return o; };

function compilePlay(p) {
  const M = MODES[p.mode], off = [Math.max(.25, M.L * .008), Math.max(.2, M.W * .012)];
  const pos = {}, meta = {}; p.tokens.forEach(([id, code, n, x, y]) => { pos[id] = [x, y]; meta[id] = { team: id[0] === 'b' ? 'b' : 'a', code, n }; });
  let holder = p.ball0; const segs = []; const init = JSON.parse(JSON.stringify(pos));
  p.steps.forEach(st => {
    const from = Object.assign({}, pos), to = Object.assign({}, pos); Object.entries(st.m || {}).forEach(([id, v]) => { if (to[id]) to[id] = v; });
    const nh = st.b !== undefined ? st.b : holder; const moves = [];
    for (const id in to) { const a = from[id], b = to[id], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < M.L * .004) continue;
      const kind = id === holder && id === nh ? 'dribble' : 'run', sgn = hashId(id) % 2 ? 1 : -1, cv = kind === 'run' ? .14 : .05;
      moves.push({ id, a, b, c: [(a[0] + b[0]) / 2 - (b[1] - a[1]) * cv * sgn, (a[1] + b[1]) / 2 + (b[0] - a[0]) * cv * sgn], kind, team: meta[id].team }); }
    let ball = null;
    if (nh !== holder && nh != null && holder != null) { const s = typeof holder === 'string' ? [from[holder][0] + off[0], from[holder][1] + off[1]] : holder; const e = typeof nh === 'string' ? [to[nh][0] + off[0], to[nh][1] + off[1]] : nh; ball = { kind: typeof nh === 'string' ? 'pass' : 'shot', a: s, b: e, c: [(s[0] + e[0]) / 2, (s[1] + e[1]) / 2] }; }
    segs.push({ from, to, moves, ball, h0: holder, h1: nh, cap: st.c, dur: st.d || (ball ? 1.9 : 1.6) });
    Object.assign(pos, to); holder = nh;
  });
  return { p, M, segs, off, meta, init, ball0: p.ball0 };
}
/* half-court framing when every position of the play stays in the attacking half */
function playView(cp) { if (cp.M.area || cp.p.mode === 'vb' || cp._view) return cp._view || 'full'; const xs = []; [cp.init].concat(cp.segs.map(s => s.to)).forEach(o => Object.values(o).forEach(q => xs.push(q[0]))); cp.segs.forEach(s => { if (s.ball) xs.push(s.ball.b[0]); });
  return (cp._view = Math.min(...xs) >= cp.M.L / 2 - cp.M.L * .02 ? 'half' : 'full'); }
/* token positions + ball at step i, progress t (0..1) */
function playState(cp, i, t) {
  const s = cp.segs[i], e = ease(clamp(t, 0, 1)), pos = Object.assign({}, s.from);
  s.moves.forEach(mv => pos[mv.id] = bez(mv.a, mv.c, mv.b, e));
  let ball = null, tb = 0;
  if (s.ball) { tb = ease(clamp((t - .3) / .7, 0, 1)); if (tb <= 0) { const h = s.h0; ball = typeof h === 'string' ? [pos[h][0] + cp.off[0], pos[h][1] + cp.off[1]] : h; } else ball = bez(s.ball.a, s.ball.c, s.ball.b, tb); }
  else { const h = s.h1; if (typeof h === 'string') ball = [pos[h][0] + cp.off[0], pos[h][1] + cp.off[1]]; else if (h) ball = h; }
  return { pos, ball, e, tb };
}
function arrowSVG(kind, pts, color, k, opacity, mk) {
  if (pts.length < 2) return ''; const d = 'M' + pts.map(q => q[0].toFixed(2) + ' ' + q[1].toFixed(2)).join(' L'); const sw = 2.4 * k;
  if (kind === 'dribble') return `<path d="${wavyPath(pts, k)}" stroke="${DRAW_COLORS[color]}" stroke-width="${sw * .9}" fill="none" opacity="${opacity}" marker-end="url(#ah${color}${mk})"/>`;
  return `<path d="${d}" stroke="${DRAW_COLORS[color]}" stroke-width="${sw}" fill="none" stroke-linecap="round" opacity="${opacity}" ${kind === 'pass' || kind === 'shot' ? `stroke-dasharray="${7 * k} ${5 * k}"` : ''} marker-end="url(#ah${color}${mk})"/>`;
}
function segArrows(cp, s, upto, uptoBall, k, opacity, mk) {
  let h = ''; s.moves.forEach(mv => { if (upto <= 0) return; const col = mv.team === 'b' ? 2 : 0; h += arrowSVG(mv.kind, bezPts(mv.a, mv.c, mv.b, upto), col, k, opacity, mk); });
  if (s.ball && uptoBall > 0) h += arrowSVG(s.ball.kind, bezPts(s.ball.a, s.ball.c, s.ball.b, uptoBall), 1, k, opacity, mk); return h;
}
function eqSVG(cp, k, portrait) { return (cp.p.eq || []).map(([kind, x, y, rot], i) => equipSVG({ id: 'eq' + i, kind, x, y, rot: rot || 0 }, cp.M.sport, k, false, portrait)).join(''); }
/* full world contents for one frame */
function frameInner(cp, i, t, k, portrait, opts = {}) {
  const st = playState(cp, i, t); let h = courtSVG(cp.p.mode, 1.6 * k) + eqSVG(cp, k, portrait);
  for (let j = 0; j < i; j++) h += segArrows(cp, cp.segs[j], 1, 1, k, .32, opts.mk || '');
  h += segArrows(cp, cp.segs[i], st.e, st.tb || (cp.segs[i].ball ? 0 : 0), k, .95, opts.mk || '');
  Object.keys(cp.meta).forEach(id => { const m = cp.meta[id], q = st.pos[id]; h += playerSVG({ id, x: q[0], y: q[1], num: m.n, label: opts.labels === false ? '' : m.code, color: TEAM_COL[m.team], k, portrait, gk: m.code === 'GK', attr: 'data-pt', scale: cp.M.area ? 1.1 : 1 }); });
  if (st.ball) h += `<g transform="translate(${st.ball[0]} ${st.ball[1]})">${ballSVG(cp.M.sport, k * (cp.M.area ? 1.2 : 1))}</g>`;
  return h;
}
function staticPlaySVG(cp, i = cp.segs.length - 1, pxW = 480, opts = {}) {
  const vr = viewRect(cp.p.mode, playView(cp)), k = vr.w / pxW;
  return `<svg viewBox="${vr.x0} ${vr.y0} ${vr.w} ${vr.h}" width="100%" style="display:block;direction:ltr;border-radius:8px" xmlns="http://www.w3.org/2000/svg">${markerDefs('x')}${frameInner(cp, i, 1, k, false, Object.assign({ mk: 'x' }, opts))}</svg>`;
}

/* ---------- Interactive player ---------- */
function mountPlayer(host, play, opts = {}) {
  const cp = compilePlay(play); const st = { i: 0, t: 0, playing: !!opts.autoplay, speed: opts.speed || 1, loop: opts.loop ?? !!opts.compact, hold: 0, raf: 0, last: 0, k: .1, portrait: false, dead: false };
  const caps = cp.segs.map(s => T(s.cap));
  host.innerHTML = `<div class="pl ${opts.compact ? 'compact' : ''}"><div class="pl-stage"><svg class="pl-svg" role="img" aria-label="${esc(T(play.name))}"></svg><div class="pl-cap" aria-live="polite"></div></div>
    ${opts.compact ? `<div class="pl-mini"><button class="btn sm icon" data-pp aria-label="${L('تشغيل', 'Play')}">${icon('pause')}</button><span class="pl-dots">${cp.segs.map((_, j) => `<i data-j="${j}"></i>`).join('')}</span></div>` :
    `<div class="pl-ctl"><button class="btn icon" data-rs aria-label="${L('من البداية', 'Restart')}">${icon('undo')}</button><button class="btn icon" data-pv aria-label="${L('الخطوة السابقة', 'Previous step')}">${icon(LANG === 'en' ? 'left' : 'right')}</button><button class="btn primary" data-pp>${icon('play')}<span>${L('تشغيل', 'Play')}</span></button><button class="btn icon" data-nx aria-label="${L('الخطوة التالية', 'Next step')}">${icon(LANG === 'en' ? 'right' : 'left')}</button>
      <div class="pl-steps">${cp.segs.map((_, j) => `<button class="pl-step" data-j="${j}" aria-label="${L('الخطوة', 'Step')} ${j + 1}">${j + 1}</button>`).join('')}</div>
      <select class="inp sm-inp" data-sp aria-label="${L('السرعة', 'Speed')}">${[.5, .75, 1, 1.5, 2].map(v => opt(v, v + '×', st.speed)).join('')}</select>
      <label class="switch sm"><input type="checkbox" data-lp ${st.loop ? 'checked' : ''}><span></span>${L('تكرار', 'Loop')}</label></div>`}</div>`;
  { const vr0 = viewRect(play.mode, playView(cp)); const ar = clamp(vr0.w / vr0.h, 1.05, 1.75), stg = host.querySelector('.pl-stage'); stg.style.aspectRatio = String(ar); if (!opts.compact) { stg.style.maxWidth = `calc(70vh * ${ar.toFixed(3)})`; stg.style.marginInline = 'auto'; stg.style.width = '100%'; } }
  const svg = host.querySelector('.pl-svg'), cap = host.querySelector('.pl-cap'), pp = host.querySelector('[data-pp]');
  const fit = () => { const f = fitSVG(svg, viewRect(play.mode, playView(cp)), !opts.noRotate); st.k = f.k; st.portrait = f.portrait; };
  const draw = () => { svg.innerHTML = markerDefs('p') + `<g transform="${st.portrait ? 'rotate(-90)' : ''}">${frameInner(cp, st.i, st.t, st.k, st.portrait, { mk: 'p' })}</g>`;
    cap.innerHTML = `<b>${st.i + 1}/${cp.segs.length}</b> ${esc(caps[st.i])}`;
    host.querySelectorAll('[data-j]').forEach(el => { const j = +el.dataset.j; el.classList.toggle('on', j === st.i); el.classList.toggle('done', j < st.i); });
    if (opts.onStep && st.i !== st.li) { st.li = st.i; opts.onStep(st.i); }
    if (pp) pp.innerHTML = opts.compact ? icon(st.playing ? 'pause' : 'play') : `${icon(st.playing ? 'pause' : 'play')}<span>${st.playing ? L('إيقاف', 'Pause') : L('تشغيل', 'Play')}</span>`; };
  const tick = now => { if (st.dead) return; if (!host.isConnected) { st.dead = true; ro.disconnect(); return; }
    const dt = Math.min(.1, (now - (st.last || now)) / 1000); st.last = now;
    if (st.playing) { if (st.hold > 0) { st.hold -= dt; if (st.hold <= 0) { st.i = 0; st.t = 0; } }
      else { st.t += dt * st.speed / cp.segs[st.i].dur; if (st.t >= 1) { if (st.i < cp.segs.length - 1) { st.i++; st.t = 0; } else { st.t = 1; if (st.loop) st.hold = 1.4; else st.playing = false; } } }
      draw(); }
    st.raf = requestAnimationFrame(tick); };
  const ro = new ResizeObserver(() => { fit(); draw(); }); ro.observe(svg.parentElement);
  const go2 = j => { st.i = clamp(j, 0, cp.segs.length - 1); st.t = 0; draw(); };
  if (pp) pp.onclick = () => { if (!st.playing && st.i === cp.segs.length - 1 && st.t >= 1) { st.i = 0; st.t = 0; } st.playing = !st.playing; st.last = 0; draw(); };
  const q = s => host.querySelector(s);
  if (q('[data-rs]')) q('[data-rs]').onclick = () => { st.i = 0; st.t = 0; st.playing = true; st.last = 0; draw(); };
  if (q('[data-pv]')) q('[data-pv]').onclick = () => { st.playing = false; go2(st.t > .05 ? st.i : st.i - 1); };
  if (q('[data-nx]')) q('[data-nx]').onclick = () => { st.playing = false; st.i = Math.min(cp.segs.length - 1, st.i + (st.t >= 1 ? 1 : 0)); st.t = 1; draw(); };
  host.querySelectorAll('.pl-step,[data-j]').forEach(b => b.onclick = () => { st.playing = false; go2(+b.dataset.j); });
  if (q('[data-sp]')) q('[data-sp]').onchange = e => { st.speed = +e.target.value; };
  if (q('[data-lp]')) q('[data-lp]').onchange = e => { st.loop = e.target.checked; };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches && opts.compact) st.playing = false;
  fit(); draw(); st.raf = requestAnimationFrame(tick);
  return { cp, stop() { st.dead = true; cancelAnimationFrame(st.raf); ro.disconnect(); }, state: st, goto(j, play) { st.i = clamp(j, 0, cp.segs.length - 1); st.t = 0; st.playing = !!play; st.last = 0; draw(); } };
}

/* ---------- Video export (WebM) ---------- */
async function exportPlayVideo(play, speed = 1) {
  if (noDownload()) return;
  const cp = typeof play.segs === 'object' ? play : compilePlay(play);
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast(L('تصدير الفيديو غير مدعوم في هذا المتصفح', 'Video export is not supported in this browser')); return; }
  const vr = viewRect(cp.p.mode, playView(cp)), W = 1280, PH = Math.round(W * vr.h / vr.w), CH = 64, H = PH + CH, k = vr.w / W;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)); if (!mime) { toast(L('تصدير الفيديو غير مدعوم', 'Video export not supported')); return; }
  const rec = new MediaRecorder(cv.captureStream(25), { mimeType: mime, videoBitsPerSecond: 4e6 }); const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const m = openModal({ title: L('إنشاء فيديو الخطة', 'Creating the video'), body: `<p class="small ink2" style="margin:0">${esc(T(cp.p.name))}</p><div class="bar-meter"><i id="vidBar" style="width:0%"></i></div><p class="hint" style="margin:0">${L('يُسجَّل الفيديو بسرعته الحقيقية، انتظر حتى ينتهي.', 'The video records in real time — please wait.')}</p>` });
  const img = new Image(); const drawFrame = async (i, t) => {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${PH}" viewBox="${vr.x0} ${vr.y0} ${vr.w} ${vr.h}">${markerDefs('v')}${frameInner(cp, i, t, k, false, { mk: 'v' })}</svg>`;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); await img.decode().catch(() => { });
    ctx.fillStyle = '#0B2545'; ctx.fillRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, PH);
    ctx.fillStyle = '#14B8A6'; ctx.fillRect(0, PH, 6, CH); ctx.fillStyle = '#FFFFFF'; ctx.font = '600 24px "IBM Plex Sans Arabic", system-ui, sans-serif'; ctx.direction = LANG === 'en' ? 'ltr' : 'rtl'; ctx.textBaseline = 'middle';
    ctx.textAlign = LANG === 'en' ? 'left' : 'right'; ctx.fillText(`${i + 1}. ${T(cp.segs[i].cap)}`, LANG === 'en' ? 24 : W - 24, PH + CH / 2); };
  const fps = 25, total = sum(cp.segs.map(s => s.dur / speed)) + 1.2; let n = 0; const t0 = performance.now(); rec.start();
  const waitUntil = async ms => { const d = ms - (performance.now() - t0); if (d > 0) await new Promise(r => setTimeout(r, d)); };
  for (let i = 0; i < cp.segs.length; i++) { const frames = Math.max(1, Math.round(cp.segs[i].dur / speed * fps)); for (let f = 0; f <= frames; f++) { await drawFrame(i, f / frames); n++; const bar = $('#vidBar'); if (bar) bar.style.width = Math.min(100, n / (total * fps) * 100) + '%'; await waitUntil(n * 1000 / fps); } }
  for (let f = 0; f < fps * 1.2; f++) { n++; await waitUntil(n * 1000 / fps); }
  await new Promise(r => { rec.onstop = r; rec.stop(); }); closeModal();
  await downloadFile((T(cp.p.name) || 'play').replace(/[\\/:*?"<>|]/g, '') + '.webm', new Blob(chunks, { type: 'video/webm' }), 'video/webm');
}

/* ---------- Board frames → play ---------- */
function boardToPlay(b) {
  const M = MODES[b.mode], players = b.tokens.filter(t => t.kind === 'player'), ballTok = b.tokens.find(t => t.kind === 'ball'), f0 = b.frames[0] || {};
  const id = t => (t.team === 'B' ? 'b' : 'a') + t.id; const P0 = t => f0[t.id] || [t.x, t.y];
  const near = (frame, bp) => { let best = null, bd = M.L * .035; players.forEach(t => { const q = frame[t.id] || [t.x, t.y]; const d = Math.hypot(q[0] - bp[0], q[1] - bp[1]); if (d < bd) { bd = d; best = id(t); } }); return best; };
  const holderAt = fr => { if (!ballTok) return null; const bp = fr[ballTok.id] || [ballTok.x, ballTok.y]; return near(fr, bp) || bp; };
  const steps = b.frames.slice(1).map((fr, i) => { const m = {}; players.forEach(t => { if (fr[t.id]) m[id(t)] = fr[t.id]; }); return { c: { ar: (b.caps && b.caps[i + 1]) || `المرحلة ${i + 2}`, en: (b.caps && b.caps[i + 1]) || `Frame ${i + 2}` }, m, b: holderAt(fr), d: 1.8 }; });
  return { id: 'board', mode: b.mode, name: { ar: b.name || 'لوحة', en: b.name || 'Board' }, desc: { ar: '', en: '' }, cat: 'att', tokens: players.map(t => { const q = P0(t); return [id(t), t.code, t.num, q[0], q[1]]; }), ball0: holderAt(f0), steps, eq: b.tokens.filter(t => t.kind !== 'player' && t.kind !== 'ball').map(t => [t.kind, (f0[t.id] || [t.x])[0], (f0[t.id] || [0, t.y])[1], t.rot || 0]) };
}
function playToBoard(play) {
  const cp = compilePlay(play), b = newBoard(play.mode); b.tokens = []; b.name = T(play.name); b.caps = [T(cp.segs[0].cap)];
  const idMap = {}; play.tokens.forEach(([pid, code, n, x, y]) => { const t = { id: uid('t'), kind: 'player', team: pid[0] === 'b' ? 'B' : 'A', x, y, num: n, code: code || '', rv: null, pid: null, label: '' }; idMap[pid] = t.id; b.tokens.push(t); });
  (play.eq || []).forEach(([kind, x, y, rot]) => b.tokens.push({ id: uid('t'), kind, x, y, rot: rot || 0 }));
  const ball = { id: uid('t'), kind: 'ball', x: 0, y: 0, rot: 0 }; if (play.ball0 != null) b.tokens.push(ball);
  const frameAt = (pos, h) => { const f = {}; b.tokens.forEach(t => f[t.id] = [t.x, t.y]); Object.entries(pos).forEach(([pid, q]) => f[idMap[pid]] = q.slice()); if (h != null) f[ball.id] = typeof h === 'string' ? [pos[h][0] + cp.off[0], pos[h][1] + cp.off[1]] : h.slice(); return f; };
  b.frames = [frameAt(cp.init, play.ball0)]; cp.segs.forEach((s, i) => { b.frames.push(frameAt(s.to, s.h1)); b.caps[i + 1] = T(s.cap); });
  cp.segs.forEach(s => { s.moves.forEach(mv => b.drawings.push({ id: uid('d'), type: mv.kind === 'dribble' ? 'dribble' : 'run', color: mv.team === 'b' ? 2 : 0, pts: bezPts(mv.a, mv.c, mv.b, 1, 8) })); if (s.ball && s.ball.kind === 'pass') b.drawings.push({ id: uid('d'), type: 'pass', color: 1, pts: [s.ball.a, s.ball.b] }); });
  b.fi = 0; const f = b.frames[0]; b.tokens.forEach(t => { if (f[t.id]) { t.x = f[t.id][0]; t.y = f[t.id][1]; } });
  return b;
}

/* ============================================================
   ACCESS & SHARED DATA
   Cloud mode (published page on claude.ai): identity from the `user` capability,
   shared academy data in the `db` capability, owner-only permissions.
   Local mode (the HTML file on a device): localStorage + optional PIN lock.
   ============================================================ */

/* ---- legacy v28: board ---- */
/* ============================================================
   TACTICAL BOARD — free drawing board with formations, symbols, frames, undo/redo
   ============================================================ */
const B = { tool: 'select', color: 1, curved: false, sel: null, drag: null, cur: null, hist: [], fut: [], playing: false, zones: true, k: .1, portrait: false, ro: null, tweenId: 0 };

function formsFor(mode, side) {
  if (FORM[mode]) return Object.keys(FORM[mode]); if (mode === 'vb') return Object.keys(VB_FORMS);
  if (mode === 'bb') return Object.keys(side === 'A' ? BB_OFF : BB_DEF); if (mode === 'hb') return Object.keys(side === 'A' ? HB_OFF : HB_DEF); return [];
}
function slotsFor(b, side) {
  const M = MODES[b.mode], key = b.teams[side].form;
  const frac = list => list.map(([c, n, x, y]) => side === 'A' ? { c, n, x: x * M.L, y: y * M.W } : { c, n, x: (1 - x) * M.L, y: (1 - y) * M.W });
  if (FORM[b.mode]) return frac(FORM[b.mode][key] || Object.values(FORM[b.mode])[0]);
  if (b.mode === 'vb') return frac(vbFormation(VB_FORMS[key] ? key : 'base|1'));
  const abs = list => list.map(([c, n, x, y]) => ({ c, n, x, y }));
  if (b.mode === 'hb') return abs((side === 'A' ? HB_OFF : HB_DEF)[key] || Object.values(side === 'A' ? HB_OFF : HB_DEF)[0]);
  if (b.mode === 'bb') { if (side === 'A') return abs(BB_OFF[key] || BB_OFF['5out']); const d = BB_DEF[key] || BB_DEF['23']; if (d !== 'man') return abs(d);
    return b.tokens.filter(t => t.kind === 'player' && t.team === 'A').slice(0, 5).map(t => { const dx = 26.425 - t.x, dy = 7.5 - t.y, len = Math.hypot(dx, dy) || 1, g = Math.min(1.4, len * .35); return { c: t.code, n: t.num, x: t.x + dx / len * g, y: t.y + dy / len * g }; }); }
  return [];
}
function placeTeam(b, side, animate) {
  const slots = slotsFor(b, side), rs = MODES[b.mode].rs, mine = b.tokens.filter(t => t.kind === 'player' && t.team === side), targets = [];
  slots.forEach((sl, i) => { let t = mine[i];
    if (!t) { t = { id: uid('t'), kind: 'player', team: side, x: sl.x, y: sl.y, num: sl.n, code: sl.c, rv: defaultVariant(rs, sl.c), pid: null, label: '' }; b.tokens.push(t); }
    else { if (CODE_FAMILY[rs][t.code] !== CODE_FAMILY[rs][sl.c]) t.rv = defaultVariant(rs, sl.c); t.code = sl.c; if (!t.pid) t.num = sl.n; }
    targets.push([t, sl.x, sl.y]); });
  if (animate) tweenTo(targets); else targets.forEach(([t, x, y]) => { t.x = x; t.y = y; });
}
function newBoard(mode) {
  const M = MODES[mode];
  const b = { id: uid('b'), mode, name: '', phase: 'att', notes: '', view: 'full', teams: { A: { name: L('فريقنا', 'Our team'), color: '#E6BE3A', form: formsFor(mode, 'A')[0], teamId: null }, B: { name: L('المنافس', 'Opponent'), color: '#E0564F', form: formsFor(mode, 'B')[mode === 'vb' ? 1 : 0] } }, tokens: [], drawings: [], frames: [], fi: 0, caps: [] };
  placeTeam(b, 'A'); placeTeam(b, 'B');
  let bx = M.L / 2, by = M.W / 2; if (mode === 'bb' || mode === 'hb') { const a = b.tokens.find(t => t.team === 'A' && (t.code === 'PG' || t.code === 'CB')); if (a) { bx = a.x - .6; by = a.y + .5; } } if (mode === 'vb') { bx = -1.4; by = 7.5; }
  b.tokens.push({ id: uid('t'), kind: 'ball', x: bx, y: by, rot: 0 }); b.frames = [snapshot(b)]; return b;
}
const board = () => S.work[S.ui.mode] || (S.work[S.ui.mode] = newBoard(S.ui.mode));
function snapshot(b) { const o = {}; b.tokens.forEach(t => o[t.id] = [t.x, t.y]); return o; }
function syncFrame(b = board()) { b.frames[b.fi] = snapshot(b); }
function pushHist() { B.hist.push(JSON.stringify(board())); if (B.hist.length > 80) B.hist.shift(); B.fut = []; updateUndo(); }
function undo() { if (!B.hist.length) return; B.fut.push(JSON.stringify(board())); S.work[S.ui.mode] = JSON.parse(B.hist.pop()); B.sel = null; save(); renderBoard(true); }
function redo() { if (!B.fut.length) return; B.hist.push(JSON.stringify(board())); S.work[S.ui.mode] = JSON.parse(B.fut.pop()); B.sel = null; save(); renderBoard(true); }
function updateUndo() { const u = $('#bUndo'), r = $('#bRedo'); if (u) u.disabled = !B.hist.length; if (r) r.disabled = !B.fut.length; }

function tokenLabel(t) { const pl = t.pid ? playerById(t.pid) : null; if (S.ui.labels === 'none') return ''; if (t.label) return t.label; return S.ui.labels === 'name' ? (pl ? pl.name.split(' ')[0] : t.code) : t.code; }
function tokenSVG(t, b, k, sel, portrait) {
  if (t.kind === 'player') return playerSVG({ id: t.id, x: t.x, y: t.y, num: t.num, label: tokenLabel(t), color: b.teams[t.team].color, k, portrait, sel, gk: t.code === 'GK' });
  return equipSVG(t, MODES[b.mode].sport, k, sel, portrait);
}
function boardZones(b, t, k) { const M = MODES[b.mode]; const role = roleById(t.rv) || roleById(defaultVariant(M.rs, t.code)); if (!role) return ''; const flip = t.team === 'B'; const which = M.mirror || role.z.own ? 'both' : (t.team === 'A' ? 'wb' : 'nb'); return zonesSVG(b.mode, role, t.y, k, flip, which); }
function boardStatic(b, pxW = 520) { const vr = viewRect(b.mode, b.view), k = vr.w / pxW; return `<svg viewBox="${vr.x0} ${vr.y0} ${vr.w} ${vr.h}" width="100%" style="display:block;border-radius:8px;direction:ltr" xmlns="http://www.w3.org/2000/svg">${markerDefs('s')}${courtSVG(b.mode, 1.6 * k)}${b.drawings.map(d => drawingSVG(d, k, false, false, 's')).join('')}${b.tokens.map(t => tokenSVG(t, b, k, false, false)).join('')}</svg>`; }

function renderPitch() {
  const b = board(), svg = $('#pitch'); if (!svg) return; const f = fitSVG(svg, viewRect(b.mode, b.view)); B.k = f.k; B.portrait = f.portrait; const k = B.k;
  const st = b.tokens.find(t => t.id === B.sel); const zones = st && st.kind === 'player' && B.zones ? boardZones(b, st, k) : '';
  svg.innerHTML = markerDefs() + `<g id="world" transform="${B.portrait ? 'rotate(-90)' : ''}">${courtSVG(b.mode, 1.6 * k)}<g id="zonesL">${zones}</g><g id="drawL">${b.drawings.map(d => drawingSVG(d, k, d.id === B.sel, B.portrait)).join('')}</g><g id="prevL"></g><g id="tokL">${b.tokens.map(t => tokenSVG(t, b, k, t.id === B.sel, B.portrait)).join('')}</g></g>`;
}
function renderBoard(full) { if (S.ui.view !== 'board') return; if (full) { $('#content').innerHTML = boardShell(); bindBoardShell(); } renderPitch(); renderPanel(); renderFrames(); updateUndo(); }
function boardShell() {
  const b = board();
  const tools = [['select', L('تحديد وتحريك', 'Select & move'), 'select'], ['pass', L('تمريرة (متقطع)', 'Pass (dashed)'), 'pass'], ['run', L('جري دون كرة (متصل)', 'Run off the ball (solid)'), 'run'], ['dribble', L('مراوغة (متموج)', 'Dribble (wavy)'), 'dribble'], ['line', L('خط دفاع / رقابة', 'Line / marking'), 'line'], ['free', L('رسم حر', 'Freehand'), 'pen'], ['zone', L('منطقة مظللة', 'Shaded zone'), 'zone'], ['text', L('ملاحظة نصية', 'Text note'), 'text'], ['eraser', L('ممحاة الرسوم', 'Eraser'), 'eraser']];
  const eq = [['player-A', L('لاعب من فريقنا', 'Our player'), 'player', b.teams.A.color], ['player-B', L('لاعب منافس', 'Opponent'), 'player', b.teams.B.color], ['ball', L('كرة', 'Ball'), 'ball'], ['cone', L('قمع', 'Cone'), 'cone'], ['pole', L('عمود', 'Pole'), 'pole'], ['dummy', L('مجسّم حائط', 'Mannequin'), 'dummy'], ['minigoal', L('مرمى صغير', 'Mini-goal'), 'goal'], ['hurdle', L('حاجز', 'Hurdle'), 'hurdle'], ['ladder', L('سلم رشاقة', 'Agility ladder'), 'ladder']];
  const fOpts = side => formsFor(b.mode, side).map(f => opt(f, fname(b.mode, side, f), b.teams[side].form)).join('');
  return `<div class="board ${S.ui.bPanelHide && typeof stageWanted === 'function' && stageWanted('board') ? 'nopanel' : ''}">
    <div class="toolrail" role="toolbar" aria-label="${L('أدوات الرسم', 'Drawing tools')}">
      ${tools.map(([id, l, ic]) => `<button class="tool" data-tool="${id}" aria-pressed="${B.tool === id}" title="${l}" aria-label="${l}">${icon(ic)}</button>`).join('')}
      <button class="tool" id="bCurve" aria-pressed="${B.curved}" title="${L('أسهم منحنية تتبع اليد', 'Curved arrows follow your hand')}" aria-label="${L('أسهم منحنية', 'Curved arrows')}">${icon('dribble')}</button><div class="grp"></div>
      <div class="swatches">${DRAW_COLORS.map((c, i) => `<button class="sw" data-color="${i}" aria-pressed="${B.color === i}" style="background:${c}" aria-label="${L('لون', 'Colour')} ${i + 1}"></button>`).join('')}</div><div class="grp"></div>
      ${eq.map(([id, l, ic, col]) => `<button class="tool" data-add="${id}" title="${l}" aria-label="${l}" ${col ? `style="color:${col}"` : ''}>${icon(ic)}</button>`).join('')}
    </div>
    <div class="stagecol">
      <div class="boardbar">
        <select class="inp" id="bMode" aria-label="${L('الرياضة', 'Sport')}">${Object.entries(MODES).filter(([k, m]) => !m.area || k === b.mode).map(([k, m]) => opt(k, T(m.name), b.mode)).join('')}</select>
        <select class="inp" id="bView" aria-label="${L('العرض', 'View')}">${opt('full', L('الملعب كاملاً', 'Full pitch'), b.view)}${opt('half', L('نصف الملعب', 'Half pitch'), b.view)}</select>
        <div class="teamctl"><input type="color" id="cA" value="${b.teams.A.color}" aria-label="${L('لون فريقنا', 'Our colour')}"><select class="inp" id="fA" aria-label="${L('خطة فريقنا', 'Our formation')}">${fOpts('A')}</select></div>
        <span class="muted small">${L('ضد', 'vs')}</span>
        <div class="teamctl"><input type="color" id="cB" value="${b.teams.B.color}" aria-label="${L('لون المنافس', 'Opponent colour')}"><select class="inp" id="fB" aria-label="${L('خطة المنافس', 'Opponent formation')}">${fOpts('B')}</select></div>
        <select class="inp" id="bLabels" aria-label="${L('التسمية', 'Labels')}">${opt('pos', L('إظهار المراكز', 'Show positions'), S.ui.labels)}${opt('name', L('إظهار الأسماء', 'Show names'), S.ui.labels)}${opt('none', L('دون تسمية', 'No labels'), S.ui.labels)}</select>
        <span class="row" style="margin-inline-start:auto"><button class="btn icon" id="bUndo" title="${L('تراجع', 'Undo')} (Ctrl+Z)" aria-label="${L('تراجع', 'Undo')}">${icon('undo')}</button><button class="btn icon" id="bRedo" title="${L('إعادة', 'Redo')} (Ctrl+Y)" aria-label="${L('إعادة', 'Redo')}">${icon('redo')}</button><button class="btn icon" id="bPng" title="${L('تصدير صورة', 'Export image')}" aria-label="${L('تصدير صورة', 'Export image')}">${icon('image')}</button><button class="btn" id="bSave">${icon('save')} ${L('حفظ في المكتبة', 'Save to library')}</button></span>
      </div>
      <div class="stage"><svg id="pitch" role="application" aria-label="${esc(T(MODES[b.mode].name))}"></svg><div class="pl-cap" id="bCap" hidden></div></div>
      <div class="framebar" id="frameBar"></div>
    </div>
    <aside class="panel" id="bPanel"></aside></div>`;
}
function bindBoardShell() {
  $$('[data-tool]').forEach(el => el.onclick = () => { B.tool = el.dataset.tool; $$('[data-tool]').forEach(x => x.setAttribute('aria-pressed', x === el)); });
  $$('[data-color]').forEach(el => el.onclick = () => { B.color = +el.dataset.color; $$('[data-color]').forEach(x => x.setAttribute('aria-pressed', x === el)); const d = board().drawings.find(x => x.id === B.sel); if (d) { pushHist(); d.color = B.color; save(); renderPitch(); } });
  $('#bCurve').onclick = e => { B.curved = !B.curved; e.currentTarget.setAttribute('aria-pressed', B.curved); toast(B.curved ? L('الأسهم تتبع حركة اليد', 'Arrows follow your hand') : L('الأسهم مستقيمة', 'Straight arrows')); };
  $$('[data-add]').forEach(el => el.onclick = () => addItem(el.dataset.add));
  $('#bMode').onchange = e => { S.ui.mode = e.target.value; B.sel = null; B.hist = []; B.fut = []; save(); renderBoard(true); };
  $('#bView').onchange = e => { pushHist(); board().view = e.target.value; save(); renderPitch(); };
  $('#bLabels').onchange = e => { S.ui.labels = e.target.value; save(); renderPitch(); };
  $('#fA').onchange = e => changeFormation('A', e.target.value); $('#fB').onchange = e => changeFormation('B', e.target.value);
  $('#cA').oninput = e => { board().teams.A.color = e.target.value; renderPitch(); }; $('#cA').onchange = save;
  $('#cB').oninput = e => { board().teams.B.color = e.target.value; renderPitch(); }; $('#cB').onchange = save;
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo; $('#bPng').onclick = exportPNG; $('#bSave').onclick = saveBoardDialog;
  const svg = $('#pitch'); bindPitch(svg);
  if (B.ro) B.ro.disconnect(); let raf = 0; B.ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if ($('#pitch')) renderPitch(); }); }); B.ro.observe(svg.parentElement);
}
function changeFormation(side, key) { const b = board(); pushHist(); b.teams[side].form = key; placeTeam(b, side, true); if (b.mode === 'bb' && side === 'A' && BB_DEF[b.teams.B.form] === 'man') setTimeout(() => placeTeam(b, 'B', true), 30); save(); }
function tweenTo(targets, dur = 520) {
  const id = ++B.tweenId, from = targets.map(([t]) => [t.x, t.y]), t0 = performance.now();
  if (!$('#pitch')) { targets.forEach(([t, x, y]) => { t.x = x; t.y = y; }); return; }
  const step = now => { if (id !== B.tweenId) return; const p = Math.min(1, (now - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    targets.forEach(([t, x, y], i) => { t.x = from[i][0] + (x - from[i][0]) * e; t.y = from[i][1] + (y - from[i][1]) * e; const el = document.querySelector(`#pitch [data-tok="${t.id}"]`); if (el) el.setAttribute('transform', `translate(${t.x} ${t.y})${B.portrait ? ' rotate(90)' : ''}`); });
    if (p < 1) requestAnimationFrame(step); else { syncFrame(); save(); renderPitch(); renderPanel(); } };
  requestAnimationFrame(step);
}
function addItem(kind) {
  const b = board(), M = MODES[b.mode]; pushHist(); const vr = viewRect(b.mode, b.view), cx = vr.x0 + vr.w / 2, cy = M.W / 2, step = 30 * B.k;
  const free = (x, y) => b.tokens.every(t => Math.hypot(t.x - x, t.y - y) > step * .9); let px = cx, py = cy;
  outer: for (let r = 0; r < 12; r++) for (let a = 0; a < 8; a++) { const x = cx + Math.cos(a * Math.PI / 4) * r * step, y = cy + Math.sin(a * Math.PI / 4) * r * step; if (y > 0 && y < M.W && free(x, y)) { px = x; py = y; break outer; } }
  let t; if (kind.startsWith('player')) { const side = kind.slice(-1), n = Math.max(0, ...b.tokens.filter(x => x.team === side && x.kind === 'player').map(x => +x.num || 0)) + 1, code = { fb: 'CM', fs: 'ALA', bb: 'SF', vb: 'OH', hb: 'LB' }[M.rs]; t = { id: uid('t'), kind: 'player', team: side, x: px, y: py, num: n, code, rv: defaultVariant(M.rs, code), pid: null, label: '' }; }
  else t = { id: uid('t'), kind, x: px, y: py, rot: 0 };
  b.tokens.push(t); b.frames.forEach(f => f[t.id] = [px, py]); B.sel = t.id; B.tool = 'select'; $$('[data-tool]').forEach(x => x.setAttribute('aria-pressed', x.dataset.tool === 'select')); save(); renderPitch(); renderPanel();
}
function bindPitch(svg) {
  svg.addEventListener('pointerdown', e => {
    if (B.playing) return; const b = board(), p = toWorldPt(e, svg, $('#world')), tokEl = e.target.closest('[data-tok]'), drwEl = e.target.closest('[data-drw]');
    if (B.tool === 'select') { if (tokEl) { const t = b.tokens.find(x => x.id === tokEl.dataset.tok); B.sel = t.id; B.drag = { t, dx: p[0] - t.x, dy: p[1] - t.y, moved: false }; svg.setPointerCapture(e.pointerId); renderPitch(); renderPanel(); return; }
      if (drwEl) { B.sel = drwEl.dataset.drw; renderPitch(); renderPanel(); return; } if (B.sel) { B.sel = null; renderPitch(); renderPanel(); } return; }
    if (B.tool === 'eraser') { if (drwEl) { pushHist(); b.drawings = b.drawings.filter(d => d.id !== drwEl.dataset.drw); save(); renderPitch(); } return; }
    if (B.tool === 'text') { textDialog(p); return; }
    B.cur = { id: uid('d'), type: B.tool, color: B.color, pts: [p, p] }; svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', e => {
    if (B.drag) { const b = board(), M = MODES[b.mode], p = toWorldPt(e, svg, $('#world')), t = B.drag.t; if (!B.drag.moved) { pushHist(); B.drag.moved = true; }
      t.x = clamp(p[0] - B.drag.dx, -M.m, M.L + M.m); t.y = clamp(p[1] - B.drag.dy, -M.m, M.W + M.m); const el = document.querySelector(`#pitch [data-tok="${t.id}"]`); if (el) el.setAttribute('transform', `translate(${t.x} ${t.y})${B.portrait ? ' rotate(90)' : ''}`);
      if (B.zones && t.kind === 'player') $('#zonesL').innerHTML = boardZones(b, t, B.k); return; }
    if (B.cur) { const p = toWorldPt(e, svg, $('#world')), c = B.cur; if (c.type === 'zone' || (!B.curved && c.type !== 'free')) c.pts[1] = p; else { const last = c.pts[c.pts.length - 1]; if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 6 * B.k) c.pts.push(p); else c.pts[c.pts.length - 1] = p; } $('#prevL').innerHTML = drawingSVG(c, B.k, false, B.portrait); }
  });
  const end = () => {
    if (B.drag) { if (B.drag.moved) { syncFrame(); save(); renderPanel(); } B.drag = null; return; }
    if (B.cur) { const c = B.cur; B.cur = null; $('#prevL').innerHTML = ''; const a = c.pts[0], z = c.pts[c.pts.length - 1]; if (Math.hypot(z[0] - a[0], z[1] - a[1]) < 8 * B.k) return; if (c.pts.length > 2 && c.pts[0] === c.pts[1]) c.pts.splice(1, 1); pushHist(); board().drawings.push(c); save(); renderPitch(); }
  };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
}
function textDialog(p) {
  const m = openModal({ title: L('ملاحظة على اللوحة', 'Note on the board'), body: `<div class="field"><label for="tTxt">${L('النص', 'Text')}</label><input class="inp" id="tTxt" maxlength="40" placeholder="${L('مثال: ضغط هنا', 'e.g. press here')}"></div>`, foot: `<button class="btn" data-c>${L('إلغاء', 'Cancel')}</button><button class="btn primary" data-ok>${L('إضافة', 'Add')}</button>` });
  const ok = () => { const v = $('#tTxt').value.trim(); if (!v) return; pushHist(); board().drawings.push({ id: uid('d'), type: 'text', color: B.color, pts: [p], text: v }); save(); closeModal(); renderPitch(); };
  m.querySelector('[data-c]').onclick = closeModal; m.querySelector('[data-ok]').onclick = ok; $('#tTxt').onkeydown = e => { if (e.key === 'Enter') ok(); };
}
function deleteSelected() { const b = board(); if (!B.sel) return; pushHist(); if (b.tokens.some(t => t.id === B.sel)) { b.tokens = b.tokens.filter(t => t.id !== B.sel); b.frames.forEach(f => delete f[B.sel]); } else b.drawings = b.drawings.filter(d => d.id !== B.sel); B.sel = null; save(); renderPitch(); renderPanel(); }
function renderFrames() {
  const b = board(), el = $('#frameBar'); if (!el) return; b.caps = b.caps || [];
  el.innerHTML = `<span class="small ink2 nowrap">${L('مراحل الحركة', 'Frames')}</span>${b.frames.map((_, i) => `<button class="frame-chip" data-fr="${i}" aria-current="${i === b.fi}">${i + 1}</button>`).join('')}
    <button class="btn sm" id="frAdd">${icon('plus')} ${L('مرحلة', 'Frame')}</button><button class="btn sm ghost" id="frDel" ${b.frames.length < 2 ? 'disabled' : ''} aria-label="${L('حذف المرحلة', 'Delete frame')}">${icon('trash')}</button>
    <input class="inp cap-inp" id="frCap" value="${esc(b.caps[b.fi] || '')}" placeholder="${L(`شرح المرحلة ${b.fi + 1} (يظهر أثناء التشغيل)`, `Caption for frame ${b.fi + 1} (shown during playback)`)}" aria-label="${L('شرح المرحلة', 'Frame caption')}">
    <select class="inp sm-inp" id="frSpeed" aria-label="${L('السرعة', 'Speed')}">${[.5, .75, 1, 1.5, 2].map(v => opt(v, v + '×', B.speed || 1)).join('')}</select>
    <button class="btn sm primary" id="frPlay" ${b.frames.length < 2 ? 'disabled' : ''}>${icon(B.playing ? 'pause' : 'play')} ${B.playing ? L('إيقاف', 'Stop') : L('تشغيل الحركة', 'Play')}</button>
    <button class="btn sm" id="frVid" ${b.frames.length < 2 ? 'disabled' : ''} title="${L('تصدير فيديو WebM', 'Export WebM video')}">${icon('film')} ${L('فيديو', 'Video')}</button>
    <button class="btn sm" id="frLib" ${b.frames.length < 2 ? 'disabled' : ''} title="${L('حفظ في مكتبة الخطط المتحركة', 'Save to the animated playbook')}">${icon('save')} ${L('حفظ كخطة متحركة', 'Save as animated play')}</button>`;
  $$('[data-fr]', el).forEach(x => x.onclick = () => goFrame(+x.dataset.fr));
  $('#frAdd').onclick = () => { pushHist(); syncFrame(b); b.frames.splice(b.fi + 1, 0, snapshot(b)); b.caps.splice(b.fi + 1, 0, ''); b.fi++; save(); renderFrames(); toast(L(`المرحلة ${b.fi + 1}: حرّك اللاعبين والكرة`, `Frame ${b.fi + 1}: move players and the ball`)); };
  $('#frDel').onclick = () => { if (b.frames.length < 2) return; pushHist(); b.frames.splice(b.fi, 1); b.caps.splice(b.fi, 1); b.fi = Math.max(0, b.fi - 1); applyFrame(b, b.fi); save(); renderPitch(); renderFrames(); };
  $('#frCap').onchange = e => { b.caps[b.fi] = e.target.value; save(); };
  $('#frSpeed').onchange = e => { B.speed = +e.target.value; };
  $('#frPlay').onclick = () => B.playing ? (B.playing = false) : playFrames();
  $('#frVid').onclick = () => { syncFrame(b); exportPlayVideo(boardToPlay(b), B.speed || 1); };
  $('#frLib').onclick = saveBoardAsPlay;
}
function applyFrame(b, i) { const f = b.frames[i]; if (!f) return; b.tokens.forEach(t => { if (f[t.id]) { t.x = f[t.id][0]; t.y = f[t.id][1]; } }); }
function goFrame(i) { const b = board(); syncFrame(b); b.fi = i; applyFrame(b, i); save(); renderPitch(); renderFrames(); renderPanel(); }
function playFrames() {
  const b = board(); syncFrame(b); const cp = compilePlay(boardToPlay(b)); if (!cp.segs.length) return; B.playing = true; B.sel = null; renderFrames();
  const svg = $('#pitch'); let i = 0, t = 0, last = 0; const extras = b.drawings.length;
  const step = now => { if (!B.playing || !$('#pitch')) { B.playing = false; const bc = $('#bCap'); if (bc) bc.hidden = true; b.fi = b.frames.length - 1; applyFrame(b, b.fi); renderPitch(); renderFrames(); renderPanel(); return; }
    const dt = Math.min(.1, (now - (last || now)) / 1000); last = now; t += dt * (B.speed || 1) / cp.segs[i].dur; if (t >= 1) { if (i < cp.segs.length - 1) { i++; t = 0; } else { t = 1; B.playing = false; } }
    svg.innerHTML = markerDefs() + `<g id="world" transform="${B.portrait ? 'rotate(-90)' : ''}">${frameInner(cp, i, t, B.k, B.portrait)}</g>`;
    const bc = $('#bCap'); if (bc) { bc.hidden = !B.playing && t >= 1 && i === cp.segs.length - 1 ? true : false; bc.innerHTML = `<b>${i + 2}/${b.frames.length}</b> ${esc(T(cp.segs[i].cap))}`; }
    $$('.frame-chip').forEach((c, j) => c.setAttribute('aria-current', j === i + 1)); const ci = $('#frCap'); if (ci) ci.value = (b.caps || [])[i + 1] || '';
    requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function renderPanel() {
  const el = $('#bPanel'); if (!el) return; const b = board(), M = MODES[b.mode], rs = M.rs, t = b.tokens.find(x => x.id === B.sel), d = !t && b.drawings.find(x => x.id === B.sel); const ph = phasesOf(rs); let h = '';
  if (t && t.kind === 'player') {
    const fam = CODE_FAMILY[rs][t.code], variants = ROLES.filter(r => r.rs === rs && r.fam === fam), role = roleById(t.rv) || variants[0], tm = b.teams[t.team], roster = t.team === 'A' && b.teams.A.teamId ? teamPlayers(b.teams.A.teamId) : [];
    const pk = ['att', 'def', 'ta', 'td'].includes(b.phase) ? b.phase : 'att';
    h += `<div class="blk"><h4><span class="dot" style="width:14px;height:14px;background:${tm.color}"></span>${esc(tm.name)} — ${L('رقم', 'No.')} ${esc(t.num)}</h4>
      <div class="grid2"><div class="field"><label for="pNum">${L('الرقم', 'Number')}</label><input class="inp" id="pNum" type="number" min="0" max="99" value="${esc(t.num)}"></div>
      <div class="field"><label for="pCode">${L('المركز', 'Position')}</label><select class="inp" id="pCode">${Object.keys(CODE_FAMILY[rs]).map(c => opt(c, c + ' · ' + codeName(rs, c), t.code)).join('')}</select></div></div>
      <div class="field"><label for="pRole">${L('الدور', 'Role')}</label><select class="inp" id="pRole">${variants.map(v => opt(v.id, T(v.name), role && role.id)).join('')}</select></div>
      ${t.team === 'A' ? `<div class="field"><label for="pLink">${L('اللاعب من القائمة', 'Player from roster')}</label><select class="inp" id="pLink">${opt('', roster.length ? L('— غير محدد —', '— none —') : L('اربط اللوحة بفريق أولاً', 'Link the board to a team first'), t.pid)}${roster.map(p => opt(p.id, `${p.num} · ${p.name}${p.status === 'inj' ? ' (' + L('مصاب', 'injured') + ')' : ''}`, t.pid)).join('')}</select></div>` : ''}
      <div class="field"><label for="pLabel">${L('تسمية مخصصة', 'Custom label')}</label><input class="inp" id="pLabel" value="${esc(t.label || '')}"></div></div>`;
    if (role) h += `<div class="blk"><div class="row" style="justify-content:space-between"><h4>${icon('roles')} ${esc(T(role.name))}</h4><button class="btn sm" id="pOpenRole">${L('في استوديو الأدوار', 'Open in roles studio')}</button></div><p class="small ink2" style="margin:0">${esc(T(role.desc))}</p>
      <div class="field"><label for="pPhase">${L('المرحلة', 'Phase')}</label><select class="inp" id="pPhase">${['att', 'def', 'ta', 'td'].map(k => opt(k, T(ph[k]), pk)).join('')}</select></div>
      <ul class="phase-list">${T(role.ph[pk]).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <label class="row small ink2"><input type="checkbox" id="pZones" ${B.zones ? 'checked' : ''}> ${L('إظهار خريطة التحرك', 'Show movement zones')}</label>
      <div class="zone-key"><span><i class="zk-wb"></i>${L('مع الكرة', 'With the ball')}</span><span><i class="zk-nb"></i>${L('دون الكرة', 'Without the ball')}</span></div></div>`;
    h += `<div class="row"><button class="btn danger" id="pDel">${icon('trash')} ${L('حذف اللاعب', 'Remove player')}</button></div>`;
  } else if (t) h += `<div class="blk"><h4>${icon('cone')} ${L('عنصر تدريب', 'Equipment')}</h4><div class="row"><button class="btn" id="eRot">${icon('rotate')} ${L('تدوير 45°', 'Rotate 45°')}</button><button class="btn" id="eDup">${icon('copy')} ${L('تكرار', 'Duplicate')}</button><button class="btn danger" id="pDel">${icon('trash')} ${L('حذف', 'Delete')}</button></div></div>`;
  else if (d) h += `<div class="blk"><h4>${icon('pen')} ${L('رسم محدد', 'Selected drawing')}</h4><p class="hint">${L('اختر لوناً من الشريط لتغيير لونه.', 'Pick a colour in the toolbar to recolour it.')}</p><button class="btn danger" id="pDel">${icon('trash')} ${L('حذف الرسم', 'Delete drawing')}</button></div>`;
  else {
    const teams = S.teams.filter(x => teamMode(x) === b.mode);
    h += `<div class="blk"><h4>${icon('board')} ${L('معلومات اللوحة', 'Board details')}</h4>
      <div class="field"><label for="bName">${L('اسم اللوحة', 'Board name')}</label><input class="inp" id="bName" value="${esc(b.name)}"></div>
      <div class="field"><label for="bPhase">${L('مرحلة اللعب', 'Phase of play')}</label><select class="inp" id="bPhase">${Object.keys(ph).map(k => opt(k, T(ph[k]), b.phase)).join('')}</select></div>
      <div class="grid2"><div class="field"><label for="nA">${L('فريقنا', 'Our team')}</label><input class="inp" id="nA" value="${esc(b.teams.A.name)}"></div><div class="field"><label for="nB">${L('المنافس', 'Opponent')}</label><input class="inp" id="nB" value="${esc(b.teams.B.name)}"></div></div>
      <div class="field"><label for="bTeam">${L('ربط بقائمة فريق', 'Link to a team roster')}</label><select class="inp" id="bTeam">${opt('', teams.length ? L('— بدون ربط —', '— not linked —') : L('لا يوجد فريق بنفس الرياضة', 'No team for this sport'), b.teams.A.teamId)}${teams.map(x => opt(x.id, teamLabel(x), b.teams.A.teamId)).join('')}</select></div>
      ${b.teams.A.teamId ? `<button class="btn" id="bAuto">${icon('squad')} ${L('توزيع اللاعبين حسب المراكز', 'Auto-assign players by position')}</button>` : ''}
      <div class="field"><label for="bNotes">${L('ملاحظات المدرب', 'Coach notes')}</label><textarea class="inp" id="bNotes">${esc(b.notes)}</textarea></div>
      <div class="row"><button class="btn" id="bNew">${icon('plus')} ${L('لوحة جديدة', 'New board')}</button><button class="btn ghost" id="bClear">${icon('eraser')} ${L('مسح الرسوم', 'Clear drawings')}</button></div></div>
      <div class="blk"><h4>${icon('pen')} ${L('رموز الرسم', 'Symbols')}</h4><div class="sym-legend">
        <svg viewBox="0 0 52 12" width="52" height="12"><path d="M2 6H44" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4"/><path d="M42 1l8 5-8 5z" fill="currentColor"/></svg><span>${L('تمريرة', 'Pass')}</span>
        <svg viewBox="0 0 52 12" width="52" height="12"><path d="M2 6H44" stroke="currentColor" stroke-width="2"/><path d="M42 1l8 5-8 5z" fill="currentColor"/></svg><span>${L('جري دون كرة', 'Run without the ball')}</span>
        <svg viewBox="0 0 52 12" width="52" height="12"><path d="M2 6c3-5 5 5 8 0s5 5 8 0 5 5 8 0 5 5 8 0 4 0 8 0" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M42 1l8 5-8 5z" fill="currentColor"/></svg><span>${L('مراوغة بالكرة', 'Dribble')}</span>
        <svg viewBox="0 0 52 12" width="52" height="12"><circle cx="4" cy="6" r="3" fill="currentColor"/><circle cx="48" cy="6" r="3" fill="currentColor"/><path d="M4 6H48" stroke="currentColor" stroke-width="2.6"/></svg><span>${L('خط دفاع / رقابة', 'Defensive line / marking')}</span></div></div>
      <div class="blk"><h4>${icon('layers')} ${L('مكتبة اللوحات', 'Board library')} <span class="pill mute">${S.boards.length}</span></h4>
      ${S.boards.length ? `<div class="list">${S.boards.slice().reverse().map(x => `<div class="list-item"><div class="grow"><div class="t">${esc(x.name || L('بدون اسم', 'Untitled'))}</div><div class="s">${esc(T(MODES[x.mode].name))}</div></div><button class="btn sm" data-load="${x.id}">${L('فتح', 'Open')}</button><button class="btn sm ghost icon" data-delb="${x.id}" aria-label="${L('حذف', 'Delete')}">${icon('trash')}</button></div>`).join('')}</div>` : `<p class="hint">${L('احفظ اللوحة لاستخدامها في الحصص والتقارير.', 'Save boards to use them in sessions and reports.')}</p>`}</div>`;
  }
  el.innerHTML = h; const on = (id, ev, fn) => { const x = $('#' + id); if (x) x[ev] = fn; };
  on('pNum', 'onchange', e => { pushHist(); t.num = e.target.value; save(); renderPitch(); });
  on('pCode', 'onchange', e => { pushHist(); t.code = e.target.value; t.rv = defaultVariant(rs, t.code); save(); renderPitch(); renderPanel(); });
  on('pRole', 'onchange', e => { t.rv = e.target.value; save(); renderPitch(); renderPanel(); });
  on('pLink', 'onchange', e => { pushHist(); t.pid = e.target.value || null; const p = t.pid && playerById(t.pid); if (p) t.num = p.num; save(); renderPitch(); renderPanel(); });
  on('pLabel', 'onchange', e => { t.label = e.target.value.trim(); save(); renderPitch(); });
  on('pPhase', 'onchange', e => { b.phase = e.target.value; save(); renderPanel(); });
  on('pZones', 'onchange', e => { B.zones = e.target.checked; renderPitch(); });
  on('pOpenRole', 'onclick', () => { const st = S.ui.st; st.mode = b.mode; st.sel = null; go('roles'); });
  on('pDel', 'onclick', deleteSelected);
  on('eRot', 'onclick', () => { pushHist(); t.rot = ((t.rot || 0) + 45) % 360; save(); renderPitch(); });
  on('eDup', 'onclick', () => { pushHist(); const n = Object.assign({}, t, { id: uid('t'), x: t.x + 20 * B.k, y: t.y + 20 * B.k }); b.tokens.push(n); b.frames.forEach(f => f[n.id] = [n.x, n.y]); B.sel = n.id; save(); renderPitch(); renderPanel(); });
  on('bName', 'onchange', e => { b.name = e.target.value; save(); }); on('bPhase', 'onchange', e => { b.phase = e.target.value; save(); });
  on('nA', 'onchange', e => { b.teams.A.name = e.target.value; save(); }); on('nB', 'onchange', e => { b.teams.B.name = e.target.value; save(); }); on('bNotes', 'onchange', e => { b.notes = e.target.value; save(); });
  on('bTeam', 'onchange', e => { b.teams.A.teamId = e.target.value || null; const tm = teamById(b.teams.A.teamId); if (tm) b.teams.A.name = tm.name; save(); renderPanel(); });
  on('bAuto', 'onclick', autoFill);
  on('bNew', 'onclick', () => confirmBox(L('بدء لوحة جديدة؟ احفظ الحالية أولاً إن أردت.', 'Start a new board? Save the current one first if needed.'), () => { pushHist(); S.work[S.ui.mode] = newBoard(S.ui.mode); B.sel = null; save(); renderBoard(true); }, L('لوحة جديدة', 'New board'), false));
  on('bClear', 'onclick', () => { if (!b.drawings.length) return; pushHist(); b.drawings = []; save(); renderPitch(); toast(L('تم مسح الرسوم — يمكنك التراجع', 'Drawings cleared — you can undo')); });
  $$('[data-load]', el).forEach(x => x.onclick = () => { const src = S.boards.find(y => y.id === x.dataset.load); if (!src) return; pushHist(); const c = JSON.parse(JSON.stringify(src)); c.id = uid('b'); c.libId = src.id; S.ui.mode = c.mode; S.work[c.mode] = c; B.sel = null; save(); renderBoard(true); });
  $$('[data-delb]', el).forEach(x => x.onclick = () => confirmBox(L('حذف اللوحة من المكتبة؟', 'Delete this board from the library?'), () => { S.boards = S.boards.filter(y => y.id !== x.dataset.delb); save(); renderPanel(); }, L('حذف', 'Delete')));
}
function autoFill() {
  const b = board(), rs = MODES[b.mode].rs, roster = teamPlayers(b.teams.A.teamId).filter(p => p.status !== 'inj'), used = new Set(); pushHist(); const toks = b.tokens.filter(t => t.kind === 'player' && t.team === 'A');
  toks.forEach(t => { const p = roster.find(p => !used.has(p.id) && p.pos === CODE_FAMILY[rs][t.code]); if (p) { used.add(p.id); t.pid = p.id; t.num = p.num; } else t.pid = null; });
  toks.filter(t => !t.pid).forEach(t => { const p = roster.find(p => !used.has(p.id) && p.pos !== 'GK'); if (p) { used.add(p.id); t.pid = p.id; t.num = p.num; } });
  save(); renderPitch(); renderPanel(); toast(L('تم توزيع اللاعبين المتاحين', 'Available players assigned'));
}
function saveBoardDialog() {
  const b = board();
  const m = openModal({ title: L('حفظ اللوحة في المكتبة', 'Save board to library'), body: `<div class="field"><label for="sbName">${L('اسم اللوحة', 'Board name')}</label><input class="inp" id="sbName" value="${esc(b.name || `${fname(b.mode, 'A', b.teams.A.form)} ${L('ضد', 'vs')} ${fname(b.mode, 'B', b.teams.B.form)}`)}"></div>`,
    foot: `${b.libId ? `<button class="btn" data-upd>${L('تحديث الأصلية', 'Update original')}</button>` : ''}<button class="btn primary" data-ok>${L('حفظ كنسخة جديدة', 'Save as new')}</button>` });
  const doSave = replace => { b.name = $('#sbName').value.trim() || L('لوحة بدون اسم', 'Untitled board'); syncFrame(b); const c = JSON.parse(JSON.stringify(b));
    if (replace) { const i = S.boards.findIndex(x => x.id === b.libId); c.id = b.libId; delete c.libId; if (i >= 0) S.boards[i] = c; else S.boards.push(c); } else { c.id = uid('lib'); delete c.libId; S.boards.push(c); b.libId = c.id; }
    save(); closeModal(); renderPanel(); toast(L('تم الحفظ في المكتبة', 'Saved to library')); };
  m.querySelector('[data-ok]').onclick = () => doSave(false); const u = m.querySelector('[data-upd]'); if (u) u.onclick = () => doSave(true);
}
function exportPNG() {
  if (noDownload()) return;
  const b = board(), vr = viewRect(b.mode, b.view), W = 1600, H = Math.round(W * vr.h / vr.w); const str = boardStatic(b, 800).replace('<svg ', `<svg width="${W}" height="${H}" `);
  const img = new Image(), url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
  img.onload = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); let data; try { data = c.toDataURL('image/png'); } catch (e) { data = url; }
    const m = openModal({ title: L('تصدير صورة اللوحة', 'Export board image'), wide: true, body: `<img src="${data}" alt="" style="width:100%;border-radius:10px"><p class="hint" style="margin:0">${L('إن لم يبدأ التنزيل، اضغط مطولاً على الصورة واحفظها.', 'If the download does not start, long-press or right-click the image to save it.')}</p>`, foot: `<button class="btn primary" data-dl>${icon('download')} PNG</button>` });
    m.querySelector('[data-dl]').onclick = () => fetch(data).then(r => r.blob()).then(bl => downloadFile((b.name || 'board') + '.png', bl)); };
  img.src = url;
}
document.addEventListener('keydown', e => {
  if (S.ui.view !== 'board' || modalStack.length || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && B.sel) { e.preventDefault(); deleteSelected(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
});

/* ============================================================
   ROLES STUDIO — the whole team on the pitch, phase by phase.
   Click any player to see the role, its tasks, zones, profile and coaching notes.
   ============================================================ */

/* ---- legacy v28: save as play ---- */
function saveBoardAsPlay() {
  const b = board(); syncFrame(b); if (b.frames.length < 2) { toast(L('أضف مرحلة ثانية على الأقل', 'Add at least a second frame')); return; }
  const m = openModal({ title: L('حفظ كخطة متحركة', 'Save as an animated play'), body: `<div class="field"><label for="apN">${L('اسم الخطة', 'Play name')}</label><input class="inp" id="apN" value="${esc(b.name || '')}"></div>
    <div class="field"><label for="apD">${L('وصف مختصر', 'Short description')}</label><input class="inp" id="apD"></div>
    <div class="field"><label for="apC">${L('النوع', 'Type')}</label><select class="inp" id="apC">${Object.entries(PLAY_CATS).map(([k, v]) => opt(k, T(v), 'att')).join('')}</select></div>
    <p class="hint">${L('يُحفظ شرح كل مرحلة كما كتبته أسفل اللوحة.', 'Each frame caption is saved as you typed it under the board.')}</p>`,
    foot: `<button class="btn" data-c>${L('إلغاء', 'Cancel')}</button><button class="btn primary" data-ok>${L('حفظ في المكتبة', 'Save to library')}</button>` });
  m.querySelector('[data-c]').onclick = closeModal;
  m.querySelector('[data-ok]').onclick = () => { const name = $('#apN').value.trim(); if (!name) { toast(L('اكتب اسم الخطة', 'Enter a name')); return; }
    const p = boardToPlay(b); Object.assign(p, { id: uid('pl'), custom: true, cat: $('#apC').value, name: { ar: name, en: name }, desc: { ar: $('#apD').value.trim(), en: $('#apD').value.trim() }, created: todayISO() });
    S.plays = S.plays || []; S.plays.push(p); S.ui.playSel = p.id; save(); closeModal();
    toast(L('حُفظت في مكتبة الخطط المتحركة', 'Saved to the animated playbook')); };
}

/* ---- mount inside the platform ---- */
/** Mount the board in `host`; `play` (optional) opens an animated play from the library on the board with all its frames. */
export function mountBoard(host, play) {
  host.innerHTML = '<div id="content" class="content flush"></div>'
  S.ui.view = "board"
  if (play && MODES[play.mode]) { S.work[play.mode] = playToBoard(play); S.ui.mode = play.mode; B.hist = []; B.fut = []; B.sel = null; save() }
  if (!MODES[S.ui.mode]) S.ui.mode = "fb11"
  renderBoard(true)
  return () => { B.playing = false; S.ui.view = "none"; if (B.ro) B.ro.disconnect(); modalStack.slice().forEach(() => closeModal()); host.innerHTML = "" }
}
