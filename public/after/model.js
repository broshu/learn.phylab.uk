// learn.phylab.uk — After class: the physics of the platypus hunt and the marking of each task.
// No drawing here, so the same code marks a real student and the simulated class.
//
// The model. A shrimp's tail muscles are treated as an electric dipole: a positive point charge toward the head and
// an equal negative one toward the tail (Knight, Section 23.2). The platypus bill reads the electric field at one point.
// Units: positions in centimetres, field in microvolts per centimetre (1 µV/cm = 10⁻⁴ N/C).

export const KE = 8.99e9;     // 1 / (4 π ε0), N m²/C²
export const P = 3.0e-16;     // C m: dipole moment of the model shrimp (a value chosen for the game)
export const SEP = 1.0;       // cm between the two charges of the model shrimp
export const THRESH = 50;     // µV/cm: weakest field a platypus bill responds to (Scheich et al., Nature 319, 1986)

const ONE = KE * (P / (SEP * 1e-2)) * 1e8;   // field of one of the two charges: ONE / r² (r in cm) gives µV/cm
export const AXIS = 2 * KE * P * 1e10;       // far from the shrimp, on its axis: E = AXIS / r³
export const axisField = (r) => AXIS / r ** 3;
export const RANGE = Math.cbrt(AXIS / THRESH);            // cm: where the on-axis field falls to the threshold
export const RANGE_SIDE = Math.cbrt(AXIS / 2 / THRESH);   // the same beside the shrimp (the field there is half)

export const deg = (r) => (r * 180) / Math.PI;
export const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const off = (v, dir) => Math.abs(deg(wrap(Math.atan2(v[1], v[0]) - dir)));

/** The two charges of a shrimp at (x, y) facing the angle a: + toward the head, − toward the tail. */
export function ends(s) {
  const dx = (SEP / 2) * Math.cos(s.a), dy = (SEP / 2) * Math.sin(s.a);
  return [{ x: s.x + dx, y: s.y + dy, q: 1 }, { x: s.x - dx, y: s.y - dy, q: -1 }];
}
/** Field of each of the two charges at a point: [[Ex, Ey] of +, [Ex, Ey] of −]. */
export function partsAt(s, x, y) {
  return ends(s).map((c) => {
    const dx = x - c.x, dy = y - c.y, r2 = Math.max(dx * dx + dy * dy, 0.04);
    const f = (ONE * c.q) / (r2 * Math.sqrt(r2));
    return [f * dx, f * dy];
  });
}
/** Net field of the shrimp at a point. */
export function fieldAt(s, x, y) {
  const [a, b] = partsAt(s, x, y);
  return [a[0] + b[0], a[1] + b[1]];
}

// ---------- step 1 · mother's lesson ----------
export const TEACH = { W: 12, H: 7, shrimp: { x: 6, y: 3.5, a: 0 }, A: [8, 3.5], B: [6, 5.5], C: [2, 3.5], ring: 2.6 };
export const TEACH_PARTS = [["A", "Direction at A"], ["B", "Direction at B"], ["C", "Direction at C"], ["size", "C much shorter than A"]];

/** v: the arrows drawn at A, B and C, each [dx, dy]. A part is null when its arrow was not drawn. */
export function judgeTeach(v) {
  const L = (k) => Math.hypot(v[k][0], v[k][1]), drawn = (k) => L(k) >= 0.25;
  const parts = {
    A: drawn("A") ? off(v.A, 0) <= 40 : null,
    B: drawn("B") ? off(v.B, Math.PI) <= 40 : null,
    C: drawn("C") ? off(v.C, 0) <= 40 : null,
  };
  parts.size = drawn("A") && drawn("C") ? L("C") <= L("A") / 2 : null; // forgiving: "less than half" counts
  const keys = Object.keys(parts);
  return { parts, answered: keys.filter((k) => parts[k] !== null).length, right: keys.filter((k) => parts[k]).length, all: keys.every((k) => parts[k]) };
}
/** Strongest signal on the circle: on the shrimp's axis, at either end. angle: where the bill is, seen from the shrimp. */
export function judgeRing(angle, shrimpAngle = 0) {
  const d = Math.abs(deg(wrap(angle - shrimpAngle)));
  return Math.min(d, 180 - d) <= 25;
}

// ---------- step 2 · the hunt, part 1: where is the shrimp, and which way does it face ----------
export const HUNT = { W: 14, H: 9, silt: { x0: 4, x1: 10, y0: 2.5, y1: 6.5 }, inset: 0.9, keepOut: 0.3, POS: 1.2, ANG: 45, ROOM: 5.2 };
export const HUNT_KINDS = {
  position: { label: "Wrong place", why: "marked more than 1.2 cm from the shrimp" },
  reversed: { label: "Head and tail swapped", why: "right place, shrimp drawn facing the opposite way" },
  angle: { label: "Wrong heading", why: "right place, heading off by more than 45°" },
};
/** A hidden shrimp somewhere in the silt, with room behind its tail for the platypus to back off. */
export function newTruth(rand = Math.random) {
  const { silt: Z, inset, W, H, ROOM } = HUNT;
  for (;;) {
    const t = { x: Z.x0 + inset + rand() * (Z.x1 - Z.x0 - 2 * inset), y: Z.y0 + inset + rand() * (Z.y1 - Z.y0 - 2 * inset), a: rand() * 2 * Math.PI };
    const bx = t.x - ROOM * Math.cos(t.a), by = t.y - ROOM * Math.sin(t.a);
    if (bx > 0.3 && bx < W - 0.3 && by > 0.3 && by < H - 0.3) return { x: +t.x.toFixed(2), y: +t.y.toFixed(2), a: +t.a.toFixed(3) };
  }
}
/**
 * guess, truth: { x, y, a }. Returns the kind of result and the guess seen from the real shrimp
 * (rel: where the guess is with the real shrimp at the origin facing right; turn: heading error in degrees).
 */
export function judgeHunt(guess, truth) {
  const dx = guess.x - truth.x, dy = guess.y - truth.y, c = Math.cos(-truth.a), s = Math.sin(-truth.a);
  const dist = Math.hypot(dx, dy), turn = deg(wrap(guess.a - truth.a)), t = Math.abs(turn);
  const kind = dist > HUNT.POS ? "position" : t > 135 ? "reversed" : t > HUNT.ANG ? "angle" : "caught";
  return { kind, caught: kind === "caught", dist, turn, rel: [dx * c - dy * s, dx * s + dy * c] };
}

// ---------- step 2 · the hunt, part 2: get behind its tail ----------
export const BEHIND = { CLOSE: 3, AXIS: 15, FRONT: 60, ROOM: 1 };
export const BEHIND_KINDS = {
  close: { label: "Came closer than 3 cm", why: "the shrimp felt the water move", fatal: true },
  front: { label: "Came round to its head", why: "the shrimp saw it coming", fatal: true },
  off: { label: "Not on the axis yet", why: "told to keep looking", fatal: false },
  weak: { label: "Too far to feel it", why: "told to come closer", fatal: false },
  room: { label: "No room to back off", why: "told to settle closer", fatal: false },
};
/** Bill tip at (x, y). Fatal kinds end the hunt; the others are hints. ok: settled on the axis behind the tail. */
export function judgeBehind(x, y, truth) {
  const dx = x - truth.x, dy = y - truth.y, r = Math.hypot(dx, dy);
  const from = Math.atan2(dy, dx);
  const front = Math.abs(deg(wrap(from - truth.a))), back = Math.abs(deg(wrap(from - truth.a - Math.PI)));
  let kind = "ok";
  if (r < BEHIND.CLOSE) kind = "close";
  else if (front <= BEHIND.FRONT) kind = "front";
  else if (back > BEHIND.AXIS) kind = "off";
  else if (Math.hypot(...fieldAt(truth, x, y)) < THRESH) kind = "weak";
  else if (roomBehind(truth, r) < BEHIND.ROOM) kind = "room";
  return { kind, r, back };
}
/** How far the bill can back off along the axis, from r behind the shrimp's centre, before leaving the river. */
export function roomBehind(truth, r) {
  const ux = -Math.cos(truth.a), uy = -Math.sin(truth.a);
  let s = 30;
  if (ux > 1e-6) s = Math.min(s, (HUNT.W - 0.3 - truth.x) / ux); else if (ux < -1e-6) s = Math.min(s, (0.3 - truth.x) / ux);
  if (uy > 1e-6) s = Math.min(s, (HUNT.H - 0.3 - truth.y) / uy); else if (uy < -1e-6) s = Math.min(s, (0.3 - truth.y) / uy);
  return s - r;
}

// ---------- step 2 · the hunt, part 3: how far away is it ----------
export const DIST = { TOL: 0.15 };
export const DIST_KINDS = {
  square: { label: "Used 1/r² (one point charge)", why: "the answer fits an inverse-square field" },
  spot: { label: "Measured from the wrong spot", why: "the answer is the distance from where they backed off to" },
  one: { label: "Only one reading", why: "a single reading cannot give the distance" },
  other: { label: "Other", why: "no pattern recognised" },
};
/** ans, r: the student's and the real distance from the starting spot (cm). pins: readings [{ b: cm backed off, E }]. */
export function judgeDistance(ans, r, pins = []) {
  const ratio = ans / r;
  if (Math.abs(ratio - 1) <= DIST.TOL) return { kind: "caught", caught: true, ratio };
  const spots = [...new Map(pins.map((p) => [p.b, p])).values()].sort((a, b) => a.b - b.b);
  let kind = "other";
  if (spots.length < 2) kind = "one";
  else {
    for (let i = 0; i < spots.length && kind === "other"; i++) for (let j = i + 1; j < spots.length; j++) {
      const d = spots[j].b - spots[i].b;
      const wrong = d / (Math.sqrt(spots[i].E / spots[j].E) - 1) - spots[i].b; // what an inverse-square field would give
      if (wrong > 0 && Math.abs(ans - wrong) / wrong <= 0.08) { kind = "square"; break; }
    }
    if (kind === "other" && spots.some((p) => p.b > 0 && Math.abs(ans - (r + p.b)) / (r + p.b) <= 0.06)) kind = "spot";
  }
  return { kind, caught: false, ratio };
}

// ---------- optional · how far away can a shrimp be felt ----------
export const RANGE_KINDS = {
  units: { label: "Unit conversion", why: "the answer is out by a power of ten" },
  side: { label: "Used the formula for beside the dipole", why: "p/r³ instead of 2p/r³" },
  other: { label: "Other", why: "no pattern recognised" },
};
export function judgeRange(ans) {
  if (!(ans > 0)) return { kind: "other", ok: false };
  if (Math.abs(ans / RANGE - 1) <= 0.15) return { kind: "ok", ok: true };
  if (Math.abs(ans / RANGE_SIDE - 1) <= 0.08) return { kind: "side", ok: false };
  const steps = 3 * Math.log10(ans / RANGE); // a slip of 10ⁿ in the field moves the answer by 10^(n/3)
  if (Math.abs(steps) > 0.5 && Math.abs(steps - Math.round(steps)) <= 0.12) return { kind: "units", ok: false };
  return { kind: "other", ok: false };
}
