// learn.phylab.uk — simulated class of 50 students for the field-line drawing, until real class data exists.
// Each simulated student draws 3 to 10 lines of their own: their own start points, lengths, bends and wobble,
// so no two drawings share the same lines. Some make the common mistakes.
// The drawings are judged by the same code as a real student's, so the teacher's picture matches what students see.
import { fieldAt } from "/assets/field.js";
import { W, H, CHARGES, judge } from "/during/lines-judge.js";

export function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Keep the part of a line that lies on the board, from its start. */
function clip(pts) {
  const out = [];
  for (const [x, y] of pts) { if (x < 0 || x > W || y < 0 || y > H) break; out.push([x, y]); }
  return out;
}

/** Hand wobble: a smooth sideways offset along the line. */
export function wobble(pts, amp, r) {
  const ph1 = r() * 6.3, ph2 = r() * 6.3, f1 = 1.2 + r() * 1.5, f2 = 3 + r() * 3;
  let s = 0;
  return pts.map((p, i) => {
    if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    const a = i ? pts[i - 1] : pts[1] || p, b = i ? p : pts[1] || p;
    const tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1;
    const off = amp * (Math.sin(f1 * s + ph1) + 0.4 * Math.sin(f2 * s + ph2)) * Math.min(1, s / 0.6);
    return [p[0] - (ty / m) * off, p[1] + (tx / m) * off];
  }).filter((_, i) => i % 3 === 0);
}

const radial = (c, a, len, outward) => {
  const pts = [];
  for (let s = 0.15; s <= len; s += 0.05) pts.push([c.x + s * Math.cos(a), c.y + s * Math.sin(a)]);
  return clip(outward ? pts : pts.reverse());
};

/** Follow the field from (x, y), dir +1 along it or −1 against it, until the board edge, a charge, or maxLen cm. */
function follow(x, y, dir, maxLen = 30) {
  const pts = [[x, y]], h = 0.05;
  for (let s = 0; s < maxLen; s += h) {
    const [ex, ey] = fieldAt(CHARGES, x, y), m = Math.hypot(ex, ey);
    if (m < 1e-9) break;
    const mx = x + (dir * h * ex) / m / 2, my = y + (dir * h * ey) / m / 2;
    const [fx, fy] = fieldAt(CHARGES, mx, my), fm = Math.hypot(fx, fy);
    if (fm < 1e-9) break;
    x += (dir * h * fx) / fm; y += (dir * h * fy) / fm;
    if (x < 0 || x > W || y < 0 || y > H) break;
    pts.push([x, y]);
    if (CHARGES.some((c) => c.q * dir < 0 && Math.hypot(x - c.x, y - c.y) < 0.18)) break;
  }
  return pts;
}

/** Keep part of a line: start at fraction a of its length, stop at fraction b. */
function part(pts, a, b) {
  const i = Math.floor(a * (pts.length - 1)), j = Math.max(i + 3, Math.ceil(b * (pts.length - 1)));
  return pts.slice(i, j + 1);
}

/** A hand-drawn line is never the exact field line: bend it as a whole, a little, sideways. */
function bend(pts, amount) {
  const n = pts.length;
  if (n < 3) return pts;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1;
    const off = amount * Math.sin((Math.PI * i) / (n - 1));
    return [p[0] - (ty / m) * off, p[1] + (tx / m) * off];
  });
}

/** One correct line, drawn the way this student draws: where it starts, how far it goes, how rough. */
function handLine(r, style, angle) {
  const [pos, neg] = CHARGES;
  let pts;
  const how = r();
  if (how < style.fromNeg) {          // started at the − charge and drawn back to the +, then the arrow put in the right way
    const a = angle + Math.PI + (r() - 0.5) * 0.6, d = 0.2 + r() * 0.35;
    pts = follow(neg.x + d * Math.cos(a), neg.y + d * Math.sin(a), -1).reverse();
  } else if (how < style.fromNeg + style.fromMiddle) { // started somewhere in the field and drawn both ways
    const x = 1 + r() * 8, y = 0.6 + r() * 4.8;
    if (Math.hypot(x - pos.x, y - pos.y) < 0.6 || Math.hypot(x - neg.x, y - neg.y) < 0.6) return null;
    pts = [...follow(x, y, -1, 2 + r() * 6).reverse(), ...follow(x, y, +1, 2 + r() * 6).slice(1)];
  } else {                             // started at the + charge
    const d = 0.2 + r() * 0.35;
    pts = follow(pos.x + d * Math.cos(angle), pos.y + d * Math.sin(angle), +1);
  }
  if (pts.length < 12) return null;
  // many students stop before the edge or before reaching the charge, some start a little away from it
  const a = r() < style.lateStart ? r() * 0.15 : 0, b = r() < style.stopEarly ? 0.45 + r() * 0.5 : 1;
  pts = part(pts, a, b);
  pts = bend(pts, (r() - 0.5) * 2 * style.bend * Math.min(1, pts.length / 60));
  return clip(pts);
}

/** Start angles at the + charge for one student: some spread them evenly, some bunch them, some skip a side. */
function angles(r, n) {
  const base = r() * 2 * Math.PI, out = [];
  const kind = r();
  for (let i = 0; i < n; i++) {
    if (kind < 0.45) out.push(base + (2 * Math.PI * i) / n + (r() - 0.5) * (1.6 / n));          // roughly even
    else if (kind < 0.75) out.push((r() < 0.5 ? 1 : -1) * (0.2 + r() * 2.6));                   // mostly toward the − charge, above and below
    else out.push(base + r() * Math.PI * (1 + r()));                                             // bunched on one side
  }
  return out;
}

const pickOne = (r, list) => list[Math.floor(r() * list.length)];

export function makeClass(n = 50, seed = 23) {
  const r = rng(seed);
  const students = [];
  for (let k = 0; k < n; k++) {
    const style = {
      fromNeg: r() * 0.3, fromMiddle: r() * 0.25, lateStart: r() * 0.5, stopEarly: 0.2 + r() * 0.6,
      bend: 0.05 + r() * 0.25, wob: 0.02 + r() * 0.06,
    };
    const count = 3 + Math.floor(r() * 8);
    const good = () => angles(r, count).map((a) => handLine(r, style, a)).filter(Boolean).map((l) => wobble(l, style.wob, r));
    const roll = r();
    let strokes, type;
    if (roll < 0.14) { type = "reversed";          // arrows from − to +: all of them, or only some
      const all = r() < 0.6;
      strokes = good().map((l) => (all || r() < 0.5 ? l.slice().reverse() : l));
    } else if (roll < 0.26) { type = "radial";     // each charge drawn on its own, straight radial lines: they cross between the charges
      strokes = [];
      const m = 3 + Math.floor(r() * 5), o0 = r() * 6.3, o1 = r() * 6.3;
      for (let i = 0; i < m; i++) {
        strokes.push(wobble(radial(CHARGES[0], o0 + (2 * Math.PI * i) / m + (r() - 0.5) * 0.5, 1.5 + r() * 3, true), style.wob, r));
        if (r() < 0.85) strokes.push(wobble(radial(CHARGES[1], o1 + (2 * Math.PI * i) / m + (r() - 0.5) * 0.5, 1.5 + r() * 3, false), style.wob, r));
      }
    } else if (roll < 0.31) { type = "loop";       // a closed loop drawn around the pair, or around one charge
      strokes = good();
      const around = pickOne(r, [{ x: 5, y: 3 }, CHARGES[0], CHARGES[1]]);
      const rx = around.x === 5 ? 2.2 + r() * 1.2 : 0.8 + r() * 0.8, ry = rx * (0.5 + r() * 0.4);
      const cx = around.x + (r() - 0.5) * 0.4, cy = around.y + (r() - 0.5) * 0.4, t0 = r() * 6.3, dir = r() < 0.5 ? 1 : -1;
      const loop = [];
      for (let t = 0; t <= 2 * Math.PI + 0.01; t += 0.05) loop.push([cx + rx * Math.cos(t0 + dir * t), cy + ry * Math.sin(t0 + dir * t)]);
      strokes.splice(Math.floor(r() * (strokes.length + 1)), 0, wobble(clip(loop), 0.04, r));
    } else if (roll < 0.37) { type = "axis";       // one straight line along the axis, through both charges
      strokes = good();
      const x0 = 0.3 + r() * 1.8, x1 = 8 + r() * 1.7, y0 = 3 + (r() - 0.5) * 0.15, y1 = 3 + (r() - 0.5) * 0.15;
      strokes.splice(Math.floor(r() * (strokes.length + 1)), 0,
        wobble(Array.from({ length: 81 }, (_, j) => [x0 + ((x1 - x0) * j) / 80, y0 + ((y1 - y0) * j) / 80]), 0.015, r));
    } else if (roll < 0.43) { type = "shaky";      // very shaky drawing: the checker cannot tell
      style.wob = 0.2 + r() * 0.12;
      strokes = good();
    } else { type = "correct"; strokes = good(); }
    strokes = strokes.filter((s) => s.length > 2);
    students.push({ id: "S" + String(k + 1).padStart(2, "0"), type, strokes, result: judge(strokes) });
  }
  return students;
}
