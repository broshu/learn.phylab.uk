// learn.phylab.uk — trial of an interactive check-in: four questions answered by dragging.
// Each question tests something learned before this lesson (vectors; Chapter 22).
import { Board, arrow, symbol, charge, INK, SOFT, MINE, RIGHT } from "/assets/board.js";
import { judgeVectors, judgePointField, judgeCoulomb, judgeForce } from "/assets/checkin-judge.js";

const $ = (id) => document.getElementById(id);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const len = (v) => Math.hypot(v[0], v[1]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
/** Angle between two vectors, in degrees (0 to 180). */
const between = (a, b) => deg(Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (len(a) * len(b))))));
const STORE = "learn.phylab.uk/checkin-trial/v1";
const M = (s) => `<math>${s}</math>`;
const V = (l) => M(`<mover><mi>${l}</mi><mo>&#x2192;</mo></mover>`);
const draw = (b, ctx, from, to, color, width, dash) => arrow(ctx, ...b.px(...from), ...b.px(...to), color, width, dash);

// ---------- 1 · adding two vectors ----------
function vectorSum() {
  const O = [4, 3];
  let A, B;
  for (;;) {
    A = [pick([-2, -1, 1, 2, 3, 4]), pick([-2, -1, 0, 1, 2, 3])];
    B = [pick([-2, -1, 0, 1, 2, 3, 4]), pick([-2, -1, 1, 2, 3])];
    const S = add(A, B), inside = (p) => p[0] >= 1 && p[0] <= 11 && p[1] >= 1 && p[1] <= 6;
    if (len(A) < 2 || len(B) < 2 || len(S) < 2) continue;
    const ang = between(A, B);
    if (ang < 75 || ang > 135) continue;
    if (![add(O, A), add(O, B), add(O, S)].every(inside)) continue;
    break;
  }
  const C = add(A, B);
  let tip;
  return {
    id: "vectors", topic: "Adding vectors", w: 12, h: 7, grid: true,
    prompt: `Vectors ${V("A")} and ${V("B")} start from the same point. Drag from that point to draw their sum, ${V("A")} + ${V("B")}.`,
    setup(b) { tip = b.addHandle({ x: O[0], y: O[1], snap: 0.5 }); },
    paint(b, ctx, review) {
      draw(b, ctx, O, add(O, A), INK, 3); draw(b, ctx, O, add(O, B), INK, 3);
      const lab = (v, t) => { const u = [v[0] / len(v), v[1] / len(v)]; const [x, y] = b.px(O[0] + v[0] + u[0] * 0.4, O[1] + v[1] + u[1] * 0.4); symbol(ctx, [{ t, vec: true }], x, y + 6); };
      lab(A, "A"); lab(B, "B");
      if (review) {
        draw(b, ctx, add(O, A), add(O, C), SOFT, 2, [5, 5]); // B moved to the tip of A
        draw(b, ctx, O, add(O, C), RIGHT, 3.5);
      }
      const S = sub([tip.x, tip.y], O);
      if (len(S) > 0.2) draw(b, ctx, O, [tip.x, tip.y], MINE, 3.5);
      const [ox, oy] = b.px(...O); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ox, oy, 4, 0, 7); ctx.fill();
    },
    solve() { tip.x = O[0] + C[0]; tip.y = O[1] + C[1]; tip.touched = true; },
    ready: () => len(sub([tip.x, tip.y], O)) > 0.4,
    judge: () => judgeVectors(A, B, sub([tip.x, tip.y], O)),
    review: () => `<p>Vectors add component by component: add the horizontal parts, then add the vertical parts. On a drawing, slide ${V("B")} so that it starts at the tip of ${V("A")}; the sum runs from the start of ${V("A")} to the tip of the moved ${V("B")}.</p>
      <p>The length of the sum is not the two lengths added together, unless the vectors point the same way.</p>`,
    legend: "Dashed: B moved to the tip of A.",
  };
}

// ---------- 2 · the field of one point charge ----------
function pointChargeField() {
  const C = [6, 3.5], r = 1.5, sign = pick([1, -1]);
  const at = (a, d) => [C[0] + d * Math.cos(rad(a)), C[1] + d * Math.sin(rad(a))];
  const P = [at(pick([60, 90, 120]), r), at(pick([-15, 0, 15, 165, 180, 195]), 2 * r), at(pick([240, 270, 300]), r)];
  const out = P.map((p) => { const v = sub(p, C); return [(sign * v[0]) / len(v), (sign * v[1]) / len(v)]; });
  let tips;
  return {
    id: "pointField", topic: "The electric field of a point charge", w: 12, h: 7, grid: false,
    prompt: `A ${sign > 0 ? "positive" : "negative"} point charge. Points 1 and 3 are the same distance ${M("<mi>r</mi>")} from it; point 2 is twice as far away. At each point, drag out an arrow for the electric field there. Both the direction and the relative lengths of your three arrows count.`,
    setup(b) { tips = P.map((p) => b.addHandle({ x: p[0], y: p[1] })); },
    paint(b, ctx, review) {
      const [cx, cy] = b.px(...C);
      ctx.save(); ctx.strokeStyle = "#cfd5df"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
      for (const p of [P[0], P[1]]) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(...b.px(...p)); ctx.stroke(); }
      ctx.restore();
      const mid = (p, t, off) => { const [x, y] = b.px((C[0] + p[0]) / 2, (C[1] + p[1]) / 2); symbol(ctx, t, x + off[0], y + off[1], SOFT, 16); };
      mid(P[0], [{ t: "r" }], [14, 4]); mid(P[1], [{ t: "2", plain: true }, { t: "r" }], [0, -10]);
      charge(ctx, cx, cy, sign, 15);
      P.forEach((p, i) => {
        const [x, y] = b.px(...p);
        if (review) { const L = Math.max(0.8, Math.min(1.3, len(sub([tips[0].x, tips[0].y], P[0])) || 1.2)) * (i === 1 ? 0.25 : 1); draw(b, ctx, p, [p[0] + out[i][0] * L, p[1] + out[i][1] * L], RIGHT, 3.5); }
        if (len(sub([tips[i].x, tips[i].y], p)) > 0.1) draw(b, ctx, p, [tips[i].x, tips[i].y], MINE, 3.5);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill();
        ctx.font = "600 14px -apple-system, Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const side = sub(p, C), n = len(side);
        ctx.fillText(String(i + 1), x - (side[1] / n) * 18, y - (side[0] / n) * 18);
      });
    },
    solve() { tips.forEach((t, i) => { const L = i === 1 ? 0.3 : 1.2; t.x = P[i][0] + out[i][0] * L; t.y = P[i][1] + out[i][1] * L; }); },
    ready: () => tips.every((t, i) => len(sub([t.x, t.y], P[i])) > 0.12),
    judge: () => judgePointField(sign, tips.map((t, i) => sub([t.x, t.y], P[i])), out),
    review: () => `<p>The electric field of a point charge points straight away from a positive charge and straight toward a negative charge. Its strength depends only on the distance from the charge:</p>
      <math display="block"><mi>E</mi><mo>=</mo><mfrac><mn>1</mn><mrow><mn>4</mn><mi>&#x3C0;</mi><msub><mi>&#x3B5;</mi><mn>0</mn></msub></mrow></mfrac><mfrac><mrow><mo>|</mo><mi>q</mi><mo>|</mo></mrow><msup><mi>r</mi><mn>2</mn></msup></mfrac></math>
      <p>So two points at the same distance have fields of the same strength, and at twice the distance the field is one quarter as strong.</p>`,
  };
}

// ---------- 3 · Coulomb's law ----------
function coulomb() {
  const r0 = pick([7, 8, 9]), ax = 1.1, yBefore = 4.4, yNow = 2.2, target = r0 / Math.SQRT2;
  let B;
  return {
    id: "coulomb", topic: "Coulomb's law", w: 12, h: 6, grid: false,
    prompt: `Two positively charged spheres, A and B, repel each other with a force of magnitude ${M("<mi>F</mi>")}. Sphere B then loses half of its charge. Drag sphere B to where the force between the spheres has magnitude ${M("<mi>F</mi>")} again. The new force is not shown until you submit.`,
    setup(b) { B = b.addHandle({ x: ax + r0, y: yNow, show: false, limit: (x) => [Math.max(ax + 1.2, Math.min(11.4, x)), yNow] }); },
    paint(b, ctx, review) {
      const text = (t, x, y, color = SOFT, align = "left") => { const [px, py] = b.px(x, y); ctx.fillStyle = color; ctx.font = "600 13px -apple-system, Arial, sans-serif"; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillText(t, px, py); };
      const name = (t, x, y) => { const [px, py] = b.px(x, y); symbol(ctx, [{ t, plain: true }], px, py - 22, INK, 16); };
      // before
      text("BEFORE", 0.3, 5.6);
      draw(b, ctx, [ax, yBefore], [ax - 1.1, yBefore], SOFT, 3); draw(b, ctx, [ax + r0, yBefore], [ax + r0 + 1.1, yBefore], SOFT, 3);
      symbol(ctx, [{ t: "F" }], ...((p) => [p[0], p[1] - 10])(b.px(ax - 0.8, yBefore)), SOFT, 16);
      symbol(ctx, [{ t: "F" }], ...((p) => [p[0], p[1] - 10])(b.px(ax + r0 + 0.8, yBefore)), SOFT, 16);
      charge(ctx, ...b.px(ax, yBefore), 1, 15); charge(ctx, ...b.px(ax + r0, yBefore), 1, 15);
      name("A", ax, yBefore); name("B", ax + r0, yBefore);
      // now
      text("NOW: B HAS HALF ITS CHARGE", 0.3, 3.35);
      charge(ctx, ...b.px(ax, yNow), 1, 15); name("A", ax, yNow);
      if (review) {
        const [gx, gy] = b.px(ax + target, yNow);
        ctx.save(); ctx.strokeStyle = RIGHT; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(gx, gy, 17, 0, 7); ctx.stroke(); ctx.restore();
        text(`${target.toFixed(1)} cm`, ax + target, yNow - 0.55, RIGHT, "center");
      }
      const [bx, by] = b.px(B.x, B.y);
      if (!b.locked) { ctx.fillStyle = "rgba(217,130,0,0.16)"; ctx.strokeStyle = MINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 21, 0, 7); ctx.fill(); ctx.stroke(); }
      charge(ctx, bx, by, 1, 12); name("B", B.x, B.y);
      // ruler, measured from the centre of A
      const ry = 0.9;
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(...b.px(ax, ry)); ctx.lineTo(...b.px(ax + 10, ry));
      for (let i = 0; i <= 10; i++) { const [x, y] = b.px(ax + i, ry); ctx.moveTo(x, y); ctx.lineTo(x, y + (i % 5 === 0 ? 10 : 6)); }
      ctx.stroke();
      for (let i = 0; i <= 10; i += 1) text(String(i), ax + i, ry - 0.42, INK, "center");
      text("cm", ax + 10.5, ry - 0.42, INK, "center");
    },
    readout: () => `Distance between the centres now: ${(B.x - ax).toFixed(1)} cm  ·  before: ${r0.toFixed(1)} cm`,
    solve() { B.x = ax + target; B.touched = true; },
    ready: () => B.touched,
    judge: () => judgeCoulomb(r0, B.x - ax),
    review: (res) => `<p>At the distance you chose, the force would be about ${M(`<mn>${res.force.toFixed(1)}</mn><mi>F</mi>`)}.</p>
      <math display="block"><mi>F</mi><mo>=</mo><mfrac><mn>1</mn><mrow><mn>4</mn><mi>&#x3C0;</mi><msub><mi>&#x3B5;</mi><mn>0</mn></msub></mrow></mfrac><mfrac><mrow><mo>|</mo><msub><mi>q</mi><mtext>A</mtext></msub><mo>|</mo><mo>|</mo><msub><mi>q</mi><mtext>B</mtext></msub><mo>|</mo></mrow><msup><mi>r</mi><mn>2</mn></msup></mfrac></math>
      <p>Halving one charge halves the force. To bring the force back, ${M("<msup><mi>r</mi><mn>2</mn></msup>")} must also be halved, so the distance has to become ${M('<mstyle displaystyle="true"><mfrac><mi>r</mi><msqrt><mn>2</mn></msqrt></mfrac></mstyle>')}, about 0.71 of what it was. Halving the distance would be too much: that makes the force four times larger, not two.</p>`,
  };
}

// ---------- 4 · force on a charge in a field ----------
function forceInField() {
  const phi = pick([0, 30, 60, 120, 150, 180, 210, 240, 300, 330]);
  const e = [Math.cos(rad(phi)), Math.sin(rad(phi))];
  const spots = [{ p: [3.4, 2.7], sign: 1, name: "proton" }, { p: [8.6, 2.7], sign: -1, name: "electron" }];
  let tips;
  return {
    id: "force", topic: "Force on a charge in an electric field", w: 12, h: 7, grid: false,
    prompt: `The electric field ${V("E")} is the same at the two marked points; the grey arrows show it. A proton is at one point and an electron at the other. Drag from each particle to draw the electric force on it.`,
    setup(b) { tips = spots.map((s) => b.addHandle({ x: s.p[0], y: s.p[1] })); },
    paint(b, ctx, review) {
      spots.forEach((s, i) => {
        const c = [s.p[0], 5.5], h = 0.9;
        draw(b, ctx, [c[0] - e[0] * h, c[1] - e[1] * h], [c[0] + e[0] * h, c[1] + e[1] * h], SOFT, 4);
        const [lx, ly] = b.px(c[0] - e[1] * 0.45, c[1] + e[0] * 0.45); symbol(ctx, [{ t: "E", vec: true }], lx, ly + 6, SOFT, 17);
        if (review) { const L = Math.max(0.9, Math.min(1.6, len(sub([tips[0].x, tips[0].y], spots[0].p)) || 1.3)); draw(b, ctx, s.p, [s.p[0] + s.sign * e[0] * L, s.p[1] + s.sign * e[1] * L], RIGHT, 3.5); }
        if (len(sub([tips[i].x, tips[i].y], s.p)) > 0.1) draw(b, ctx, s.p, [tips[i].x, tips[i].y], MINE, 3.5);
        const [x, y] = b.px(...s.p);
        charge(ctx, x, y, s.sign, 11);
        ctx.fillStyle = INK; ctx.font = "600 14px -apple-system, Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(s.name, x, b.px(0, 0.45)[1]);
      });
    },
    solve() { tips.forEach((t, i) => { t.x = spots[i].p[0] + spots[i].sign * e[0] * 1.3; t.y = spots[i].p[1] + spots[i].sign * e[1] * 1.3; }); },
    ready: () => tips.every((t, i) => len(sub([t.x, t.y], spots[i].p)) > 0.25),
    judge: () => judgeForce(phi, e, tips.map((t, i) => sub([t.x, t.y], spots[i].p))),
    review: () => `<p>A charge ${M("<mi>q</mi>")} at a point where the field is ${V("E")} feels the force</p>
      <math display="block"><mover><mi>F</mi><mo>&#x2192;</mo></mover><mo>=</mo><mi>q</mi><mover><mi>E</mi><mo>&#x2192;</mo></mover></math>
      <p>For a positive charge the force is along the field; for a negative charge it is opposite to the field. A proton and an electron carry charges of the same size, so in the same field the two forces are equally strong.</p>`,
  };
}

// ---------- the page ----------
let items = [], results = null, startedAt = Date.now();

function build() {
  results = null; startedAt = Date.now();
  items = [vectorSum(), pointChargeField(), coulomb(), forceInField()];
  $("items").innerHTML = items.map((it, i) => `
    <div class="card q" id="q-${it.id}">
      <p class="stem"><span class="n">${i + 1}.</span>${it.prompt}</p>
      <div class="fieldbox"><canvas id="cv-${it.id}"></canvas></div>
      <div class="readout" id="ro-${it.id}"></div>
    </div>`).join("");
  items.forEach((it) => {
    it.board = new Board($("cv-" + it.id), {
      w: it.w, h: it.h, grid: it.grid,
      onChange: () => { if (it.readout) $("ro-" + it.id).textContent = it.readout(); check(); },
    });
    it.setup(it.board); // the handles must exist before the first paint
    it.board.paint = (b, ctx) => it.paint(b, ctx, false);
    it.board.draw();
    if (it.readout) $("ro-" + it.id).textContent = it.readout();
  });
  $("result").innerHTML = ""; $("recorded").innerHTML = "";
  $("submit").hidden = false; $("again").hidden = true;
  check();
}

function check() {
  const left = items.filter((it) => !it.ready()).length;
  $("submit").disabled = left > 0;
  $("left").textContent = left ? `${left} question${left === 1 ? "" : "s"} still to answer` : "";
}

function submit() {
  results = items.map((it) => ({ it, ...it.judge() }));
  items.forEach((it) => { it.board.locked = true; it.board.draw(); });
  try { // keep the submission in this browser, so the teacher view can show it next to the sample class
    const all = JSON.parse(localStorage.getItem(STORE) || "[]");
    all.push({ t: Date.now(), seconds: Math.round((Date.now() - startedAt) / 1000), results: results.map((r) => ({ id: r.it.id, ok: r.ok, error: r.error, norm: r.norm })) });
    localStorage.setItem(STORE, JSON.stringify(all.slice(-20)));
  } catch { /* storage unavailable */ }
  const right = results.filter((r) => r.ok).length, missed = results.filter((r) => !r.ok);
  $("result").innerHTML = `
    <div class="card">
      <p class="score">You answered ${right} of ${items.length} correctly.</p>
      <p class="muted" style="margin:0">${missed.length ? "Read the refresher" + (missed.length > 1 ? "s" : "") + " below. Orange is what you drew; green is the answer." : "You have what this lesson builds on."}</p>
    </div>
    ${missed.map((r) => `
      <div class="card review">
        <span class="tag">Refresher</span><h3>${r.it.topic}</h3>
        ${r.it.review(r)}
        <div class="fieldbox"><canvas id="rv-${r.it.id}"></canvas></div>
        ${r.it.legend ? `<p class="cap">${r.it.legend}</p>` : ""}
      </div>`).join("")}`;
  missed.forEach((r) => {
    const b = new Board($("rv-" + r.it.id), { w: r.it.w, h: r.it.h, grid: r.it.grid, paint: (bd, ctx) => r.it.paint(bd, ctx, true) });
    b.locked = true; b.draw();
  });
  $("recorded").innerHTML = `
    <details open><summary>For the reviewer: what would be recorded</summary>
    <table class="rec">
      <tr><th>Question</th><th>Result</th><th>What the student did</th><th>Numbers kept</th></tr>
      ${results.map((r) => `<tr><td>${r.it.topic}</td><td>${r.ok ? "Correct" : "Not correct"}</td><td>${r.ok ? "—" : r.error}</td><td><code>${JSON.stringify(r.data).replace(/[{}"]/g, "").replace(/,/g, ", ").replace(/:/g, ": ")}</code></td></tr>`).join("")}
    </table>
    <p class="cap">This submission now also appears in the <a href="/teacher/">teacher view</a>, next to the sample class.</p></details>`;
  $("submit").hidden = true; $("again").hidden = false; $("left").textContent = "";
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("submit").addEventListener("click", submit);
$("again").addEventListener("click", () => { build(); window.scrollTo(0, 0); });
// reviewer only: fill in a correct answer everywhere, to see the all-correct result
$("fill").addEventListener("click", () => {
  if (results) return;
  items.forEach((it) => { it.solve(); it.board.draw(); if (it.readout) $("ro-" + it.id).textContent = it.readout(); });
  check();
});
build();
