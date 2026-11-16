// learn.phylab.uk — simulated class of 50 students for the field-line drawing, until real class data exists.
// Each simulated student draws 6 to 10 lines by hand (smooth wobble added), and some make the common mistakes.
// The drawings are judged by the same code as a real student's, so the teacher's picture matches what students see.
import { fieldLines } from "/assets/field.js";
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

export function makeClass(n = 50, seed = 23) {
  const r = rng(seed);
  const all = fieldLines(CHARGES, { x0: 0, x1: W, y0: 0, y1: H }, 14).map(clip).filter((l) => l.length > 10);
  const students = [];
  for (let k = 0; k < n; k++) {
    const roll = r();
    const pick = all.filter(() => r() < 0.55).slice(0, 6 + Math.floor(r() * 5));
    let strokes;
    let type;
    if (roll < 0.14) { type = "reversed";          // arrows from − to +
      strokes = pick.map((l) => wobble(l, 0.05, r).reverse());
    } else if (roll < 0.26) { type = "radial";   // each charge drawn on its own, straight radial lines: they cross between the charges
      strokes = [];
      for (let i = 0; i < 6; i++) {
        const a = (2 * Math.PI * (i + 0.5)) / 6 + (r() - 0.5) * 0.3;
        strokes.push(wobble(radial(CHARGES[0], a, 4 + r() * 2, true), 0.03, r));
        strokes.push(wobble(radial(CHARGES[1], a + Math.PI / 6, 4 + r() * 2, false), 0.03, r));
      }
    } else if (roll < 0.31) { type = "loop";   // a loop drawn around the pair
      strokes = pick.map((l) => wobble(l, 0.05, r));
      const loop = [];
      for (let t = 0; t <= 2 * Math.PI + 0.01; t += 0.05) loop.push([5 + 2.6 * Math.cos(t), 3 + 1.6 * Math.sin(t)]);
      strokes.push(wobble(loop, 0.04, r));
    } else if (roll < 0.37) { type = "axis";   // one straight line along the axis through both charges
      strokes = pick.map((l) => wobble(l, 0.05, r));
      strokes.push(wobble(Array.from({ length: 81 }, (_, j) => [1 + j * 0.1, 3]), 0.01, r));
    } else if (roll < 0.43) { type = "shaky";   // very shaky drawing: the checker cannot tell
      strokes = pick.map((l) => wobble(l, 0.28, r));
    } else { type = "correct"; // correct, with ordinary hand wobble
      strokes = pick.map((l) => wobble(l, 0.03 + r() * 0.05, r));
    }
    strokes = strokes.filter((s) => s.length > 2);
    students.push({ id: "S" + String(k + 1).padStart(2, "0"), type, strokes, result: judge(strokes) });
  }
  return students;
}
