// learn.phylab.uk — After class, step 1: the mother platypus teaches how a shrimp's field looks (help allowed).
// Student side: (a) drag the field arrows at three points around a shrimp, (b) find where the signal is strongest.
// Teacher side: every student's arrows in one picture, right and wrong in colour, with statistics.
import { Board, arrow, symbol, INK, SOFT, MINE, POS, NEG } from "/assets/board.js";
import { TEACH, TEACH_PARTS, judgeTeach, judgeRing, fieldAt, partsAt } from "/after/model.js";
import { water, shrimp, bill, reading, label, fmt, M, MD, fr, k4, r3, inv, mum, OK, BAD } from "/after/scene.js";
import { askMother } from "/assets/ask.js";

const PTS = ["A", "B", "C"];
const UNIT = 1.5 / Math.hypot(...fieldAt(TEACH.shrimp, ...TEACH.A)); // board units per µV/cm: the net field at A is 1.5 long
const dot = (b, ctx, p, name) => {
  const [x, y] = b.px(...p);
  ctx.save(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.restore();
  symbol(ctx, [{ t: name, plain: true }], x - 13, y + 22, INK, 17);
};

const WHY = {
  A: `At A you are nearer the + end than the &minus; end, so the push away from + wins. The field at A points away from the shrimp's head.`,
  B: `At B the two charges are equally far away. The parts of their fields that point up and down cancel; what is left points from the + side toward the &minus; side, opposite to the way the shrimp faces.`,
  C: `At C you are nearer the &minus; end, so the pull toward &minus; wins and the field points toward the shrimp. That is the same direction as at A.`,
  size: `C is twice as far from the shrimp as A. A dipole's field falls off like ${inv(3)}, so at C it is about 8 times weaker. The arrow at C should be much shorter than the one at A (less than half is accepted).`,
};

export function startTeach({ student, teacher, rec, cls }) {
  const saved = rec.get("teach") || {};
  const v = saved.v || { A: [0, 0], B: [0, 0], C: [0, 0] };
  let result = saved.checked ? judgeTeach(v) : null;
  let help = false, helped = !!saved.helped;
  const ring = saved.ring || { angle: (115 * Math.PI) / 180, tries: 0, done: false, first: null };
  const keep = () => rec.set("teach", { v, checked: !!result, helped, ring });

  student.innerHTML = `
    <div class="card q">
      <p class="stem"><span class="n">1</span>The shrimp's tail muscles act like a small electric dipole: + toward the head, &minus; toward the tail. Drag from each dot to draw the electric field at A, B and C. Direction matters most; make an arrow longer where the field is stronger.</p>
      <div class="fieldbox"><canvas id="tA" aria-label="A shrimp with a positive and a negative charge, and three points A, B and C"></canvas></div>
      <div class="toolbar">
        <button class="btn small ghost" id="tHelp">Ask mother</button>
        <span style="flex:1"></span>
        <button class="btn" id="tCheck">Check</button>
      </div>
      <div id="tFb" aria-live="polite"></div>
      <div id="tAsk"></div>
    </div>
    <div class="card q">
      <p class="stem"><span class="n">2</span>Now feel it with your own bill. Slide your bill around the dashed circle, always the same distance from the shrimp, and watch the reading. Stop where the signal is strongest, then check.</p>
      <div class="fieldbox"><canvas id="tR" aria-label="A shrimp inside a dashed circle; the platypus bill slides around the circle"></canvas></div>
      <div class="toolbar">
        <span class="readout" id="tRead"></span>
        <span style="flex:1"></span>
        <button class="btn" id="tRCheck">Check</button>
      </div>
      <div id="tRFb" aria-live="polite"></div>
    </div>
    <div class="card" id="tRecap" hidden>
      ${mum(`<h3>What to take with you</h3>
        <p>Far from the shrimp (much farther than the distance between its two charges), with ${M("<mi>p</mi>")} its dipole moment and ${M("<mi>r</mi>")} the distance from its centre:</p>
        <div class="two">
          <div><span class="muted small">On its axis, ahead of the head or behind the tail</span>${MD(`<mi>E</mi><mo>=</mo>${k4}${fr("<mrow><mn>2</mn><mi>p</mi></mrow>", r3)}`)}</div>
          <div><span class="muted small">Beside it, level with its middle</span>${MD(`<mi>E</mi><mo>=</mo>${k4}${fr("<mi>p</mi>", r3)}`)}</div>
        </div>
        <p style="margin:0">On the axis the field points the way the shrimp faces; beside the shrimp it points the opposite way. Your bill reads this field in microvolts per centimetre: 1 &micro;V/cm = ${M("<msup><mn>10</mn><mrow><mo>&#x2212;</mo><mn>4</mn></mrow></msup>")} N/C. Below 50 &micro;V/cm you feel nothing.</p>`)}
    </div>`;
  const $ = (id) => student.querySelector("#" + id);

  // ---------- (a) arrows at A, B, C ----------
  const tips = {};
  const boardA = new Board($("tA"), {
    w: TEACH.W, h: TEACH.H, grid: false,
    paint(b, ctx) {
      water(b, ctx, false);
      shrimp(b, ctx, TEACH.shrimp, { charges: true });
      for (const k of PTS) {
        const p = TEACH[k];
        if (help) { // the field of each charge on its own, to scale with each other
          const [plus, minus] = partsAt(TEACH.shrimp, ...p);
          arrow(ctx, ...b.px(...p), ...b.px(p[0] + plus[0] * UNIT, p[1] + plus[1] * UNIT), POS, 1.8);
          arrow(ctx, ...b.px(...p), ...b.px(p[0] + minus[0] * UNIT, p[1] + minus[1] * UNIT), NEG, 1.8);
        }
        if (result && result.all) { const e = fieldAt(TEACH.shrimp, ...p); arrow(ctx, ...b.px(...p), ...b.px(p[0] + e[0] * UNIT, p[1] + e[1] * UNIT), OK, 5); }
        const t = tips[k];
        if (t && Math.hypot(t.x - p[0], t.y - p[1]) > 0.12) {
          const col = result && result.parts[k] !== null ? (result.parts[k] ? OK : BAD) : MINE;
          arrow(ctx, ...b.px(...p), ...b.px(t.x, t.y), col, 3.2);
        }
        dot(b, ctx, p, k);
      }
      if (help) label(ctx, "red: field of + alone   blue: field of − alone", b.w / 2, b.h - 14, SOFT);
    },
    onChange(b, ended) {
      for (const k of PTS) v[k] = [+(tips[k].x - TEACH[k][0]).toFixed(2), +(tips[k].y - TEACH[k][1]).toFixed(2)];
      if (result) { result = null; $("tFb").innerHTML = ""; }
      if (ended) { keep(); rec.event("teach-arrow"); paintTeacher(); }
    },
  });
  for (const k of PTS) tips[k] = boardA.addHandle({ x: TEACH[k][0] + v[k][0], y: TEACH[k][1] + v[k][1] });
  boardA.draw();

  $("tHelp").addEventListener("click", () => {
    help = !help; helped = helped || help;
    $("tHelp").textContent = help ? "Hide mother's hint" : "Ask mother";
    if (help) $("tFb").innerHTML = mum(`<p style="margin:0">The shrimp's field is the sum of two fields. At each dot I have drawn the field of the + charge alone (red, pointing away from +) and of the &minus; charge alone (blue, pointing toward &minus;). Add the two arrows tip to tail to get the field your bill feels.</p>`);
    else if (!result) $("tFb").innerHTML = "";
    rec.event("teach-help", { on: help }); keep(); boardA.draw(); paintTeacher();
  });
  $("tCheck").addEventListener("click", () => {
    result = judgeTeach(v); keep();
    rec.event("teach-check", { parts: result.parts, helped });
    showA(); boardA.draw(); paintTeacher();
  });
  function showA() {
    if (!result) return;
    if (!result.answered) { $("tFb").innerHTML = `<p class="note warn" style="margin:0">Nothing drawn yet. Drag from a dot to draw an arrow.</p>`; return; }
    const wrong = TEACH_PARTS.filter(([k]) => result.parts[k] === false), missing = PTS.filter((k) => result.parts[k] === null);
    const head = result.all
      ? `<p class="note" style="margin:0"><strong>All three arrows are right.</strong> The thick green arrows show the field to scale: the same direction at A and C, the opposite direction at B, and very much weaker at C.</p>`
      : `<p class="note warn" style="margin:0"><strong>${wrong.length ? `${wrong.length} thing${wrong.length > 1 ? "s" : ""} to fix` : "Not finished yet"}.</strong> Change the arrows and check again${missing.length ? `; ${missing.join(" and ")} still ${missing.length > 1 ? "have" : "has"} no arrow` : ""}.</p>`;
    $("tFb").innerHTML = head + (wrong.length ? `<ul class="tight" style="margin-top:12px">${wrong.map(([k, t]) => `<li><b style="color:${BAD}">${t}.</b> ${WHY[k]}</li>`).join("")}</ul>` : "");
  }

  // ---------- (b) strongest signal on a circle ----------
  const S = TEACH.shrimp, R = TEACH.ring;
  let grip;
  const boardR = new Board($("tR"), {
    w: TEACH.W, h: TEACH.H, grid: false,
    paint(b, ctx) {
      water(b, ctx, false);
      const [cx, cy] = b.px(S.x, S.y);
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = SOFT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R * b.scale, 0, 7); ctx.stroke(); ctx.restore();
      if (ring.done) { // the axis, once found
        ctx.save(); ctx.strokeStyle = OK; ctx.lineWidth = 2; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(...b.px(S.x - 4.6, S.y)); ctx.lineTo(...b.px(S.x + 4.6, S.y)); ctx.stroke(); ctx.restore();
        label(ctx, "the shrimp's axis", ...b.px(S.x + 4.3, S.y + 0.4), OK);
      }
      shrimp(b, ctx, S, { charges: true });
      if (!grip) return;
      bill(b, ctx, grip.x, grip.y, ring.angle + Math.PI);
      reading(b, ctx, grip.x, grip.y, fieldAt(S, grip.x, grip.y), MINE, 3.4);
    },
    onChange(b, ended) {
      ring.angle = Math.atan2(grip.y - S.y, grip.x - S.x);
      read();
      if (ended) { keep(); rec.event("teach-ring-move"); }
    },
  });
  const onRing = (x, y) => { const a = Math.atan2(y - S.y, x - S.x); return [S.x + R * Math.cos(a), S.y + R * Math.sin(a)]; };
  grip = boardR.addHandle({ x: S.x + R * Math.cos(ring.angle), y: S.y + R * Math.sin(ring.angle), limit: onRing });
  const read = () => { $("tRead").textContent = "Reading: " + fmt(Math.hypot(...fieldAt(S, grip.x, grip.y))); };
  read(); boardR.draw();

  $("tRCheck").addEventListener("click", () => {
    const ok = judgeRing(ring.angle, S.a);
    ring.tries += 1; if (ring.first === null) ring.first = ok; ring.done = ring.done || ok;
    keep(); rec.event("teach-ring-check", { ok, tries: ring.tries });
    showR(ok); boardR.draw(); paintTeacher();
  });
  function showR(ok) {
    $("tRFb").innerHTML = ok
      ? `<p class="note" style="margin:0"><strong>Yes, this is the strongest place.</strong> At a fixed distance the signal is strongest on the shrimp's axis, the line through its head and tail, at either end. Beside the shrimp, at the same distance, it is only about half as strong.</p>`
      : mum(`<p style="margin:0">Not the strongest yet${ring.tries > 1 ? ". Try the line through the shrimp's head and tail" : ". Keep sliding and watch the number: there are two places where it peaks"}.</p>`);
    $("tRecap").hidden = !ring.done;
  }
  if (result) showA();
  if (ring.tries) showR(ring.done);

  // ---------- asking mother (AI): about the arrows as they are now and how the rules marked them ----------
  askMother($("tAsk"), {
    where: "teach",
    prompt: "Ask mother a question about your arrows",
    state: () => ({ arrows: v, result: result && result.answered ? result.parts : null, ring: { done: ring.done, tries: ring.tries }, helped }),
    onEvent: (name, data) => rec.event(name, data),
  });

  // ---------- teacher ----------
  teacher.innerHTML = `
    <div class="qhead"><h3>Mother's lesson · class picture</h3><span class="pct" id="ttPct"></span></div>
    <p class="task">Every student's three arrows on top of each other, ${cls.length} students (simulated). Thick arrows: the student on the left, once checked.</p>
    <div class="plot"><canvas id="ttBoard"></canvas></div>
    <div class="key" style="margin:8px 0 12px"><span><i style="background:${OK}"></i>right direction</span><span><i style="background:${BAD}"></i>wrong direction</span></div>
    <div id="ttStats"></div>`;
  const tq = (id) => teacher.querySelector("#" + id);
  const tBoard = new Board(tq("ttBoard"), {
    w: TEACH.W, h: TEACH.H, grid: false,
    paint(b, ctx) {
      water(b, ctx, false);
      shrimp(b, ctx, S, { charges: true, alpha: 0.9 });
      const draw = (st, width, alpha) => PTS.forEach((k) => {
        if (st.result.parts[k] === null) return;
        const p = TEACH[k];
        ctx.save(); ctx.globalAlpha = alpha; arrow(ctx, ...b.px(...p), ...b.px(p[0] + st.v[k][0], p[1] + st.v[k][1]), st.result.parts[k] ? OK : BAD, width); ctx.restore();
      });
      cls.forEach((st) => draw(st.teach, 1.5, 0.3));
      if (result) draw({ v, result }, 4, 1);
      PTS.forEach((k) => dot(b, ctx, TEACH[k], k));
    },
  });
  tBoard.locked = true;

  function paintTeacher() {
    tBoard.draw();
    const all = cls.map((s) => s.teach);
    if (result && result.answered) all.push({ result, help: helped, ring: ring.first });
    const n = all.length, pct = (c) => Math.round((100 * c) / n);
    const whole = all.filter((s) => s.result.all).length;
    tq("ttPct").innerHTML = `${pct(whole)}% <small>all right, first check</small>`;
    const ringDone = cls.filter((s) => s.teach.ring).length + (ring.first ? 1 : 0), ringN = cls.length + (ring.first !== null ? 1 : 0);
    tq("ttStats").innerHTML = `
      <table class="err">
        ${TEACH_PARTS.map(([k, t]) => { const c = all.filter((s) => s.result.parts[k]).length; return `<tr class="ok"><td>${t}<div class="bar" style="width:${pct(c)}%"></div></td><td class="n">${c} / ${n}</td></tr>`; }).join("")}
        <tr class="rest"><td>Found the strongest place at the first try</td><td class="n">${ringDone} / ${ringN}</td></tr>
        <tr class="rest"><td>Asked mother for the hint</td><td class="n">${all.filter((s) => s.help).length} / ${n}</td></tr>
      </table>
      <p class="how">The weak point is B: students draw the field beside the shrimp pointing away from it or the way it faces.${result && result.answered ? " Includes the student on the left." : ""}</p>`;
  }
  paintTeacher();
}
