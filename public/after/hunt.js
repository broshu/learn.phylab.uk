// learn.phylab.uk — After class, step 2: the hunt, alone, as one project in two parts.
//   1 Find it: read the field around the silt with the bill, then place and turn a shrimp where you think it is.
//   Then the platypus swims round behind the shrimp's tail by itself, and the picture turns until the shrimp's axis
//   is level: the hunt becomes a problem in one dimension.
//   2 How far: back off along the axis, work out the distance from how the reading falls (1/r³), move the target
//   ring there and strike. The shrimp is revealed: is it under the ring?
// A mistake makes the shrimp flee; the mother explains that mistake and a new shrimp is hidden.
// An optional question follows: how far away can a shrimp be felt at all.
// Teacher side: the class's first attempt at each part, in pictures and statistics, and what feeds the next lesson.
import { Board, arrow, SOFT, MINE } from "/assets/board.js";
import { fieldLines } from "/assets/field.js";
import {
  HUNT, HUNT_KINDS, DIST, DIST_KINDS, RANGE_KINDS, RANGE,
  newTruth, judgeHunt, judgeDistance, judgeRange, fieldAt, ends, wrap,
} from "/after/model.js";
import { water, shrimp, bill, onBill, grip, reading, label, fmt, num, M, MD, fr, k4, r3, inv, mum, OK, BAD } from "/after/scene.js";
import { askMother } from "/assets/ask.js";

const { W, H, silt: Z, inset, keepOut } = HUNT;
const { H: SH, y: Y, start: X0, back: BACK, RING } = DIST; // the one-dimensional view: W wide, SH high, axis at height Y
const MID = [(Z.x0 + Z.x1) / 2, (Z.y0 + Z.y1) / 2], NECK = 1.6, PINS = 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => +(+v).toFixed(2);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const PARTS = [["find", "Find it"], ["measure", "How far"]];
const newR = () => +(4 + Math.floor(Math.random() * 21) / 10).toFixed(1); // 4.0 to 6.0 cm from the shrimp's centre

/** Keep the bill out of the silt while searching: a point inside is pushed to the nearest edge. */
function outside(x, y) {
  const x0 = Z.x0 - keepOut, x1 = Z.x1 + keepOut, y0 = Z.y0 - keepOut, y1 = Z.y1 + keepOut;
  if (x <= x0 || x >= x1 || y <= y0 || y >= y1) return [x, y];
  const gaps = [[x - x0, [x0, y]], [x1 - x, [x1, y]], [y - y0, [x, y0]], [y1 - y, [x, y1]]];
  return gaps.sort((p, q) => p[0] - q[0])[0][1];
}

/**
 * The river turned so that the shrimp's axis is level and the shrimp faces right, with its centre r to the right
 * of the spot X0 where the platypus starts. u = 0 is the river as it is; u = 1 is the one-dimensional view.
 */
function turn(t, r, u = 1) {
  const th = u * wrap(-t.a), c = Math.cos(th), s = Math.sin(th);
  const tx = t.x + u * (X0 + r - t.x), ty = t.y + u * (Y - t.y);
  const f = (x, y) => { const dx = x - t.x, dy = y - t.y; return [c * dx - s * dy + tx, s * dx + c * dy + ty]; };
  f.rot = th;
  return f;
}
/** A board-like object that draws river coordinates through the map f. */
const through = (b, f) => ({ px: (x, y) => b.px(...f(x, y)), scale: b.scale, w: b.w, h: b.h });
/** The silt patch in any view: a rotated rectangle. */
function siltIn(b, ctx, f) {
  const pts = [[Z.x0, Z.y0], [Z.x1, Z.y0], [Z.x1, Z.y1], [Z.x0, Z.y1]].map(([x, y]) => b.px(...f(x, y)));
  ctx.save(); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath();
  ctx.fillStyle = "rgba(125,112,84,0.5)"; ctx.fill();
  ctx.save(); ctx.clip();
  let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = "rgba(74,64,44,0.35)";
  for (let i = 0; i < 260; i++) { const [x, y] = b.px(...f(Z.x0 + r() * (Z.x1 - Z.x0), Z.y0 + r() * (Z.y1 - Z.y0))); ctx.beginPath(); ctx.arc(x, y, 0.6 + r() * 1.4, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.setLineDash([6, 5]); ctx.strokeStyle = "rgba(74,64,44,0.7)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

const fresh = () => ({
  truth: newTruth(), phase: "find", guess: { x: MID[0], y: MID[1], a: 0 }, placed: false, pins: [],
  snout: { x: 2, y: 2 }, r: null, back: 0, dpins: [], aim: X0 + 3, hint: null, end: null,
});

export function startHunt({ student, teacher, rec, cls }) {
  const saved = rec.get("hunt");
  const st = saved && saved.phase && (saved.phase === "find" || saved.r) ? saved : { ...fresh(), log: { finds: [], lunges: [], hunts: 0, caughtOn: 0 } };
  if (!st.log.lunges) st.log = { finds: [], lunges: [], hunts: 0, caughtOn: 0 };
  const rg = rec.get("range") || { tries: [], ok: false };
  const keep = () => { rec.set("hunt", st); rec.set("range", rg); };
  keep(); // kept from the start, so a refresh meets the same shrimp
  let lines = null; // the real field lines, drawn only when the hunt ends
  let busy = false; // the swim-round animation is playing

  student.innerHTML = `
    <ol class="hparts" id="hParts">${PARTS.map(([k, t], i) => `<li data-p="${k}"><b>${i + 1}</b> ${t}</li>`).join("")}</ol>
    <p class="htask" id="hTask"></p>
    <div class="fieldbox" id="hBox"><canvas id="hBoard" aria-label="Murky river water with a patch of silt. Drag the platypus to read the electric field with its bill."></canvas></div>
    <div class="fieldbox" id="aBox" hidden><canvas id="aBoard" aria-hidden="true"></canvas></div>
    <div class="fieldbox" id="dBox" hidden><canvas id="dBoard" aria-label="The shrimp's axis, level. Drag the platypus back along it to read the field at different distances."></canvas></div>
    <div class="toolbar">
      <span class="readout" id="hRead"></span>
      <span style="flex:1"></span>
      <button class="btn small ghost" id="hClear">Clear readings</button>
      <button class="btn" id="hGo"></button>
    </div>
    <p class="muted small" style="margin:0 0 10px">Arrows show the direction of the field exactly. Their length is on a compressed scale, because the field changes a thousandfold across this picture; the number is the true strength.</p>
    <div id="hMeasure" hidden>
      <table class="pins" style="max-width:360px"><thead><tr><th>Backed off</th><th>Reading</th></tr></thead><tbody id="hPins"></tbody></table>
    </div>
    <div id="hFb" aria-live="polite"></div>

    <div class="card q" style="margin-top:26px">
      <span class="tag">Optional · harder</span>
      <p class="stem" style="margin-top:6px">Mother's last question. A shrimp of this kind has dipole moment ${M(`<mi>p</mi><mo>=</mo><mn>3.0</mn><mo>&#xD7;</mo><msup><mn>10</mn><mrow><mo>&#x2212;</mo><mn>16</mn></mrow></msup><mtext>&#xA0;C&#x2009;m</mtext>`)}. Your bill feels nothing weaker than 50 &micro;V/cm. Facing the shrimp along its axis, from how far away can you first feel it?</p>
      <p class="muted">${M(`${k4}<mo>=</mo><mn>8.99</mn><mo>&#xD7;</mo><msup><mn>10</mn><mn>9</mn></msup><mtext>&#xA0;N&#x2009;m&#xB2;/C&#xB2;</mtext>`)} &nbsp;·&nbsp; 1 &micro;V/cm = ${M("<msup><mn>10</mn><mrow><mo>&#x2212;</mo><mn>4</mn></mrow></msup>")} N/C</p>
      <div class="ansrow"><input type="number" id="rAns" inputmode="decimal" min="0" step="0.1" autocomplete="off"><span>cm</span><button class="btn" id="rGo">Check</button></div>
      <div id="rFb" aria-live="polite" style="margin-top:12px"></div>
    </div>`;
  const $ = (id) => student.querySelector("#" + id);

  // ---------- part 1: the river seen from above ----------
  const toMid = () => Math.atan2(MID[1] - snout.y, MID[0] - snout.x);
  let snout, body, head, moving = null;
  const board = new Board($("hBoard"), {
    w: W, h: H, grid: false,
    paint(b, ctx) {
      const id = (x, y) => [x, y];
      water(b, ctx);
      siltIn(b, ctx, id);
      if (st.end && st.end.part === "find") {
        lines = lines || fieldLines(ends(st.truth), { x0: 0, x1: W, y0: 0, y1: H }, 12);
        ctx.save(); ctx.strokeStyle = "rgba(26,32,48,0.3)"; ctx.lineWidth = 1.2;
        for (const l of lines) { ctx.beginPath(); l.forEach((p, i) => { const [x, y] = b.px(...p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
        ctx.restore();
      }
      st.pins.forEach((p) => reading(b, ctx, p.x, p.y, fieldAt(st.truth, p.x, p.y)));
      shrimp(b, ctx, st.guess, { color: "#b56a00", dash: true, charges: true });
      if (!st.placed && !st.end) label(ctx, "your guess", ...b.px(st.guess.x, st.guess.y - 1.05), "#8a5200");
      if (st.end && st.end.part === "find") {
        shrimp(b, ctx, st.truth, { color: BAD, charges: true });
        label(ctx, "where the shrimp was", ...b.px(st.truth.x, st.truth.y + 1.2), BAD);
      }
      if (!snout) return; // first paint, before the handles exist
      bill(b, ctx, snout.x, snout.y, toMid(), 0.94);
      if (!st.end) { reading(b, ctx, snout.x, snout.y, fieldAt(st.truth, snout.x, snout.y), MINE, 3.4); grip(b, ctx, snout.x, snout.y); }
    },
    onChange(b, ended) {
      if (b._drag) moving = b._drag;
      st.snout = { x: r1(snout.x), y: r1(snout.y) };
      st.guess = { x: r1(body.x), y: r1(body.y), a: st.guess.a };
      if (moving && moving !== snout) st.placed = true;
      read();
      if (!ended) return;
      if (moving === snout) { // letting go of the bill leaves a reading behind
        st.pins.push({ ...st.snout }); if (st.pins.length > PINS) st.pins.shift();
        rec.event("hunt-reading", { n: st.pins.length });
        if (st.hint) { st.hint = null; $("hFb").innerHTML = ""; }
      }
      moving = null; keep(); b.draw();
    },
  });
  // the platypus: grabbed by the ring at its bill tip or anywhere on its head and body
  snout = board.addHandle({ x: st.snout.x, y: st.snout.y, show: false, limit: outside, hit: (x, y) => !st.end && onBill(snout.x, snout.y, toMid(), x, y) });
  body = board.addHandle({
    x: st.guess.x, y: st.guess.y, show: false,
    limit(x, y) {
      x = clamp(x, Z.x0 + inset, Z.x1 - inset); y = clamp(y, Z.y0 + inset, Z.y1 - inset);
      head.x = x + NECK * Math.cos(st.guess.a); head.y = y + NECK * Math.sin(st.guess.a);
      return [x, y];
    },
  });
  head = board.addHandle({
    x: st.guess.x + NECK * Math.cos(st.guess.a), y: st.guess.y + NECK * Math.sin(st.guess.a),
    limit(x, y) {
      st.guess.a = +Math.atan2(y - body.y, x - body.x).toFixed(3);
      return [body.x + NECK * Math.cos(st.guess.a), body.y + NECK * Math.sin(st.guess.a)];
    },
  });
  board.handles = [head, body, snout];

  // ---------- part 2: the shrimp's axis, level ----------
  const strip = () => ({ x: X0 + st.r, y: Y, a: 0 }); // the shrimp in the level view
  let tip, aim, dmoving = null;
  /** The target ring: where the platypus will strike. */
  function target(b, ctx, x, color) {
    const [px, py] = b.px(x, Y), R = RING * b.scale;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.fillStyle = color + "22";
    ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(px, py, R * 0.45, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px - R - 7, py); ctx.lineTo(px - R * 0.6, py); ctx.moveTo(px + R * 0.6, py); ctx.lineTo(px + R + 7, py);
    ctx.moveTo(px, py - R - 7); ctx.lineTo(px, py - R * 0.6); ctx.moveTo(px, py + R * 0.6); ctx.lineTo(px, py + R + 7); ctx.stroke();
    ctx.restore();
  }
  const dBoard = new Board($("dBoard"), {
    w: W, h: SH, grid: false,
    paint(b, ctx) {
      if (!st.r || !tip) return;
      const f = turn(st.truth, st.r);
      water(b, ctx);
      siltIn(b, ctx, f);
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = SOFT; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(...b.px(0, Y)); ctx.lineTo(...b.px(W, Y)); ctx.stroke(); ctx.restore();
      label(ctx, "the shrimp's axis", ...b.px(0.3, SH - 0.5), SOFT, "left");
      ctx.save(); ctx.strokeStyle = "#1a2030"; ctx.fillStyle = "#1a2030"; ctx.lineWidth = 1.4; ctx.font = "12px -apple-system, 'Segoe UI', Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      const AHEAD = W - X0 - 0.3;
      ctx.beginPath(); ctx.moveTo(...b.px(X0 - BACK, 1)); ctx.lineTo(...b.px(X0 + AHEAD, 1));
      for (let k = -BACK * 2; k <= AHEAD * 2; k++) { const [x, y] = b.px(X0 + k / 2, 1); ctx.moveTo(x, y); ctx.lineTo(x, y + (k % 2 ? 4 : 8)); if (k % 2 === 0) ctx.fillText(String(Math.abs(k / 2)), x, y + 10); }
      ctx.stroke(); ctx.restore();
      if (b.w > 520) { label(ctx, "cm backed off", ...b.px(X0 - BACK - 0.15, 0.32), "#1a2030", "left"); label(ctx, "cm ahead", ...b.px(W - 0.15, 0.32), "#1a2030", "right"); }
      else label(ctx, "back  ·  cm  ·  ahead", ...b.px(X0, 0.3), "#1a2030");
      st.dpins.forEach((p) => reading(b, ctx, X0 - p.b, Y, fieldAt(strip(), X0 - p.b, Y)));
      if (st.end) {
        const caught = st.end.caught, sx = X0 + st.r;
        lines = lines || fieldLines(ends(strip()), { x0: 0, x1: W, y0: 0, y1: SH }, 12);
        ctx.save(); ctx.strokeStyle = "rgba(26,32,48,0.3)"; ctx.lineWidth = 1.2;
        for (const l of lines) { ctx.beginPath(); l.forEach((p, i) => { const [x, y] = b.px(...p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
        ctx.restore();
        bill(b, ctx, X0 + st.end.ans - RING, Y, 0, 0.95);
        shrimp(b, ctx, strip(), { color: caught ? OK : BAD, charges: true });
        target(b, ctx, X0 + st.end.ans, caught ? OK : BAD);
        label(ctx, `${caught ? "caught" : "it was here"}: ${st.r} cm ahead`, ...b.px(W - 0.2, Y + 1.65), caught ? OK : BAD, "right");
        return;
      }
      target(b, ctx, aim.x, "#d98200");
      label(ctx, `target: ${(aim.x - X0).toFixed(1)} cm ahead`, ...b.px(W - 0.2, Y + 1.65), "#8a5200", "right");
      bill(b, ctx, tip.x, Y, 0, 0.95);
      reading(b, ctx, tip.x, Y, fieldAt(strip(), tip.x, Y), MINE, 3.4);
      grip(b, ctx, tip.x, Y);
    },
    onChange(b, ended) {
      if (b._drag) dmoving = b._drag;
      if (dmoving === aim) { st.aim = +aim.x.toFixed(1); if (ended) { dmoving = null; keep(); rec.event("hunt-aim", { at: +(st.aim - X0).toFixed(1) }); } return; }
      st.back = +(X0 - tip.x).toFixed(1);
      read();
      if (!ended) return;
      dmoving = null;
      const E = +Math.hypot(...fieldAt(strip(), tip.x, Y)).toPrecision(3);
      st.dpins = st.dpins.filter((p) => p.b !== st.back); st.dpins.push({ b: st.back, E });
      st.dpins.sort((p, q) => p.b - q.b); if (st.dpins.length > 6) st.dpins.shift();
      rec.event("hunt-measure-reading", { b: st.back }); keep(); pins(); b.draw();
    },
  });
  aim = dBoard.addHandle({
    x: st.aim, y: Y, snap: 0.1, show: false,
    limit: (x) => [clamp(x, X0 + 1.5, W - 0.4), Y],
    hit: (x, y) => !st.end && Math.hypot(x - aim.x, y - Y) <= RING + 0.15,
  });
  tip = dBoard.addHandle({
    x: X0 - st.back, y: Y, snap: 0.1, show: false,
    limit: (x) => [clamp(x, X0 - BACK, X0), Y],
    hit: (x, y) => !st.end && onBill(tip.x, Y, 0, x, y),
  });

  // ---------- the swim round and the turn, between the two parts ----------
  const aCanvas = $("aBoard"), actx = aCanvas.getContext("2d");
  function swimRound(done) {
    const t = st.truth, r = st.r, from = [snout.x, snout.y];
    const a0 = Math.atan2(from[1] - t.y, from[0] - t.x), d0 = Math.hypot(from[0] - t.x, from[1] - t.y);
    const a1 = t.a + Math.PI, da = wrap(a1 - a0);
    // the swim and the turn overlap, so the platypus stays in view while it goes round
    const T1 = 1700, D2 = 800, T2 = 1800, END = D2 + T2, start = performance.now();
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("hBox").hidden = true; $("aBox").hidden = false; busy = true; show();
    const frame = (now) => {
      const ms = still ? END : now - start;
      const p1 = ease(clamp(ms / T1, 0, 1)), p2 = ease(clamp((ms - D2) / T2, 0, 1));
      // the canvas shrinks from the river's height to the strip's while the picture turns
      const w = aCanvas.clientWidth || 600, dpr = window.devicePixelRatio || 1, k = w / W, hU = H + (SH - H) * p2, h = Math.round(hU * k);
      if (aCanvas.height !== Math.round(h * dpr) || aCanvas.width !== Math.round(w * dpr)) { aCanvas.style.height = h + "px"; aCanvas.width = Math.round(w * dpr); aCanvas.height = Math.round(h * dpr); }
      actx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const b = { w, h, scale: k, px: (x, y) => [x * k, h - y * k] };
      const f = turn(t, r, p2), v = through(b, f);
      water(b, actx);
      siltIn(b, actx, f);
      actx.save(); actx.globalAlpha = 1 - p2;
      st.pins.forEach((q) => reading(v, actx, q.x, q.y, fieldAt(t, q.x, q.y)));
      shrimp(v, actx, { ...st.guess, a: st.guess.a + f.rot }, { color: "#b56a00", dash: true, charges: true, alpha: 0.6 });
      actx.restore();
      // round the shrimp at a steady distance change, ending behind its tail, facing it
      const ang = a0 + da * p1, dist = d0 + (r - d0) * p1, x = t.x + dist * Math.cos(ang), y = t.y + dist * Math.sin(ang);
      bill(v, actx, x, y, ang + Math.PI + f.rot, 0.95);
      reading(v, actx, x, y, fieldAt(t, x, y), MINE, 3.4);
      if (p2 > 0.6) { actx.save(); actx.globalAlpha = (p2 - 0.6) / 0.4; actx.setLineDash([6, 6]); actx.strokeStyle = SOFT; actx.lineWidth = 1.4; actx.beginPath(); actx.moveTo(...b.px(0, Y)); actx.lineTo(...b.px(W, Y)); actx.stroke(); actx.restore(); }
      if (ms < END) requestAnimationFrame(frame);
      else { $("aBox").hidden = true; $("dBox").hidden = false; busy = false; dBoard.resize(); done(); }
    };
    requestAnimationFrame(frame);
  }

  const read = () => {
    if (st.end || busy) { $("hRead").textContent = ""; return; }
    if (st.phase === "measure") { $("hRead").textContent = `Backed off ${st.back.toFixed(1)} cm · reading: ${fmt(Math.hypot(...fieldAt(strip(), tip.x, Y)))}`; return; }
    $("hRead").textContent = "Reading at your bill: " + fmt(Math.hypot(...fieldAt(st.truth, snout.x, snout.y)));
  };
  function pins() {
    $("hPins").innerHTML = st.dpins.length
      ? st.dpins.map((p) => `<tr><td>${p.b.toFixed(1)} cm</td><td>${num(p.E)} &micro;V/cm</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">Drag the platypus back along the dashed line. Each time you let go, the reading is noted here.</td></tr>`;
  }

  $("hClear").addEventListener("click", () => {
    if (st.end || busy) return;
    if (st.phase === "find") { st.pins = []; board.draw(); } else { st.dpins = st.dpins.filter((p) => p.b === 0); pins(); dBoard.draw(); }
    keep(); rec.event("hunt-clear", { phase: st.phase });
  });
  $("hGo").addEventListener("click", () => { if (!busy) (st.phase === "find" ? markIt : lunge)(); });

  function markIt() {
    if (!st.placed) { st.hint = "place"; return show(); }
    const j = judgeHunt(st.guess, st.truth);
    const r = { kind: j.kind, dist: r1(j.dist), turn: Math.round(j.turn), rel: j.rel.map(r1), readings: st.pins.length };
    st.log.finds.push(r); rec.event("hunt-find", r);
    if (!j.caught) { finish({ part: "find", ...r }); keep(); show(); paintTeacher(); return; }
    st.phase = "measure"; st.r = newR(); st.back = 0; tip.x = X0;
    st.dpins = [{ b: 0, E: +Math.hypot(...fieldAt(strip(), X0, Y)).toPrecision(3) }];
    st.hint = "found"; keep(); paintTeacher();
    swimRound(() => { st.hint = "level"; show(); });
  }
  function lunge() {
    const ans = +(aim.x - X0).toFixed(1);
    const j = judgeDistance(ans, st.r, st.dpins);
    const r = { kind: j.kind, caught: j.caught, ratio: +j.ratio.toFixed(3), ans, readings: st.dpins.length };
    st.log.lunges.push(r); rec.event("hunt-lunge", r);
    finish({ part: "measure", ...r });
    keep(); show(); paintTeacher();
  }
  function finish(end) {
    st.end = { caught: !!end.caught, ...end };
    st.log.hunts += 1;
    if (end.caught && !st.log.caughtOn) st.log.caughtOn = st.log.hunts;
    st.hint = null; lines = null;
  }
  function again() {
    const log = st.log;
    Object.assign(st, fresh(), { log });
    snout.x = st.snout.x; snout.y = st.snout.y; body.x = MID[0]; body.y = MID[1]; head.x = MID[0] + NECK; head.y = MID[1]; tip.x = X0; aim.x = st.aim;
    rec.event("hunt-again", { hunts: log.hunts }); keep(); show();
  }

  const TASK = {
    find: `Drag the platypus around the silt, by its bill or its head: each time you let go, the reading stays on the picture. Then drag the dashed shrimp to where you think the real one is, turn it by the grip at its head, and press <b>Found it</b>. You must be within 1.2 cm of it and within 45&deg; of its heading.`,
    measure: `You are behind its tail, on its axis, facing it. Drag the platypus back along the dashed line to take more readings and work out how far ahead of your starting spot (0 on the ruler) the shrimp's centre is. Then move the target ring there and press <b>Strike</b>. The ring must cover most of the shrimp.`,
  };
  const HINT = {
    place: `<p class="note warn" style="margin:0">First drag the dashed shrimp to where you think the real one is, and turn it by the orange grip at its head.</p>`,
    found: `<p class="note" style="margin:0"><strong>You have found it.</strong> You swim quietly round behind its tail&hellip;</p>`,
    level: `<p class="note" style="margin:0"><strong>You are behind it, on its axis.</strong> The picture has turned so that the axis is level. Your guess was close, but not exact: the shrimp is still hidden, so you need its distance.</p>`,
  };

  function show() {
    const p = st.phase, at = PARTS.findIndex(([k]) => k === p);
    [...$("hParts").children].forEach((li, i) => {
      li.className = st.end ? (i < at || st.end.caught ? "ok" : i === at ? "no" : "") : i < at ? "ok" : i === at ? "now" : "";
    });
    $("hTask").innerHTML = st.end || busy ? "" : TASK[p];
    if (!busy) { $("hBox").hidden = p !== "find"; $("dBox").hidden = p !== "measure"; }
    board.locked = !!st.end || p !== "find"; dBoard.locked = !!st.end;
    $("hGo").textContent = p === "find" ? "Found it" : "Strike";
    $("hGo").disabled = !!st.end || busy; $("hClear").disabled = !!st.end || busy;
    $("hMeasure").hidden = p !== "measure" || busy;
    read(); pins();
    if (p === "find") board.draw(); else if (!busy) { dBoard.resize(); }
    if (!st.end) { $("hFb").innerHTML = st.hint ? HINT[st.hint] : ""; return; }
    const e = st.end;
    if (e.caught) {
      $("hFb").innerHTML = `<p class="note" style="margin:12px 0 0"><strong>Caught, on hunt ${st.log.hunts}.</strong> You struck ${e.ans} cm ahead; it was ${st.r} cm ahead. You found it from the direction of its field, and two readings along its axis told you how far, because the way a dipole's field falls with distance is known. The grey lines are its real field.</p>
        <div class="toolbar"><button class="btn small ghost" id="hAgain">Hunt another shrimp</button></div>`;
    } else {
      $("hFb").innerHTML = `<div class="card burrow" style="margin-top:12px">${mum(`<h3>The shrimp got away</h3>${why(e)}
        <p class="muted small">The picture shows where it was, with its real field in grey. Compare the grey lines with your readings.</p>
        <div id="hAsk"></div>
        <button class="btn" id="hAgain">Go out again</button>`, "Back at the burrow · mother")}</div>`;
      // the young one can ask mother (AI) about this mistake before going out again
      askMother($("hAsk"), {
        where: "hunt",
        prompt: "Ask mother about what went wrong",
        state: () => ({ end: st.end, r: st.r, readings: st.dpins, hunts: st.log.hunts }),
        onEvent: (name, data) => rec.event(name, data),
      });
    }
    $("hAgain").addEventListener("click", again);
  }

  function why(e) {
    if (e.part === "find") return {
      position: `<p>You thought it was ${e.dist} cm from where it really was, so you swam round the wrong spot and it heard you. The field of a dipole falls off like ${inv(3)}: halve your distance and the reading is 8 times stronger. So the size of the reading tells you how near you are.</p>
        <p>Sweep your bill along each side of the silt and find where the reading peaks on that side. The shrimp lies between those peaks, nearest the side with the largest reading.</p>`,
      reversed: `<p>You found the right place, but it was facing the other way, so you swam round to its head instead of its tail, and it saw you.</p>
        <p>Field lines leave the + end, at the head, and arrive at the &minus; end, at the tail. Readings taken in front of the head point away from the shrimp; readings taken behind the tail point toward it.</p>`,
      angle: `<p>You found the right place, but its heading was ${Math.abs(e.turn)}&deg; away from your guess, so you came at it from the side, and it saw you.</p>
        <p>On the shrimp's axis the reading lies along the axis and is the strongest for that distance. Beside the shrimp the reading is parallel to the axis but points the opposite way. Find where the readings point straight out of the silt and straight into it: the line joining them is the axis.</p>`,
    }[e.kind];
    const back = `<p>You struck ${e.ans} cm ahead; it was ${st.r} cm ahead, so your strike landed ${e.ans < st.r ? "short of it" : "beyond it"} and it darted away.</p>`;
    return back + {
      one: `<p>One reading cannot give the distance: a strong shrimp far away and a weak one close by can give the same reading. Back off, take a second reading, and use how much the reading has fallen.</p>`,
      square: `<p>Your answer fits a field that falls like ${inv(2)}. That is the field of a single point charge. A shrimp is a dipole: on its axis the field falls like ${inv(3)}, so backing off from ${M("<mi>r</mi>")} to ${M("<mi>r</mi><mo>+</mo><mi>d</mi>")} divides the reading by</p>${MD(`<msup><mrow><mo>(</mo>${fr("<mrow><mi>r</mi><mo>+</mo><mi>d</mi></mrow>", "<mi>r</mi>")}<mo>)</mo></mrow><mn>3</mn></msup>`)}`,
      spot: `<p>Your number is the distance from the place you backed off to. Your strike is measured from your starting spot, 0 on the ruler, so ${M("<mi>r</mi>")} must be measured from there.</p>`,
      other: `<p>Use two readings and divide one by the other, so that the unknown dipole moment cancels. With ${M("<msub><mi>E</mi><mn>1</mn></msub>")} read at your starting spot, a distance ${M("<mi>r</mi>")} from the shrimp, and ${M("<msub><mi>E</mi><mn>2</mn></msub>")} read after backing off by ${M("<mi>d</mi>")}:</p>${MD(`${fr("<msub><mi>E</mi><mn>1</mn></msub>", "<msub><mi>E</mi><mn>2</mn></msub>")}<mo>=</mo><msup><mrow><mo>(</mo>${fr("<mrow><mi>r</mi><mo>+</mo><mi>d</mi></mrow>", "<mi>r</mi>")}<mo>)</mo></mrow><mn>3</mn></msup>`)}<p>Take the cube root of the ratio of your readings, then solve for ${M("<mi>r</mi>")}.</p>`,
    }[e.kind];
  }

  // ---------- optional: sensing range ----------
  $("rAns").addEventListener("keydown", (e) => { if (e.key === "Enter") $("rGo").click(); });
  $("rGo").addEventListener("click", () => {
    const ans = parseFloat($("rAns").value);
    if (!(ans > 0)) return;
    const j = judgeRange(ans);
    rg.tries.push({ ans, kind: j.kind }); rg.ok = rg.ok || j.ok;
    rec.event("range-check", { ans, kind: j.kind }); keep(); showRange(); paintTeacher();
  });
  function showRange() {
    const t = rg.tries[rg.tries.length - 1];
    if (!t) return;
    $("rAns").value = t.ans;
    const set = MD(`${k4}${fr("<mrow><mn>2</mn><mi>p</mi></mrow>", r3)}<mo>=</mo><mn>50</mn><mtext>&#xA0;&#xB5;V/cm</mtext>`);
    $("rFb").innerHTML = t.kind === "ok"
      ? `<p class="note" style="margin:0"><strong>Right: about ${RANGE.toFixed(0)} cm.</strong> A platypus has to pass within about a hand's width of a shrimp like this one to feel it at all. Because the field falls like ${inv(3)}, a bill ten times more sensitive would reach only about twice as far.</p>`
      : mum({
        units: `<p style="margin:0">Your method may be right, but the answer is out by a power of ten. Put everything in SI units before you solve: 50 &micro;V/cm is ${M(`<mn>5</mn><mo>&#xD7;</mo><msup><mn>10</mn><mrow><mo>&#x2212;</mo><mn>3</mn></mrow></msup>`)} N/C, and the distance comes out in metres.</p>`,
        side: `<p style="margin:0">You used the field beside a dipole. You are facing the shrimp along its axis, where the field is twice as large:</p>${set}`,
        other: `<p style="margin:0">Set the field on the axis equal to the weakest field your bill can feel, then solve for ${M("<mi>r</mi>")}:</p>${set}`,
      }[t.kind]);
  }

  // ---------- teacher ----------
  teacher.innerHTML = `
    <div class="card tcard">
      <div class="qhead"><h3>Part 1 · finding it</h3><span class="pct" id="t1Pct"></span></div>
      <p class="task">Each student hunts a different shrimp, so every first guess is drawn as seen from the real shrimp (centre, facing right). A dot is where the student placed it, its arrow the heading they chose. ${cls.length} students (simulated).</p>
      <div class="plot"><canvas id="t1Board"></canvas></div>
      <div class="key" style="margin:8px 0 12px"><span><i style="background:${OK}"></i>found</span><span><i style="background:${BAD}"></i>got away</span><span><i style="background:${MINE}"></i>student on the left</span></div>
      <div id="t1Stats"></div>
    </div>
    <div class="card tcard">
      <div class="qhead"><h3>Part 2 · how far</h3><span class="pct" id="t3Pct"></span></div>
      <p class="task">Where each student first struck, divided by the real distance of their own shrimp. Out of the students who found the shrimp in part 1.</p>
      <div class="dist wide" id="t3Hist"></div>
      <div id="t3Stats"></div>
    </div>
    <div class="card tcard">
      <div class="qhead"><h3>Feeds the next lesson</h3></div>
      <p class="task">The hunt is done without help, so its mistakes decide each student's first check next lesson.</p>
      <div id="tNext"></div>
    </div>`;
  const tq = (id) => teacher.querySelector("#" + id);
  const VW = 6.4, VH = 4.8, at = (rel) => [VW / 2 + clamp(rel[0], -3, 3), VH / 2 + clamp(rel[1], -2.2, 2.2)];
  const mark = (b, ctx, s, width, alpha, ringed) => {
    const p = at(s.rel), a = (s.turn * Math.PI) / 180, col = s.kind === "caught" ? OK : BAD;
    ctx.save(); ctx.globalAlpha = alpha;
    arrow(ctx, ...b.px(...p), ...b.px(p[0] + 0.45 * Math.cos(a), p[1] + 0.45 * Math.sin(a)), col, width);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(...b.px(...p), width + 1.2, 0, 7); ctx.fill();
    if (ringed) { ctx.strokeStyle = MINE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(...b.px(...p), 9, 0, 7); ctx.stroke(); }
    ctx.restore();
  };
  const tBoard = new Board(tq("t1Board"), {
    w: VW, h: VH, grid: false,
    paint(b, ctx) {
      ctx.fillStyle = "#f4f6f3"; ctx.fillRect(0, 0, b.w, b.h);
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = SOFT; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(...b.px(VW / 2, VH / 2), HUNT.POS * b.scale, 0, 7); ctx.stroke(); ctx.restore();
      label(ctx, "close enough (1.2 cm)", ...b.px(VW / 2, VH / 2 + HUNT.POS + 0.28), SOFT);
      shrimp(b, ctx, { x: VW / 2, y: VH / 2, a: 0 }, { color: "#55607a", alpha: 0.45 });
      cls.forEach((s) => mark(b, ctx, s.hunt.first, 1.6, 0.75, false));
      if (st.log.finds[0]) mark(b, ctx, st.log.finds[0], 3, 1, true);
    },
  });
  tBoard.locked = true;
  const EDGES = [0, 0.5, 0.7, 0.85, 1.15, 1.5, Infinity], NAMES = ["under 0.5", "0.5 to 0.7", "0.7 to 0.85", "right", "1.15 to 1.5", "over 1.5"];
  const rows = (list, KINDS, pct) => Object.keys(KINDS).map((k) => [k, list.filter((s) => s.kind === k).length]).sort((a, b) => b[1] - a[1])
    .filter(([, c]) => c).map(([k, c]) => `<tr><td>${KINDS[k].label}<div class="bar" style="width:${pct(c)}%"></div></td><td class="n">${c}</td></tr>`).join("");

  function paintTeacher() {
    tBoard.draw();
    const L = st.log;
    // part 1
    const finds = cls.map((s) => s.hunt.first); if (L.finds[0]) finds.push(L.finds[0]);
    let n = finds.length, pct = (c) => Math.round((100 * c) / n);
    const found = finds.filter((s) => s.kind === "caught").length;
    tq("t1Pct").innerHTML = `${pct(found)}% <small>found it at the first try</small>`;
    const reads = cls.map((s) => s.hunt.readings); if (L.finds[0]) reads.push(L.finds[0].readings);
    tq("t1Stats").innerHTML = `<table class="err">
        <tr class="ok"><td>Found it at the first try<div class="bar" style="width:${pct(found)}%"></div></td><td class="n">${found} / ${n}</td></tr>
        ${rows(finds, HUNT_KINDS, pct)}</table>
      <p class="how">Readings taken before the first guess: ${(reads.reduce((a, c) => a + c, 0) / reads.length).toFixed(1)} on average.${L.finds[0] ? " Includes the student on the left." : ""}</p>`;
    // part 2
    const lunges = cls.map((s) => s.dist && s.dist.first).filter(Boolean); const mine = L.lunges[0]; if (mine) lunges.push(mine);
    n = lunges.length; pct = (c) => Math.round((100 * c) / n);
    const right = lunges.filter((s) => s.kind === "caught").length;
    const bins = NAMES.map((_, i) => lunges.filter((s) => s.ratio >= EDGES[i] && s.ratio < EDGES[i + 1]).length), top = Math.max(...bins, 1);
    const mineBin = mine ? NAMES.findIndex((_, i) => mine.ratio >= EDGES[i] && mine.ratio < EDGES[i + 1]) : -1;
    tq("t3Pct").innerHTML = `${pct(right)}% <small>caught at the first strike</small>`;
    tq("t3Hist").innerHTML = bins.map((c, i) => `<div${i === mineBin ? ' class="me"' : ""}><b>${c}</b><i style="height:${Math.round((70 * c) / top)}px;background:${i === 3 ? OK : BAD}"></i>${NAMES[i]}</div>`).join("");
    const tried = cls.filter((s) => s.range).map((s) => s.range); if (rg.tries.length) tried.push(rg.tries[0]);
    const hunts = cls.map((s) => s.hunts); if (L.caughtOn) hunts.push(L.caughtOn);
    const hb = [1, 2, 3, 4].map((k) => hunts.filter((v) => (k < 4 ? v === k : v >= 4)).length), htop = Math.max(...hb, 1);
    tq("t3Stats").innerHTML = `
      <p class="how" style="margin:8px 0 12px">Answers near 0.6 come from treating the shrimp as one point charge (${inv(2)}).${mine ? " The outlined bar holds the student on the left." : ""}</p>
      <table class="err">
        <tr class="ok"><td>Caught at the first strike<div class="bar" style="width:${pct(right)}%"></div></td><td class="n">${right} / ${n}</td></tr>
        ${rows(lunges, DIST_KINDS, pct)}</table>
      <h4 class="tsub">Hunts needed to catch a shrimp</h4>
      <div class="dist">${hb.map((c, i) => `<div><b>${c}</b><i style="height:${Math.round((52 * c) / htop)}px"></i>${i < 3 ? i + 1 : "4+"}</div>`).join("")}</div>
      <h4 class="tsub">Optional question: sensing range</h4>
      <table class="err">
        <tr class="ok"><td>Right at the first try</td><td class="n">${tried.filter((s) => s.kind === "ok").length} / ${tried.length} who tried</td></tr>
        ${Object.keys(RANGE_KINDS).map((k) => [k, tried.filter((s) => s.kind === k).length]).filter(([, c]) => c).map(([k, c]) => `<tr><td>${RANGE_KINDS[k].label}</td><td class="n">${c}</td></tr>`).join("")}
      </table>`;
    // what the unaided work feeds into
    tq("tNext").innerHTML = `<table class="err">
        <tr><td>Direction of a dipole's field (part 1)</td><td class="n">${finds.filter((s) => ["reversed", "angle"].includes(s.kind)).length} students</td></tr>
        <tr><td>Dipole ${inv(3)} against point charge ${inv(2)} (part 2)</td><td class="n">${lunges.filter((s) => s.kind === "square").length} students</td></tr>
        <tr><td>Unit conversion (optional question)</td><td class="n">${tried.filter((s) => s.kind === "units").length} students</td></tr>
      </table>
      <p class="how">A student can appear in more than one row. Students with no mistake start the next lesson without an extra item.</p>`;
  }

  show(); showRange(); paintTeacher();
}
