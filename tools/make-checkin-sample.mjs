// Makes the sample class used by the teacher view: 50 SIMULATED students answering the check-in.
// These are not real students. Each simulated answer is drawn from a made-up mix of typical
// behaviours and then marked with the same rules as the real page (public/assets/checkin-judge.js).
//
// Run from the repository root:  node tools/make-checkin-sample.mjs
import { writeFileSync } from "node:fs";
import { judgeVectors, judgePointField, judgeCoulomb, judgeForce, judgeRod, rodFactor, between } from "../public/assets/checkin-judge.js";

const SEED = 20261116, N = 50;
let state = SEED;
const rnd = () => { // mulberry32: the same sample every time
  state |= 0; state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rnd() * list.length)];
const uniform = (a, b) => a + (b - a) * rnd();
const normal = (mean, sd) => mean + sd * Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
/** Choose a behaviour from [[name, weight], ...]. */
const choose = (table) => { let x = rnd() * table.reduce((s, r) => s + r[1], 0); for (const [name, w] of table) { if ((x -= w) < 0) return name; } return table[0][0]; };
const rad = (d) => (d * Math.PI) / 180;
const len = (v) => Math.hypot(v[0], v[1]);
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const turn = (v, d) => [v[0] * Math.cos(rad(d)) - v[1] * Math.sin(rad(d)), v[0] * Math.sin(rad(d)) + v[1] * Math.cos(rad(d))];
const snap = (v) => v.map((n) => Math.round(n * 2) / 2);

function vectors() {
  let A, B;
  for (;;) { // the same rule as the page uses to pick A and B
    A = [pick([-2, -1, 1, 2, 3, 4]), pick([-2, -1, 0, 1, 2, 3])];
    B = [pick([-2, -1, 0, 1, 2, 3, 4]), pick([-2, -1, 1, 2, 3])];
    const ang = between(A, B);
    if (len(A) >= 2 && len(B) >= 2 && len(add(A, B)) >= 2 && ang >= 75 && ang <= 135) break;
  }
  const C = add(A, B), unit = [C[0] / len(C), C[1] / len(C)];
  const how = choose([["right", 0.68], ["addLengths", 0.1], ["one", 0.04], ["difference", 0.05], ["slip", 0.13]]);
  let S;
  if (how === "right") S = C;
  else if (how === "addLengths") S = snap([unit[0] * (len(A) + len(B)), unit[1] * (len(A) + len(B))]);
  else if (how === "one") S = pick([A, B]);
  else if (how === "difference") S = pick([sub(A, B), sub(B, A)]);
  else S = snap(add(C, turn([uniform(0.6, 1.6), 0], uniform(0, 360))));
  return judgeVectors(A, B, S);
}

function pointField() {
  const sign = pick([1, -1]);
  const out = [pick([60, 90, 120]), pick([-15, 0, 15, 165, 180, 195]), pick([240, 270, 300])].map((a) => [sign * Math.cos(rad(a)), sign * Math.sin(rad(a))]);
  const L1 = uniform(0.8, 1.4);
  const how = choose([["right", 0.5], ["half", 0.2], ["same", 0.08], ["reversed", 0.1], ["offLine", 0.05], ["tooShort", 0.03], ["grows", 0.04]]);
  let far = normal(0.25, 0.04), flip = 1, wobble = [normal(0, 4), normal(0, 4), normal(0, 4)];
  if (how === "half") far = normal(0.5, 0.04);
  if (how === "same") far = normal(1, 0.08);
  if (how === "tooShort") far = uniform(0.06, 0.12);
  if (how === "grows") far = uniform(1.5, 2.2);
  if (how === "reversed") { flip = -1; far = pick([normal(0.25, 0.04), normal(0.5, 0.05)]); }
  if (how === "offLine") wobble[pick([0, 1, 2])] = pick([-1, 1]) * uniform(30, 70);
  const lengths = [L1, L1 * Math.max(0.04, far), L1 * normal(1, 0.07)];
  const v = out.map((o, i) => turn([o[0] * flip * lengths[i], o[1] * flip * lengths[i]], wobble[i]));
  return judgePointField(sign, v, out);
}

function coulomb() {
  const r0 = pick([7, 8, 9]);
  const how = choose([["right", 0.38], ["halved", 0.34], ["unchanged", 0.06], ["farther", 0.08], ["closer", 0.14]]);
  let ratio = normal(0.71, 0.02);
  if (how === "halved") ratio = normal(0.5, 0.018);
  if (how === "unchanged") ratio = 1;
  if (how === "farther") ratio = uniform(1.06, 10.3 / r0);
  if (how === "closer") ratio = pick([uniform(0.57, 0.65), uniform(0.77, 0.94)]);
  return judgeCoulomb(r0, Math.round(ratio * r0 * 20) / 20);
}

function force() {
  const phi = pick([0, 30, 60, 120, 150, 180, 210, 240, 300, 330]), e = [Math.cos(rad(phi)), Math.sin(rad(phi))];
  const Lw = uniform(0.7, 1);
  const how = choose([["right", 0.52], ["negativeAlong", 0.2], ["equal", 0.15], ["backwards", 0.05], ["bothReversed", 0.03], ["offLine", 0.05]]);
  let pa = normal(0, 9), na = 180 + normal(0, 9), longer = uniform(1.4, 2.4);
  if (how === "negativeAlong") na = normal(0, 9);
  if (how === "equal") longer = normal(1, 0.08);
  if (how === "backwards") longer = uniform(0.5, 0.75);
  if (how === "bothReversed") { pa = 180 + normal(0, 6); na = normal(0, 6); }
  if (how === "offLine") na = pick([90, -90]) + normal(0, 10);
  // fields at the two particles: different directions, the stronger one about three times the weaker
  const posStronger = phi % 60 === 0, other = turn(e, 50);
  const EP = posStronger ? [e[0] * 3, e[1] * 3] : e, EN = posStronger ? other : [other[0] * 3, other[1] * 3];
  const lp = posStronger ? Lw * longer : Lw, ln = posStronger ? Lw : Lw * longer;
  const up = [EP[0] / len(EP), EP[1] / len(EP)], un = [EN[0] / len(EN), EN[1] / len(EN)];
  return judgeForce(EP, EN, [turn([up[0] * lp, up[1] * lp], pa), turn([un[0] * ln, un[1] * ln], na)]);
}

function rod() {
  const ratio = pick([2, 3]), rb = 5 / ratio, unit = (v) => [v[0] / len(v), v[1] / len(v)];
  const toPiece = unit([-rb, uniform(1.9, 2.3)]), toCentre = [-1, 0], a = Math.min(1.6, rb * 0.55);
  const pulls = [1, -1].map((s) => { const u = unit([-rb, s * 1.6]); return [u[0] * a, u[1] * a]; });
  const sum = add(pulls[0], pulls[1]), k = rodFactor(ratio);
  const one = choose([["right", 0.58], ["centre", 0.27], ["away", 0.05], ["off", 0.1]]);
  const va = one === "right" ? turn(toPiece, normal(0, 3)) : one === "centre" ? turn(toCentre, normal(0, 3)) : one === "away" ? turn([-toPiece[0], -toPiece[1]], normal(0, 5)) : turn(toPiece, pick([-1, 1]) * uniform(15, 40));
  const two = choose([["right", 0.68], ["tilted", 0.12], ["length", 0.2]]);
  const vb = two === "right" ? turn([sum[0] * uniform(0.85, 1.15), sum[1] * uniform(0.85, 1.15)], normal(0, 3)) : two === "tilted" ? turn(sum, pick([-1, 1]) * uniform(15, 35)) : pick([[sum[0] * ((2 * a) / len(sum)) * 1.05 + 0, 0].map((n, i) => (i ? 0 : n)), [sum[0] * 0.5, 0]]);
  const limits = choose([["ok", 0.6], ["zeroL", 0.3], ["mixed", 0.1]]);
  const blanks = {
    dm: choose([["M/L", 0.8], ["M", 0.15], ["ML", 0.05]]),
    dist: choose([["y2+r2", 0.58], ["r2", 0.3], ["y2", 0.12]]),
    factor: choose([["r/root", 0.5], ["1", 0.33], ["y/root", 0.17]]),
    lower: limits === "ok" ? "-L/2" : limits === "zeroL" ? "0" : pick(["-L/2", "0"]),
    upper: limits === "ok" ? "+L/2" : limits === "zeroL" ? "L" : "L",
  };
  const guess = choose([["right", 0.5], ["point", 0.3], ["other", 0.2]]);
  const est = guess === "right" ? normal(k, 0.02) : guess === "point" ? normal(1, 0.015) : uniform(0.2, 1.4);
  return judgeRod({ ratio, toPiece, toCentre, pulls }, { va, vb, blanks, est: Math.round(Math.max(0, Math.min(1.5, est)) * 100) / 100 });
}

const makers = { vectors, pointField, coulomb, force };
const students = [];
for (let i = 1; i <= N; i++) {
  const results = Object.entries(makers).map(([id, make]) => { const r = make(); return { id, ok: r.ok, error: r.error, norm: r.norm }; });
  students.push({ student: i, seconds: Math.round(Math.exp(normal(Math.log(150), 0.35))), results });
}
// the rod question was added later: it draws from its own stream, so the answers above did not change
state = SEED + 5;
for (const s of students) {
  const r = rod();
  s.results.push({ id: "rod", ok: r.ok, error: r.error, norm: r.norm, parts: r.parts });
  s.seconds += Math.round(Math.exp(normal(Math.log(210), 0.3)));
}
makers.rod = rod;

const file = new URL("../public/teacher/checkin-sample.json", import.meta.url);
writeFileSync(file, JSON.stringify({ note: "SIMULATED data, not real students. Made by tools/make-checkin-sample.mjs.", seed: SEED, students }) + "\n");
for (const id of Object.keys(makers)) {
  const right = students.filter((s) => s.results.find((r) => r.id === id).ok).length;
  console.log(id.padEnd(12), `${right} of ${N} correct`);
}
