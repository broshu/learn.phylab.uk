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
  // Kept generous on purpose: answers are dragged freehand, with a mouse or a finger on a phone.
  vectors: { angle: 15, lengthLow: 0.8, lengthHigh: 1.2 },
  // far point: the arrow only has to be less than half as long as at the near point
  pointField: { angle: 20, farHigh: 0.5, sameLow: 0.6, sameHigh: 1.67 },
  coulomb: { low: 0.62, high: 0.8 },
  // the force where the field is clearly stronger only has to be drawn clearly longer
  force: { angle: 30, longer: 1.25 },
  rod: { angle: 15, sumLow: 0.6, sumHigh: 1.5, ratio: 0.08 },
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
  const dirOk = off.every((a) => a <= L.angle), farOk = far < L.farHigh, sameOk = same >= L.sameLow && same <= L.sameHigh;
  const ok = dirOk && farOk && sameOk;
  let error = null;
  if (!ok) {
    if (off.every((a) => a >= 180 - L.angle)) error = "All three arrows point the wrong way for this sign of charge";
    else if (!dirOk) error = "Arrows not along the line to the charge";
    else if (!sameOk) error = "Different lengths at the same distance";
    else if (far <= 0.8) error = "At twice the distance, drawn shorter but still half as long or more (should be a quarter)";
    else if (far <= 1.25) error = "At twice the distance, drawn about the same length";
    else error = "Drawn stronger farther from the charge";
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

/**
 * 4 · forces on a positive and a negative charge (same size of charge) at two points of a field that varies.
 * EP, EN: the field at the positive and at the negative charge; v = [arrow on the positive, arrow on the negative].
 */
export function judgeForce(EP, EN, v) {
  const L = LIMITS.force, flip = 180 - L.angle;
  const pos = between(v[0], EP), neg = between(v[1], [-EN[0], -EN[1]]);
  const posStronger = len(EP) > len(EN);
  const ratio = posStronger ? len(v[0]) / len(v[1]) : len(v[1]) / len(v[0]); // drawn force where the field is stronger ÷ where it is weaker
  const dirOk = pos <= L.angle && neg <= L.angle;
  const ok = dirOk && ratio >= L.longer;
  let error = null;
  if (!ok) {
    if (pos <= L.angle && neg >= flip) error = "Force on the negative charge drawn along the field (should be opposite)";
    else if (pos >= flip && neg <= L.angle) error = "Force on the positive charge drawn against the field";
    else if (pos >= flip && neg >= flip) error = "Both forces reversed";
    else if (!dirOk) error = "A force not along the field at that point";
    else if (ratio < 1 / L.longer) error = "Larger force drawn where the field is weaker";
    else error = "The two forces drawn about equally strong, although the field strengths differ";
  }
  // common frame: each arrow turned so that its correct direction is +x; length 1 where the field is weaker
  const aPos = signedAngle(EP, v[0]), aNeg = signedAngle([-EN[0], -EN[1]], v[1]);
  return {
    ok, error,
    data: { fieldStrengthRatio: round(Math.max(len(EP), len(EN)) / Math.min(len(EP), len(EN)), 1), strongerFieldAt: posStronger ? "positive charge" : "negative charge", positiveOffDegrees: round(pos, 0), negativeOffDegrees: round(neg, 0), strongerToWeakerLength: round(ratio) },
    norm: { weak: { a: round(posStronger ? aNeg : aPos, 1), l: 1 }, strong: { a: round(posStronger ? aPos : aNeg, 1), l: round(ratio, 3) } },
  };
}

/** The cards that belong in the five blanks of the rod integral. */
export const ROD_KEY = { dm: "M/L", dist: "y2+r2", factor: "r/root", lower: "-L/2", upper: "+L/2" };
/** True force on the ball divided by the force if the whole rod sat at its centre; ratio = L / r. */
export const rodFactor = (ratio) => 1 / Math.sqrt(1 + (ratio / 2) ** 2);

/**
 * 5 · gravitational pull of a thin rod on a ball in its bisecting plane (the gravity twin of the charged rod).
 * p: { ratio (L / r), toPiece, toCentre (directions from the ball), pulls: [f1, f2] (the two given pulls) }
 * a: { va (pull of one piece), vb (sum of the two pulls), blanks: { dm, dist, factor, lower, upper }, est }
 */
export function judgeRod(p, a) {
  const L = LIMITS.rod, parts = {}, skip = () => ({ ok: false, error: "Not answered", skipped: true });
  // one piece
  let offPiece = null;
  if (!a.va) parts.piece = skip();
  else {
    offPiece = between(a.va, p.toPiece);
    parts.piece = { ok: offPiece <= L.angle, error: null };
    if (!parts.piece.ok) parts.piece.error = between(a.va, p.toCentre) <= L.angle ? "Pull of one piece drawn toward the centre of the rod, not toward the piece"
      : between(a.va, [-p.toPiece[0], -p.toPiece[1]]) <= 25 ? "Pull drawn away from the rod" : "Pull of one piece not drawn toward that piece";
  }
  // two symmetric pieces
  const sum = add(p.pulls[0], p.pulls[1]);
  let sumOff = null, sumRatio = null;
  if (!a.vb) parts.pair = skip();
  else {
    sumOff = between(a.vb, sum); sumRatio = len(a.vb) / len(sum);
    parts.pair = { ok: sumOff <= L.angle && sumRatio >= L.sumLow && sumRatio <= L.sumHigh, error: null };
    if (!parts.pair.ok) parts.pair.error = sumOff > L.angle ? "Sum of the two pulls not straight toward the rod" : "Sum of the two pulls: direction right, length wrong";
  }
  // the integral
  const keys = Object.keys(ROD_KEY), filled = keys.filter((k) => a.blanks[k]).length;
  if (!filled) parts.integral = skip();
  else {
    const wrong = keys.filter((k) => a.blanks[k] !== ROD_KEY[k]);
    parts.integral = { ok: wrong.length === 0, error: null };
    if (wrong.length) parts.integral.error = a.blanks.dist === "r2" ? "Integral: used the distance to the centre for every piece"
      : a.blanks.factor === "1" ? "Integral: left out the factor for the part of the pull that points at the rod"
      : a.blanks.lower === "0" && a.blanks.upper === "L" ? "Integral: limits 0 to L instead of −L/2 to +L/2"
      : a.blanks.dm && a.blanks.dm !== ROD_KEY.dm ? "Integral: mass of a small piece not written as (M/L) dy"
      : filled < keys.length ? "Integral: not every box filled" : "Integral: set up incorrectly";
  }
  // the ratio
  const k = rodFactor(p.ratio);
  if (a.est == null) parts.ratio = skip();
  else {
    parts.ratio = { ok: Math.abs(a.est - k) <= L.ratio, error: null };
    if (!parts.ratio.ok) parts.ratio.error = Math.abs(a.est - 1) <= 0.05 ? "Ratio: treated the rod as a point mass at its centre"
      : a.est > 1.05 ? "Ratio: force larger than for a point mass" : "Ratio: miscalculated";
  }

  const all = Object.values(parts), wrongPart = all.find((x) => !x.ok && !x.skipped), skipped = all.every((x) => x.skipped);
  const turn = a.vb ? signedAngle(sum, a.vb) * (Math.PI / 180) : 0;
  return {
    ok: all.every((x) => x.ok), skipped, parts,
    error: skipped ? "Not answered" : wrongPart ? wrongPart.error : all.some((x) => x.skipped) ? "Not every part answered" : null,
    data: { rodLengthOverDistance: p.ratio, pieceArrowOffDegrees: offPiece == null ? null : round(offPiece, 0), sumOffDegrees: sumOff == null ? null : round(sumOff, 0), blanks: a.blanks, ratioGiven: a.est == null ? null : round(a.est), ratioCorrect: round(k) },
    // t: 0 = aimed at the centre of the rod, 1 = aimed at the piece; pair: tip of the sum with the correct sum as the unit vector
    norm: {
      t: a.va ? round(signedAngle(p.toCentre, a.va) / signedAngle(p.toCentre, p.toPiece), 3) : null,
      away: a.va ? Math.abs(signedAngle(p.toCentre, a.va)) > 90 : false,
      pair: a.vb ? { u: round(sumRatio * Math.cos(turn), 3), v: round(sumRatio * Math.sin(turn), 3) } : null,
      blanks: a.blanks, est: a.est == null ? null : round(a.est, 3), correct: round(k, 3),
    },
  };
}
