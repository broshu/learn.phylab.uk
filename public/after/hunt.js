// learn.phylab.uk — After class, step 2: the hunt, alone, as one project in three parts.
//   1 Find it: read the field around the silt with the bill, then place and turn a shrimp where you think it is.
//   2 Get behind it: swim round to its tail, on its axis, no closer than 3 cm.
//   3 How far: back off along the axis, work out the distance from how the reading falls (1/r³), and lunge.
// A mistake at any part makes the shrimp flee; the mother explains that mistake and a new shrimp is hidden.
// An optional question follows: how far away can a shrimp be felt at all.
// Teacher side: the class's first attempt at each part, in pictures and statistics, and what feeds the next lesson.
import { Board, arrow, SOFT, MINE } from "/assets/board.js";
import { fieldLines } from "/assets/field.js";
import {
  HUNT, HUNT_KINDS, BEHIND_KINDS, DIST_KINDS, RANGE_KINDS, RANGE,
  newTruth, judgeHunt, judgeBehind, roomBehind, judgeDistance, judgeRange, fieldAt, ends,
} from "/after/model.js";
import { water, silt, shrimp, bill, onBill, grip, reading, label, fmt, num, M, MD, fr, k4, r3, inv, mum, OK, BAD } from "/after/scene.js";

const { W, H, silt: Z, inset, keepOut } = HUNT;
const MID = [(Z.x0 + Z.x1) / 2, (Z.y0 + Z.y1) / 2], NECK = 1.6, PINS = 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => +(+v).toFixed(2);
const PARTS = [["find", "Find it"], ["behind", "Get behind it"], ["measure", "How far"]];

/** Keep the bill out of the silt while searching: a point inside is pushed to the nearest edge. */
function outside(x, y) {
  const x0 = Z.x0 - keepOut, x1 = Z.x1 + keepOut, y0 = Z.y0 - keepOut, y1 = Z.y1 + keepOut;
  if (x <= x0 || x >= x1 || y <= y0 || y >= y1) return [x, y];
  const gaps = [[x - x0, [x0, y]], [x1 - x, [x1, y]], [y - y0, [x, y0]], [y1 - y, [x, y1]]];
  return gaps.sort((p, q) => p[0] - q[0])[0][1];
}

const fresh = () => ({
  truth: newTruth(), phase: "find", guess: { x: MID[0], y: MID[1], a: 0 }, placed: false, pins: [],
  snout: { x: 2, y: 2 }, start: null, back: 0, dpins: [], ans: "", hint: null, end: null,
});

export function startHunt({ student, teacher, rec, cls }) {
  const saved = rec.get("hunt");
  const st = saved && saved.phase ? saved : { ...fresh(), log: { finds: [], behinds: [], lunges: [], hunts: 0, caughtOn: 0 } };
  const rg = rec.get("range") || { tries: [], ok: false };
  const keep = () => { rec.set("hunt", st); rec.set("range", rg); };
  keep(); // kept from the start, so a refresh meets the same shrimp
  let lines = null; // the real field lines, drawn only when the hunt ends

  student.innerHTML = `
    <ol class="hparts" id="hParts">${PARTS.map(([k, t], i) => `<li data-p="${k}"><b>${i + 1}</b> ${t}</li>`).join("")}</ol>
    <p class="htask" id="hTask"></p>
    <div class="fieldbox"><canvas id="hBoard" aria-label="Murky river water with a patch of silt. Drag the platypus to read the electric field with its bill."></canvas></div>
    <div class="toolbar">
      <span class="readout" id="hRead"></span>
      <span style="flex:1"></span>
      <button class="btn small ghost" id="hClear">Clear readings</button>
      <button class="btn" id="hGo"></button>
    </div>
    <p class="muted small" style="margin:0 0 10px">Arrows show the direction of the field exactly. Their length is on a compressed scale, because the field changes a thousandfold across this picture; the number is the true strength.</p>
    <div class="two" id="hMeasure" hidden>
      <div>
        <table class="pins"><thead><tr><th>Backed off</th><th>Reading</th></tr></thead><tbody id="hPins"></tbody></table>
      </div>
      <div>
        <label class="plabel" for="hAns">Distance from your settled spot (0 on the ruler) to the shrimp's centre</label>
        <div class="ansrow"><input type="number" id="hAns" inputmode="decimal" min="0" step="0.1" autocomplete="off"><span>cm</span></div>
      </div>
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

  // ---------- where the platypus points, and where it may go ----------
  const axisU = () => [Math.cos(st.truth.a), Math.sin(st.truth.a)]; // the way the shrimp faces
  const facing = () => {
    if (st.start) return st.truth.a;                                       // settled: straight at the shrimp, along its axis
    const to = st.phase === "behind" ? [st.guess.x, st.guess.y] : MID;    // toward where it thinks the shrimp is
    return Math.atan2(to[1] - snout.y, to[0] - snout.x);
  };
  const along = (s) => { const [ux, uy] = axisU(); const d = st.start.r + s; return [st.truth.x - d * ux, st.truth.y - d * uy]; };
  function limitSnout(x, y) {
    if (st.phase === "find") return outside(x, y);
    if (st.phase === "measure") { // only backwards along the axis, from the settled spot
      const [ux, uy] = axisU();
      const s = clamp(-((x - st.truth.x) * ux + (y - st.truth.y) * uy) - st.start.r, 0, st.start.room);
      return along(Math.round(s * 10) / 10);
    }
    return [clamp(x, 0.2, W - 0.2), clamp(y, 0.2, H - 0.2)];
  }

  let snout, body, head, moving = null;
  const board = new Board($("hBoard"), {
    w: W, h: H, grid: false,
    paint(b, ctx) {
      water(b, ctx);
      silt(b, ctx, Z.x0, Z.y0, Z.x1, Z.y1, "silt");
      if (st.end) {
        lines = lines || fieldLines(ends(st.truth), { x0: 0, x1: W, y0: 0, y1: H }, 12);
        ctx.save(); ctx.strokeStyle = "rgba(26,32,48,0.3)"; ctx.lineWidth = 1.2;
        for (const l of lines) { ctx.beginPath(); l.forEach((p, i) => { const [x, y] = b.px(...p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
        ctx.restore();
      }
      if (st.start) ruler(b, ctx);
      st.pins.forEach((p) => reading(b, ctx, p.x, p.y, fieldAt(st.truth, p.x, p.y)));
      shrimp(b, ctx, st.guess, { color: "#b56a00", dash: true, charges: true, alpha: st.phase === "find" && !st.end ? 1 : 0.5 });
      if (st.phase === "find" && !st.placed && !st.end) label(ctx, "your guess", ...b.px(st.guess.x, st.guess.y - 1.05), "#8a5200");
      if (st.end) {
        shrimp(b, ctx, st.truth, { color: st.end.caught ? OK : BAD, charges: true });
        label(ctx, st.end.caught ? "the shrimp" : "where the shrimp was", ...b.px(st.truth.x, st.truth.y + 1.2), st.end.caught ? OK : BAD);
      }
      if (!snout) return;
      bill(b, ctx, snout.x, snout.y, facing(), 0.94);
      if (!st.end) { reading(b, ctx, snout.x, snout.y, fieldAt(st.truth, snout.x, snout.y), MINE, 3.4); grip(b, ctx, snout.x, snout.y); }
    },
    onChange(b, ended) {
      if (b._drag) moving = b._drag;
      st.snout = { x: r1(snout.x), y: r1(snout.y) };
      if (st.phase === "find") {
        st.guess = { x: r1(body.x), y: r1(body.y), a: st.guess.a };
        if (moving && moving !== snout) st.placed = true;
      }
      if (st.phase === "measure") st.back = Math.round(Math.hypot(snout.x - st.start.x, snout.y - st.start.y) * 10) / 10;
      read();
      if (!ended) return;
      if (moving === snout && st.phase === "find") { // letting go of the bill leaves a reading behind
        st.pins.push({ ...st.snout }); if (st.pins.length > PINS) st.pins.shift();
        rec.event("hunt-reading", { n: st.pins.length });
      }
      if (moving === snout && st.phase === "measure") {
        const E = +Math.hypot(...fieldAt(st.truth, snout.x, snout.y)).toPrecision(3);
        st.dpins = st.dpins.filter((p) => p.b !== st.back); st.dpins.push({ b: st.back, E });
        st.dpins.sort((p, q) => p.b - q.b); if (st.dpins.length > 6) st.dpins.shift();
        rec.event("hunt-measure-reading", { b: st.back }); pins();
      }
      if (st.hint && moving === snout && st.phase !== "measure") { st.hint = null; $("hFb").innerHTML = ""; }
      moving = null; keep(); b.draw();
    },
  });
  // the platypus: grabbed by the ring at its bill tip or anywhere on its head and body
  snout = board.addHandle({ x: st.snout.x, y: st.snout.y, show: false, limit: limitSnout, hit: (x, y) => !st.end && onBill(snout.x, snout.y, facing(), x, y) });
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
  const handles = { find: [head, body, snout], behind: [snout], measure: [snout] };

  /** The ruler along the axis, behind the settled spot: how far the bill has backed off. */
  function ruler(b, ctx) {
    const [ux, uy] = axisU(), nx = -uy, ny = ux, n = Math.floor(st.start.room * 2 + 1e-6);
    const off = 1.15; // to one side of the axis, clear of the platypus
    const P = (s, o) => { const [x, y] = along(s); return b.px(x + nx * o, y + ny * o); };
    ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = SOFT; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(...b.px(...along(-0.9))); ctx.lineTo(...b.px(...along(st.start.room))); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.strokeStyle = "rgba(26,32,48,0.8)"; ctx.fillStyle = "#1a2030"; ctx.lineWidth = 1.4;
    ctx.font = "12px -apple-system, 'Segoe UI', Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.beginPath(); ctx.moveTo(...P(0, off)); ctx.lineTo(...P(n / 2, off));
    for (let k = 0; k <= n; k++) { const [x0, y0] = P(k / 2, off), [x1, y1] = P(k / 2, off + (k % 2 ? 0.15 : 0.28)); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
    ctx.stroke();
    for (let k = 0; k <= n; k += 2) ctx.fillText(String(k / 2), ...P(k / 2, off + 0.55));
    ctx.restore();
    label(ctx, "cm backed off", ...P(n / 2 + 0.2, off + 1.0), "#1a2030");
  }

  const read = () => {
    if (st.end) { $("hRead").textContent = ""; return; }
    const E = fmt(Math.hypot(...fieldAt(st.truth, snout.x, snout.y)));
    $("hRead").textContent = st.phase === "measure" ? `Backed off ${st.back.toFixed(1)} cm · reading: ${E}` : "Reading at your bill: " + E;
  };
  function pins() {
    $("hPins").innerHTML = st.dpins.length
      ? st.dpins.map((p) => `<tr><td>${p.b.toFixed(1)} cm</td><td>${num(p.E)} &micro;V/cm</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">Drag the platypus back along the dashed line. Each time you let go, the reading is noted here.</td></tr>`;
  }

  $("hClear").addEventListener("click", () => {
    if (st.end) return;
    if (st.phase === "find") st.pins = []; else if (st.phase === "measure") { st.dpins = st.dpins.filter((p) => p.b === 0); pins(); }
    keep(); rec.event("hunt-clear", { phase: st.phase }); board.draw();
  });
  $("hAns").addEventListener("input", (e) => { st.ans = e.target.value; keep(); });
  $("hAns").addEventListener("keydown", (e) => { if (e.key === "Enter") $("hGo").click(); });
  $("hGo").addEventListener("click", () => ({ find: markIt, behind: settle, measure: lunge })[st.phase]());

  function markIt() {
    if (!st.placed) { st.hint = "place"; return show(); }
    const j = judgeHunt(st.guess, st.truth);
    const r = { kind: j.kind, dist: r1(j.dist), turn: Math.round(j.turn), rel: j.rel.map(r1), readings: st.pins.length };
    st.log.finds.push(r); rec.event("hunt-find", r);
    if (j.caught) { st.phase = "behind"; st.hint = "found"; } else finish({ part: "find", ...r });
    keep(); show(); paintTeacher();
  }
  function settle() {
    const j = judgeBehind(snout.x, snout.y, st.truth);
    st.log.behinds.push({ kind: j.kind }); rec.event("hunt-behind", { kind: j.kind, r: r1(j.r) });
    if (BEHIND_KINDS[j.kind] && BEHIND_KINDS[j.kind].fatal) finish({ part: "behind", kind: j.kind });
    else if (j.kind !== "ok") st.hint = j.kind;
    else { // settle exactly on the axis, at the same distance
      const r = Math.round(j.r * 10) / 10, [ux, uy] = axisU();
      const sx = st.truth.x - r * ux, sy = st.truth.y - r * uy;
      st.start = { x: r1(sx), y: r1(sy), r, room: Math.min(4, Math.floor(roomBehind(st.truth, r) * 2) / 2) };
      snout.x = sx; snout.y = sy; st.snout = { x: r1(sx), y: r1(sy) };
      st.dpins = [{ b: 0, E: +Math.hypot(...fieldAt(st.truth, sx, sy)).toPrecision(3) }];
      st.phase = "measure"; st.hint = "settled"; st.back = 0;
    }
    keep(); show(); paintTeacher();
  }
  function lunge() {
    const ans = parseFloat($("hAns").value);
    if (!(ans > 0)) { st.hint = "noans"; return show(); }
    const j = judgeDistance(ans, st.start.r, st.dpins);
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
    snout.x = st.snout.x; snout.y = st.snout.y; body.x = MID[0]; body.y = MID[1]; head.x = MID[0] + NECK; head.y = MID[1];
    rec.event("hunt-again", { hunts: log.hunts }); keep(); show();
  }

  const TASK = {
    find: `Drag the platypus around the silt (by its bill or its head): each time you let go, the reading stays on the picture. Then drag the dashed shrimp to where you think the real one is, turn it by the grip at its head, and press <b>Found it</b>. You must be within 1.2 cm of it and within 45&deg; of its heading.`,
    behind: `Now swim round behind its tail, on its axis, and press <b>Settle here</b>. Do not come closer than 3 cm, or it will feel the water move; do not come round to its head, or it will see you.`,
    measure: `You are on its axis, behind its tail. Drag the platypus back along the dashed line to take more readings, work out how far the shrimp's centre is from your settled spot, and lunge. You must be right within 15%.`,
  };
  const HINT = {
    place: `<p class="note warn" style="margin:0">First drag the dashed shrimp to where you think the real one is, and turn it by the orange grip at its head.</p>`,
    found: `<p class="note" style="margin:0"><strong>You have found it.</strong> Your dashed shrimp is close to the real one, but not exact: the real one is still hidden. Next, get behind its tail.</p>`,
    off: `<p class="note warn" style="margin:0">Not on its axis yet. Keep the same distance and slide round: on the axis behind the tail, the reading is the strongest for that distance and points straight at the shrimp.</p>`,
    weak: `<p class="note warn" style="margin:0">You cannot feel it from here: the reading is below 50 &micro;V/cm. Come closer, but not within 3 cm.</p>`,
    room: `<p class="note warn" style="margin:0">There is no room behind you to back off and take more readings. Settle a little nearer the shrimp (but not within 3 cm).</p>`,
    settled: `<p class="note" style="margin:0"><strong>Settled on its axis.</strong> The reading is the strongest here and points straight at the shrimp. Now find the distance.</p>`,
    noans: `<p class="note warn" style="margin:0">Type the distance in centimetres first.</p>`,
  };

  function show() {
    const p = st.phase, at = PARTS.findIndex(([k]) => k === p);
    [...$("hParts").children].forEach((li, i) => {
      li.className = st.end ? (i < at || st.end.caught ? "ok" : i === at ? "no" : "") : i < at ? "ok" : i === at ? "now" : "";
    });
    $("hTask").innerHTML = st.end ? "" : TASK[p];
    board.handles = st.end ? [] : handles[p];
    board.locked = !!st.end;
    $("hGo").textContent = { find: "Found it", behind: "Settle here", measure: "Lunge" }[p];
    $("hGo").disabled = !!st.end; $("hClear").disabled = !!st.end || p === "behind";
    $("hMeasure").hidden = p !== "measure"; $("hAns").disabled = !!st.end; $("hAns").value = st.ans;
    read(); pins(); board.draw();
    if (!st.end) { $("hFb").innerHTML = st.hint ? HINT[st.hint] : ""; return; }
    const e = st.end;
    if (e.caught) {
      $("hFb").innerHTML = `<p class="note" style="margin:12px 0 0"><strong>Caught, on hunt ${st.log.hunts}.</strong> You said ${e.ans} cm; it was ${st.start.r} cm. You found it from the direction of its field, got behind it on its axis, and two readings told you how far, because the way a dipole's field falls with distance is known. The grey lines are its real field.</p>
        <div class="toolbar"><button class="btn small ghost" id="hAgain">Hunt another shrimp</button></div>`;
    } else {
      $("hFb").innerHTML = `<div class="card burrow" style="margin-top:12px">${mum(`<h3>The shrimp got away</h3>${why(e)}
        <p class="muted small">The picture shows where it was, with its real field in grey. Compare the grey lines with your readings.</p>
        <button class="btn" id="hAgain">Go out again</button>`, "Back at the burrow · mother")}</div>`;
    }
    $("hAgain").addEventListener("click", again);
  }

  function why(e) {
    if (e.part === "find") return {
      position: `<p>You thought it was ${e.dist} cm from where it really was, so you circled round the wrong spot and it heard you. The field of a dipole falls off like ${inv(3)}: halve your distance and the reading is 8 times stronger. So the size of the reading tells you how near you are.</p>
        <p>Sweep your bill along each side of the silt and find where the reading peaks on that side. The shrimp lies between those peaks, nearest the side with the largest reading.</p>`,
      reversed: `<p>You found the right place, but it was facing the other way, so you would have come round to its head instead of its tail.</p>
        <p>Field lines leave the + end, at the head, and arrive at the &minus; end, at the tail. Readings taken in front of the head point away from the shrimp; readings taken behind the tail point toward it.</p>`,
      angle: `<p>You found the right place, but its heading was ${Math.abs(e.turn)}&deg; away from your guess, so you would have come at it from the side.</p>
        <p>On the shrimp's axis the reading lies along the axis and is the strongest for that distance. Beside the shrimp the reading is parallel to the axis but points the opposite way. Find where the readings point straight out of the silt and straight into it: the line joining them is the axis.</p>`,
    }[e.kind];
    if (e.part === "behind") return {
      close: `<p>You came within 3 cm, and it felt the water move. You do not need to come close: two readings from farther away tell you the distance.</p>`,
      front: `<p>You came round to its head, where it can see you. Behind the tail, the reading points toward the shrimp; in front of its head, it points away from it. Check which way the reading points before you settle.</p>`,
    }[e.kind];
    const back = `<p>You lunged ${e.ans} cm; it was ${st.start.r} cm away, so you ${e.ans < st.start.r ? "stopped short" : "overshot and it darted aside"}.</p>`;
    return back + {
      one: `<p>One reading cannot give the distance: a strong shrimp far away and a weak one close by can give the same reading. Back off, take a second reading, and use how much the reading has fallen.</p>`,
      square: `<p>Your answer fits a field that falls like ${inv(2)}. That is the field of a single point charge. A shrimp is a dipole: on its axis the field falls like ${inv(3)}, so backing off from ${M("<mi>r</mi>")} to ${M("<mi>r</mi><mo>+</mo><mi>d</mi>")} divides the reading by</p>${MD(`<msup><mrow><mo>(</mo>${fr("<mrow><mi>r</mi><mo>+</mo><mi>d</mi></mrow>", "<mi>r</mi>")}<mo>)</mo></mrow><mn>3</mn></msup>`)}`,
      spot: `<p>Your number is the distance from the place you backed off to. The lunge starts from your settled spot, 0 on the ruler, so ${M("<mi>r</mi>")} must be measured from there.</p>`,
      other: `<p>Use two readings and divide one by the other, so that the unknown dipole moment cancels. With ${M("<msub><mi>E</mi><mn>1</mn></msub>")} read at your settled spot, a distance ${M("<mi>r</mi>")} from the shrimp, and ${M("<msub><mi>E</mi><mn>2</mn></msub>")} read after backing off by ${M("<mi>d</mi>")}:</p>${MD(`${fr("<msub><mi>E</mi><mn>1</mn></msub>", "<msub><mi>E</mi><mn>2</mn></msub>")}<mo>=</mo><msup><mrow><mo>(</mo>${fr("<mrow><mi>r</mi><mo>+</mo><mi>d</mi></mrow>", "<mi>r</mi>")}<mo>)</mo></mrow><mn>3</mn></msup>`)}<p>Take the cube root of the ratio of your readings, then solve for ${M("<mi>r</mi>")}.</p>`,
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
      <div class="qhead"><h3>Part 2 · getting behind it</h3><span class="pct" id="t2Pct"></span></div>
      <div id="t2Stats"></div>
    </div>
    <div class="card tcard">
      <div class="qhead"><h3>Part 3 · how far</h3><span class="pct" id="t3Pct"></span></div>
      <p class="task">Each student's first lunge, divided by the real distance of their own shrimp.</p>
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
      label(ctx, "close enough (1.2 cm)", ...b.px(VW / 2, VH / 2 - HUNT.POS - 0.28), SOFT);
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
    // part 2: the first time each student settled, or was caught out
    const firstB = L.behinds.find((b) => b.kind === "ok" || BEHIND_KINDS[b.kind].fatal);
    const behinds = cls.map((s) => s.behind).filter(Boolean);
    if (firstB) behinds.push({ kind: firstB.kind, hints: L.behinds.slice(0, L.behinds.indexOf(firstB)).length });
    n = behinds.length; pct = (c) => Math.round((100 * c) / n);
    const okB = behinds.filter((s) => s.kind === "ok").length;
    tq("t2Pct").innerHTML = `${pct(okB)}% <small>got behind it at the first try</small>`;
    tq("t2Stats").innerHTML = `<table class="err">
        <tr class="ok"><td>Got behind it, on its axis<div class="bar" style="width:${pct(okB)}%"></div></td><td class="n">${okB} / ${n}</td></tr>
        ${rows(behinds, { close: BEHIND_KINDS.close, front: BEHIND_KINDS.front }, pct)}
        <tr class="rest"><td>Needed a hint first ("not on the axis yet" and the like)</td><td class="n">${behinds.filter((s) => s.hints).length}</td></tr></table>
      <p class="how">Out of the students who found the shrimp in part 1.</p>`;
    // part 3
    const lunges = cls.map((s) => s.dist && s.dist.first).filter(Boolean); const mine = L.lunges[0]; if (mine) lunges.push(mine);
    n = lunges.length; pct = (c) => Math.round((100 * c) / n);
    const right = lunges.filter((s) => s.kind === "caught").length;
    const bins = NAMES.map((_, i) => lunges.filter((s) => s.ratio >= EDGES[i] && s.ratio < EDGES[i + 1]).length), top = Math.max(...bins, 1);
    const mineBin = mine ? NAMES.findIndex((_, i) => mine.ratio >= EDGES[i] && mine.ratio < EDGES[i + 1]) : -1;
    tq("t3Pct").innerHTML = `${pct(right)}% <small>right at the first lunge</small>`;
    tq("t3Hist").innerHTML = bins.map((c, i) => `<div${i === mineBin ? ' class="me"' : ""}><b>${c}</b><i style="height:${Math.round((70 * c) / top)}px;background:${i === 3 ? OK : BAD}"></i>${NAMES[i]}</div>`).join("");
    const tried = cls.filter((s) => s.range).map((s) => s.range); if (rg.tries.length) tried.push(rg.tries[0]);
    const hunts = cls.map((s) => s.hunts); if (L.caughtOn) hunts.push(L.caughtOn);
    const hb = [1, 2, 3, 4].map((k) => hunts.filter((v) => (k < 4 ? v === k : v >= 4)).length), htop = Math.max(...hb, 1);
    tq("t3Stats").innerHTML = `
      <p class="how" style="margin:8px 0 12px">Answers near 0.6 come from treating the shrimp as one point charge (${inv(2)}).${mine ? " The outlined bar holds the student on the left." : ""}</p>
      <table class="err">
        <tr class="ok"><td>Right at the first lunge<div class="bar" style="width:${pct(right)}%"></div></td><td class="n">${right} / ${n}</td></tr>
        ${rows(lunges, DIST_KINDS, pct)}</table>
      <h4 class="tsub">Hunts needed to catch a shrimp</h4>
      <div class="dist">${hb.map((c, i) => `<div><b>${c}</b><i style="height:${Math.round((52 * c) / htop)}px"></i>${i < 3 ? i + 1 : "4+"}</div>`).join("")}</div>
      <h4 class="tsub">Optional question: sensing range</h4>
      <table class="err">
        <tr class="ok"><td>Right at the first try</td><td class="n">${tried.filter((s) => s.kind === "ok").length} / ${tried.length} who tried</td></tr>
        ${Object.keys(RANGE_KINDS).map((k) => [k, tried.filter((s) => s.kind === k).length]).filter(([, c]) => c).map(([k, c]) => `<tr><td>${RANGE_KINDS[k].label}</td><td class="n">${c}</td></tr>`).join("")}
      </table>`;
    // what the unaided work feeds into
    const dir = finds.filter((s) => ["reversed", "angle"].includes(s.kind)).length + behinds.filter((s) => s.kind === "front").length;
    tq("tNext").innerHTML = `<table class="err">
        <tr><td>Direction of a dipole's field (parts 1 and 2)</td><td class="n">${dir} students</td></tr>
        <tr><td>Dipole ${inv(3)} against point charge ${inv(2)} (part 3)</td><td class="n">${lunges.filter((s) => s.kind === "square").length} students</td></tr>
        <tr><td>Unit conversion (optional question)</td><td class="n">${tried.filter((s) => s.kind === "units").length} students</td></tr>
      </table>
      <p class="how">A student can appear in more than one row. Students with no mistake start the next lesson without an extra item.</p>`;
  }

  show(); showRange(); paintTeacher();
}
