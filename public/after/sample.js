// learn.phylab.uk — After class: a simulated class of 50 students, until real class data exists.
// Every simulated answer is marked by the same code as a real student's (model.js), so the teacher's
// pictures match what students see.
import { judgeTeach, judgeHunt, judgeDistance, judgeRange, axisField, RANGE, RANGE_SIDE } from "/after/model.js";

function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
const rad = (d) => (d * Math.PI) / 180;

export function makeClass(n = 50, seed = 41) {
  const r = rng(seed);
  const span = (a, b) => a + (b - a) * r();
  const sign = () => (r() < 0.5 ? -1 : 1);
  const polar = (len, angle) => [len * Math.cos(angle), len * Math.sin(angle)];
  const students = [];

  for (let k = 0; k < n; k++) {
    // step 1: three arrows around the shrimp
    const lenA = span(1.4, 3);
    const A = polar(lenA, r() < 0.9 ? rad(span(-15, 15)) : rad(180 + span(-15, 15)));
    const b = r();
    const B = polar(span(0.8, 2), b < 0.62 ? rad(180 + span(-18, 18)) : b < 0.82 ? rad(90 + span(-15, 15)) : b < 0.94 ? rad(span(-15, 15)) : rad(span(0, 360)));
    const C = polar(lenA * (r() < 0.76 ? span(0.15, 0.45) : span(0.65, 1.1)), r() < 0.8 ? rad(span(-15, 15)) : rad(180 + span(-15, 15)));
    const v = { A, B, C };
    const teach = { v, result: judgeTeach(v), help: r() < 0.42, ring: r() < 0.88 };

    // step 2, part 1: the first guess, seen from the real shrimp
    const h = r();
    let guess;
    if (h < 0.46) guess = { d: span(0, 1), a: sign() * span(0, 38) };
    else if (h < 0.68) guess = { d: span(0, 1), a: 180 + span(-30, 30) };
    else if (h < 0.8) guess = { d: span(0, 1), a: sign() * span(60, 120) };
    else guess = { d: span(1.5, 3.2), a: span(0, 360) };
    const [gx, gy] = polar(guess.d, rad(span(0, 360)));
    const first = judgeHunt({ x: gx, y: gy, a: rad(guess.a) }, { x: 0, y: 0, a: 0 });
    const hunt = { first, readings: 3 + Math.floor(r() * 6) };

    // part 2, only for students who found it: settle behind the tail
    let behind = null, dist = null;
    if (first.caught) {
      const b2 = r();
      behind = { kind: b2 < 0.72 ? "ok" : b2 < 0.87 ? "front" : "close", hints: r() < 0.35 ? 1 + Math.floor(r() * 2) : 0 };
    }

    // part 3, only for students who got behind it. Every simulated student settles 4 cm away and reads at 0 and 2 cm backed off.
    if (behind && behind.kind === "ok") {
      const pins = [{ b: 0, E: axisField(4) }, { b: 2, E: axisField(6) }];
      const d = r();
      let ans, used = pins;
      if (d < 0.52) ans = 4 * span(0.9, 1.1);
      else if (d < 0.76) ans = (2 / (Math.sqrt(pins[0].E / pins[1].E) - 1)) * span(0.95, 1.05);
      else if (d < 0.86) ans = 6 * span(0.97, 1.03);
      else if (d < 0.9) { ans = span(6.5, 9); used = [pins[0]]; }
      else ans = 4 * (r() < 0.5 ? span(1.25, 1.36) : span(1.7, 2.3));
      dist = { first: judgeDistance(ans, 4, used) };
    }
    const clean = dist && dist.first.caught;
    const hunts = clean ? 1 : 2 + (r() < 0.4 ? 1 : 0) + (r() < 0.15 ? 1 : 0);

    // optional question
    let range = null;
    if (r() < 0.6) {
      const q = r();
      const a = q < 0.5 ? RANGE * span(0.92, 1.08) : q < 0.78 ? RANGE * 10 ** ([-4, -3, 2, 4][Math.floor(r() * 4)] / 3) : q < 0.92 ? RANGE_SIDE : r() < 0.5 ? 3 : 20;
      range = judgeRange(a);
    }
    students.push({ id: "S" + String(k + 1).padStart(2, "0"), teach, hunt, behind, dist, hunts, range });
  }
  return students;
}
