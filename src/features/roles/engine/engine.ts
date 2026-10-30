// @ts-nocheck — Roles studio engine, kept byte-for-byte in behaviour (data + layout logic). Do not "simplify": every table is coaching content.
import drillsData from "@/content/legacy-v28/drills.json"
/* Roles studio engine — ported verbatim from the platform (legacy v28 lines 1577-2292, 3462-3471, 5543-5652). */
let LANG="ar";const L=(ar,en)=>LANG==="en"?en:ar;
const T=v=>v==null?"":(typeof v==="object"&&!Array.isArray(v)&&("ar" in v||"en" in v))?(v[LANG]??v.ar):v;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const bi=(ar,en)=>({ar,en});
const S={ui:{st:{mode:"fb11",form:{},oppForm:{},def:{},oppDef:{},rv:{},rot:1,phase:"att",sel:null,opp:true,trails:true}},customDrills:[]};
const MODES = {
  fb11:   { sport: 'football',   rs: 'fb', name: { ar: 'قدم 11 × 11', en: 'Football 11v11' }, L: 105, W: 68, n: 11, mirror: true,  m: 3 },
  fb7:    { sport: 'football',   rs: 'fb', name: { ar: 'قدم 7 × 7 (ناشئين)', en: 'Football 7v7 (youth)' }, L: 55, W: 36, n: 7, mirror: true, m: 2 },
  futsal: { sport: 'football',   rs: 'fs', name: { ar: 'كرة الصالات 5 × 5', en: 'Futsal 5v5' }, L: 40, W: 20, n: 5, mirror: true, m: 1.5 },
  bb:     { sport: 'basketball', rs: 'bb', name: { ar: 'كرة السلة 5 × 5', en: 'Basketball 5v5' }, L: 28, W: 15, n: 5, mirror: false, m: 1.2 },
  vb:     { sport: 'volleyball', rs: 'vb', name: { ar: 'الكرة الطائرة 6 × 6', en: 'Volleyball 6v6' }, L: 18, W: 9, n: 6, mirror: true, m: 3.2 },
  hb:     { sport: 'handball',   rs: 'hb', name: { ar: 'كرة اليد 7 × 7', en: 'Handball 7v7' }, L: 40, W: 20, n: 7, mirror: false, m: 1.5 }
};

/* ---------- Formations (slot = [code, number, x, y]) ---------- */
const FORM = {
  fb11: {
    '4-4-2':   [['GK',1,.03,.5],['RB',2,.18,.86],['RCB',4,.16,.62],['LCB',5,.16,.38],['LB',3,.18,.14],['RM',7,.32,.86],['RCM',8,.30,.60],['LCM',6,.30,.40],['LM',11,.32,.14],['ST',9,.45,.60],['ST',10,.45,.40]],
    '4-3-3':   [['GK',1,.03,.5],['RB',2,.18,.86],['RCB',4,.16,.62],['LCB',5,.16,.38],['LB',3,.18,.14],['DM',6,.26,.5],['RCM',8,.34,.68],['LCM',10,.34,.32],['RW',7,.44,.86],['ST',9,.47,.5],['LW',11,.44,.14]],
    '4-2-3-1': [['GK',1,.03,.5],['RB',2,.18,.86],['RCB',4,.16,.62],['LCB',5,.16,.38],['LB',3,.18,.14],['DM',6,.27,.62],['DM',8,.27,.38],['RAM',7,.38,.84],['CAM',10,.39,.5],['LAM',11,.38,.16],['ST',9,.47,.5]],
    '4-1-4-1': [['GK',1,.03,.5],['RB',2,.18,.86],['RCB',4,.16,.62],['LCB',5,.16,.38],['LB',3,.18,.14],['DM',6,.25,.5],['RM',7,.35,.86],['RCM',8,.34,.63],['LCM',10,.34,.37],['LM',11,.35,.14],['ST',9,.46,.5]],
    '3-5-2':   [['GK',1,.03,.5],['RCB',4,.16,.72],['CB',5,.14,.5],['LCB',6,.16,.28],['RWB',2,.31,.9],['RCM',8,.33,.67],['DM',16,.26,.5],['LCM',10,.33,.33],['LWB',3,.31,.1],['ST',9,.45,.6],['ST',11,.45,.4]],
    '3-4-3':   [['GK',1,.03,.5],['RCB',4,.16,.72],['CB',5,.14,.5],['LCB',6,.16,.28],['RWB',2,.31,.88],['RCM',8,.29,.62],['LCM',16,.29,.38],['LWB',3,.31,.12],['RW',7,.43,.8],['ST',9,.47,.5],['LW',11,.43,.2]],
    '5-3-2':   [['GK',1,.03,.5],['RWB',2,.22,.9],['RCB',4,.16,.7],['CB',5,.14,.5],['LCB',6,.16,.3],['LWB',3,.22,.1],['RCM',8,.31,.72],['CM',16,.29,.5],['LCM',10,.31,.28],['ST',9,.44,.6],['ST',11,.44,.4]]
  },
  fb7: {
    '2-3-1':   [['GK',1,.04,.5],['RCB',2,.2,.68],['LCB',3,.2,.32],['RM',7,.34,.85],['CM',8,.32,.5],['LM',11,.34,.15],['ST',9,.45,.5]],
    '3-2-1':   [['GK',1,.04,.5],['RB',2,.2,.8],['CB',4,.18,.5],['LB',3,.2,.2],['RCM',8,.33,.65],['LCM',6,.33,.35],['ST',9,.45,.5]],
    '2-1-2-1': [['GK',1,.04,.5],['RCB',2,.2,.68],['LCB',3,.2,.32],['DM',6,.28,.5],['RW',7,.38,.82],['LW',11,.38,.18],['ST',9,.46,.5]]
  },
  futsal: {
    '1-2-1': [['GK',1,.04,.5],['FIXO',4,.2,.5],['ALA',7,.32,.82],['ALA',11,.32,.18],['PIVO',9,.45,.5]],
    '2-2':   [['GK',1,.04,.5],['FIXO',4,.22,.7],['FIXO',5,.22,.3],['ALA',7,.4,.72],['ALA',11,.4,.28]],
    '3-1':   [['GK',1,.04,.5],['ALA',7,.22,.82],['FIXO',4,.2,.5],['ALA',11,.22,.18],['PIVO',9,.44,.5]],
    '4-0':   [['GK',1,.04,.5],['ALA',7,.32,.86],['FIXO',4,.26,.62],['FIXO',5,.26,.38],['ALA',11,.32,.14]]
  }
};
/* Basketball — metres. Offence attacks the right basket (26.425, 7.5). */
const BB_OFF = {
  '5out':   [['PG',1,19.2,7.5],['SG',2,21.0,12.9],['SF',3,21.0,2.1],['PF',4,27.2,13.8],['C',5,27.2,1.2]],
  '4out':   [['PG',1,19.3,7.5],['SG',2,21.0,12.6],['SF',3,21.0,2.4],['PF',4,27.2,1.2],['C',5,25.5,10.2]],
  'horns':  [['PG',1,18.8,7.5],['SG',2,27.2,13.8],['SF',3,27.2,1.2],['PF',4,22.2,9.95],['C',5,22.2,5.05]],
  '14high': [['PG',1,18.8,7.5],['SG',2,22.2,13.5],['SF',3,22.2,1.5],['PF',4,22.2,9.95],['C',5,22.2,5.05]],
  'box':    [['PG',1,19.0,7.5],['SG',2,22.2,10.2],['SF',3,22.2,4.8],['PF',4,25.6,10.2],['C',5,25.6,4.8]]
};
const BB_DEF = {
  'man': 'man',
  '23':  [['PG',1,22.3,9.6],['SG',2,22.3,5.4],['SF',3,25.3,12.2],['C',5,26.0,7.5],['PF',4,25.3,2.8]],
  '32':  [['PG',1,20.9,7.5],['SG',2,21.9,11.6],['SF',3,21.9,3.4],['PF',4,25.3,10.0],['C',5,25.3,5.0]],
  '131': [['PG',1,19.8,7.5],['SG',2,22.6,12.2],['C',5,23.0,7.5],['SF',3,22.6,2.8],['PF',4,26.3,7.5]],
  '212': [['PG',1,22.2,9.7],['SG',2,22.2,5.3],['C',5,24.0,7.5],['SF',3,26.0,11.0],['PF',4,26.0,4.0]]
};
/* Handball — metres. Attack toward the right goal (x=40). Defence lists are for the team defending the right goal. */
const HB_OFF = {
  '33': [['GK',1,1.0,10],['LW',7,38.9,0.8],['LB',9,30.5,4.2],['CB',10,29.0,10],['RB',11,30.5,15.8],['RW',17,38.9,19.2],['PV',6,32.6,11.2]],
  '24': [['GK',1,1.0,10],['LW',7,38.9,0.8],['LB',9,29.5,7.0],['RB',11,29.5,13.0],['RW',17,38.9,19.2],['PV',6,33.0,8.6],['CB',10,33.0,11.4]]
};
const HB_DEF = {
  '60':  [['GK',12,39.2,10],['RW',17,37.2,2.6],['RB',11,34.8,4.1],['PV',6,33.3,7.3],['CB',10,33.3,12.7],['LB',9,34.8,15.9],['LW',7,37.2,17.4]],
  '51':  [['GK',12,39.2,10],['RW',17,37.2,2.6],['RB',11,34.6,4.8],['PV',6,33.3,10],['LB',9,34.6,15.2],['LW',7,37.2,17.4],['CB',10,30.5,10]],
  '321': [['GK',12,39.2,10],['RW',17,37.2,2.8],['PV',6,33.4,10],['LW',7,37.2,17.2],['RB',11,31.6,5.5],['LB',9,31.6,14.5],['CB',10,29.5,10]],
  '42':  [['GK',12,39.2,10],['RW',17,37.2,2.6],['PV',6,33.6,6.5],['LB',9,33.6,13.5],['LW',7,37.2,17.4],['RB',11,30.5,6.0],['CB',10,30.5,14.0]]
};
/* Volleyball — 5-1 system. Lineup in positions 1..6: S OH MB OPP OH MB. */
const VB_ORDER = [['S',1],['OH',4],['MB',3],['OPP',2],['OH',7],['MB',8]];
const VB_SPOT = { 1:[2.5,7.5], 2:[7.0,7.5], 3:[7.0,4.5], 4:[7.0,1.5], 5:[2.5,1.5], 6:[2.5,4.5] };
function vbRotation(k, liberoAllBack) {
  const seq = [1,6,5,4,3,2];
  return VB_ORDER.map((m, i) => {
    const pos = seq[(seq.indexOf(i + 1) + (k - 1)) % 6]; let code = m[0];
    if (code === 'MB' && (pos === 5 || pos === 6 || (liberoAllBack && pos === 1))) code = 'L';
    return { code, n: code === 'L' ? 13 : m[1], pos };
  });
}
function vbFormation(key) {
  const [type, kStr] = key.split('|'); const k = +kStr; const rot = vbRotation(k, type !== 'base');
  const F = (x, y) => [x / 18, y / 9];
  if (type === 'base') return rot.map(r => [r.code, r.n, ...F(...VB_SPOT[r.pos]), r.pos]);
  if (type === 'recv') {
    const passers = rot.filter(r => r.code === 'OH' || r.code === 'L').sort((a, b) => VB_SPOT[a.pos][1] - VB_SPOT[b.pos][1]);
    const lanes = [[3.2,1.7],[2.8,4.5],[3.2,7.3]]; const out = [];
    passers.forEach((p, i) => out.push([p.code, p.n, ...F(...lanes[i]), p.pos]));
    const setter = rot.find(r => r.code === 'S'); out.push(['S', 1, ...F(8.3, 6.4), setter.pos]);
    rot.filter(r => r !== setter && !passers.includes(r)).sort((a, b) => VB_SPOT[a.pos][1] - VB_SPOT[b.pos][1])
      .forEach((r, i) => { const front = [2,3,4].includes(r.pos); out.push([r.code, r.n, ...F(front ? 8.2 : 1.4, front ? ([2.4,4.6][i] || 3) : 7.8), r.pos]); });
    return out;
  }
  if (type === 'trans') {
    const sp = { 4:[5.4,1.0], 3:[6.2,4.5], 2:[5.4,8.0], 5:[2.6,1.6], 6:[3.0,4.5], 1:[2.6,7.4] };
    return rot.map(r => r.code === 'S' ? ['S', 1, ...F(8.3, 6.2), r.pos] : [r.code, r.n, ...F(...sp[r.pos]), r.pos]);
  }
  if (type === 'cover') {
    const hitter = rot.find(r => r.pos === 4) || rot[0]; const others = rot.filter(r => r !== hitter);
    const ring = [[6.6,1.9],[7.0,3.4],[4.9,1.3],[4.8,3.3],[3.0,5.2]];
    const H = [8.0, 1.2]; others.sort((a, b) => Math.hypot(VB_SPOT[a.pos][0] - H[0], VB_SPOT[a.pos][1] - H[1]) - Math.hypot(VB_SPOT[b.pos][0] - H[0], VB_SPOT[b.pos][1] - H[1]));
    return [[hitter.code, hitter.n, ...F(...H), hitter.pos]].concat(others.map((r, i) => [r.code, r.n, ...F(...ring[i]), r.pos]));
  }
  const d = { 4:[8.4,1.6], 3:[8.4,4.5], 2:[8.4,7.4], 5:[2.6,1.0], 6:[1.4,4.5], 1:[2.6,8.0] };
  return rot.map(r => [r.code, r.n, ...F(...d[r.pos]), r.pos]);
}
const VB_FORMS = {};
for (let k = 1; k <= 6; k++) { VB_FORMS[`base|${k}`] = 1; VB_FORMS[`recv|${k}`] = 1; VB_FORMS[`def|${k}`] = 1; }

/* ---------- Formation display names ---------- */
const FNAME = {
  futsal: { '1-2-1': { ar: '1-2-1 (ماسة)', en: '1-2-1 (diamond)' }, '2-2': { ar: '2-2 (مربع)', en: '2-2 (square)' }, '3-1': { ar: '3-1', en: '3-1' }, '4-0': { ar: '4-0 (دوران)', en: '4-0 (rotation)' } },
  bbOff: { '5out': { ar: '5-Out (خمسة خارج القوس)', en: '5-Out' }, '4out': { ar: '4-Out 1-In', en: '4-Out 1-In' }, 'horns': { ar: 'Horns (القرون)', en: 'Horns' }, '14high': { ar: '1-4 High (عالٍ)', en: '1-4 High' }, 'box': { ar: 'Box (صندوق)', en: 'Box' } },
  bbDef: { 'man': { ar: 'رجل لرجل', en: 'Man-to-man' }, '23': { ar: 'منطقة 2-3', en: '2-3 zone' }, '32': { ar: 'منطقة 3-2 (1-2-2)', en: '3-2 zone (1-2-2)' }, '131': { ar: 'منطقة 1-3-1', en: '1-3-1 zone' }, '212': { ar: 'منطقة 2-1-2', en: '2-1-2 zone' } },
  hbOff: { '33': { ar: '3:3 (ثلاثة خلفيين)', en: '3:3 (three backs)' }, '24': { ar: '2:4 (دائرتان)', en: '2:4 (two pivots)' } },
  hbDef: { '60': { ar: 'دفاع 6:0', en: '6:0 defence' }, '51': { ar: 'دفاع 5:1', en: '5:1 defence' }, '321': { ar: 'دفاع 3:2:1', en: '3:2:1 defence' }, '42': { ar: 'دفاع 4:2', en: '4:2 defence' } }
};
function vbName(key) { const [t, k] = key.split('|'); const n = { base: { ar: 'تمركز الإرسال', en: 'serve alignment' }, recv: { ar: 'استقبال ثلاثي', en: '3-passer reception' }, def: { ar: 'دفاع محيطي', en: 'perimeter defence' } }[t]; return { ar: `الدوران ${k} — ${n.ar}`, en: `Rotation ${k} — ${n.en}` }; }

/* ---------- Formation analysis ---------- */
const FINFO = {
  '4-4-2': { ar: { p: 'خطان متوازيان من أربعة لاعبين يغطيان عرض الملعب، ومهاجمان يضغطان على قلبي الدفاع.', s: ['تغطية متوازنة للعرض في الدفاع', 'شراكة هجومية ثنائية أمام المرمى', 'سهلة التعليم للناشئين'], w: ['نقص عددي في الوسط أمام 4-3-3', 'مساحة بين الخطوط إن تباعد الوسط عن الدفاع'] },
             en: { p: 'Two flat lines of four cover the width, while two strikers press the centre-backs.', s: ['Balanced width when defending', 'Two-striker partnership in the box', 'Easy to teach to young players'], w: ['Outnumbered centrally by a 4-3-3', 'Space between the lines if midfield and defence split'] } },
  '4-3-3': { ar: { p: 'ثلاثي وسط بمثلث (ارتكاز + لاعبان) وأجنحة واسعة تثبت ظهيري الخصم.', s: ['تفوق عددي في الوسط', 'ضغط عالٍ بثلاثة مهاجمين', 'اتساع هجومي طبيعي'], w: ['الأطراف مكشوفة إن تأخر الجناح في العودة', 'الارتكاز معرض للعزل أمام صانع ألعاب منافس'] },
             en: { p: 'A midfield triangle (anchor + two eights) and wide wingers pinning the opposing full-backs.', s: ['Numerical edge in midfield', 'High press with three forwards', 'Natural attacking width'], w: ['Flanks exposed if wingers do not track back', 'The anchor can be isolated against a No.10'] } },
  '4-2-3-1': { ar: { p: 'محوران أمام الدفاع يمنحان التوازن، وثلاثة خلف المهاجم يصنعون الفرص.', s: ['أمان دفاعي أمام قلبي الدفاع', 'مرونة التحول إلى 4-4-1-1 في الدفاع', 'صانع ألعاب حر بين الخطوط'], w: ['المهاجم قد يعزل', 'يعتمد على جودة لاعب الرقم 10'] },
               en: { p: 'Two holding midfielders give balance; three behind the striker create chances.', s: ['Security in front of the centre-backs', 'Easy shift to 4-4-1-1 out of possession', 'A free No.10 between the lines'], w: ['The striker can become isolated', 'Heavily reliant on the No.10'] } },
  '4-1-4-1': { ar: { p: 'ارتكاز واحد يحمي الخطين، وخط وسط من أربعة يشكل كتلة دفاعية متماسكة.', s: ['كتلة متوسطة قوية', 'حماية المساحة بين الخطوط', 'يتحول إلى 4-3-3 في الاستحواذ'], w: ['المهاجم وحيد في الضغط', 'يتطلب لياقة عالية من لاعبي الوسط'] },
               en: { p: 'A single pivot screens the back four, with a midfield four forming a compact block.', s: ['Strong mid-block', 'Protects space between the lines', 'Becomes 4-3-3 in possession'], w: ['Lone striker in the press', 'Demands high fitness from midfielders'] } },
  '3-5-2': { ar: { p: 'ثلاثة قلوب دفاع، وظهيران جناحان يغطيان الطرف كاملاً، ومهاجمان.', s: ['سيطرة على الوسط بخمسة لاعبين', 'تغطية دفاعية ضد مهاجمين اثنين', 'الظهير الجناح يصنع الاتساع'], w: ['الأطراف تعتمد على لاعب واحد', 'يتطلب لياقة عالية جداً من الظهيرين الجناحين'] },
             en: { p: 'Three centre-backs, wing-backs covering whole flanks, and two strikers.', s: ['Midfield control with five', 'Cover against two strikers', 'Wing-backs provide the width'], w: ['Each flank depends on one player', 'Very demanding for the wing-backs'] } },
  '3-4-3': { ar: { p: 'دفاع ثلاثي، ووسط من أربعة، وثلاثة مهاجمين للضغط والاتساع.', s: ['ضغط عالٍ بخمسة لاعبين في الخط الأمامي', 'اتساع هجومي كبير', 'مثلثات تمرير كثيرة'], w: ['ثنائي الوسط تحت ضغط عددي', 'المساحة خلف الظهيرين الجناحين'] },
             en: { p: 'Back three, midfield four and a front three for pressing and width.', s: ['Five players can press high', 'Great attacking width', 'Many passing triangles'], w: ['Midfield pair can be outnumbered', 'Space behind the wing-backs'] } },
  '5-3-2': { ar: { p: 'خط دفاع خماسي منخفض ووسط ثلاثي، مع مرتدات عبر المهاجمين.', s: ['صلابة دفاعية عالية أمام المرمى', 'مناسبة للمرتدات', 'حماية ضد العرضيات'], w: ['قلة الضغط في الأمام', 'صعوبة الاستحواذ في نصف الخصم'] },
             en: { p: 'A deep back five and midfield three, countering through two strikers.', s: ['Very solid in front of goal', 'Suited to counter-attacks', 'Protection against crosses'], w: ['Little pressure high up', 'Hard to keep the ball in the opposition half'] } },
  '2-3-1': { ar: { p: 'الخطة الأكثر توازناً في 7×7: مدافعان وثلاثة وسط ومهاجم.', s: ['مثلثات تمرير طبيعية', 'توزيع جيد للعرض', 'تعلم المراكز الأساسية'], w: ['مدافعان فقط أمام المرتدات', 'المهاجم يحتاج دعماً سريعاً'] },
             en: { p: 'The most balanced 7v7 shape: two defenders, three midfielders, one striker.', s: ['Natural passing triangles', 'Good use of width', 'Teaches core positions'], w: ['Only two defenders against counters', 'The striker needs quick support'] } },
  '3-2-1': { ar: { p: 'ثلاثة مدافعين لأمان دفاعي مع وسطين ومهاجم.', s: ['أمان دفاعي', 'بناء لعب مريح من الخلف', 'مناسب للفرق الأصغر سناً'], w: ['قلة اللاعبين في الهجوم', 'الأطراف الأمامية فارغة'] },
             en: { p: 'Three defenders for safety, two midfielders and a striker.', s: ['Defensive safety', 'Comfortable build-up', 'Good for younger teams'], w: ['Few players in attack', 'Empty flanks up front'] } },
  '2-1-2-1': { ar: { p: 'شكل ماسي في الوسط بارتكاز وجناحين.', s: ['اتساع هجومي بالجناحين', 'ارتكاز يحمي الدفاع', 'تحولات سريعة'], w: ['الأطراف الخلفية مكشوفة', 'يتطلب انضباط الجناحين دفاعياً'] },
               en: { p: 'A midfield diamond with an anchor and two wingers.', s: ['Width through wingers', 'Anchor protects the defence', 'Quick transitions'], w: ['Rear flanks exposed', 'Wingers must track back'] } },
  '1-2-1': { ar: { p: 'الماسة: فيكسو في الخلف، جناحان، ومحور متقدم.', s: ['توازن بين الدفاع والهجوم', 'المحور يحمي الكرة للأجنحة القادمة', 'الأكثر استخداماً'], w: ['يعتمد على جودة المحور', 'الفيكسو وحيد أمام المرتدات'] },
             en: { p: 'The diamond: fixo at the back, two alas and an advanced pivot.', s: ['Balance between defence and attack', 'Pivot holds the ball for arriving alas', 'Most widely used'], w: ['Depends on pivot quality', 'Fixo alone against counters'] } },
  '2-2': { ar: { p: 'المربع: مدافعان ومهاجمان، بسيط للتعليم.', s: ['أمان في الخلف', 'سهل للمبتدئين'], w: ['قليل الحركة والدوران', 'متوقع للخصم'] },
           en: { p: 'The square: two back, two up; simple to teach.', s: ['Safety at the back', 'Easy for beginners'], w: ['Little rotation', 'Predictable'] } },
  '3-1': { ar: { p: 'ثلاثة في الخلف ومحور، للدوران والاستحواذ.', s: ['استحواذ آمن', 'دوران بين الثلاثة'], w: ['قلة الحضور الهجومي'] },
           en: { p: 'Three back and a pivot, for rotation and possession.', s: ['Safe possession', 'Rotation among the three'], w: ['Limited attacking presence'] } },
  '4-0': { ar: { p: 'أربعة على خط واحد بدوران مستمر ودون محور ثابت.', s: ['حركة دائمة تفكك الدفاع', 'كل لاعب يهاجم ويدافع'], w: ['يتطلب لاعبين أذكياء تكتيكياً ولياقة عالية'] },
           en: { p: 'Four in a line with constant rotation and no fixed pivot.', s: ['Constant movement disorganises defences', 'Everyone attacks and defends'], w: ['Needs tactically smart, very fit players'] } },
  '5out': { ar: { p: 'خمسة لاعبين خارج القوس لتفريغ المنطقة للاختراق.', s: ['مساحة واسعة للاختراق', 'قراءة سهلة للتمريرة الخارجية'], w: ['ضعف المتابعة الهجومية'] }, en: { p: 'Five outside the arc to empty the paint for drives.', s: ['Wide driving lanes', 'Easy kick-out reads'], w: ['Weak offensive rebounding'] } },
  '4out': { ar: { p: 'أربعة خارج القوس ولاعب ارتكاز في المنطقة المنخفضة.', s: ['تهديد داخلي وخارجي', 'متابعة هجومية أفضل'], w: ['ازدحام جانب الارتكاز'] }, en: { p: 'Four outside and one post player on the low block.', s: ['Inside-out threat', 'Better offensive rebounding'], w: ['Crowded on the post side'] } },
  'horns': { ar: { p: 'لاعبان عند المرفقين وصانع الألعاب في القمة، لخيارات حجز متعددة.', s: ['حجز من الجهتين', 'قراءات متعددة للصانع'], w: ['يحتاج مصوبين في الزوايا'] }, en: { p: 'Two bigs at the elbows with the point guard up top for multiple screen options.', s: ['Screens from both sides', 'Many reads for the ball-handler'], w: ['Needs corner shooters'] } },
  '14high': { ar: { p: 'أربعة لاعبين على خط الرمية الحرة الممتد، لفتح الاختراق والقطع الخلفي.', s: ['عزل ممتاز للاختراق', 'فرص القطع الخلفي'], w: ['ضعيف أمام الضغط العالي'] }, en: { p: 'Four players on the extended free-throw line, opening drives and back-cuts.', s: ['Great isolation for drives', 'Back-cut opportunities'], w: ['Vulnerable to high pressure'] } },
  'box': { ar: { p: 'صندوق حول المنطقة، يستخدم كثيراً في الرميات الخلفية والجمل المحفوظة.', s: ['حجوزات متقاطعة', 'مناسب للرميات'], w: ['متوقع إذا تكرر'] }, en: { p: 'A box around the key, common for inbounds and set plays.', s: ['Cross screens', 'Good for inbounds'], w: ['Predictable if repeated'] } },
  'man': { ar: { p: 'كل مدافع مسؤول عن لاعب، مع خط مساندة حسب الكرة.', s: ['مسؤولية واضحة', 'ضغط على الحامل'], w: ['يتأثر بالحجوزات والتبديل'] }, en: { p: 'Each defender guards a player, with help positions based on the ball.', s: ['Clear responsibility', 'Pressure on the ball'], w: ['Screens and switches hurt it'] } },
  '23': { ar: { p: 'اثنان أعلى المنطقة وثلاثة في الأسفل لحماية السلة.', s: ['حماية المنطقة والمتابعة', 'مناسب ضد الاختراق'], w: ['ضعيف أمام التصويب من المرفقين والزوايا'] }, en: { p: 'Two up top and three low to protect the rim.', s: ['Protects the paint and boards', 'Good against drivers'], w: ['Weak against elbow and corner shooting'] } },
  '32': { ar: { p: 'ثلاثة في الأعلى لإغلاق التصويب الخارجي واثنان في الأسفل.', s: ['يغلق المصوبين من الخارج'], w: ['المنطقة المنخفضة والزوايا مكشوفة'] }, en: { p: 'Three up top to close perimeter shots, two low.', s: ['Closes perimeter shooters'], w: ['Low post and corners exposed'] } },
  '131': { ar: { p: 'منطقة مصيدة تضغط على الأجنحة وتصنع الأخطاء.', s: ['يربك صانع الألعاب', 'فرص قطع الكرات'], w: ['الزوايا والمتابعة الدفاعية ضعيفة'] }, en: { p: 'A trapping zone that pressures the wings and forces errors.', s: ['Disrupts the point guard', 'Steal opportunities'], w: ['Corners and rebounding weak'] } },
  '212': { ar: { p: 'منطقة متوازنة بلاعب في وسط المنطقة.', s: ['حماية الوسط'], w: ['الأجنحة مفتوحة للتصويب'] }, en: { p: 'A balanced zone with a player in the middle of the key.', s: ['Protects the middle'], w: ['Wings open for shots'] } },
  '33': { ar: { p: 'ثلاثة خلفيين وجناحان ودائرة: الشكل الأساسي للهجوم المنظم.', s: ['توزيع متوازن للعرض', 'خيارات تسديد من 9م'], w: ['دائرة واحدة فقط'] }, en: { p: 'Three backs, two wings and a pivot: the standard organised attack.', s: ['Balanced width', 'Shooting options from 9 m'], w: ['Only one pivot'] } },
  '24': { ar: { p: 'دخول لاعب ثانٍ للدائرة لتفكيك الدفاع المسطح.', s: ['حجوزات مزدوجة', 'ضغط على خط 6م'], w: ['قلة التسديد البعيد'] }, en: { p: 'A second player enters the line to break a flat defence.', s: ['Double screens', 'Pressure on the 6 m line'], w: ['Fewer long-range shots'] } },
  '60': { ar: { p: 'ستة مدافعين على خط 6م ينزلقون مع الكرة.', s: ['حماية الدائرة', 'تنظيم بسيط'], w: ['مساحة للتسديد من الخلف'] }, en: { p: 'Six defenders on the 6 m line sliding with the ball.', s: ['Protects the line players', 'Simple to organise'], w: ['Space for back-court shooting'] } },
  '51': { ar: { p: 'خمسة على الخط ومدافع متقدم يقطع التمرير على صانع الألعاب.', s: ['إرباك الصانع', 'فرص قطع الكرات'], w: ['فراغات خلف المتقدم'] }, en: { p: 'Five on the line and one advanced defender disrupting the playmaker.', s: ['Disrupts the centre back', 'Interception chances'], w: ['Gaps behind the advanced player'] } },
  '321': { ar: { p: 'دفاع عميق متقدم بثلاثة خطوط، هجومي الطابع.', s: ['ضغط على الخلفيين', 'كرات مقطوعة وهجوم خاطف'], w: ['مساحات للدائرة والأجنحة'] }, en: { p: 'A deep, aggressive three-line defence.', s: ['Pressure on the backs', 'Turnovers and fast breaks'], w: ['Space for pivot and wings'] } },
  '42': { ar: { p: 'مدافعان متقدمان على الخلفيين المسددين.', s: ['يوقف مسددي الخلف'], w: ['الوسط مفتوح للاختراق'] }, en: { p: 'Two advanced defenders on the shooting backs.', s: ['Stops back-court shooters'], w: ['Centre open for penetration'] } },
  'vb51': { ar: { p: 'نظام 5-1: معد واحد في كل الدورانات، يقابله ضارب مقابل، ومعه ضاربان رئيسيان ولاعبا وسط وليبرو.', s: ['إعداد ثابت ومتسق', 'ثلاثة ضاربين في الأمام حين يكون المعد في الخلف'], w: ['ضاربان فقط في الأمام حين يكون المعد في الأمام'] },
            en: { p: '5-1 system: one setter in every rotation opposite the opposite hitter, with two outside hitters, two middles and a libero.', s: ['Consistent setting', 'Three front-row hitters when the setter is back row'], w: ['Only two front-row hitters when the setter is front row'] } }
};

/* ---------- Phases ---------- */
const PHASES = {
  default: { att: { ar: 'في الاستحواذ', en: 'In possession' }, def: { ar: 'دون الكرة', en: 'Out of possession' }, ta: { ar: 'التحول الهجومي', en: 'Attacking transition' }, td: { ar: 'التحول الدفاعي', en: 'Defensive transition' }, sp: { ar: 'الكرات الثابتة', en: 'Set pieces' } },
  bb: { att: { ar: 'الهجوم المنظم', en: 'Half-court offence' }, def: { ar: 'الدفاع المنظم', en: 'Half-court defence' }, ta: { ar: 'الهجوم الخاطف', en: 'Fast break' }, td: { ar: 'الارتداد الدفاعي', en: 'Transition defence' }, sp: { ar: 'الرميات الجانبية والخلفية', en: 'Inbound plays' } },
  hb: { att: { ar: 'الهجوم المنظم', en: 'Organised attack' }, def: { ar: 'الدفاع المنظم', en: 'Organised defence' }, ta: { ar: 'الهجوم الخاطف', en: 'Fast break' }, td: { ar: 'الارتداد الدفاعي', en: 'Getting back' }, sp: { ar: 'الرميات الحرة و7 أمتار', en: 'Free throws & 7 m' } },
  vb: { att: { ar: 'الاستقبال وبناء الهجوم', en: 'Reception & side-out' }, def: { ar: 'الحائط والدفاع', en: 'Block & defence' }, ta: { ar: 'الهجوم المرتد', en: 'Transition attack' }, td: { ar: 'تغطية الضارب', en: 'Hitter coverage' }, sp: { ar: 'الإرسال', en: 'Serve' } }
};
const phasesOf = rs => PHASES[rs] || PHASES.default;

/* ---------- Families & code map ---------- */
const CODE_FAMILY = {
  fb: { GK:'GK', CB:'CB', RCB:'CB', LCB:'CB', RB:'FB', LB:'FB', RWB:'WB', LWB:'WB', DM:'DM', CM:'CM', RCM:'CM', LCM:'CM', CAM:'AM', RAM:'W', LAM:'W', RM:'W', LM:'W', RW:'W', LW:'W', ST:'ST' },
  fs: { GK:'GK', FIXO:'FIXO', ALA:'ALA', PIVO:'PIVO' },
  bb: { PG:'PG', SG:'SG', SF:'SF', PF:'PF', C:'C' },
  vb: { S:'S', OH:'OH', MB:'MB', OPP:'OPP', L:'L' },
  hb: { GK:'GK', LW:'WING', RW:'WING', LB:'BACK', RB:'BACK', CB:'CB', PV:'PV' }
};
const CODE_NAME = {
  GK: { ar: 'حارس المرمى', en: 'Goalkeeper' }, CB: { ar: 'قلب دفاع', en: 'Centre-back' }, RCB: { ar: 'قلب دفاع أيمن', en: 'Right centre-back' }, LCB: { ar: 'قلب دفاع أيسر', en: 'Left centre-back' },
  RB: { ar: 'ظهير أيمن', en: 'Right-back' }, LB: { ar: 'ظهير أيسر', en: 'Left-back' }, RWB: { ar: 'ظهير جناح أيمن', en: 'Right wing-back' }, LWB: { ar: 'ظهير جناح أيسر', en: 'Left wing-back' },
  DM: { ar: 'لاعب ارتكاز', en: 'Defensive midfielder' }, CM: { ar: 'لاعب وسط', en: 'Central midfielder' }, RCM: { ar: 'وسط أيمن', en: 'Right central mid' }, LCM: { ar: 'وسط أيسر', en: 'Left central mid' },
  CAM: { ar: 'صانع ألعاب', en: 'Attacking midfielder' }, RAM: { ar: 'جناح أيمن متأخر', en: 'Right attacking mid' }, LAM: { ar: 'جناح أيسر متأخر', en: 'Left attacking mid' }, RM: { ar: 'وسط أيمن (طرف)', en: 'Right midfielder' }, LM: { ar: 'وسط أيسر (طرف)', en: 'Left midfielder' },
  RW: { ar: 'جناح أيمن', en: 'Right winger' }, LW: { ar: 'جناح أيسر', en: 'Left winger' }, ST: { ar: 'مهاجم', en: 'Striker' },
  FIXO: { ar: 'فيكسو (مدافع)', en: 'Fixo' }, ALA: { ar: 'آلا (جناح)', en: 'Ala' }, PIVO: { ar: 'بيفو (محور)', en: 'Pivot' },
  PG: { ar: 'صانع ألعاب (1)', en: 'Point guard (1)' }, SG: { ar: 'حارس مسجل (2)', en: 'Shooting guard (2)' }, SF: { ar: 'جناح صغير (3)', en: 'Small forward (3)' }, PF: { ar: 'جناح قوي (4)', en: 'Power forward (4)' }, C: { ar: 'ارتكاز (5)', en: 'Centre (5)' },
  S: { ar: 'معد', en: 'Setter' }, OH: { ar: 'ضارب رئيسي', en: 'Outside hitter' }, MB: { ar: 'لاعب وسط', en: 'Middle blocker' }, OPP: { ar: 'ضارب مقابل', en: 'Opposite' }, L: { ar: 'ليبرو', en: 'Libero' },
  PV: { ar: 'لاعب الدائرة', en: 'Pivot' }
};
const HB_CODE_NAME = { LW: { ar: 'جناح أيسر', en: 'Left wing' }, RW: { ar: 'جناح أيمن', en: 'Right wing' }, LB: { ar: 'ظهير أيسر', en: 'Left back' }, RB: { ar: 'ظهير أيمن', en: 'Right back' }, CB: { ar: 'صانع ألعاب', en: 'Centre back' } };

/* ---------- Drill categories, intensity ---------- */
const CATS = { warm: { ar: 'إحماء', en: 'Warm-up' }, tech: { ar: 'مهاري', en: 'Technical' }, tact: { ar: 'خططي', en: 'Tactical' }, phys: { ar: 'بدني', en: 'Physical' }, game: { ar: 'لعب مصغّر', en: 'Small-sided game' }, cool: { ar: 'تهدئة', en: 'Cool-down' } };
const INT = { 1: { ar: 'منخفضة', en: 'Low' }, 2: { ar: 'متوسطة', en: 'Moderate' }, 3: { ar: 'عالية', en: 'High' }, 4: { ar: 'قصوى', en: 'Maximal' } };

/* ---------- Evaluation ---------- */
const PILLARS = { tech: { ar: 'فني', en: 'Technical' }, tact: { ar: 'خططي', en: 'Tactical' }, phys: { ar: 'بدني', en: 'Physical' }, ment: { ar: 'ذهني', en: 'Mental' } };
const MENT = [['foc', { ar: 'التركيز', en: 'Focus' }], ['conf', { ar: 'الثقة', en: 'Confidence' }], ['disc', { ar: 'الانضباط', en: 'Discipline' }], ['team', { ar: 'العمل الجماعي', en: 'Teamwork' }]];
const EVAL = {
  football: {
    tech: [['ctrl', { ar: 'الاستلام والتحكم', en: 'First touch' }], ['pass', { ar: 'التمرير', en: 'Passing' }], ['drib', { ar: 'المراوغة', en: 'Dribbling' }], ['fin', { ar: 'التسديد والإنهاء', en: 'Finishing' }]],
    tact: [['posi', { ar: 'التمركز', en: 'Positioning' }], ['dec', { ar: 'اتخاذ القرار', en: 'Decision-making' }], ['defa', { ar: 'الوعي الدفاعي', en: 'Defensive awareness' }], ['trans', { ar: 'سرعة التحول', en: 'Transition speed' }]],
    phys: [['spd', { ar: 'السرعة', en: 'Speed' }], ['end', { ar: 'التحمل', en: 'Endurance' }], ['str', { ar: 'القوة', en: 'Strength' }], ['agi', { ar: 'الرشاقة', en: 'Agility' }]], ment: MENT },
  basketball: {
    tech: [['drib', { ar: 'المحاورة', en: 'Ball-handling' }], ['pass', { ar: 'التمرير', en: 'Passing' }], ['shot', { ar: 'التصويب', en: 'Shooting' }], ['fin', { ar: 'الإنهاء قرب السلة', en: 'Finishing at the rim' }]],
    tact: [['read', { ar: 'قراءة اللعب', en: 'Game reading' }], ['d1', { ar: 'الدفاع الفردي', en: 'On-ball defence' }], ['help', { ar: 'المساندة الدفاعية', en: 'Help defence' }], ['off', { ar: 'اللعب دون كرة', en: 'Off-ball movement' }]],
    phys: [['spd', { ar: 'السرعة', en: 'Speed' }], ['end', { ar: 'التحمل', en: 'Endurance' }], ['jmp', { ar: 'القفز', en: 'Jumping' }], ['agi', { ar: 'الرشاقة', en: 'Agility' }]], ment: MENT },
  volleyball: {
    tech: [['srv', { ar: 'الإرسال', en: 'Serve' }], ['rcv', { ar: 'الاستقبال', en: 'Reception' }], ['atk', { ar: 'الضرب الساحق', en: 'Attack' }], ['blk', { ar: 'حائط الصد', en: 'Block' }]],
    tact: [['posi', { ar: 'التمركز الدفاعي', en: 'Defensive positioning' }], ['read', { ar: 'قراءة الضارب', en: 'Reading the hitter' }], ['cov', { ar: 'التغطية', en: 'Coverage' }], ['shot', { ar: 'اختيار الضربة', en: 'Shot selection' }]],
    phys: [['jmp', { ar: 'الوثب العمودي', en: 'Vertical jump' }], ['spd', { ar: 'السرعة', en: 'Speed' }], ['agi', { ar: 'الرشاقة', en: 'Agility' }], ['str', { ar: 'القوة', en: 'Strength' }]], ment: MENT },
  handball: {
    tech: [['pass', { ar: 'التمرير والاستلام', en: 'Passing & catching' }], ['shot', { ar: 'التسديد', en: 'Shooting' }], ['feint', { ar: 'الخداع 1 ضد 1', en: '1v1 feints' }], ['drib', { ar: 'التنطيط', en: 'Dribbling' }]],
    tact: [['defs', { ar: 'الدفاع الجماعي', en: 'Team defence' }], ['pen', { ar: 'الاختراق', en: 'Penetration' }], ['piv', { ar: 'اللعب مع الدائرة', en: 'Play with the pivot' }], ['trans', { ar: 'التحول', en: 'Transition' }]],
    phys: [['spd', { ar: 'السرعة', en: 'Speed' }], ['end', { ar: 'التحمل', en: 'Endurance' }], ['str', { ar: 'القوة', en: 'Strength' }], ['jmp', { ar: 'القفز', en: 'Jumping' }]], ment: MENT }
};
const TESTS = [
  { k: 'sp30', name: { ar: 'سرعة 30م', en: '30 m sprint' }, unit: { ar: 'ث', en: 's' }, lower: true, dp: 2 },
  { k: 'yoyo', name: { ar: 'Yo-Yo IR1', en: 'Yo-Yo IR1' }, unit: { ar: 'م', en: 'm' }, lower: false, dp: 0 },
  { k: 'cmj', name: { ar: 'الوثب العمودي CMJ', en: 'Countermovement jump' }, unit: { ar: 'سم', en: 'cm' }, lower: false, dp: 1 },
  { k: 'ttest', name: { ar: 'اختبار T للرشاقة', en: 'T-test agility' }, unit: { ar: 'ث', en: 's' }, lower: true, dp: 2 },
  { k: 'lj', name: { ar: 'الوثب العريض', en: 'Standing long jump' }, unit: { ar: 'سم', en: 'cm' }, lower: false, dp: 0 }
];
const POSITIONS = {
  fb: [['GK', { ar: 'حارس', en: 'Goalkeeper' }], ['CB', { ar: 'قلب دفاع', en: 'Centre-back' }], ['FB', { ar: 'ظهير', en: 'Full-back' }], ['WB', { ar: 'ظهير جناح', en: 'Wing-back' }], ['DM', { ar: 'ارتكاز', en: 'Defensive mid' }], ['CM', { ar: 'وسط', en: 'Central mid' }], ['AM', { ar: 'صانع ألعاب', en: 'Attacking mid' }], ['W', { ar: 'جناح', en: 'Winger' }], ['ST', { ar: 'مهاجم', en: 'Striker' }]],
  fs: [['GK', { ar: 'حارس', en: 'Goalkeeper' }], ['FIXO', { ar: 'فيكسو', en: 'Fixo' }], ['ALA', { ar: 'جناح', en: 'Ala' }], ['PIVO', { ar: 'محور', en: 'Pivot' }]],
  bb: [['PG', { ar: 'صانع ألعاب', en: 'Point guard' }], ['SG', { ar: 'حارس مسجل', en: 'Shooting guard' }], ['SF', { ar: 'جناح صغير', en: 'Small forward' }], ['PF', { ar: 'جناح قوي', en: 'Power forward' }], ['C', { ar: 'ارتكاز', en: 'Centre' }]],
  vb: [['S', { ar: 'معد', en: 'Setter' }], ['OH', { ar: 'ضارب رئيسي', en: 'Outside hitter' }], ['MB', { ar: 'وسط', en: 'Middle blocker' }], ['OPP', { ar: 'مقابل', en: 'Opposite' }], ['L', { ar: 'ليبرو', en: 'Libero' }]],
  hb: [['GK', { ar: 'حارس', en: 'Goalkeeper' }], ['WING', { ar: 'جناح', en: 'Wing' }], ['BACK', { ar: 'ظهير', en: 'Back' }], ['CB', { ar: 'صانع ألعاب', en: 'Centre back' }], ['PV', { ar: 'دائرة', en: 'Pivot' }]]
};
/* Attribute labels used in role profiles */
const ATTR = {
  shot: { ar: 'التصدي ورد الفعل', en: 'Shot-stopping & reflexes' }, dist: { ar: 'التوزيع والتمرير', en: 'Distribution' }, comm: { ar: 'التواصل والقيادة', en: 'Communication & leadership' }, aer: { ar: 'اللعب الهوائي', en: 'Aerial ability' },
  tack: { ar: 'الافتكاك والتدخل', en: 'Tackling' }, pos: { ar: 'التمركز', en: 'Positioning' }, read: { ar: 'قراءة اللعب', en: 'Reading the game' }, pace: { ar: 'السرعة', en: 'Pace' },
  stam: { ar: 'التحمل', en: 'Stamina' }, cross: { ar: 'العرضيات', en: 'Crossing' }, pass: { ar: 'التمرير', en: 'Passing' }, vis: { ar: 'الرؤية', en: 'Vision' }, touch: { ar: 'اللمسة الأولى', en: 'First touch' },
  drib: { ar: 'المراوغة', en: 'Dribbling' }, fin: { ar: 'الإنهاء', en: 'Finishing' }, str: { ar: 'القوة البدنية', en: 'Strength' }, work: { ar: 'الجهد والالتزام', en: 'Work rate' }, calm: { ar: 'الهدوء تحت الضغط', en: 'Composure' },
  hold: { ar: 'حماية الكرة', en: 'Hold-up play' }, jump: { ar: 'القفز', en: 'Jumping' }, handle: { ar: 'التحكم بالكرة', en: 'Ball-handling' }, shoot: { ar: 'التصويب', en: 'Shooting' }, iq: { ar: 'الذكاء التكتيكي', en: 'Tactical IQ' },
  rebound: { ar: 'المتابعة', en: 'Rebounding' }, block: { ar: 'حائط الصد', en: 'Blocking' }, serve: { ar: 'الإرسال', en: 'Serving' }, recv: { ar: 'الاستقبال', en: 'Reception' }, setg: { ar: 'دقة الإعداد', en: 'Setting accuracy' },
  attack: { ar: 'قوة الضرب', en: 'Attacking power' }, dig: { ar: 'الدفاع الأرضي', en: 'Digging' }, feint: { ar: 'الخداع', en: 'Feints' }, agil: { ar: 'الرشاقة', en: 'Agility' }
};

/* ============================================================
   ROLES — position families (profile, mistakes, cues, youth notes)
   and role variants (tasks by phase, KPIs, drills, zones, movement).
   mv[phase] = [x, lat]: x = fraction of length (team attacking →),
   lat = distance from the centre line as a fraction of width (0..0.5),
   null keeps the player's lateral position from the formation.
   ============================================================ */
const FAM = {
  fb: {
    GK: { name: { ar: 'حارس المرمى', en: 'Goalkeeper' }, qual: [['shot', 5], ['pos', 5], ['comm', 4], ['dist', 4], ['aer', 4], ['calm', 4]],
      mistakes: { ar: ['التمركز على خط المرمى أثناء الكرات الطويلة خلف الدفاع', 'الصمت وعدم توجيه خط الدفاع', 'التردد بين الخروج والبقاء في العرضيات'], en: ['Staying on the line when long balls go in behind', 'Silence — not organising the back line', 'Hesitating between coming and staying on crosses'] },
      cues: { ar: ['«قدمان خفيفتان قبل التسديد»', '«منصّف الزاوية، ثم خطوة للأمام»', '«نادِ الكرة مبكراً: حارس!»'], en: ['"Light feet before the shot"', '"Split the angle, then step up"', '"Call it early: keeper!"'] },
      youth: { ar: 'تحت 12 سنة: دوّر الحراسة بين اللاعبين وركز على اللعب بالقدم أولاً.', en: 'Under 12: rotate goalkeepers and develop footwork with the ball first.' } },
    CB: { name: { ar: 'قلب الدفاع', en: 'Centre-back' }, qual: [['tack', 5], ['aer', 5], ['pos', 5], ['read', 4], ['comm', 4], ['pass', 3]],
      mistakes: { ar: ['الوقوف بجسم مسطّح في مواجهة المهاجم', 'ترك مسافة كبيرة مع الزميل (أكثر من 10–12م)', 'الانجذاب للكرة وترك المهاجم خلفه'], en: ['Square body shape against the striker', 'Too big a gap to the partner (over 10–12 m)', 'Ball-watching and losing the runner behind'] },
      cues: { ar: ['«جسم جانبي، وجّهه للخارج»', '«تكلم: معي، اطلع، اثبت»', '«انظر للكرة وللرجل معاً»'], en: ['"Side-on, show him outside"', '"Talk: with me, step, hold"', '"See ball and man"'] },
      youth: { ar: 'علّم الناشئ البناء من الخلف باللعب القصير قبل الكرات الطويلة.', en: 'Teach young centre-backs to build short before playing long.' } },
    FB: { name: { ar: 'الظهير', en: 'Full-back' }, qual: [['pace', 5], ['stam', 5], ['tack', 4], ['cross', 4], ['pos', 4], ['pass', 3]],
      mistakes: { ar: ['التقدم دون تغطية من الارتكاز أو قلب الدفاع', 'الانقضاض المبكر على الجناح', 'العرضية دون رفع الرأس'], en: ['Going forward without cover', 'Diving in against the winger', 'Crossing without looking up'] },
      cues: { ar: ['«اطلع حين يستلم الجناح وجسمه للأمام»', '«صبر: اجعله يقرر أولاً»', '«انظر، ثم أرسل»'], en: ['"Go when the winger receives facing forward"', '"Patience — make him commit"', '"Look, then deliver"'] },
      youth: { ar: 'نمِّ المراوغة والعرضية بالقدمين؛ الظهير الحديث مهاجم أيضاً.', en: 'Develop dribbling and crossing with both feet; modern full-backs attack too.' } },
    WB: { name: { ar: 'الظهير الجناح', en: 'Wing-back' }, qual: [['stam', 5], ['pace', 5], ['cross', 4], ['tack', 4], ['drib', 3], ['work', 5]],
      mistakes: { ar: ['البقاء متقدماً عند فقدان الكرة', 'الدخول للعمق وترك الطرف فارغاً', 'عرضيات متكررة دون تنويع'], en: ['Staying high after losing the ball', 'Drifting inside and leaving the flank empty', 'Repetitive crosses with no variety'] },
      cues: { ar: ['«العرض كاملاً: قدم على الخط»', '«فقدنا الكرة؟ اركض أولاً ثم فكّر»'], en: ['"Full width — boots on the line"', '"Lost it? Sprint first, think second"'] },
      youth: { ar: 'دور شاق بدنياً؛ راقب الحمل وبدّل اللاعب عند الحاجة.', en: 'Physically demanding — monitor load and rotate.' } },
    DM: { name: { ar: 'لاعب الارتكاز', en: 'Defensive midfielder' }, qual: [['pos', 5], ['read', 5], ['tack', 4], ['pass', 4], ['calm', 4], ['comm', 4]],
      mistakes: { ar: ['الاستلام بظهره للملعب', 'الانجراف نحو الكرة وترك العمق', 'تمريرات عرضية خطرة في وسط الملعب'], en: ['Receiving with the back to play', 'Drifting to the ball and leaving the centre', 'Risky square passes in midfield'] },
      cues: { ar: ['«تفقّد كتفيك قبل الاستلام»', '«ابقَ بين الكرة والمرمى»', '«اثنتان: استلم ومرر»'], en: ['"Check your shoulders before receiving"', '"Stay between ball and goal"', '"Two touches: receive and play"'] },
      youth: { ar: 'درّب المسح البصري (Scanning) منذ سن مبكرة.', en: 'Train scanning from an early age.' } },
    CM: { name: { ar: 'لاعب الوسط', en: 'Central midfielder' }, qual: [['stam', 5], ['pass', 4], ['work', 5], ['vis', 4], ['tack', 3], ['fin', 3]],
      mistakes: { ar: ['الوصول للمنطقة مبكراً جداً', 'فقدان التوازن بين التقدم والعودة', 'الاختفاء في التحولات'], en: ['Arriving in the box too early', 'Losing the balance between going and staying', 'Hiding in transitions'] },
      cues: { ar: ['«تأخّر ثم انطلق»', '«خسرنا الكرة؟ اضغط خمس ثوانٍ»'], en: ['"Delay, then arrive"', '"Lost it? Five-second press"'] },
      youth: { ar: 'امنح اللاعب الحرية للتقدم والتسديد لبناء الثقة.', en: 'Give freedom to arrive and shoot to build confidence.' } },
    AM: { name: { ar: 'صانع الألعاب', en: 'Attacking midfielder' }, qual: [['vis', 5], ['pass', 5], ['touch', 5], ['drib', 4], ['fin', 4], ['calm', 4]],
      mistakes: { ar: ['النزول العميق جداً لطلب الكرة', 'التمرير الجانبي الآمن بدل الأمامي', 'إهمال الضغط الدفاعي'], en: ['Dropping too deep to get the ball', 'Safe sideways passes instead of forward ones', 'Ignoring defensive pressing'] },
      cues: { ar: ['«ابحث عن الفراغ بين الخطوط»', '«استلم ونصف جسمك للأمام»'], en: ['"Find the pocket between the lines"', '"Receive half-turned"'] },
      youth: { ar: 'اللعب المصغّر يبني صانع الألعاب أكثر من أي تمرين.', en: 'Small-sided games develop playmakers more than any drill.' } },
    W: { name: { ar: 'الجناح / لاعب الطرف', en: 'Winger / wide midfielder' }, qual: [['pace', 5], ['drib', 5], ['cross', 4], ['fin', 4], ['work', 3], ['touch', 4]],
      mistakes: { ar: ['الاستلام وقدماه ثابتتان', 'الاكتفاء بالعرضية دون تهديد الداخل', 'عدم العودة مع الظهير المنافس'], en: ['Receiving flat-footed', 'Only crossing, never threatening inside', 'Not tracking the opposing full-back'] },
      cues: { ar: ['«واجه المدافع وغيّر الإيقاع»', '«اعرض ثم انطلق»', '«عُد مع رجلك»'], en: ['"Face him up and change pace"', '"Show, then go"', '"Track your man"'] },
      youth: { ar: 'شجّع المواجهة 1 ضد 1 حتى لو خسر الكرة.', en: 'Encourage 1v1s even when the ball is lost.' } },
    ST: { name: { ar: 'المهاجم', en: 'Striker' }, qual: [['fin', 5], ['pos', 5], ['hold', 4], ['aer', 4], ['pace', 4], ['work', 4]],
      mistakes: { ar: ['التحرك مبكراً والوقوع في التسلل', 'الوقوف ثابتاً داخل المنطقة', 'التسديد القوي بدل الدقيق'], en: ['Moving too early and getting caught offside', 'Standing still in the box', 'Power over placement'] },
      cues: { ar: ['«تحرّك عكسياً ثم اهاجم الكرة»', '«على كتف المدافع»', '«الزاوية البعيدة»'], en: ['"Move away, then attack the ball"', '"On the defender\'s shoulder"', '"Far post"'] },
      youth: { ar: 'درّب الإنهاء بالقدمين وبلمسة واحدة من أول يوم.', en: 'Train two-footed, one-touch finishing from day one.' } }
  },
  fs: {
    GK: { name: { ar: 'حارس الصالات', en: 'Futsal goalkeeper' }, qual: [['shot', 5], ['dist', 5], ['comm', 4], ['pos', 4]], mistakes: { ar: ['الرمي البطيء بعد التصدي', 'الوقوف عالياً دون تغطية'], en: ['Slow release after saves', 'Standing high without cover'] }, cues: { ar: ['«تصدٍّ ثم رمية خلال ثانيتين»'], en: ['"Save, then release within two seconds"'] }, youth: { ar: 'درّب الحارس على اللعب بقدميه كلاعب خامس.', en: 'Train the keeper to play as a fifth outfield player.' },
      mv: { att: [.12, 0], ta: [.08, 0], td: [.05, 0] } },
    FIXO: { name: { ar: 'المدافع (فيكسو)', en: 'Fixo' }, qual: [['read', 5], ['pass', 5], ['tack', 4], ['comm', 4]], mistakes: { ar: ['التقدم مع الهجمة وترك المرمى', 'تمرير عرضي أمام محور الخصم'], en: ['Joining the attack and leaving goal open', 'Square passes in front of the opposing pivot'] }, cues: { ar: ['«آخر لاعب: خلف الكرة دائماً»'], en: ['"Last player — always behind the ball"'] }, youth: { ar: 'دوّر اللاعبين على الفيكسو لتعلم قراءة اللعب.', en: 'Rotate players through fixo to learn reading the game.' },
      mv: { att: [.52, null], ta: [.38, null], td: [.28, 0] } },
    ALA: { name: { ar: 'الجناح (آلا)', en: 'Ala' }, qual: [['drib', 5], ['pace', 4], ['fin', 4], ['stam', 4]], mistakes: { ar: ['البقاء ملاصقاً للخط دون تبادل', 'عدم العودة في التحول'], en: ['Hugging the line without rotating', 'Not recovering in transition'] }, cues: { ar: ['«مرّر واركض قطرياً»'], en: ['"Pass and run diagonally"'] }, youth: { ar: 'المواجهة 1 ضد 1 أساس تطوير الآلا.', en: '1v1 duels are the core of ala development.' },
      mv: { att: [.72, .42], ta: [.66, .42], td: [.5, .3] } },
    PIVO: { name: { ar: 'المحور (بيفو)', en: 'Pivot' }, qual: [['hold', 5], ['fin', 5], ['str', 4], ['touch', 4]], mistakes: { ar: ['الاستلام بعيداً عن المرمى', 'الدوران في الضغط بدل التمرير'], en: ['Receiving too far from goal', 'Turning into pressure instead of laying off'] }, cues: { ar: ['«ظهرك للمدافع، اشعر به ثم استدر»'], en: ['"Feel the defender, then turn"'] }, youth: { ar: 'درّب حماية الكرة بالجسم مع الناشئين.', en: 'Teach shielding with the body early.' },
      mv: { att: [.9, 0], ta: [.8, 0], td: [.66, 0] } }
  },
  bb: {
    PG: { name: { ar: 'صانع الألعاب (1)', en: 'Point guard (1)' }, qual: [['handle', 5], ['pass', 5], ['iq', 5], ['shoot', 4], ['comm', 4]], mistakes: { ar: ['المحاورة الزائدة دون هدف', 'نسيان التواصل الدفاعي'], en: ['Over-dribbling without purpose', 'Forgetting to talk on defence'] }, cues: { ar: ['«ارفع رأسك، اقرأ المدافع المساند»'], en: ['"Head up, read the help defender"'] }, youth: { ar: 'دوّر مهام صناعة اللعب على كل اللاعبين في الفئات الصغيرة.', en: 'Rotate ball-handling duties among all players in younger groups.' },
      mv: { ta: [.6, 0], td: [.3, 0] } },
    SG: { name: { ar: 'الحارس المسجل (2)', en: 'Shooting guard (2)' }, qual: [['shoot', 5], ['pace', 4], ['handle', 4], ['tack', 3]], mistakes: { ar: ['الوقوف ثابتاً دون كرة', 'التصويب من التوازن الخاطئ'], en: ['Standing still off the ball', 'Shooting off balance'] }, cues: { ar: ['«كن جاهزاً قبل الاستلام: يدان وقدمان»'], en: ['"Be ready before the catch: hands and feet"'] }, youth: { ar: 'اضبط تقنية التصويب قبل المسافة.', en: 'Fix shooting form before adding distance.' },
      mv: { ta: [.74, .42], td: [.2, .28] } },
    SF: { name: { ar: 'الجناح الصغير (3)', en: 'Small forward (3)' }, qual: [['drib', 4], ['shoot', 4], ['tack', 4], ['pace', 4], ['rebound', 3]], mistakes: { ar: ['القطع البطيء', 'إغفال المتابعة الدفاعية'], en: ['Slow cuts', 'Not boxing out'] }, cues: { ar: ['«إن أغلق خط التمرير، اقطع خلفه»'], en: ['"Denied? Back-cut"'] }, youth: { ar: 'أكثر المراكز شمولاً؛ مناسب لتطوير لاعب متكامل.', en: 'The most complete position — ideal for all-round development.' },
      mv: { ta: [.74, .42], td: [.2, .28] } },
    PF: { name: { ar: 'الجناح القوي (4)', en: 'Power forward (4)' }, qual: [['rebound', 5], ['str', 5], ['jump', 4], ['shoot', 3]], mistakes: { ar: ['الحجز الضعيف', 'الابتعاد عن المتابعة'], en: ['Soft screens', 'Leaking out instead of rebounding'] }, cues: { ar: ['«أغلق خصمك ثم اذهب للكرة»'], en: ['"Hit, then get the ball"'] }, youth: { ar: 'طوّر مهارات الكرة للاعبين الطوال مبكراً ولا تحصرهم تحت السلة.', en: 'Develop ball skills for tall youngsters; don\'t confine them to the paint.' },
      mv: { ta: [.52, .12], td: [.14, .15] } },
    C: { name: { ar: 'لاعب الارتكاز (5)', en: 'Centre (5)' }, qual: [['block', 5], ['rebound', 5], ['str', 5], ['pos', 4], ['comm', 4]], mistakes: { ar: ['القفز على الخداع', 'التأخر في العودة لحماية السلة'], en: ['Biting on pump fakes', 'Late getting back to protect the rim'] }, cues: { ar: ['«الذراعان للأعلى: عمودية»'], en: ['"Arms up — verticality"'] }, youth: { ar: 'لا تتخصص مبكراً؛ علّم الطويل المحاورة والتمرير.', en: 'Avoid early specialisation; teach bigs to dribble and pass.' },
      mv: { ta: [.82, .04], td: [.08, 0] } }
  },
  vb: {
    S: { name: { ar: 'المعد', en: 'Setter' }, qual: [['setg', 5], ['iq', 5], ['comm', 5], ['agil', 4], ['block', 3]], mistakes: { ar: ['الوصول متأخراً لمنطقة الإعداد', 'إعداد متوقع للضارب نفسه دائماً'], en: ['Arriving late to the target', 'Always setting the same hitter'] }, cues: { ar: ['«قف قبل الكرة ووجهك للمركز 4»'], en: ['"Beat the ball there, face position 4"'] }, youth: { ar: 'دوّر مهمة الإعداد في الفئات الصغيرة.', en: 'Rotate setting duties in young age groups.' } },
    OH: { name: { ar: 'الضارب الرئيسي', en: 'Outside hitter' }, qual: [['attack', 5], ['recv', 5], ['jump', 4], ['serve', 4], ['block', 3]], mistakes: { ar: ['الاقتراب المبكر قبل الإعداد', 'الاستقبال بالذراعين غير الثابتتين'], en: ['Approaching too early', 'Unstable platform in reception'] }, cues: { ar: ['«انتظر الإعداد، ثم يسار–يمين–يسار»'], en: ['"Wait for the set, then left-right-left"'] }, youth: { ar: 'أساس الفريق؛ اجمع بين الاستقبال والهجوم في التدريب.', en: 'The backbone — train reception and attack together.' } },
    MB: { name: { ar: 'لاعب الوسط', en: 'Middle blocker' }, qual: [['block', 5], ['jump', 5], ['attack', 4], ['agil', 4]], mistakes: { ar: ['القفز مع الضارب الوهمي', 'التأخر في الاقتراب للضربة السريعة'], en: ['Jumping with the decoy', 'Late approach for the quick'] }, cues: { ar: ['«اقرأ المعد، لا الضارب»'], en: ['"Read the setter, not the hitter"'] }, youth: { ar: 'تحرك القدمين الجانبي أهم من طول القامة في البداية.', en: 'Lateral footwork matters more than height early on.' } },
    OPP: { name: { ar: 'الضارب المقابل', en: 'Opposite' }, qual: [['attack', 5], ['block', 4], ['jump', 5], ['serve', 4]], mistakes: { ar: ['الضرب دون قراءة الحائط', 'إهمال الدفاع في المركز 1'], en: ['Hitting without reading the block', 'Neglecting defence in zone 1'] }, cues: { ar: ['«اضرب اليد الخارجية للحائط»'], en: ['"Tool the outside hand"'] }, youth: { ar: 'طوّر الضرب بالذراعين والضرب الخلفي.', en: 'Develop back-row attacking.' } },
    L: { name: { ar: 'الليبرو', en: 'Libero' }, qual: [['recv', 5], ['dig', 5], ['read', 5], ['comm', 5], ['agil', 4]], mistakes: { ar: ['الوقوف على الكعبين', 'عدم أخذ المساحة الأكبر في الاستقبال'], en: ['Standing on the heels', 'Not taking the biggest share of reception'] }, cues: { ar: ['«منخفض، على أطراف القدمين، اقرأ الذراع»'], en: ['"Low, on your toes, read the arm"'] }, youth: { ar: 'لا تحصر الناشئ في الليبرو مبكراً.', en: 'Don\'t lock young players into libero too early.' } }
  },
  hb: {
    GK: { name: { ar: 'حارس المرمى', en: 'Goalkeeper' }, qual: [['shot', 5], ['pos', 5], ['dist', 4], ['comm', 4], ['calm', 4]], mistakes: { ar: ['التحرك قبل خروج الكرة', 'التأخر في التمريرة الطويلة'], en: ['Moving before the release', 'Late outlet pass'] }, cues: { ar: ['«انتظر الذراع، ثم تحرك»'], en: ['"Wait for the arm, then move"'] }, youth: { ar: 'درّب الحارس على بدء الهجوم الخاطف.', en: 'Train the keeper to launch the fast break.' },
      mv: { ta: [.05, 0], td: [.03, 0] } },
    WING: { name: { ar: 'الجناح', en: 'Wing' }, qual: [['pace', 5], ['shoot', 5], ['agil', 4], ['read', 3]], mistakes: { ar: ['التسديد من زاوية ضيقة دون قفز داخل المنطقة', 'التأخر في الانطلاق'], en: ['Shooting from a tight angle without jumping in', 'Slow to break'] }, cues: { ar: ['«اقفز للداخل وافتح الزاوية»'], en: ['"Jump in and open the angle"'] }, youth: { ar: 'درّب التسديد من الزوايا بكرة مناسبة للعمر.', en: 'Use an age-appropriate ball for angle shooting.' },
      mv: { ta: [.86, .45], td: [.22, .4] } },
    BACK: { name: { ar: 'الظهير (يمين/يسار)', en: 'Back (left/right)' }, qual: [['shoot', 5], ['jump', 5], ['str', 4], ['feint', 4], ['pass', 4]], mistakes: { ar: ['التسديد دون جذب مدافع', 'الإفراط في التنطيط'], en: ['Shooting without committing a defender', 'Too much bouncing'] }, cues: { ar: ['«هدّد المرمى أولاً ثم مرر»'], en: ['"Threaten goal first, then pass"'] }, youth: { ar: 'نمِّ قوة الذراع تدريجياً ووقاية الكتف.', en: 'Build throwing strength gradually with shoulder care.' },
      mv: { ta: [.68, .22], td: [.28, .25] } },
    CB: { name: { ar: 'صانع الألعاب (الوسط)', en: 'Centre back' }, qual: [['iq', 5], ['pass', 5], ['feint', 4], ['comm', 5], ['shoot', 3]], mistakes: { ar: ['تنفيذ الجملة دون قراءة الدفاع', 'بطء نقل الكرة'], en: ['Running the play without reading the defence', 'Slow ball circulation'] }, cues: { ar: ['«انظر للدفاع قبل النداء»'], en: ['"Read the defence before the call"'] }, youth: { ar: 'امنح أكثر من لاعب فرصة القيادة.', en: 'Let several players lead the attack.' },
      mv: { ta: [.6, 0], td: [.3, 0] } },
    PV: { name: { ar: 'لاعب الدائرة', en: 'Pivot' }, qual: [['str', 5], ['hold', 4], ['fin', 5], ['pos', 4]], mistakes: { ar: ['الوقوف ثابتاً بين المدافعين', 'الحجز دون الالتفاف'], en: ['Standing static between defenders', 'Screening without rolling'] }, cues: { ar: ['«احجز، التفّ، اطلب الكرة»'], en: ['"Screen, roll, show hands"'] }, youth: { ar: 'علّم الالتحام الآمن والتوازن.', en: 'Teach safe contact and balance.' },
      mv: { ta: [.74, .05], td: [.2, .08] } }
  }
};

/* helper to keep entries short */
const P = (ar, en) => ({ ar, en });
const ROLES = [
  /* ---------------- Football ---------------- */
  { id:'gk-shot', rs:'fb', fam:'GK', name:P('حارس تقليدي','Shot-stopper'), desc:P('يركز على حماية المرمى والتمركز على خط التسديد، ويبني اللعب بشكل آمن ومباشر.','Focuses on protecting the goal and angle play; distributes safely and directly.'),
    ph:{ att:P(['تمريرة آمنة للمدافع الحر أو إطلاق طويل نحو المهاجم المستهدف','توجيه خط الدفاع للاتساع عند البناء'],['Safe pass to the free defender or long release to the target striker','Tell the back line to spread when building']),
         def:P(['التمركز على المنصّف بين الكرة والقائمين','التحكم في منطقة الست ياردات والعرضيات القريبة'],['Position on the bisector between ball and posts','Command the six-yard box and near crosses']),
         ta:P(['إعادة الكرة للعب بسرعة باليد نحو اللاعب الحر','قراءة المساحة خلف ضغط الخصم'],['Release quickly by hand to the free player','Spot space behind the opponent\'s press']),
         td:P(['تنظيم الدفاع صوتياً فور فقدان الكرة','التقدم خطوة لتقليص الزاوية في الانفراد'],['Organise vocally the moment the ball is lost','Step out to narrow the angle in 1v1s']) },
    sp:P(['تنظيم الحائط وترتيب الرقابة في الركنيات','ضربات الجزاء: قراءة جسم المسدد وعدم التحرك المبكر'],['Set the wall and marking at corners','Penalties: read the taker\'s body, don\'t move early']),
    kpi:P(['نسبة التصديات','أخطاء تؤدي لتسديدة','دقة التمرير القصير','نجاح الإمساك بالعرضيات'],['Save percentage','Errors leading to shots','Short pass accuracy','Cross claims']),
    drills:['f-gk','f-cross'], z:{ wb:[.06,0,.06,.16], nb:[.04,0,.04,.14] }, mv:{ att:[.1,0], ta:[.06,0], td:[.1,0] } },
  { id:'gk-sweep', rs:'fb', fam:'GK', name:P('حارس ليبرو','Sweeper-keeper'), desc:P('يلعب كلاعب حر إضافي في البناء، ويغطي المساحة خلف خط دفاع متقدم.','Acts as an extra free player in build-up and covers space behind a high line.'),
    ph:{ att:P(['التقدم لتكوين تفوق عددي 3 ضد 2 أمام الضغط','تمريرات قطرية لكسر الخط الأول للضغط'],['Step up to create a 3v2 against the press','Diagonal passes to break the first line']),
         def:P(['التمركز المتقدم خارج المنطقة عند تقدم الدفاع','قطع الكرات الطويلة خلف المدافعين'],['High starting position when the line is high','Sweep long balls played in behind']),
         ta:P(['رمية أو ركلة سريعة للمرتدة خلال ثوانٍ','استغلال الخصم غير المنظم بتمرير عمودي'],['Fast throw or kick to launch the counter','Exploit a disorganised opponent vertically']),
         td:P(['التمركز الاستباقي خلف الدفاع','الخروج الحاسم أو البقاء، دون تردد'],['Pre-emptive position behind the defence','Commit decisively — come or stay']) },
    sp:P(['قيادة التمركز الدفاعي بالمنطقة','البدء السريع بعد الإمساك بالكرة'],['Lead zonal marking in the box','Start quickly after claiming the ball']),
    kpi:P(['تمريرات ناجحة تحت الضغط','التدخلات خارج المنطقة','متوسط بعد التمركز عن المرمى','أخطاء البناء'],['Passes completed under pressure','Sweeper actions outside the box','Average distance from goal','Build-up errors']),
    drills:['f-build','f-gk'], z:{ wb:[.12,0,.1,.22], nb:[.1,0,.09,.2] }, mv:{ att:[.2,0], ta:[.1,0], td:[.16,0] } },

  { id:'cb-stop', rs:'fb', fam:'CB', name:P('مدافع مباشر','Stopper'), desc:P('يتقدم لملاقاة المهاجم قبل أن يستلم ويستدير، ويكسب الالتحامات الأمامية.','Steps out to meet the striker before he can turn and wins front-foot duels.'),
    ph:{ att:P(['تمرير بسيط للارتكاز أو للظهير','التقدم بالكرة عند وجود مساحة أمامه'],['Simple passes to the pivot or full-back','Carry the ball forward into space']),
         def:P(['الضغط على المهاجم الذي يسقط لاستلام الكرة','كسب الكرات الهوائية والالتحامات الثنائية'],['Follow the striker who drops to receive','Win headers and duels']),
         ta:P(['تمريرة عمودية مباشرة بعد الافتكاك','التحرك لخلق زاوية تمرير للحارس'],['Vertical pass straight after winning the ball','Open an angle for the goalkeeper']),
         td:P(['تأخير المهاجم وتوجيهه للخارج','التواصل مع المغطي لتبادل الأدوار'],['Delay the striker and show him wide','Communicate with the cover defender']) },
    sp:P(['مهاجم رئيسي في الركنيات والحرة','رقابة لاعب الخصم الأقوى هوائياً'],['Main target at corners and free kicks','Mark the strongest aerial opponent']),
    kpi:P(['نسبة الالتحامات الهوائية الناجحة','الافتكاك في الثلث الأوسط','الأخطاء المرتكبة','دقة التمرير الأمامي'],['Aerial duels won %','Ball recoveries in the middle third','Fouls committed','Forward pass accuracy']),
    drills:['f-1v1','f-press'], z:{ wb:[.34,0,.12,.14], nb:[.22,0,.1,.13] }, mv:{ att:[.42,null], ta:[.3,null], td:[.45,null] } },
  { id:'cb-cover', rs:'fb', fam:'CB', name:P('مدافع مغطٍّ','Cover defender'), desc:P('يبقى خلف زميله ليغطي المساحة، ويقرأ الكرات البينية والطويلة.','Stays behind his partner to cover space and reads through balls and long passes.'),
    ph:{ att:P(['التمركز الواسع لاستلام الكرة من الحارس','تبديل اتجاه اللعب بتمريرة جانبية آمنة'],['Split wide to receive from the goalkeeper','Switch play with a safe lateral pass']),
         def:P(['التغطية خلف المدافع الضاغط بزاوية 45 درجة','قيادة خط التسلل وتحديد ارتفاع الخط'],['Cover behind the pressing defender at 45°','Lead the offside line and set its height']),
         ta:P(['تأمين العمق خلف المتقدمين','تمريرة أولى سريعة للارتكاز'],['Provide rest-defence behind the attack','Quick first pass into the pivot']),
         td:P(['التراجع أولاً لحماية المساحة خلف الدفاع','تأخير المرتدة حتى يعود الزملاء'],['Drop first to protect space in behind','Delay the counter until teammates recover']) },
    sp:P(['رقابة المساحة في الركنيات (دفاع منطقة)','البقاء خلف الكرة في الركنيات الهجومية'],['Zonal marking at corners','Stay back during attacking corners']),
    kpi:P(['قطع الكرات البينية','التمريرات الناجحة للأمام','نسبة كسب المواجهات','الأخطاء التي أدت لفرصة'],['Interceptions of through balls','Forward passes completed','Duels won %','Errors leading to chances']),
    drills:['f-press','f-build'], z:{ wb:[.3,0,.1,.12], nb:[.15,0,.08,.14] }, mv:{ att:[.38,null], ta:[.26,null], td:[.34,null] } },
  { id:'cb-bp', rs:'fb', fam:'CB', name:P('مدافع باني لعب','Ball-playing CB'), desc:P('نقطة البداية في بناء اللعب، يكسر خطوط الضغط بالتمرير أو بالتقدم بالكرة.','Starts the build-up and breaks pressing lines by passing or carrying.'),
    ph:{ att:P(['التقدم بالكرة لسحب مهاجم الخصم وفتح خط تمرير','تمريرات بين الخطوط وتمريرات قطرية للطرف البعيد'],['Carry forward to draw a forward and open a lane','Passes between the lines and diagonals to the far side']),
         def:P(['الدفاع الموضعي والتغطية مع الزميل','الحفاظ على المسافة مع الارتكاز (10–15م)'],['Positional defending and cover with the partner','Keep 10–15 m to the pivot']),
         ta:P(['الاستلام المفتوح والتمرير العمودي السريع','التقدم لنصف الملعب عند التفوق العددي'],['Receive open and play vertical quickly','Step into midfield when there is an overload']),
         td:P(['الضغط الفوري إن كانت الكرة قريبة، وإلا التراجع','إغلاق العمق وتوجيه الخصم للأطراف'],['Press immediately if close, otherwise drop','Close the centre and force play wide']) },
    sp:P(['تنفيذ التمريرات القصيرة من الحرة الدفاعية','مهاجم في الركنيات'],['Take short defensive free kicks','Attack corners']),
    kpi:P(['التمريرات التقدمية','الأمتار المقطوعة بالكرة للأمام','دقة التمرير الطويل','الكرات المفقودة في الثلث الدفاعي'],['Progressive passes','Progressive carrying distance','Long pass accuracy','Losses in the defensive third']),
    drills:['f-build','f-pos','f-rondo'], z:{ wb:[.38,0,.15,.15], nb:[.18,0,.08,.13] }, mv:{ att:[.47,null], ta:[.34,null], td:[.42,null] } },

  { id:'fb-over', rs:'fb', fam:'FB', name:P('ظهير متقدم','Overlapping full-back'), desc:P('يوفر الاتساع ويتقدم خلف الجناح (أوفرلاب) لإرسال العرضيات.','Provides width and overlaps the winger to deliver crosses.'),
    ph:{ att:P(['التحرك خلف الجناح (Overlap) أو داخله (Underlap)','العرضيات من الخط الجانبي أو عند حافة المنطقة'],['Overlap or underlap the winger','Cross from the byline or the edge of the box']),
         def:P(['منع العرضيات وتوجيه الجناح للداخل حيث التغطية','الإغلاق نحو الوسط عند وجود الكرة في الطرف الآخر'],['Stop crosses and show the winger inside into cover','Tuck in when the ball is on the far side']),
         ta:P(['الانطلاق المبكر على الطرف لاستغلال المساحة','التمريرة الأولى على الخط للجناح'],['Early run down the flank into space','First pass down the line to the winger']),
         td:P(['العودة بالجري المائل نحو خط الدفاع','الضغط على المستلم في الطرف لإبطاء المرتدة'],['Recovery run on a diagonal back into the line','Press the receiver wide to slow the counter']) },
    sp:P(['تغطية القائم القريب في الركنيات','تنفيذ الرميات الجانبية الطويلة عند الحاجة'],['Guard the near post at corners','Take long throw-ins when needed']),
    kpi:P(['العرضيات الناجحة','عدد الأوفرلاب','المواجهات الدفاعية 1 ضد 1','المسافة بالسرعات العالية'],['Successful crosses','Overlaps made','Defensive 1v1s won','High-speed running distance']),
    drills:['f-overlap','f-cross','f-rsa'], z:{ wb:[.66,.08,.28,.09], nb:[.25,.02,.12,.1] }, mv:{ att:[.72,.47], ta:[.56,.45], td:[.58,.4] } },
  { id:'fb-inv', rs:'fb', fam:'FB', name:P('ظهير معكوس','Inverted full-back'), desc:P('يدخل إلى الوسط بجانب الارتكاز عند الاستحواذ لخلق تفوق عددي في العمق.','Moves inside next to the pivot in possession to overload the centre.'),
    ph:{ att:P(['الدخول لمنطقة الارتكاز لتكوين 3-2 أو 2-3 في البناء','تمريرات قصيرة للأمام وتحويل اللعب'],['Step into midfield to form a 3-2 or 2-3 build-up','Short forward passes and switches']),
         def:P(['العودة لمركز الظهير في الشكل الدفاعي','إغلاق الممرات الداخلية أولاً'],['Return to full-back in the defensive shape','Close inside lanes first']),
         ta:P(['الضغط المعاكس الفوري من الوسط','حماية العمق من المرتدات'],['Immediate counter-press from central areas','Protect the centre against counters']),
         td:P(['التحكم بالمساحة الوسطى حتى عودة الزملاء','التحول للطرف عند ثبات الخصم'],['Control central space until teammates return','Slide back out wide once play settles']) },
    sp:P(['رقابة المساحة على حافة المنطقة','البقاء للتوازن في الركنيات الهجومية'],['Guard the edge of the box','Stay back for balance on attacking corners']),
    kpi:P(['التمريرات في الثلث الأوسط','استعادة الكرة خلال 5 ثوانٍ','دقة التمرير','المرتدات التي أوقفها'],['Passes in the middle third','Recoveries within 5 seconds','Pass accuracy','Counters stopped']),
    drills:['f-pos','f-rondo','f-build'], z:{ wb:[.44,-.2,.14,.12], nb:[.22,0,.1,.1] }, mv:{ att:[.5,.13], ta:[.38,.15], td:[.46,.12] } },
  { id:'fb-hold', rs:'fb', fam:'FB', name:P('ظهير دفاعي','Holding full-back'), desc:P('يبقى مع خط الدفاع ويشكّل ثلاثياً خلفياً عندما يتقدم الظهير الآخر.','Stays with the back line, forming a back three when the other full-back goes.'),
    ph:{ att:P(['البقاء كمدافع ثالث عند تقدم الظهير المقابل','تمرير آمن ودعم الجناح من الخلف'],['Stay as the third defender when the other full-back pushes','Safe passes and support from behind']),
         def:P(['الرقابة اللصيقة للجناح المنافس','التغطية الداخلية لقلب الدفاع'],['Tight marking of the opposing winger','Cover inside for the centre-back']),
         ta:P(['تمرير مباشر للجناح في المساحة','تأمين الخلف بدل التقدم'],['Direct pass to the winger in space','Secure the back instead of joining']),
         td:P(['الاستعداد لمواجهة المرتدة على طرفه','التواصل مع قلب الدفاع'],['Ready to face the counter on his side','Communicate with the centre-back']) },
    sp:P(['رقابة القائم البعيد','البقاء في الخلف أثناء الركنيات الهجومية'],['Mark the far post','Stay back during attacking corners']),
    kpi:P(['المواجهات 1 ضد 1 الناجحة','الكرات المقطوعة','العرضيات المسموحة','الأخطاء قرب المنطقة'],['1v1s won','Interceptions','Crosses allowed','Fouls near the box']),
    drills:['f-1v1','f-press'], z:{ wb:[.38,.04,.14,.08], nb:[.2,0,.1,.1] }, mv:{ att:[.42,.36], ta:[.3,.34], td:[.38,.34] } },

  { id:'wb', rs:'fb', fam:'WB', name:P('ظهير جناح','Wing-back'), desc:P('مسؤول وحده عن الطرف بالكامل في خطط 3-5-2 و3-4-3 و5-3-2، يهاجم كجناح ويدافع كظهير.','Owns the entire flank in 3-5-2, 3-4-3 and 5-3-2 — attacks as a winger, defends as a full-back.'),
    ph:{ att:P(['الاتساع الكامل على الخط لتثبيت الظهير المنافس','الوصول للقائم البعيد عند العرضيات من الطرف الآخر'],['Hold full width to pin the opposing full-back','Arrive at the far post for crosses from the other side']),
         def:P(['العودة لتكوين خط خماسي عند الدفاع المنخفض','الضغط العالي على ظهير الخصم عند الدفاع المتقدم'],['Drop to form a back five in a low block','Press the opposing full-back when pressing high']),
         ta:P(['الانطلاق بالسرعة القصوى على الخط','توفير خيار تمرير عريض للمرتدة'],['Sprint down the line','Offer a wide option on the counter']),
         td:P(['العودة الفورية بالسرعة، وهي أولويته الأولى','إغلاق الطرف حتى يعود قلب الدفاع الجانبي'],['Immediate recovery sprint — top priority','Close the flank until the wide centre-back covers']) },
    sp:P(['العرضيات في الحرة الجانبية','رقابة القائم البعيد'],['Deliver wide free kicks','Mark the far post']),
    kpi:P(['المسافة بالسرعات العالية','العرضيات والتمريرات المفتاحية','الارتدادات الدفاعية الناجحة','الكرات المستعادة في الطرف'],['High-speed running','Crosses and key passes','Successful recovery runs','Wide recoveries']),
    drills:['f-cross','f-rsa','f-4x4'], z:{ wb:[.68,.05,.28,.07], nb:[.25,0,.13,.08] }, mv:{ att:[.76,.48], ta:[.62,.47], td:[.6,.44], def:[.22,.46] } },

  { id:'dm-anchor', rs:'fb', fam:'DM', name:P('ارتكاز مدافع','Anchor'), desc:P('يحمي المساحة أمام الدفاع ويحافظ على توازن الفريق.','Screens the defence and keeps the team balanced.'),
    ph:{ att:P(['النزول بين قلبي الدفاع أو بجانبهما لتسهيل البناء','تمرير بسيط وسريع بلمستين'],['Drop between or beside the centre-backs to help build','Simple, quick two-touch passing']),
         def:P(['حماية المساحة أمام خط الدفاع (بين الخطوط)','قطع خطوط التمرير نحو صانع ألعاب الخصم'],['Protect the space between the lines','Cut passing lanes to the opposing No.10']),
         ta:P(['التمريرة الأولى للأمام بعد الافتكاك','البقاء خلف الكرة لتأمين التوازن'],['First forward pass after winning the ball','Stay behind the ball for balance']),
         td:P(['إيقاف المرتدة بالتأخير أو خطأ تكتيكي عند الضرورة','إغلاق العمق فوراً'],['Stop the counter by delaying or a tactical foul if needed','Close the centre immediately']) },
    sp:P(['رقابة المساحة على حافة المنطقة','تأمين الخلف في الركنيات الهجومية'],['Guard the edge of the box','Rest-defence on attacking corners']),
    kpi:P(['الكرات المستعادة','التدخلات والاعتراضات','دقة التمرير','المرتدات التي أوقفها'],['Ball recoveries','Tackles and interceptions','Pass accuracy','Counters stopped']),
    drills:['f-rondo','f-press','f-pos'], z:{ wb:[.42,0,.1,.15], nb:[.3,0,.09,.17] }, mv:{ att:[.48,null], ta:[.38,null], td:[.52,null] } },
  { id:'dm-dlp', rs:'fb', fam:'DM', name:P('صانع لعب متأخر','Deep-lying playmaker'), desc:P('محور التوزيع من الخلف، يغيّر إيقاع اللعب واتجاهه.','The deep distributor who dictates tempo and switches play.'),
    ph:{ att:P(['الاستلام بجسم مفتوح والتمرير الطويل لتغيير الاتجاه','التمريرات بين الخطوط للأجنحة وصانع الألعاب'],['Receive open and switch with long passes','Pass between the lines to wingers and the No.10']),
         def:P(['التمركز في ظل المهاجم لقطع التمرير','الضغط الجماعي عند إشارة الفريق'],['Use the cover shadow to block passes','Press on the team trigger']),
         ta:P(['تمريرة طولية مبكرة خلف الدفاع','الاستلام من المدافع وتسريع اللعب'],['Early long ball behind the defence','Receive from defenders and speed up play']),
         td:P(['التراجع للمساحة المركزية','التأخير والتوجيه للخارج'],['Drop into central space','Delay and show outside']) },
    sp:P(['منفذ الركنيات والحرة غير المباشرة','التمركز على حافة المنطقة للكرات المرتدة'],['Corner and indirect free-kick taker','Edge of the box for second balls']),
    kpi:P(['التمريرات التقدمية','تحويل اللعب الناجح','عدد مرات الاستلام','الكرات المفقودة في الوسط'],['Progressive passes','Successful switches','Touches / receptions','Losses in midfield']),
    drills:['f-pos','f-rondo','f-build'], z:{ wb:[.46,0,.14,.2], nb:[.3,0,.1,.15] }, mv:{ att:[.52,null], ta:[.42,null], td:[.55,null] } },

  { id:'cm-b2b', rs:'fb', fam:'CM', name:P('لاعب وسط شامل','Box-to-box'), desc:P('يغطي المسافة بين المنطقتين، يدافع في منطقته ويصل لمنطقة الخصم.','Covers ground from box to box — defends in his own and arrives in theirs.'),
    ph:{ att:P(['الانطلاق المتأخر داخل المنطقة للتسديد','الربط بين الارتكاز والمهاجمين'],['Late runs into the box to shoot','Link the pivot and the forwards']),
         def:P(['الضغط على لاعب وسط الخصم','التغطية خلف الظهير عند تقدمه'],['Press the opposing midfielder','Cover behind the full-back when he goes']),
         ta:P(['حمل الكرة للأمام في المساحة','الوصول بسرعة لدعم المرتدة'],['Carry the ball into space','Arrive quickly to support the counter']),
         td:P(['الضغط المعاكس فور فقدان الكرة (5 ثوانٍ)','العودة للكتلة إن فشل الضغط'],['Counter-press for five seconds','Drop into the block if the press fails']) },
    sp:P(['الكرات المرتدة على حافة المنطقة','رقابة لاعب وسط في الركنيات الدفاعية'],['Second balls at the edge of the box','Mark a midfielder at defensive corners']),
    kpi:P(['المسافة المقطوعة','الانطلاقات داخل المنطقة','الكرات المستعادة','التسديدات والتمريرات المفتاحية'],['Distance covered','Box entries','Ball recoveries','Shots and key passes']),
    drills:['f-4x4','f-ssg','f-press'], z:{ wb:[.6,0,.25,.2], nb:[.38,0,.2,.2] }, mv:{ att:[.7,null], ta:[.6,null], td:[.68,null] } },
  { id:'cm-mez', rs:'fb', fam:'CM', name:P('وسط متقدم','Mezzala'), desc:P('لاعب وسط يتحرك نحو نصف المساحة بين الظهير وقلب الدفاع المنافس.','A midfielder who attacks the half-space between full-back and centre-back.'),
    ph:{ att:P(['التحرك في نصف المساحة بين الخطوط','الجري خلف الظهير عندما يدخل الجناح للعمق'],['Operate in the half-space between the lines','Run behind the full-back when the winger comes inside']),
         def:P(['الضغط على قلب الدفاع أو الارتكاز حسب الخطة','العودة لخط الوسط في الكتلة المتوسطة'],['Press the centre-back or pivot as planned','Return to the midfield line in a mid-block']),
         ta:P(['الانطلاق في نصف المساحة','التمريرة الحاسمة من العمق'],['Burst into the half-space','Final pass from inside']),
         td:P(['الضغط المعاكس في منطقته','إغلاق نصف المساحة'],['Counter-press in his zone','Close the half-space']) },
    sp:P(['التحرك نحو القائم القريب في الركنيات','التسديد من خارج المنطقة'],['Near-post runs at corners','Shots from outside the box']),
    kpi:P(['الاستلام بين الخطوط','التمريرات المفتاحية','الدخول للمنطقة','الاسترجاع في الثلث الهجومي'],['Receptions between the lines','Key passes','Box entries','Final-third recoveries']),
    drills:['f-pos','f-ssg'], z:{ wb:[.7,.15,.15,.15], nb:[.4,0,.12,.15] }, mv:{ att:[.74,.24], ta:[.62,.25], td:[.7,.2] } },

  { id:'am-10', rs:'fb', fam:'AM', name:P('صانع الألعاب','Number 10'), desc:P('يعمل بين خط وسط الخصم ودفاعه، ويصنع الفرص بالتمريرة الأخيرة.','Operates between the opposing midfield and defence; creates with the final pass.'),
    ph:{ att:P(['الاستلام بين الخطوط والاستدارة للأمام','التمريرة البينية خلف الدفاع'],['Receive between the lines and turn','Through ball behind the defence']),
         def:P(['تظليل ارتكاز الخصم وقطع التمرير إليه','الضغط الأول مع المهاجم'],['Shadow the opposing pivot','First press alongside the striker']),
         ta:P(['التمريرة الأولى في المرتدة نحو المساحة','الدخول بالكرة لجذب المدافعين'],['First pass into space on the counter','Carry to draw defenders']),
         td:P(['الضغط المعاكس على مستلم الكرة','العودة لحماية العمق أمام الوسط'],['Counter-press the receiver','Recover to protect the centre']) },
    sp:P(['تنفيذ الحرة المباشرة','التمركز للكرات المرتدة'],['Direct free kicks','Position for rebounds']),
    kpi:P(['التمريرات المفتاحية','الأهداف المتوقعة المصنوعة','الاستلام بين الخطوط','الكرات المفقودة'],['Key passes','Expected assists','Receptions between lines','Ball losses']),
    drills:['f-pos','f-rondo','f-finish'], z:{ wb:[.74,0,.12,.2], nb:[.56,0,.12,.15] }, mv:{ att:[.76,null], ta:[.64,null], td:[.72,.08] } },
  { id:'am-shadow', rs:'fb', fam:'AM', name:P('مهاجم ظل','Shadow striker'), desc:P('يتقدم خلف المهاجم ويهاجم المنطقة من الخط الثاني.','Plays off the striker and attacks the box from the second line.'),
    ph:{ att:P(['الانطلاق خلف المهاجم عند نزوله','التسديد من الخط الثاني'],['Run beyond the striker when he drops','Shoot from the second line']),
         def:P(['الضغط على قلب الدفاع','تظليل الارتكاز'],['Press a centre-back','Shadow the pivot']),
         ta:P(['الجري نحو المرمى بأسرع طريق','مساندة المهاجم في المرتدة'],['Take the shortest route to goal','Support the striker on the counter']),
         td:P(['الضغط الفوري','العودة لخط الوسط'],['Immediate press','Drop to the midfield line']) },
    sp:P(['التمركز داخل المنطقة في الركنيات','الكرات الثانية'],['In the box at corners','Second balls']),
    kpi:P(['التسديدات داخل المنطقة','الأهداف','الانطلاقات خلف الدفاع','الضغوط الناجحة'],['Shots in the box','Goals','Runs in behind','Successful pressures']),
    drills:['f-finish','f-cross'], z:{ wb:[.84,0,.1,.15], nb:[.6,0,.1,.12] }, mv:{ att:[.84,.08], ta:[.72,.1], td:[.78,.08] } },

  { id:'w-trad', rs:'fb', fam:'W', name:P('جناح تقليدي','Traditional winger'), desc:P('يلتزم بالخط الجانبي، يواجه الظهير ويرسل العرضيات.','Stays wide, takes on the full-back and crosses.'),
    ph:{ att:P(['الاتساع الكامل وتثبيت الظهير المنافس','المراوغة للخارج والعرضية'],['Hold the width and pin the full-back','Beat him on the outside and cross']),
         def:P(['العودة لمساعدة الظهير في الطرف','الضغط على ظهير الخصم عند استلامه'],['Track back to help the full-back','Press the opposing full-back on reception']),
         ta:P(['الجري في المساحة على الخط','حمل الكرة بسرعة للأمام'],['Run into space down the line','Carry forward at speed']),
         td:P(['العودة لخط الوسط في الطرف','إغلاق خط التمرير للظهير المنافس'],['Recover to the midfield line wide','Block the pass to the full-back']) },
    sp:P(['تنفيذ الركنيات','رقابة الظهير المنافس في الركنيات الدفاعية'],['Take corners','Mark the full-back at defensive corners']),
    kpi:P(['المراوغات الناجحة','العرضيات الناجحة','المسافة بالسرعات العالية','الارتداد الدفاعي'],['Successful dribbles','Successful crosses','High-speed running','Defensive recoveries']),
    drills:['f-1v1','f-cross','f-rsa'], z:{ wb:[.78,.08,.2,.08], nb:[.5,.03,.2,.1] }, mv:{ att:[.84,.47], ta:[.74,.46], td:[.74,.38] } },
  { id:'w-inv', rs:'fb', fam:'W', name:P('جناح معكوس','Inverted winger'), desc:P('يلعب بالقدم العكسية ويدخل من الطرف إلى العمق للتسديد أو التمريرة.','Plays on the opposite foot and cuts inside to shoot or create.'),
    ph:{ att:P(['الاستلام على الطرف ثم الدخول للعمق بالقدم الأقوى','التسديد الملتف أو التمريرة البينية'],['Receive wide then cut inside onto the strong foot','Curled shot or through ball']),
         def:P(['إغلاق خط التمرير الداخلي أولاً','المساندة الدفاعية مع الظهير'],['Block the inside pass first','Support the full-back defensively']),
         ta:P(['الجري القطري من الطرف نحو المرمى','الإنهاء في المرتدات'],['Diagonal run from wide towards goal','Finish on the counter']),
         td:P(['الضغط المعاكس','العودة لمركزه في الكتلة'],['Counter-press','Recover to his place in the block']) },
    sp:P(['القائم البعيد في الركنيات','الحرة المباشرة من الجهة المناسبة لقدمه'],['Far post at corners','Direct free kicks from his side']),
    kpi:P(['التسديدات','الأهداف والتمريرات الحاسمة','الدخول للمنطقة بالكرة','المراوغات الناجحة'],['Shots','Goals and assists','Carries into the box','Successful dribbles']),
    drills:['f-1v1','f-finish'], z:{ wb:[.8,-.14,.14,.14], nb:[.5,0,.18,.1] }, mv:{ att:[.83,.22], ta:[.72,.25], td:[.75,.25] } },

  { id:'st-target', rs:'fb', fam:'ST', name:P('رأس حربة','Target man'), desc:P('نقطة ارتكاز أمامية يستلم الكرات الطويلة ويحميها لصعود زملائه.','A focal point who receives long balls and holds them up for support.'),
    ph:{ att:P(['الاستلام بظهره للمرمى وحماية الكرة','كسب الكرات الهوائية وتوجيهها للزملاء'],['Receive with back to goal and shield','Win headers and flick on to teammates']),
         def:P(['توجيه ضغط الخصم نحو جهة واحدة','إغلاق التمرير بين قلبي الدفاع'],['Steer the build-up to one side','Block the pass between centre-backs']),
         ta:P(['الاحتفاظ بالكرة حتى وصول الدعم','الجري نحو القائم القريب'],['Hold the ball until support arrives','Near-post runs']),
         td:P(['الضغط الأول على المدافع المستلم','إغلاق الارتكاز'],['First press on the receiving defender','Screen the pivot']) },
    sp:P(['الهدف الرئيسي في الركنيات والعرضيات','الدفاع عن القائم القريب في الركنيات الدفاعية'],['Main target at corners and crosses','Near-post defender at defensive corners']),
    kpi:P(['الكرات الهوائية المكتسبة','الاحتفاظ بالكرة','التسديدات والأهداف','الأخطاء المكتسبة'],['Aerial duels won','Hold-up success','Shots and goals','Fouls won']),
    drills:['f-cross','f-finish'], z:{ wb:[.86,0,.1,.12], nb:[.66,0,.12,.15] }, mv:{ att:[.87,null], ta:[.7,null], td:[.8,null] } },
  { id:'st-poach', rs:'fb', fam:'ST', name:P('مهاجم قنّاص','Poacher'), desc:P('يعيش داخل منطقة الجزاء ويتحرك على كتف آخر مدافع.','Lives in the box and plays on the last defender\'s shoulder.'),
    ph:{ att:P(['التحرك على كتف آخر مدافع وتجنب التسلل','الإنهاء بلمسة واحدة داخل المنطقة'],['Play on the last defender\'s shoulder, stay onside','One-touch finishing in the box']),
         def:P(['الضغط الموجّه دون استنزاف','البقاء متقدماً لتهديد المرتدة'],['Directed pressing without over-running','Stay high to threaten the counter']),
         ta:P(['الجري خلف الدفاع مبكراً','التمركز بين قلبي الدفاع'],['Early run in behind','Position between the centre-backs']),
         td:P(['الضغط على الحارس أو المدافع المستلم','إغلاق التمرير الخلفي'],['Press the keeper or receiving defender','Block the back pass']) },
    sp:P(['التمركز على القائمين','متابعة الكرات المرتدة'],['Near and far post','Follow in rebounds']),
    kpi:P(['الأهداف','التسديدات على المرمى','الأهداف المتوقعة','حالات التسلل'],['Goals','Shots on target','Expected goals','Offsides']),
    drills:['f-finish','f-cross'], z:{ wb:[.9,0,.06,.1], nb:[.66,0,.1,.12] }, mv:{ att:[.9,null], ta:[.8,null], td:[.82,null] } },
  { id:'st-f9', rs:'fb', fam:'ST', name:P('مهاجم وهمي','False 9'), desc:P('ينزل من خط الهجوم نحو الوسط ليجذب قلب الدفاع ويفتح المساحة للأجنحة.','Drops into midfield to drag a centre-back out and open space for wingers.'),
    ph:{ att:P(['النزول لخط الوسط لخلق تفوق عددي','التمرير للأجنحة المنطلقة للعمق'],['Drop into midfield to overload','Feed wingers running inside']),
         def:P(['تظليل الارتكاز المنافس','الضغط على قلب الدفاع المستلم'],['Shadow the opposing pivot','Press the receiving centre-back']),
         ta:P(['الاستلام والتمريرة الأولى للأمام','الربط مع الأجنحة'],['Receive and play the first pass forward','Combine with the wingers']),
         td:P(['الضغط المعاكس في الوسط','إغلاق التمرير المركزي'],['Counter-press centrally','Block central passes']) },
    sp:P(['حافة المنطقة للكرات المرتدة','تنفيذ الحرة القريبة'],['Edge of the box for rebounds','Close-range free kicks']),
    kpi:P(['الاستلام بين الخطوط','التمريرات المفتاحية','الأهداف والتمريرات الحاسمة','الضغوط الناجحة'],['Receptions between lines','Key passes','Goals and assists','Successful pressures']),
    drills:['f-pos','f-rondo'], z:{ wb:[.7,0,.12,.15], nb:[.6,0,.12,.15] }, mv:{ att:[.72,0], ta:[.62,0], td:[.74,0] } },
  { id:'st-press', rs:'fb', fam:'ST', name:P('مهاجم ضاغط','Pressing forward'), desc:P('أول مدافع في الفريق، يقود الضغط العالي بتوقيت جماعي.','The team\'s first defender who leads the high press on a shared trigger.'),
    ph:{ att:P(['التحرك خلف الدفاع لسحب الخط للخلف','الإنهاء السريع'],['Run in behind to push the line back','Quick finishing']),
         def:P(['قيادة الضغط العالي بالجري المقوّس لقطع التمرير','توجيه اللعب نحو الطرف (مصيدة الضغط)'],['Lead the high press with curved runs','Steer play into a wide pressing trap']),
         ta:P(['الجري للمرمى فوراً','استغلال فقدان الخصم للتنظيم'],['Go straight at goal','Exploit the disorganised opponent']),
         td:P(['الضغط الفوري على حامل الكرة','إشارة البدء لضغط الفريق'],['Immediate pressure on the ball','Trigger the team press']) },
    sp:P(['القائم القريب في الركنيات','الضغط على المنفذ في الرميات'],['Near post at corners','Pressure the thrower']),
    kpi:P(['عدد الضغوط','الكرات المستعادة في الثلث الهجومي','الأهداف','المسافة بالسرعات العالية'],['Pressures','Final-third recoveries','Goals','High-speed running']),
    drills:['f-press','f-rsa'], z:{ wb:[.86,0,.1,.15], nb:[.76,0,.15,.25] }, mv:{ att:[.88,null], ta:[.8,null], td:[.82,.1], def:[.6,null] } },

  /* ---------------- Futsal ---------------- */
  { id:'fs-gk', rs:'fs', fam:'GK', name:P('حارس الصالات','Goleiro'), desc:P('حارس ولاعب خامس في البناء؛ يبدأ الهجمات بالرمي الدقيق.','Goalkeeper and fifth outfield player in build-up; starts attacks with accurate throws.'),
    ph:{ att:P(['الرمية السريعة للجناح البعيد','المشاركة كحارس لاعب عند الحاجة'],['Quick throw to the far ala','Play as a fly keeper when needed']),
         def:P(['وضع الاستعداد المنخفض والتمدد الجانبي','تنظيم الدفاع صوتياً'],['Low ready stance and lateral spread','Organise vocally']),
         ta:P(['رمية مباشرة للمحور في المرتدة','قراءة لحظة التمرير قبل عودة الخصم'],['Direct throw to the pivot on the counter','Release before the opponent recovers']),
         td:P(['الخروج لقطع الكرات الطويلة','التعامل مع الانفراد بالتمدد'],['Come out to cut long balls','Spread to handle 1v1s']) },
    sp:P(['تنظيم الحائط في الحرة','ضربات الجزاء من 6م والجزاء الثاني من 10م'],['Organise the wall','Penalties from 6 m and second penalties from 10 m']),
    kpi:P(['نسبة التصديات','دقة الرميات','الانفرادات المتصدى لها','الأخطاء في البناء'],['Save %','Throw accuracy','1v1s saved','Build-up errors']),
    drills:['fs-rot','f-gk'], z:{ wb:[.12,0,.1,.3], nb:[.06,0,.06,.25] } },
  { id:'fs-fixo', rs:'fs', fam:'FIXO', name:P('المدافع (فيكسو)','Fixo'), desc:P('آخر لاعب قبل الحارس، ينظم الدفاع ويبدأ الدوران الهجومي.','The last player before the keeper; organises defence and starts the rotation.'),
    ph:{ att:P(['بدء البناء وتحويل اللعب من جهة لأخرى','التمريرة الطويلة للمحور'],['Start build-up and switch sides','Long pass into the pivot']),
         def:P(['قيادة الدفاع ورقابة المحور المنافس','التغطية خلف الأجنحة'],['Lead the defence and mark the pivot','Cover behind the alas']),
         ta:P(['تأمين الخلف ضد المرتدة المعاكسة','التمرير المبكر للأمام'],['Secure the back against counters','Early forward pass']),
         td:P(['أول مدافع يتراجع لحماية المرمى','تأخير الهجمة 2 ضد 1'],['First to drop and protect goal','Delay 2v1 situations']) },
    sp:P(['تأمين الخلف في الركنيات','رقابة المحور'],['Rest-defence at corners','Mark the pivot']),
    kpi:P(['الكرات المقطوعة','دقة تحويل اللعب','المرتدات التي أوقفها','الأخطاء'],['Interceptions','Switch accuracy','Counters stopped','Errors']),
    drills:['fs-rot','f-rondo'], z:{ wb:[.4,0,.15,.25], nb:[.22,0,.1,.25] } },
  { id:'fs-ala', rs:'fs', fam:'ALA', name:P('الجناح (آلا)','Ala'), desc:P('يعمل على الطرفين، يخلق التفوق العددي بالمراوغة والتبادل.','Works the flanks and creates overloads by dribbling and rotating.'),
    ph:{ att:P(['المواجهة 1 ضد 1 على الطرف','التبادل مع المحور والجري القطري'],['1v1 on the flank','Rotate with the pivot and run diagonally']),
         def:P(['الضغط على حامل الكرة في الطرف','إغلاق الممر الداخلي'],['Press the ball-carrier wide','Close the inside lane']),
         ta:P(['الانطلاق السريع على الطرف','الإنهاء في القائم البعيد'],['Fast break down the side','Finish at the far post']),
         td:P(['العودة لخط الدفاع','الضغط المعاكس'],['Recover to the defensive line','Counter-press']) },
    sp:P(['تنفيذ الركنيات والرميات الجانبية','التسديد من الحرة'],['Take corners and kick-ins','Shoot from free kicks']),
    kpi:P(['المراوغات الناجحة','التسديدات','التمريرات المفتاحية','الاسترجاع'],['Successful dribbles','Shots','Key passes','Recoveries']),
    drills:['fs-rot','f-1v1'], z:{ wb:[.64,.05,.25,.15], nb:[.35,.05,.15,.15] } },
  { id:'fs-pivo', rs:'fs', fam:'PIVO', name:P('المحور (بيفو)','Pivô'), desc:P('مهاجم متقدم يحمي الكرة بظهره للمرمى ويُنهي الهجمات.','Advanced striker who shields with back to goal and finishes attacks.'),
    ph:{ att:P(['الاستلام بظهره للمرمى وحماية الكرة','الدوران والتسديد أو التمرير للجناح القادم'],['Receive with back to goal and shield','Turn and shoot or lay off to the arriving ala']),
         def:P(['الضغط الأول على الفيكسو','إغلاق خط التمرير المركزي'],['First pressure on the fixo','Block the central passing lane']),
         ta:P(['التمركز كمحطة للمرتدة','متابعة التسديدات'],['Be the outlet for the counter','Follow up shots']),
         td:P(['الضغط الفوري','إبطاء بناء الخصم'],['Immediate press','Slow down the opponent\'s build-up']) },
    sp:P(['القائم البعيد في الركنيات','متابعة الكرات المرتدة'],['Far post at corners','Follow rebounds']),
    kpi:P(['الأهداف','الكرات المحتفظ بها','التسديدات على المرمى','التمريرات الحاسمة'],['Goals','Balls held up','Shots on target','Assists']),
    drills:['fs-pivot','f-finish'], z:{ wb:[.86,0,.1,.2], nb:[.6,0,.12,.25] } },

  /* ---------------- Basketball ---------------- */
  { id:'pg-floor', rs:'bb', fam:'PG', name:P('قائد منظّم','Floor general'), desc:P('يدير الهجوم وينادي الخطط، ويضبط الإيقاع وتوزيع الكرة.','Runs the offence, calls plays and controls tempo and distribution.'),
    ph:{ att:P(['نقل الكرة وإطلاق الخطة المطلوبة','قراءة الدفاع في البيك آند رول واختيار التمريرة الصحيحة'],['Bring the ball up and initiate the set','Read the pick-and-roll coverage and make the right pass']),
         def:P(['الضغط على حامل الكرة وتوجيهه للخط الجانبي','التواصل في التبديلات'],['Pressure the ball and force it to the sideline','Communicate on switches']),
         ta:P(['دفع الكرة بسرعة بعد المتابعة الدفاعية','التمرير المبكر للمتقدم'],['Push the ball after the defensive rebound','Hit the leak-out early']),
         td:P(['العودة أولاً لحماية السلة','إيقاف الكرة قبل منتصف الملعب'],['Get back first to protect the basket','Stop the ball before half court']) },
    sp:P(['تنفيذ الرمية الجانبية بخطة محددة','الاستلام الآمن ضد الضغط'],['Run the sideline out-of-bounds play','Safe catch against pressure']),
    kpi:P(['التمريرات الحاسمة','نسبة الحاسمة إلى الأخطاء','الأخطاء (Turnovers)','نسبة التصويب'],['Assists','Assist-to-turnover ratio','Turnovers','Shooting %']),
    drills:['b-pnr','b-break','b-weave'], z:{ wb:[.72,0,.08,.2], nb:[.28,0,.07,.2] } },
  { id:'pg-score', rs:'bb', fam:'PG', name:P('صانع مسجّل','Scoring guard'), desc:P('يبحث عن التسجيل أولاً من الاختراق أو التصويب بعد الحجز.','Looks to score first — drives or pull-ups off screens.'),
    ph:{ att:P(['الاختراق بعد الحجز والإنهاء أو التمرير للزاوية','التصويب بعد المحاورة'],['Attack off the screen, finish or kick to the corner','Pull-up shooting']),
         def:P(['الضغط على الكرة','المساندة ثم العودة'],['Ball pressure','Help and recover']),
         ta:P(['الهجوم على السلة في التفوق العددي','التصويب المبكر عند الفرصة'],['Attack the rim in numbers','Early shot when open']),
         td:P(['العودة السريعة','إيقاف الكرة'],['Sprint back','Stop the ball']) },
    sp:P(['خيار التصويب الأول في الرميات الأخيرة','حجز لزميله ثم الخروج'],['First shooting option in late-game plays','Screen then pop']),
    kpi:P(['النقاط','نسبة التصويب الفعلية','الاختراقات','الأخطاء'],['Points','Effective FG%','Drives','Turnovers']),
    drills:['b-form','b-pnr'], z:{ wb:[.74,0,.1,.22], nb:[.28,0,.07,.2] } },
  { id:'sg-shoot', rs:'bb', fam:'SG', name:P('مصوّب','Shooter'), desc:P('يهدد من خارج القوس ويتحرك بدون كرة حول الحجوزات.','Threatens from beyond the arc and runs off screens.'),
    ph:{ att:P(['الجري حول الحجوزات والاستلام جاهزاً للتصويب','التباعد في الزاوية لفتح الاختراق'],['Run off screens, catch shot-ready','Space the corner to open drives']),
         def:P(['الدفاع الفردي على الجناح','الخروج لإغلاق المصوّب'],['On-ball defence on the wing','Close out on shooters']),
         ta:P(['ملء الممر الجانبي في الهجوم الخاطف','الوقوف في الزاوية للتصويب'],['Fill the wing lane','Run to the corner for the shot']),
         td:P(['العودة للمنطقة','حماية الجناح'],['Get back to the paint','Protect the wing']) },
    sp:P(['خيار الرمية الأخيرة في الزاوية','الاستلام بعد الحجز'],['Corner option on inbounds','Catch off the screen']),
    kpi:P(['نسبة التصويب الثلاثي','التصويب بعد الاستلام','النقاط','الأخطاء'],['3PT %','Catch-and-shoot %','Points','Turnovers']),
    drills:['b-form','b-closeout'], z:{ wb:[.82,.12,.1,.18], nb:[.22,.05,.08,.15] } },
  { id:'sg-3d', rs:'bb', fam:'SG', name:P('مدافع ومصوّب','3&D'), desc:P('يدافع على أخطر لاعب طرف في الخصم، ويعاقب الدفاع من الزاوية.','Guards the best perimeter player and punishes from the corner.'),
    ph:{ att:P(['التمركز في الزاوية لتوفير التباعد','التصويب من الزاوية'],['Space the corner','Corner threes']),
         def:P(['الرقابة على أخطر لاعب طرف','الخروج السريع مع اليد العليا'],['Guard the best perimeter player','Fast closeouts with a high hand']),
         ta:P(['الجري في الممر الجانبي','التصويب المبكر'],['Run the lane','Early threes']),
         td:P(['العودة للمنطقة','المساعدة في الوسط'],['Get back','Help in the middle']) },
    sp:P(['خيار الزاوية في الرميات','حجز لزميله'],['Corner option on inbounds','Screen for a teammate']),
    kpi:P(['نسبة ثلاثيات الزاوية','نقاط الخصم في رقابته','الكرات المقطوعة','الأخطاء الشخصية'],['Corner 3PT %','Points allowed','Steals','Fouls']),
    drills:['b-closeout','b-slides'], z:{ wb:[.9,.3,.06,.1], nb:[.22,.05,.08,.15] } },
  { id:'sf-slash', rs:'bb', fam:'SF', name:P('جناح مخترق','Slasher'), desc:P('يهاجم السلة بالاختراق والقطع الخلفي، وينهي قرب السلة.','Attacks the rim with drives and back-cuts; finishes inside.'),
    ph:{ att:P(['القطع الخلفي عند إغلاق خط التمرير','الاختراق من الجناح والإنهاء أو التمرير الخارجي'],['Back-cut when denied','Drive from the wing, finish or kick out']),
         def:P(['الدفاع الفردي والمساندة','المتابعة الدفاعية'],['On-ball and help defence','Defensive rebounding']),
         ta:P(['الجري في الممر للإنهاء السهل','تلقي التمريرة الطويلة'],['Run the lane for easy finishes','Catch the long outlet']),
         td:P(['العودة وحماية الممر','إيقاف الكرة عند الحاجة'],['Get back and protect the lane','Stop the ball if needed']) },
    sp:P(['القطع نحو السلة في الرمية الخلفية','خيار ثانٍ للتصويب'],['Basket cut on baseline inbounds','Second shooting option']),
    kpi:P(['النقاط قرب السلة','الرميات الحرة المكتسبة','المتابعات','الأخطاء'],['Points in the paint','Free throws drawn','Rebounds','Turnovers']),
    drills:['b-break','b-weave'], z:{ wb:[.85,.05,.1,.2], nb:[.16,0,.08,.15] } },
  { id:'pf-stretch', rs:'bb', fam:'PF', name:P('جناح قوي مصوّب','Stretch 4'), desc:P('يسحب لاعب الارتكاز المنافس بعيداً عن السلة بالتصويب الخارجي.','Pulls the opposing big away from the rim with outside shooting.'),
    ph:{ att:P(['الحجز ثم الخروج للتصويب (Pick & Pop)','التباعد لفتح المنطقة لزملائه'],['Screen and pop for the shot','Space to open the paint']),
         def:P(['الدفاع على لاعب الطول','إغلاق المنطقة (Box-out)'],['Defend the big','Box out']),
         ta:P(['اللحاق بالهجمة كقادم متأخر للتصويب','المتابعة'],['Trail for the three','Crash the glass']),
         td:P(['العودة للمنطقة','المتابعة الدفاعية'],['Get back to the paint','Defensive rebounding']) },
    sp:P(['الحاجز في الرميات','خيار التصويب المتأخر'],['Screener on inbounds','Late shooting option']),
    kpi:P(['نسبة التصويب الثلاثي','المتابعات الدفاعية','النقاط','الحجوزات الفعالة'],['3PT %','Defensive rebounds','Points','Screen assists']),
    drills:['b-pnr','b-form'], z:{ wb:[.84,0,.08,.3], nb:[.1,0,.05,.18] } },
  { id:'pf-power', rs:'bb', fam:'PF', name:P('جناح قوي تحت السلة','Power forward'), desc:P('يعمل في المنطقة: متابعات وحجوزات وإنهاء قوي.','Works inside: rebounds, screens and strong finishes.'),
    ph:{ att:P(['التمركز في المنطقة المنخفضة والاستلام','المتابعة الهجومية'],['Post up on the low block','Offensive rebounding']),
         def:P(['إغلاق المنطقة ومتابعة الكرة','حماية السلة مع لاعب الارتكاز'],['Box out and rebound','Protect the rim with the centre']),
         ta:P(['التمريرة الأولى بعد المتابعة','الجري للمنطقة'],['Outlet pass after the rebound','Run to the paint']),
         td:P(['العودة للمنطقة أولاً','المتابعة'],['Paint first','Rebound']) },
    sp:P(['الحاجز الأساسي','القطع نحو السلة'],['Main screener','Basket cut']),
    kpi:P(['المتابعات','النقاط في المنطقة','الحجوزات','الأخطاء الشخصية'],['Rebounds','Paint points','Screens set','Fouls']),
    drills:['b-shell','b-pnr'], z:{ wb:[.9,0,.05,.22], nb:[.08,0,.04,.18] } },
  { id:'c-rim', rs:'bb', fam:'C', name:P('حامي السلة','Rim protector'), desc:P('يحمي السلة بالقفز والتمركز، ويقود الدفاع صوتياً من الخلف.','Protects the rim with timing and positioning; directs the defence from behind.'),
    ph:{ att:P(['الحجز للحامل ثم الدحرجة نحو السلة','المتابعة الهجومية'],['Screen for the handler and roll','Offensive rebounding']),
         def:P(['التمركز في المنطقة المحظورة ومساندة الزملاء','صد التصويبات دون خطأ'],['Anchor the paint and help','Contest without fouling']),
         ta:P(['المتابعة والتمرير السريع للصانع','الجري في منتصف الملعب'],['Rebound and outlet quickly','Rim-run down the middle']),
         td:P(['العودة أولاً لحماية السلة','التواصل مع الزملاء'],['Sprint back to the rim','Talk to teammates']) },
    sp:P(['الحاجز الرئيسي','الهدف في الرمية العلوية'],['Main screener','Lob target']),
    kpi:P(['الصدات','المتابعات الدفاعية','نسبة التصويب قرب السلة','الأخطاء الشخصية'],['Blocks','Defensive rebounds','FG% at the rim','Fouls']),
    drills:['b-shell','b-pnr'], z:{ wb:[.9,0,.05,.15], nb:[.08,0,.04,.14] } },
  { id:'c-post', rs:'bb', fam:'C', name:P('لاعب ارتكاز ممرّر','Playmaking big'), desc:P('يستلم في المرفق أو أعلى المنطقة ويصنع اللعب لزملائه القاطعين.','Receives at the elbow or high post and creates for cutters.'),
    ph:{ att:P(['الاستلام في المرفق والتمرير للقاطعين','التسليم باليد للمصوّبين (Hand-off)'],['Catch at the elbow and hit cutters','Dribble hand-offs for shooters']),
         def:P(['الدفاع في المنطقة ومساندة الاختراق','الإغلاق على لاعب الطول'],['Paint defence and help on drives','Box out the big']),
         ta:P(['التمريرة الطويلة بعد المتابعة','القدوم المتأخر'],['Long outlet after rebounds','Trail the play']),
         td:P(['العودة للمنطقة','المتابعة الدفاعية'],['Get back to the paint','Defensive rebound']) },
    sp:P(['المرّر في الرمية الخلفية','الحاجز'],['Inbounder on baseline plays','Screener']),
    kpi:P(['التمريرات الحاسمة','الحجوزات الناتجة عن نقاط','المتابعات','الأخطاء'],['Assists','Screen assists','Rebounds','Turnovers']),
    drills:['b-shell','b-weave'], z:{ wb:[.8,0,.06,.15], nb:[.1,0,.05,.15] } },

  /* ---------------- Volleyball ---------------- */
  { id:'vb-s', rs:'vb', fam:'S', name:P('المعد','Setter'), desc:P('عقل الفريق، يوزع الكرة الثانية ويختار الضارب حسب حائط الخصم.','The team\'s brain; distributes the second ball based on the opposing block.'),
    ph:{ att:P(['الانتقال من الخلف لمنطقة الإعداد بين المركزين 2 و3','توزيع الإعداد لإبعاد الحائط عن الضارب'],['Penetrate to the target between zones 2 and 3','Set to beat the block']),
         def:P(['حائط الصد في المركز 2 عند وجوده في الصف الأمامي','الدفاع في المركز 1 عند وجوده في الخلف'],['Block in zone 2 when front row','Defend zone 1 when back row']),
         ta:P(['الانتقال السريع من الدفاع إلى الشبكة','الإعداد من وضعيات غير مثالية'],['Transition fast from defence to the net','Set from out-of-system positions']),
         td:P(['تغطية الضارب بعد الإعداد','قراءة الكرة المرتدة من الحائط'],['Cover the hitter after setting','Read the ball off the block']) },
    sp:P(['إرسال موجّه يحدد مكان الاستقبال','الإعداد الخلفي المفاجئ للمقابل'],['Tactical serve to target a passer','Surprise back set to the opposite']),
    kpi:P(['دقة الإعداد','نسبة نجاح الهجوم بعد إعداده','أخطاء اللمس المزدوج','الإرسال الناجح'],['Set accuracy','Kill % from his sets','Ball-handling errors','Serve success']),
    drills:['v-setter','v-wash'], z:{ wb:[.46,0,.04,.14], nb:[.3,0,.12,.2] } },
  { id:'vb-oh', rs:'vb', fam:'OH', name:P('الضارب الرئيسي','Outside hitter'), desc:P('يستقبل الإرسال ويهاجم من المركز 4 ومن الخط الخلفي.','Passes serve and attacks from zone 4 and the back row.'),
    ph:{ att:P(['الاستقبال في الممر المحدد له','الهجوم من المركز 4 والهجوم الخلفي (Pipe)'],['Pass in his lane','Attack from zone 4 and the pipe']),
         def:P(['حائط الصد مع لاعب الوسط','الدفاع في الممر الخطي أو القطري'],['Block with the middle','Dig line or cross-court']),
         ta:P(['الانسحاب من الشبكة للاقتراب الكامل','الضرب من الإعداد العالي'],['Transition off the net for a full approach','Hit the high ball']),
         td:P(['تغطية الضارب','الاستعداد للكرة الثانية'],['Cover the hitter','Ready for the next ball']) },
    sp:P(['إرسال قوي بالقفز','استقبال الإرسال في المنطقة المخصصة'],['Jump serve','Serve receive in his zone']),
    kpi:P(['نسبة الاستقبال الإيجابي','كفاءة الهجوم (نقاط − أخطاء ÷ محاولات)','الحائط','أخطاء الإرسال'],['Positive reception %','Hitting efficiency (kills − errors ÷ attempts)','Blocks','Serve errors']),
    drills:['v-receive','v-pepper','v-wash'], z:{ wb:[.42,0,.08,.3], nb:[.18,0,.12,.25] } },
  { id:'vb-mb', rs:'vb', fam:'MB', name:P('لاعب الوسط','Middle blocker'), desc:P('أساس حائط الصد والهجوم السريع في الوسط.','The anchor of the block and the quick attack.'),
    ph:{ att:P(['الاقتراب للضربة السريعة لتثبيت حائط الخصم','التحركات الوهمية لتحرير الضاربين'],['Approach for the quick to hold their block','Decoy runs to free the hitters']),
         def:P(['قراءة المعد والتحرك الجانبي لغلق الحائط المزدوج','الضغط على الشبكة بيدين فوقها'],['Read the setter and close the double block','Penetrate the net with both hands']),
         ta:P(['الانسحاب من الحائط والاقتراب السريع','خيار الضربة السريعة دائماً'],['Transition off the block for the quick','Always be a quick option']),
         td:P(['تغطية الضارب من الوسط','الاستعداد للحائط التالي'],['Cover from the middle','Ready for the next block']) },
    sp:P(['الإرسال ثم الخروج لصالح الليبرو','الإرسال التكتيكي نحو المنطقة الضعيفة'],['Serve, then sub off for the libero','Tactical serve to a weak zone']),
    kpi:P(['نقاط الحائط','اللمسات على الحائط','كفاءة الهجوم السريع','أخطاء لمس الشبكة'],['Stuff blocks','Block touches','Quick-attack efficiency','Net faults']),
    drills:['v-block','v-wash'], z:{ wb:[.47,0,.03,.3], nb:[.46,0,.03,.4] } },
  { id:'vb-opp', rs:'vb', fam:'OPP', name:P('الضارب المقابل','Opposite'), desc:P('المسجل الأول، يهاجم من المركز 2 والخلفي من المركز 1 ولا يستقبل غالباً.','The main scorer — attacks from zone 2 and back-row zone 1; rarely passes.'),
    ph:{ att:P(['الهجوم من المركز 2 ومن الخلف (منطقة D)','الضرب ضد حائط ثنائي'],['Attack from zone 2 and the back row (D)','Score against a double block']),
         def:P(['حائط ضد ضارب الخصم الرئيسي','الدفاع في المركز 1'],['Block the opposing outside hitter','Defend zone 1']),
         ta:P(['الخيار الأول للكرة العالية في التحول','الهجوم الخلفي'],['First option for the high ball in transition','Back-row attack']),
         td:P(['تغطية المعد','إعادة التمركز'],['Cover the setter','Reset position']) },
    sp:P(['إرسال قوي بالقفز','الإعداد الطارئ إذا لمس المعد الكرة الأولى'],['Jump serve','Emergency set when the setter digs']),
    kpi:P(['كفاءة الهجوم','النقاط','الحائط','أخطاء الإرسال'],['Hitting efficiency','Points','Blocks','Serve errors']),
    drills:['v-serve','v-wash'], z:{ wb:[.42,0,.08,.2], nb:[.2,0,.1,.2] } },
  { id:'vb-l', rs:'vb', fam:'L', name:P('الليبرو','Libero'), desc:P('اختصاصي الاستقبال والدفاع في الصف الخلفي، لا يرسل ولا يهاجم فوق الشبكة.','Back-row reception and defence specialist; does not attack above the net.'),
    ph:{ att:P(['قيادة منظومة الاستقبال وأخذ المساحة الأكبر','الإعداد بالساعدين من خلف خط 3م عند الحاجة'],['Lead the reception and take the biggest area','Forearm set from behind the 3 m line when needed']),
         def:P(['الدفاع في المركز 6 أو 5 حسب النظام','قراءة الضارب واتجاه الذراع'],['Defend zone 6 or 5 per system','Read the hitter\'s arm']),
         ta:P(['تحويل الدفاع إلى كرة قابلة للإعداد','التواصل مع المعد'],['Turn digs into settable balls','Talk to the setter']),
         td:P(['تغطية الضاربين','الاستعداد للكرة المرتدة'],['Cover the hitters','Ready for the rebound']) },
    sp:P(['يدخل بدل لاعب الوسط في الصف الخلفي دون تسجيل تبديل','لا يرسل في أغلب المسابقات'],['Replaces the middle in the back row without a sub','Does not serve in most competitions']),
    kpi:P(['نسبة الاستقبال الممتاز','الدفاعات الناجحة','أخطاء الاستقبال','التغطية'],['Perfect pass %','Digs','Reception errors','Coverage']),
    drills:['v-receive','v-pepper'], z:{ wb:[.18,0,.12,.4], nb:[.15,0,.12,.4] } },

  /* ---------------- Handball ---------------- */
  { id:'hb-gk', rs:'hb', fam:'GK', name:P('حارس المرمى','Goalkeeper'), desc:P('آخر خط دفاع وأول مهاجم في الهجوم الخاطف.','The last line of defence and the first attacker on the break.'),
    ph:{ att:P(['التمريرة الطويلة السريعة للجناح المنطلق','التبديل مع لاعب سابع عند اللعب بلا حارس'],['Fast long pass to the breaking wing','Swap for a 7th field player when needed']),
         def:P(['التمركز على المنصّف بين الكرة والمرمى','التنسيق مع الحائط الدفاعي لتقسيم المرمى'],['Position on the ball–goal bisector','Coordinate with the block to split the goal']),
         ta:P(['رمية فورية بعد التصدي','قراءة الجناح المنطلق'],['Immediate throw after the save','Read the breaking wing']),
         td:P(['العودة للمرمى بسرعة عند التقدم','التمركز ضد التسديد البعيد'],['Sprint back to goal when out','Set against long shots']) },
    sp:P(['رميات 7 أمتار: الصبر وتضييق الزاوية','تنظيم الحائط في الرمية الحرة'],['7 m throws: patience, narrow the angle','Organise the free-throw wall']),
    kpi:P(['نسبة التصديات','تصديات 7 أمتار','التمريرات الطويلة الناجحة','التصديات من الأجنحة'],['Save %','7 m saves','Successful outlets','Wing saves']),
    drills:['h-gk','h-break'], z:{ wb:[.05,0,.04,.14], nb:[.03,0,.03,.16], own:true } },
  { id:'hb-wing-fast', rs:'hb', fam:'WING', name:P('جناح سريع','Fast-break wing'), desc:P('أول المنطلقين في الهجوم الخاطف، والمدافع الخارجي في منظومة الدفاع.','First to break on the counter and the outside defender in the system.'),
    ph:{ att:P(['الاتساع على الخط وتثبيت المدافع الخارجي','الدخول للدائرة الثانية'],['Hold width to pin the outside defender','Run in as a second pivot']),
         def:P(['الدفاع في المركز الخارجي (1)','منع اختراق الجناح المنافس'],['Defend position 1 (outside)','Stop the wing\'s penetration']),
         ta:P(['الانطلاق الفوري بعد استعادة الكرة','الاستلام والتسديد من الزاوية'],['Break immediately on possession','Catch and shoot from the angle']),
         td:P(['العودة وإغلاق الطرف','الضغط على الجناح المنافس'],['Get back and close the side','Pressure the opposing wing']) },
    sp:P(['التمركز في الجناح في الرمية الحرة','خيار التسديد من الزاوية'],['Wide position on free throws','Angle-shot option']),
    kpi:P(['أهداف الهجوم الخاطف','نسبة التسديد من الجناح','الكرات المقطوعة','الأخطاء التقنية'],['Fast-break goals','Wing shooting %','Steals','Technical faults']),
    drills:['h-break','h-shoot9'], z:{ wb:[.94,.04,.05,.1], nb:[.07,0,.04,.1] } },
  { id:'hb-wing-corner', rs:'hb', fam:'WING', name:P('جناح زاوية','Corner specialist'), desc:P('يتقن التسديد من الزوايا الضيقة بالقفز داخل المنطقة.','Masters tight-angle shots by jumping into the area.'),
    ph:{ att:P(['القفز داخل منطقة المرمى لفتح الزاوية','التسديد الملتف أو الساقط'],['Jump into the area to open the angle','Spin or lob shots']),
         def:P(['الدفاع الخارجي ومنع التمرير للجناح','المساعدة للداخل'],['Outside defence, deny the wing','Help inside']),
         ta:P(['الانطلاق على الطرف','الاستلام خلف المدافع'],['Break down the side','Receive behind the defender']),
         td:P(['العودة للخط','إغلاق الطرف'],['Back to the line','Close the side']) },
    sp:P(['الرمية الحرة من الجانب','منفذ 7 أمتار البديل'],['Side free throws','Backup 7 m taker']),
    kpi:P(['نسبة التسديد من الزاوية','الأهداف','الأخطاء','الاعتراضات'],['Angle shooting %','Goals','Errors','Interceptions']),
    drills:['h-shoot9','h-feint'], z:{ wb:[.96,.08,.03,.08], nb:[.07,0,.04,.1] } },
  { id:'hb-back-shoot', rs:'hb', fam:'BACK', name:P('ظهير مصوّب','Back shooter'), desc:P('مسجّل من خارج 9 أمتار بالقفز فوق الحائط.','Scores from beyond 9 m with jump shots over the block.'),
    ph:{ att:P(['التسديد بالقفز من خلف 9م','الاختراق بين مدافعين عند تقدمهما'],['Jump shots from beyond 9 m','Break through when two defenders step out']),
         def:P(['الدفاع في المركز 2 (نصف)','الخروج لمواجهة الظهير المنافس'],['Defend position 2 (half)','Step out on the opposing back']),
         ta:P(['الاستلام في منتصف الملعب والتسديد البعيد','الموجة الثانية من الهجوم'],['Receive at half court and shoot long','Second wave of the attack']),
         td:P(['العودة للمركز الدفاعي','إيقاف الظهير المنافس'],['Return to the defensive spot','Stop the opposing back']) },
    sp:P(['منفذ الرمية الحرة 9 أمتار','منفذ 7 أمتار'],['9 m free-throw shooter','7 m taker']),
    kpi:P(['الأهداف من خارج 9م','نسبة التسديد','التمريرات الحاسمة','الإيقافات الدفاعية'],['Goals from 9 m+','Shooting %','Assists','Defensive stops']),
    drills:['h-shoot9','h-60'], z:{ wb:[.75,0,.08,.15], nb:[.16,0,.05,.12] } },
  { id:'hb-back-pen', rs:'hb', fam:'BACK', name:P('ظهير مخترق','Penetrating back'), desc:P('يهاجم الفراغات بالخداع ويصنع للدائرة والجناح.','Attacks gaps with feints and creates for the pivot and wing.'),
    ph:{ att:P(['الخداع 1 ضد 1 والاختراق','التمرير للدائرة بعد جذب مدافعين'],['1v1 feints and penetration','Feed the pivot after drawing two']),
         def:P(['الدفاع النشط والتقدم لمواجهة الظهير','المساندة للداخل'],['Active defence stepping out','Help inside']),
         ta:P(['حمل الكرة للأمام في الموجة الثانية','التمرير للجناح'],['Carry in the second wave','Feed the wing']),
         td:P(['العودة للخط','إغلاق الفراغ'],['Back to the line','Close the gap']) },
    sp:P(['التمرير للدائرة في الرمية الحرة','الحجز لزميله'],['Pivot pass on free throws','Screen for a teammate']),
    kpi:P(['الاختراقات الناجحة','رميات 7 أمتار المكتسبة','التمريرات الحاسمة','الأخطاء التقنية'],['Successful breakthroughs','7 m drawn','Assists','Technical faults']),
    drills:['h-feint','h-pivot'], z:{ wb:[.8,0,.07,.15], nb:[.16,0,.05,.12] } },
  { id:'hb-cb', rs:'hb', fam:'CB', name:P('صانع الألعاب','Centre back'), desc:P('ينادي الخطط وينظم الهجوم، وقد يكون المدافع المتقدم في دفاع 5:1.','Calls plays and organises the attack; often the advanced defender in 5:1.'),
    ph:{ att:P(['تنظيم الهجوم ومناداة الجملة المناسبة للدفاع','اللعب الثنائي مع الدائرة'],['Organise and call the play for the defence faced','Two-man game with the pivot']),
         def:P(['المدافع المتقدم في 5:1 أو 3:2:1 لقطع التمرير','تنظيم الدفاع صوتياً'],['Advanced defender in 5:1 or 3:2:1','Organise the defence vocally']),
         ta:P(['بدء الموجة الثانية بسرعة','التمريرة الطويلة للجناح'],['Start the second wave fast','Long pass to the wing']),
         td:P(['العودة للمركز الأوسط','إيقاف صانع ألعاب الخصم'],['Return to the centre','Stop the opposing playmaker']) },
    sp:P(['منفذ الرمية الحرة وتنظيم الحائط الهجومي','ضربة البداية السريعة'],['Free-throw organiser','Quick throw-off']),
    kpi:P(['التمريرات الحاسمة','الأهداف','الأخطاء التقنية','الكرات المقطوعة كمدافع متقدم'],['Assists','Goals','Technical faults','Interceptions as advanced defender']),
    drills:['h-pivot','h-pass','h-60'], z:{ wb:[.73,0,.07,.18], nb:[.22,0,.08,.12] } },
  { id:'hb-pv', rs:'hb', fam:'PV', name:P('لاعب الدائرة','Pivot'), desc:P('يعمل بين المدافعين على خط 6م، يحجز ويفتح الفراغات ويسجل.','Works between defenders on the 6 m line — screens, opens gaps and scores.'),
    ph:{ att:P(['الحجز للظهير ثم الالتفاف لاستلام الكرة','التحرك على الخط لفصل المدافعين'],['Screen for the back, then roll for the ball','Move along the line to split defenders']),
         def:P(['الدفاع في المركز الأوسط والالتحام','إغلاق خط التمرير للدائرة المنافسة'],['Defend the central position with contact','Deny passes to the opposing pivot']),
         ta:P(['الانطلاق كقادم ثانٍ','استلام الكرة في المنطقة'],['Run as the trailer','Receive near the area']),
         td:P(['العودة للمركز الأوسط','التواصل الدفاعي'],['Get back to the centre','Defensive communication']) },
    sp:P(['الحجز في الرمية الحرة','كسب رميات 7 أمتار'],['Screen on free throws','Draw 7 m throws']),
    kpi:P(['الأهداف من الدائرة','رميات 7 أمتار المكتسبة','الحجوزات الفعالة','الإيقافات الدفاعية'],['Goals from the line','7 m drawn','Effective screens','Defensive stops']),
    drills:['h-pivot','h-60'], z:{ wb:[.86,0,.04,.2], nb:[.16,0,.04,.1] } }
];
function fname(mode, side, key) {
  if (mode === 'vb') return T(vbName(key));
  if (mode === 'futsal') return T(FNAME.futsal[key] || key);
  if (mode === 'bb') return T((side === 'A' ? FNAME.bbOff : FNAME.bbDef)[key] || key);
  if (mode === 'hb') return T((side === 'A' ? FNAME.hbOff : FNAME.hbDef)[key] || key);
  return key;
}
const roleById = id => ROLES.find(r => r.id === id);
const defaultVariant = (rs, code) => { const f = CODE_FAMILY[rs][code]; const v = ROLES.find(r => r.rs === rs && r.fam === f); return v ? v.id : null; };
const codeName = (rs, code) => T((rs === 'hb' && HB_CODE_NAME[code]) || CODE_NAME[code] || code);
const PHASE_INFO = {
  fb: {
    att: { ar: ['الفريق يتقدم ككتلة ويستقر في نصف الخصم.', 'الاتساع من الأظهرة أو الأجنحة، والعمق من المهاجم.', 'لاعبو الوسط يتحركون بين الخطوط ويخلقون مثلثات تمرير.', 'قلبا الدفاع والارتكاز يؤمّنون الخلف (التوازن الوقائي).'], en: ['The team pushes up as a block and settles in the opposition half.', 'Width from full-backs or wingers, depth from the striker.', 'Midfielders move between the lines to create triangles.', 'Centre-backs and pivot provide rest-defence behind the ball.'] },
    def: { ar: ['كتلة متوسطة متماسكة: 10–15م بين كل خطين ونحو 30–35م طولاً.', 'إغلاق العمق وتوجيه الخصم نحو الطرف.', 'الانزلاق الجماعي نحو جهة الكرة.', 'الضغط يبدأ بإشارة مشتركة: تمريرة للخلف أو استلام سيئ.'], en: ['A compact mid-block: 10–15 m between lines, about 30–35 m deep.', 'Close the centre and force play wide.', 'Slide together towards the ball side.', 'Press on a shared trigger: back pass or poor touch.'] },
    ta: { ar: ['لحظة استعادة الكرة: أول تمريرة للأمام خلال ثانيتين.', 'الأجنحة والمهاجم يهاجمون المساحة خلف الدفاع.', 'لاعب أو اثنان يبقيان للتوازن.'], en: ['On regaining the ball: first forward pass within two seconds.', 'Wingers and striker attack space behind the defence.', 'One or two players stay back for balance.'] },
    td: { ar: ['الضغط المعاكس 5 ثوانٍ من أقرب ثلاثة لاعبين.', 'البقية يغلقون العمق ويتراجعون خلف الكرة.', 'إن فشل الضغط: العودة للكتلة بسرعة.'], en: ['Five-second counter-press from the nearest three players.', 'The rest close the centre and drop behind the ball.', 'If the press fails: recover into the block quickly.'] },
    sp: { ar: ['ركنية هجومية من اليمين: 4–5 لاعبين في المنطقة.', 'لاعبان على حافة المنطقة للكرات الثانية.', 'ثلاثة لاعبين للتوازن ضد المرتدة.'], en: ['Attacking corner from the right: 4–5 players in the box.', 'Two on the edge for second balls.', 'Three stay back against the counter.'] } },
  fs: {
    att: { ar: ['دوران مستمر لتفكيك الدفاع.', 'المحور يثبت المدافعين، والأجنحة تهاجم الطرفين.', 'الفيكسو آخر لاعب ويؤمّن الخلف.'], en: ['Constant rotation to unbalance the defence.', 'Pivot pins defenders, alas attack the sides.', 'Fixo is the last player and secures the back.'] },
    def: { ar: ['دفاع في نصف الملعب بشكل مسطح أو ماسي.', 'إغلاق خط التمرير للمحور.', 'تبديل الرقابة بالتواصل.'], en: ['Half-court defence in a flat or diamond shape.', 'Deny passes into the pivot.', 'Switch marks by communication.'] },
    ta: { ar: ['هجوم سريع قبل عودة الخصم.', 'تفوق عددي 2 ضد 1 أو 3 ضد 2.'], en: ['Attack before the opponent recovers.', 'Look for 2v1 or 3v2.'] },
    td: { ar: ['الفيكسو يتراجع فوراً.', 'أقرب لاعب يضغط لإبطاء الهجمة.'], en: ['Fixo drops at once.', 'Nearest player presses to slow the attack.'] },
    sp: { ar: ['ركنية أو رمية جانبية بجملة محفوظة.', 'لاعب للتوازن دائماً.'], en: ['Corner or kick-in with a rehearsed play.', 'Always one player for balance.'] } },
  bb: {
    att: { ar: ['خطة منظمة في نصف الملعب.', 'التباعد يفتح ممرات الاختراق.', 'الحجز والقطع يخلقان التفوق.'], en: ['A set half-court offence.', 'Spacing opens driving lanes.', 'Screens and cuts create advantages.'] },
    def: { ar: ['العودة لحماية السلة الخاصة بنا.', 'مثلث الكرة – المدافع – الرجل.', 'المتابعة الدفاعية تنهي الهجمة.'], en: ['Protect our own basket.', 'Ball – you – man triangle.', 'Defensive rebound ends the possession.'] },
    ta: { ar: ['الكرة في الوسط والأجنحة في الممرات.', 'لاعب الارتكاز يجري للسلة.', 'الجناح القوي يأتي متأخراً (Trailer).'], en: ['Ball in the middle, wings fill the lanes.', 'The centre rim-runs.', 'The power forward trails.'] },
    td: { ar: ['الارتكاز يعود أولاً لحماية السلة.', 'صانع الألعاب يوقف الكرة.', 'الجميع يعود قبل منتصف الملعب.'], en: ['The centre sprints back first.', 'The point guard stops the ball.', 'Everyone back before half court.'] },
    sp: { ar: ['رمية خلفية بشكل صندوق.', 'حجوزات متقاطعة لتحرير المصوب.'], en: ['Baseline inbound from a box set.', 'Cross screens free the shooter.'] } },
  hb: {
    att: { ar: ['ثلاثة خلفيين وجناحان ودائرة.', 'تهديد المرمى أولاً ثم التمرير.', 'الحجز مع الدائرة يفتح الفراغات.'], en: ['Three backs, two wings and a pivot.', 'Threaten goal first, then pass.', 'Screens with the pivot open gaps.'] },
    def: { ar: ['دفاع منظم أمام مرمانا حسب النظام المختار.', 'الانزلاق مع الكرة والخروج للمسدد.'], en: ['Organised defence in front of our goal.', 'Slide with the ball and step out on shooters.'] },
    ta: { ar: ['الحارس يمرر مباشرة للجناحين.', 'الموجة الثانية من الخلفيين.'], en: ['Keeper passes straight to the wings.', 'Second wave from the backs.'] },
    td: { ar: ['العودة السريعة قبل تنظيم الخصم.', 'إيقاف الهجوم الخاطف.'], en: ['Get back before the opponent organises.', 'Stop the fast break.'] },
    sp: { ar: ['رمية 7 أمتار: المنفذ على خط 7م والبقية خلف 9م.'], en: ['7 m throw: taker on the 7 m line, others behind 9 m.'] } },
  vb: {
    sp: { ar: ['تمركز قانوني لحظة الإرسال حسب الدوران.', 'المرسِل خلف خط النهاية.'], en: ['Legal alignment at the serve for this rotation.', 'Server behind the end line.'] },
    att: { ar: ['استقبال ثلاثي: الليبرو والضاربان الرئيسيان.', 'المعد ينتقل لمنطقة الإعداد.', 'باقي اللاعبين يختبئون قرب الشبكة.'], en: ['Three-passer reception: libero and two outside hitters.', 'The setter penetrates to the target.', 'Others hide near the net.'] },
    def: { ar: ['الصف الأمامي يستعد للحائط.', 'الصف الخلفي على المحيط يقرأ الضارب.'], en: ['Front row ready to block.', 'Back row on the perimeter reading the hitter.'] },
    ta: { ar: ['الضاربون ينسحبون من الشبكة للاقتراب.', 'المعد يصل للهدف.'], en: ['Hitters pull off the net for the approach.', 'The setter reaches the target.'] },
    td: { ar: ['حلقة تغطية حول الضارب لالتقاط الكرة المرتدة من الحائط.'], en: ['A cover ring around the hitter to catch the ball off the block.'] } }
};
const ST = { pos: {}, opos: {}, playing: false, ro: null, k: .1, portrait: false, anim: 0 };
const stPhases = rs => rs === 'vb' ? ['sp', 'att', 'ta', 'def', 'td'] : ['att', 'def', 'ta', 'td', 'sp'];
const stCfg = () => S.ui.st;
function stForm(mode) { const c = stCfg(); const def = { fb11: '4-3-3', fb7: '2-3-1', futsal: '1-2-1', bb: '5out', hb: '33', vb: '' }[mode]; return c.form[mode] || def; }
function stOppForm(mode) { const c = stCfg(); return c.oppForm[mode] || { fb11: '4-4-2', fb7: '2-3-1', futsal: '1-2-1', bb: '5out', hb: '33', vb: '' }[mode]; }
function stDef(mode, opp) { const c = stCfg(); if (opp) return (c.oppDef || {})[mode] || { bb: 'man', hb: '60' }[mode]; return c.def[mode] || { bb: 'man', hb: '60' }[mode]; }
const rvKey = (mode, form, id) => `${mode}|${form}|${id}`;

/* ---------- Layout engine: returns players (metres) + ball for a phase ---------- */
function layoutFootball(mode, form, phase, rvMap) {
  const M = MODES[mode], rs = M.rs, slots = FORM[mode][form] || Object.values(FORM[mode])[0];
  const out = slots.map(([code, n, bx, by], i) => {
    const fam = CODE_FAMILY[rs][code], rv = rvMap[rvKey(mode, form, i)] || defaultVariant(rs, code), role = roleById(rv), lat0 = by - .5, sign = lat0 > .02 ? 1 : lat0 < -.02 ? -1 : 0; let x, y;
    if (phase === 'def') { const m = role && role.mv && role.mv.def; if (m) { x = m[0]; y = .5 + (m[1] == null ? lat0 * .82 : sign * m[1]); } else { x = code === 'GK' ? (mode === 'futsal' ? .04 : .05) : (mode === 'futsal' ? .03 + bx * .95 : .065 + bx * 1.02); y = .5 + lat0 * .82; } }
    else if (phase === 'sp') { x = bx; y = by; }
    else { const m = (role && role.mv && role.mv[phase]) || (FAM[rs][fam] && FAM[rs][fam].mv && FAM[rs][fam].mv[phase]); const f = { att: 1.12, ta: 1.05, td: .9 }[phase];
      if (m) { x = m[0]; y = .5 + (m[1] == null ? lat0 * f : sign * m[1]); } else { x = bx + { att: .35, ta: .2, td: .3 }[phase]; y = .5 + lat0 * f; } }
    return { id: i, code, n, fam, rv, x, y, by };
  });
  if (phase === 'sp') {
    const gk = out.find(p => p.code === 'GK'); if (gk) { gk.x = .06; gk.y = .5; }
    const rest = out.filter(p => p !== gk); const taker = rest.find(p => (p.fam === 'W' || p.fam === 'AM' || p.fam === 'ALA') && p.by >= .5) || rest.find(p => p.fam === 'W' || p.fam === 'AM' || p.fam === 'ALA') || rest[rest.length - 1];
    taker.x = .997; taker.y = .99;
    const pr = { CB: 0, ST: 1, PIVO: 1, AM: 2, CM: 3, ALA: 3, W: 4, WB: 5, FB: 6, DM: 7, FIXO: 8 };
    const others = rest.filter(p => p !== taker).sort((a, b) => (pr[a.fam] ?? 5) - (pr[b.fam] ?? 5)); const n = others.length;
    const nRest = n >= 6 ? 3 : n >= 4 ? 1 : 0, nEdge = n >= 8 ? 2 : n >= 5 ? 1 : 0, nBox = n - nRest - nEdge;
    const box = [[.955, .42], [.95, .56], [.935, .66], [.925, .34], [.915, .5]], edge = [[.82, .44], [.83, .62]], rst = [[.55, .36], [.55, .64], [.62, .5]];
    others.forEach((p, i) => { const s = i < nBox ? box[i % 5] : i < nBox + nEdge ? edge[i - nBox] : rst[i - nBox - nEdge]; p.x = s[0]; p.y = s[1]; });
  }
  out.forEach(p => { p.x = clamp(p.x, .005, .997) * M.L; p.y = clamp(p.y, .02, .98) * M.W; p.by *= M.W; });
  const ball = { att: [.78, .22], def: [.42, .72], ta: [.36, .6], td: [.78, .3], sp: [.995, .985] }[phase];
  return { players: out, ball: [ball[0] * M.L, ball[1] * M.W] };
}
function manMark(offence, target) { return offence.map(o => { const dx = target[0] - o.x, dy = target[1] - o.y, len = Math.hypot(dx, dy) || 1, g = Math.min(1.4, len * .35); return { x: o.x + dx / len * g, y: o.y + dy / len * g, code: o.code }; }); }
function layoutCourt(mode, cfg, phase, rvMap, oppAtt) {
  const M = MODES[mode], rs = M.rs, off = mode === 'bb' ? BB_OFF[cfg.off] || BB_OFF['5out'] : HB_OFF[cfg.off] || HB_OFF['33'];
  const base = off.map(([code, n, x, y]) => ({ code, n, x, y }));
  const players = base.map(b => { const fam = CODE_FAMILY[rs][b.code], rv = rvMap[rvKey(mode, cfg.off, b.code)] || defaultVariant(rs, b.code); return { id: b.code, code: b.code, n: b.n, fam, rv, x: b.x, y: b.y, by: b.y }; });
  const byCode = c => players.find(p => p.code === c);
  if (phase === 'def') {
    let d = mode === 'bb' ? BB_DEF[cfg.def] : HB_DEF[cfg.def];
    if (d === 'man') { const offence = (oppAtt || BB_OFF['5out'].map(([code, n, x, y]) => ({ code, x: M.L - x, y: M.W - y }))); manMark(offence, [1.575, 7.5]).forEach((q, i) => { const p = byCode(q.code) || players[i]; p.x = q.x; p.y = q.y; }); }
    else (d || []).forEach(([code, n, x, y]) => { const p = byCode(code); if (p) { p.x = M.L - x; p.y = M.W - y; } });
  } else if (phase === 'ta' || phase === 'td') {
    players.forEach(p => { const m = FAM[rs][p.fam] && FAM[rs][p.fam].mv && FAM[rs][p.fam].mv[phase]; if (!m) return; const s = p.by / M.W - .5, sign = s > .02 ? 1 : s < -.02 ? -1 : 0; p.x = m[0] * M.L; p.y = (.5 + sign * m[1]) * M.W; });
  } else if (phase === 'sp') {
    if (mode === 'bb') { BB_OFF.box.forEach(([code, n, x, y]) => { const p = byCode(code); if (p) { p.x = x; p.y = y; } }); const sf = byCode('SF'); sf.x = 28.45; sf.y = 4.4; }
    else { const shooter = byCode('RB') || players[1]; shooter.x = 33; shooter.y = 10; const spots = [[30.2, 2.6], [29.6, 6.6], [29.6, 13.4], [30.2, 17.4], [27.6, 10]]; players.filter(p => p !== shooter && p.code !== 'GK').forEach((p, i) => { p.x = spots[i][0]; p.y = spots[i][1]; }); }
  }
  let ball;
  if (mode === 'bb') { const pg = byCode('PG'); ball = { att: [pg.x - .6, pg.y + .5], def: [8.4, 7.5], ta: [pg.x - .5, pg.y + .4], td: [15, 7.5], sp: [28.8, 4.4] }[phase]; }
  else { const cb = byCode('CB'), gk = byCode('GK'); ball = { att: [cb.x - .6, cb.y + .5], def: [9.5, 10], ta: [gk.x + 1.2, gk.y], td: [20, 10], sp: [33.6, 10] }[phase]; }
  return { players, ball };
}
function layoutVolley(k, phase) {
  const type = { sp: 'base', att: 'recv', def: 'def', ta: 'trans', td: 'cover' }[phase]; const rows = vbFormation(`${type}|${k}`);
  const players = rows.map(([code, n, x, y, pos]) => ({ id: 'p' + pos, code, n, fam: code, rv: defaultVariant('vb', code), x: x * 18, y: y * 9, by: y * 9, pos }));
  if (phase === 'sp') { const s = players.find(p => p.pos === 1); s.x = -1.2; s.y = 7.5; }
  const srv = players.find(p => p.pos === 1);
  const ball = { sp: [srv.x + .5, srv.y - .3], att: [3.9, 4.2], def: [9.9, 1.4], ta: [8.5, 6.6], td: [8.6, .8] }[phase];
  return { players, ball };
}
function stLayout(mode, phase, opp) {
  const c = stCfg(), rv = opp ? {} : c.rv;
  if (FORM[mode]) return layoutFootball(mode, opp ? stOppForm(mode) : stForm(mode), phase, rv);
  if (mode === 'vb') return layoutVolley(c.rot || 1, phase);
  const cfg = { off: opp ? stOppForm(mode) : stForm(mode), def: stDef(mode, opp) };
  let oppAtt = null;
  if (mode === 'bb' && phase === 'def' && cfg.def === 'man') { const o = layoutCourt(mode, { off: opp ? stForm(mode) : stOppForm(mode), def: 'man' }, 'att', {}); oppAtt = o.players.map(p => ({ code: p.code, x: MODES.bb.L - p.x, y: MODES.bb.W - p.y })); }
  return layoutCourt(mode, cfg, phase, rv, oppAtt);
}
const invPhase = (rs, ph) => rs === 'vb' ? ({ sp: 'att', att: 'sp', def: 'ta', ta: 'def', td: 'def' })[ph] : ({ att: 'def', def: 'att', ta: 'td', td: 'ta', sp: null })[ph];
function stOpp(mode, phase) {
  const M = MODES[mode], ip = invPhase(M.rs, phase); if (!ip) return null; const o = stLayout(mode, ip, true);
  let players = o.players.map(p => Object.assign({}, p, { x: M.L - p.x, y: M.W - p.y }));
  if (mode === 'bb' && phase === 'att' && stDef(mode, true) === 'man') { const ours = stLayout(mode, 'att', false).players; players = players.map(p => { const me = ours.find(q => q.code === p.code); if (!me) return p; const q = manMark([me], [26.425, 7.5])[0]; return Object.assign({}, p, { x: q.x, y: q.y }); }); }
  return players;
}
const DRILLS=drillsData;const drillById=id=>DRILLS.find(d=>d.id===id);
export const ENG={MODES,FORM,BB_OFF,BB_DEF,HB_OFF,HB_DEF,FNAME,FINFO,PHASES,phasesOf,CODE_FAMILY,CODE_NAME,POSITIONS,ATTR,FAM,ROLES,CATS,PHASE_INFO,ST,S,stPhases,stCfg,stForm,stOppForm,stDef,rvKey,stLayout,stOpp,roleById,defaultVariant,codeName,fname,vbName,drillById,setLang:l=>{LANG=l},getLang:()=>LANG,L,T};