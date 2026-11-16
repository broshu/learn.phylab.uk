// learn.phylab.uk — marking rules for the interactive check-in.
// Pure functions: the check-in page, the sample-data generator and the teacher view all use these,
// so an answer is always classified the same way.
//
// Each function returns { ok, error, data, norm }:
//   error — a short description of what the student did (null when correct)
//   data  — the numbers kept for the record
//   norm  — the answer in a common frame, so that answers to differently numbered
//           versions of the question can be drawn on top of each other

const deg = (r) => (r * 180) / Math.PI;
const len = (v) => Math.hypot(v[0], v[1]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const round = (n, d = 2) => +n.toFixed(d);
/** Angle between two vectors, 0 to 180 degrees. */
export const between = (a, b) => deg(Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (len(a) * len(b))))));
/** Signed angle from vector a to vector b, -180 to 180 degrees (anticlockwise positive). */
export const signedAngle = (a, b) => deg(Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]));

export const LIMITS = {
  vectors: { angle: 10, lengthLow: 0.85, lengthHigh: 1.15 },
  pointField: { angle: 15, farLow: 0.15, farHigh: 0.4, sameLow: 0.75, sameHigh: 1.33 },
  coulomb: { low: 0.66, high: 0.76 },
  force: { angle: 20, lengthLow: 0.6, lengthHigh: 1.67 },
};

/** 1 · sum of vectors A and B; S is what the student drew. */
export function judgeVectors(A, B, S) {
  const L = LIMITS.vectors, C = add(A, B);
  const angle = between(S, C), ratio = len(S) / len(C);
  const ok = angle <= L.angle && ratio >= L.lengthLow && ratio <= L.lengthHigh;
  let error = null;
  if (!ok) {
    const near = (p) => len(sub(S, p)) < 0.6;
    if (near(A) || near(B)) error = "Drew one of the two vectors again";
    else if (near(sub(A, B)) || near(sub(B, A))) error = "Drew the difference, not the sum";
    else if (Math.abs(len(S) - (len(A) + len(B))) < 0.1 * (len(A) + len(B))) error = "Added the two lengths";
    else if (angle <= L.angle) error = "Direction right, length wrong";
    else if (ratio >= L.lengthLow && ratio <= L.lengthHigh) error = "Length right, direction wrong";
    else error = "Direction and length both off";
  }
  // common frame: the correct sum becomes the unit vector along +x
  const a = signedAngle(C, S) * (Math.PI / 180);
  return {
    ok, error,
    data: { A, B, drawn: S.map((n) => round(n)), angleOffDegrees: round(angle, 1), lengthRatio: round(ratio) },
    norm: { u: round(ratio * Math.cos(a), 3), v: round(ratio * Math.sin(a), 3) },
  };
}

/** 2 · field of one point charge at three points; v = the student's three arrows, out = the correct unit directions. */
export function judgePointField(sign, v, out) {
  const L = LIMITS.pointField;
  const off = v.map((x, i) => between(x, out[i]));
  const lengths = v.map(len), far = lengths[1] / lengths[0], same = lengths[2] / lengths[0];
  const dirOk = off.every((a) => a <= L.angle), farOk = far >= L.farLow && far <= L.farHigh, sameOk = same >= L.sameLow && same <= L.sameHigh;
  const ok = dirOk && farOk && sameOk;
  let error = null;
  if (!ok) {
    if (off.every((a) => a >= 180 - L.angle)) error = "All three arrows point the wrong way for this sign of charge";
    else if (!dirOk) error = "Arrows not along the line to the charge";
    else if (!sameOk) error = "Different lengths at the same distance";
    else if (far > L.farHigh && far <= 0.65) error = "At twice the distance, drawn about half as long (should be a quarter)";
    else if (far > 0.65 && far <= 1.25) error = "At twice the distance, drawn about the same length";
    else if (far > 1.25) error = "Drawn stronger farther from the charge";
    else error = "At twice the distance, drawn too short";
  }
  return {
    ok, error,
    data: { sign, directionOffDegrees: off.map((a) => round(a, 0)), lengthAtTwiceDistance: round(far), lengthAtSameDistance: round(same) },
    // angle from the correct direction, and length relative to the student's own arrow at point 1
    norm: { arrows: v.map((x, i) => ({ a: round(signedAngle(out[i], x), 1), l: round(lengths[i] / lengths[0], 3) })) },
  };
}

/** 3 · Coulomb's law: one sphere has lost half its charge; r0 = distance before, r = distance chosen. */
export function judgeCoulomb(r0, r) {
  const L = LIMITS.coulomb, ratio = r / r0, force = 0.5 / (ratio * ratio);
  const ok = ratio >= L.low && ratio <= L.high;
  let error = null;
  if (!ok) {
    if (ratio >= 0.45 && ratio <= 0.56) error = "Halved the distance (the force would be 2F)";
    else if (ratio >= 0.97 && ratio <= 1.03) error = "Left the sphere where it was (the force would be F/2)";
    else if (ratio > 1.03) error = "Moved the sphere farther away";
    else if (ratio < 0.45) error = "Moved the sphere much too close";
    else error = "Moved closer, but not to the right distance";
  }
  return {
    ok, error, force,
    data: { distanceBefore: r0, distanceNow: round(r), distanceRatio: round(ratio), forceInUnitsOfF: round(force) },
    norm: { ratio: round(ratio, 3) },
  };
}

/** 4 · force on a proton and an electron; e = unit vector of the field, v = [arrow on proton, arrow on electron]. */
export function judgeForce(phi, e, v) {
  const L = LIMITS.force, flip = 180 - L.angle;
  const proton = between(v[0], e), electron = between(v[1], [-e[0], -e[1]]), ratio = len(v[1]) / len(v[0]);
  const lengthOk = ratio >= L.lengthLow && ratio <= L.lengthHigh;
  const ok = proton <= L.angle && electron <= L.angle && lengthOk;
  let error = null;
  if (!ok) {
    if (proton <= L.angle && electron >= flip) error = "Force on the electron drawn along the field (should be opposite)";
    else if (proton >= flip && electron <= L.angle) error = "Force on the proton drawn against the field";
    else if (proton >= flip && electron >= flip) error = "Both forces reversed";
    else if (proton <= L.angle && electron <= L.angle) error = ratio < L.lengthLow ? "Force on the electron drawn much smaller than on the proton" : "Force on the electron drawn much larger than on the proton";
    else error = "A force not along the line of the field";
  }
  return {
    ok, error,
    data: { fieldDirectionDegrees: phi, protonOffDegrees: round(proton, 0), electronOffDegrees: round(electron, 0), electronToProtonLength: round(ratio) },
    // angles measured from the field direction; lengths relative to the arrow on the proton
    norm: { proton: { a: round(signedAngle(e, v[0]), 1), l: 1 }, electron: { a: round(signedAngle(e, v[1]), 1), l: round(ratio, 3) } },
  };
}
