// learn.phylab.uk — In class, question 1: checking hand-drawn field lines of one positive and one negative charge.
// Layer 1 of the checking: only big mistakes are marked. Drawings are rough (mouse, finger), so the rules are loose,
// and anything the rules cannot read clearly is flagged "unclear" for a person to look at, never marked wrong.
// Units: centimetres on a 10 cm × 6 cm board, y upward. Charges in nanocoulombs.
import { fieldAt } from "/assets/field.js";

export const W = 10, H = 6;
export const CHARGES = [{ x: 3.2, y: 3, q: 1 }, { x: 6.8, y: 3, q: -1 }];

const NEAR_CHARGE = 0.5;  // cm: close to a charge the field turns fast and drawings are imprecise, so these parts are not judged
const THROUGH = 0.22;     // cm: a line passing this close to a charge, away from its ends, goes through the charge
const STEP = 0.12;        // cm: lines are resampled at this spacing before judging

export const KINDS = {
  reversed: { label: "Arrow points the wrong way", why: "Field lines point away from the positive charge and toward the negative charge." },
  self:     { label: "Line crosses itself", why: "At the crossing point the line would have to point two ways at once, but the field has only one direction there." },
  cross:    { label: "Lines cross", why: "At any point the field has one direction only, so two field lines can never cross." },
  off:      { label: "Does not follow the field", why: "The line runs across the field instead of along it. Near the charges lines are almost radial; between them they curve from + to −." },
  loop:     { label: "Closed loop", why: "Field lines of charges at rest start on positive charges and end on negative charges (or leave the picture). They never close on themselves." },
  through:  { label: "Passes through a charge", why: "A field line ends when it reaches a negative charge (or starts at a positive one); it does not pass through it." },
};
export const UNCLEAR = {
  wobbly:  "Hard to tell whether this line follows the field.",
  short:   "Too short to judge.",
  overlap: "Two lines lie almost on top of each other.",
};

const nearCharge = (x, y, d) => CHARGES.some((c) => Math.hypot(x - c.x, y - c.y) < d);

/** Points every STEP cm along a stroke. */
export function resample(pts) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  let [px, py] = pts[0], carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    let seg = Math.hypot(x - px, y - py);
    while (carry + seg >= STEP) {
      const t = (STEP - carry) / seg;
      px += (x - px) * t; py += (y - py) * t;
      out.push([px, py]);
      seg = Math.hypot(x - px, y - py); carry = 0;
    }
    carry += seg; px = x; py = y;
  }
  const last = pts[pts.length - 1];
  if (Math.hypot(last[0] - out[out.length - 1][0], last[1] - out[out.length - 1][1]) > STEP * 0.3) out.push(last);
  return out;
}

function lengthOf(p) { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }

/** Where segments a-b and c-d cross, or null. */
function crossing(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-12) return null;
  const qp = [c[0] - a[0], c[1] - a[1]];
  const t = (qp[0] * s[1] - qp[1] * s[0]) / den, u = (qp[0] * r[1] - qp[1] * r[0]) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  const sin = Math.abs(den) / (Math.hypot(...r) * Math.hypot(...s));
  return { x: a[0] + t * r[0], y: a[1] + t * r[1], sin };
}

/**
 * Judge a whole drawing. strokes: arrays of [x, y] in drawing order (the order gives the arrow direction).
 * Returns { lines: [{ status: "ok" | "wrong" | "unclear", kinds: [...], unclear: [...], with: [...] }], kinds: {kind: n}, verdict, crossings: [{x, y}] }
 */
export function judge(strokes) {
  const lines = strokes.map((raw) => {
    const p = resample(raw);
    const out = { p, status: "ok", kinds: [], unclear: [], with: [] };
    const len = lengthOf(p);
    if (len < 0.8) { out.unclear.push("short"); return out; }

    // along the field or against it, judged away from the charges
    let along = 0, follow = 0, n = 0;
    for (let i = 1; i < p.length; i++) {
      const mx = (p[i][0] + p[i - 1][0]) / 2, my = (p[i][1] + p[i - 1][1]) / 2;
      if (nearCharge(mx, my, NEAR_CHARGE)) continue;
      const [ex, ey] = fieldAt(CHARGES, mx, my), em = Math.hypot(ex, ey);
      const tx = p[i][0] - p[i - 1][0], ty = p[i][1] - p[i - 1][1], tm = Math.hypot(tx, ty);
      if (em < 1e-9 || tm < 1e-9) continue;
      const cos = (ex * tx + ey * ty) / (em * tm);
      along += cos; follow += Math.abs(cos); n++;
    }
    if (n < 3) { out.unclear.push("short"); return out; }
    follow /= n; along /= n;
    out.follow = follow;
    if (follow < 0.6) out.kinds.push("off");
    else if (follow < 0.82) out.unclear.push("wobbly");
    if (follow >= 0.6 && along < -0.3) out.kinds.push("reversed");

    // through a charge: close to it somewhere away from the two ends
    const ends = Math.max(2, Math.round(p.length * 0.12));
    for (let i = ends; i < p.length - ends; i++) if (nearCharge(p[i][0], p[i][1], THROUGH)) { out.kinds.push("through"); break; }

    // closed loop
    const a = p[0], b = p[p.length - 1];
    const closed = len > 2.5 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.6 && !nearCharge(a[0], a[1], NEAR_CHARGE);
    if (closed) out.kinds.push("loop");

    // crossing itself (a closed loop meeting its own start is already counted as a loop)
    out.selfAt = null;
    for (let i = 1; i < p.length && !out.selfAt; i++) for (let j = i + 3; j < p.length; j++) {
      if (closed && (i < 6 || j > p.length - 6)) continue;
      const c = crossing(p[i - 1], p[i], p[j - 1], p[j]);
      if (!c || c.sin < 0.26 || nearCharge(c.x, c.y, NEAR_CHARGE)) continue;
      out.selfAt = { x: c.x, y: c.y }; out.kinds.push("self"); break;
    }
    return out;
  });

  // crossings between different lines, ignored close to the charges where every line meets
  const crossings = [];
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const A = lines[i].p, B = lines[j].p;
    let hit = null, shallow = 0;
    for (let s = 1; s < A.length && !hit; s++) for (let t = 1; t < B.length; t++) {
      const c = crossing(A[s - 1], A[s], B[t - 1], B[t]);
      if (!c || nearCharge(c.x, c.y, NEAR_CHARGE)) continue;
      if (c.sin < 0.26) { shallow++; continue; } // under about 15°: drawn on top of each other, not a real crossing
      hit = c; break;
    }
    if (hit) {
      crossings.push({ x: hit.x, y: hit.y });
      for (const [k, other] of [[i, j], [j, i]]) {
        if (!lines[k].kinds.includes("cross")) lines[k].kinds.push("cross");
        lines[k].with.push(other);
      }
    } else if (shallow) {
      for (const k of [i, j]) if (!lines[k].unclear.includes("overlap")) lines[k].unclear.push("overlap");
    }
  }

  for (const l of lines) if (l.selfAt) crossings.push(l.selfAt);
  const kinds = {};
  for (const l of lines) {
    l.status = l.kinds.length ? "wrong" : l.unclear.length ? "unclear" : "ok";
    for (const k of l.kinds) kinds[k] = (kinds[k] || 0) + 1;
  }
  const wrong = lines.filter((l) => l.status === "wrong").length;
  const unclear = lines.filter((l) => l.status === "unclear").length;
  const verdict = !lines.length ? "empty" : wrong ? "mistakes" : unclear ? "unclear" : "clean";
  return { lines, kinds, wrong, unclear, verdict, crossings };
}
