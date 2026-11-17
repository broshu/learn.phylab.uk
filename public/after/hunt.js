// learn.phylab.uk — After class, step 2: the first hunt, alone. A shrimp hides in the silt; the student reads the
// field around the silt with the bill, then places a shrimp where they think it is, facing the way they think it faces.
// In class students went from charges to the field; here they go from the field back to the charges.
// Teacher side: every student's first strike seen from the real shrimp, in one picture, with statistics.
import { Board, arrow, SOFT, MINE } from "/assets/board.js";
import { fieldLines } from "/assets/field.js";
import { HUNT, HUNT_KINDS, judgeHunt, fieldAt, ends } from "/after/model.js";
import { water, silt, shrimp, bill, reading, label, fmt, inv, mum, OK, BAD } from "/after/scene.js";

const { W, H, silt: Z, inset, keepOut } = HUNT;
const MID = [(Z.x0 + Z.x1) / 2, (Z.y0 + Z.y1) / 2], NECK = 1.6, PINS = 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const newTruth = () => ({
  x: +(Z.x0 + inset + Math.random() * (Z.x1 - Z.x0 - 2 * inset)).toFixed(2),
  y: +(Z.y0 + inset + Math.random() * (Z.y1 - Z.y0 - 2 * inset)).toFixed(2),
  a: +(Math.random() * 2 * Math.PI).toFixed(3),
});
/** Keep the bill out of the silt: a point inside is pushed to the nearest edge. */
function outside(x, y) {
  const x0 = Z.x0 - keepOut, x1 = Z.x1 + keepOut, y0 = Z.y0 - keepOut, y1 = Z.y1 + keepOut;
  if (x <= x0 || x >= x1 || y <= y0 || y >= y1) return [x, y];
  const gaps = [[x - x0, [x0, y]], [x1 - x, [x1, y]], [y - y0, [x, y0]], [y1 - y, [x, y1]]];
  return gaps.sort((p, q) => p[0] - q[0])[0][1];
}

export function startHunt({ student, teacher, rec, cls, onChange = () => {} }) {
  const st = rec.get("hunt") || { truth: newTruth(), guess: { x: MID[0], y: MID[1], a: 0 }, placed: false, pins: [], strikes: [], last: null, snout: { x: 2, y: 2 } };
  const keep = () => { rec.set("hunt", st); onChange(st); };
  let lines = null; // the real field lines, drawn only after a strike
  rec.set("hunt", st); // kept from the start, so a refresh meets the same shrimp

  student.innerHTML = `
    <div class="fieldbox"><canvas id="hBoard" aria-label="Murky water with a patch of silt in the middle. Drag the platypus bill around the silt to read the electric field."></canvas></div>
    <div class="toolbar">
      <span class="readout" id="hRead"></span>
      <span style="flex:1"></span>
      <button class="btn small ghost" id="hClear">Clear readings</button>
      <button class="btn" id="hStrike">Strike</button>
    </div>
    <p class="muted small" style="margin:0 0 10px">Arrows show the direction of the field exactly. Their length is on a compressed scale, because the field changes a thousandfold across this picture; the number is the true strength.</p>
    <div id="hFb" aria-live="polite"></div>`;
  const $ = (id) => student.querySelector("#" + id);

  let snout, body, head, moving = null;
  const board = new Board($("hBoard"), {
    w: W, h: H, grid: false,
    paint(b, ctx) {
      water(b, ctx);
      silt(b, ctx, Z.x0, Z.y0, Z.x1, Z.y1, "silt");
      if (st.last) {
        lines = lines || fieldLines(ends(st.truth), { x0: 0, x1: W, y0: 0, y1: H }, 12);
        ctx.save(); ctx.strokeStyle = "rgba(26,32,48,0.3)"; ctx.lineWidth = 1.2;
        for (const l of lines) { ctx.beginPath(); l.forEach((p, i) => { const [x, y] = b.px(...p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
        ctx.restore();
      }
      st.pins.forEach((p) => reading(b, ctx, p.x, p.y, fieldAt(st.truth, p.x, p.y)));
      shrimp(b, ctx, st.guess, { color: "#b56a00", dash: true });
      if (st.last) {
        shrimp(b, ctx, st.truth, { color: st.last.caught ? OK : BAD, charges: true });
        label(ctx, st.last.caught ? "the shrimp" : "where the shrimp was", ...b.px(st.truth.x, Z.y0 - 0.45), st.last.caught ? OK : BAD);
      }
      if (!st.placed && !st.last) label(ctx, "your guess", ...b.px(st.guess.x, st.guess.y - 1.05), "#8a5200");
      if (!snout) return;
      const a = Math.atan2(MID[1] - snout.y, MID[0] - snout.x);
      bill(b, ctx, snout.x, snout.y, a, 0.92);
      if (!st.last) reading(b, ctx, snout.x, snout.y, fieldAt(st.truth, snout.x, snout.y), MINE, 3.4);
    },
    onChange(b, ended) {
      if (b._drag) moving = b._drag;
      st.snout = { x: +snout.x.toFixed(2), y: +snout.y.toFixed(2) };
      st.guess = { x: +body.x.toFixed(2), y: +body.y.toFixed(2), a: st.guess.a };
      if (moving && moving !== snout) st.placed = true;
      read();
      if (!ended) return;
      if (moving === snout) { // letting go of the bill leaves a reading behind
        st.pins.push({ ...st.snout }); if (st.pins.length > PINS) st.pins.shift();
        rec.event("hunt-reading", { n: st.pins.length });
      }
      moving = null; keep(); b.draw();
    },
  });
  snout = board.addHandle({ x: st.snout.x, y: st.snout.y, show: false, limit: outside });
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
  const read = () => { $("hRead").textContent = st.last ? "" : "Reading at your bill: " + fmt(Math.hypot(...fieldAt(st.truth, snout.x, snout.y))); };

  $("hClear").addEventListener("click", () => { if (st.last) return; st.pins = []; keep(); rec.event("hunt-clear"); board.draw(); });
  $("hStrike").addEventListener("click", () => {
    if (st.last) return;
    if (!st.placed) { $("hFb").innerHTML = `<p class="note warn" style="margin:0">First drag the dashed shrimp to where you think the real one is, and turn it by the orange grip at its head.</p>`; return; }
    const j = judgeHunt(st.guess, st.truth);
    st.last = { kind: j.kind, caught: j.caught, dist: +j.dist.toFixed(2), turn: Math.round(j.turn), rel: j.rel.map((n) => +n.toFixed(2)), readings: st.pins.length };
    st.strikes.push(st.last);
    rec.event("hunt-strike", st.last); keep(); show(); paintTeacher();
  });

  function again() {
    Object.assign(st, { truth: newTruth(), guess: { x: MID[0], y: MID[1], a: 0 }, placed: false, pins: [], last: null });
    lines = null; body.x = MID[0]; body.y = MID[1]; head.x = MID[0] + NECK; head.y = MID[1];
    rec.event("hunt-again", { strikes: st.strikes.length }); keep(); show();
  }

  function show() {
    const j = st.last;
    board.locked = !!j; $("hStrike").disabled = !!j; $("hClear").disabled = !!j;
    read(); board.draw();
    if (!j) { $("hFb").innerHTML = ""; return; }
    const n = st.strikes.length;
    if (j.caught) {
      $("hFb").innerHTML = `<p class="note" style="margin:0"><strong>Caught, on strike ${n}.</strong> You were ${j.dist} cm from its centre and ${Math.abs(j.turn)}° off its heading, close enough to grab it from behind. The grey lines are its real field: each of your readings lies along one of them.</p>
        <div class="toolbar"><button class="btn small ghost" id="hAgain">Hunt another shrimp</button></div>`;
    } else {
      const why = {
        position: `<p>You struck ${j.dist} cm away from it, too far to reach. The field of a dipole falls off like ${inv(3)}: halve your distance and the reading is 8 times stronger. So the size of the reading tells you a lot about how near you are.</p>
          <p>Sweep your bill along each side of the silt and find where the reading peaks on that side. The shrimp lies between those peaks, nearest the side with the largest reading.</p>`,
        reversed: `<p>You found the right place, but it was facing the other way, so it shot off backwards before you could grab it.</p>
          <p>Field lines leave the + end, at the head, and arrive at the &minus; end, at the tail. Readings taken in front of the head point away from the shrimp; readings taken behind the tail point toward it.</p>`,
        angle: `<p>You found the right place, but its heading was ${Math.abs(j.turn)}° away from your guess, and it slipped past your bill.</p>
          <p>On the shrimp's axis the reading lies along the axis, and it is the strongest for that distance. Beside the shrimp the reading is parallel to the axis but points the opposite way. Find the two sides where the readings point straight out of the silt and straight into it: the line joining them is the axis.</p>`,
      }[j.kind];
      $("hFb").innerHTML = `<div class="card burrow">${mum(`<h3>The shrimp got away</h3>${why}
        <p class="muted small">The picture shows where it was, with its real field in grey. Compare the grey lines with your readings.</p>
        <button class="btn" id="hAgain">Go out again</button>`, "Back at the burrow · mother")}</div>`;
    }
    $("hAgain").addEventListener("click", again);
  }

  // ---------- teacher ----------
  teacher.innerHTML = `
    <div class="qhead"><h3>Hunt 1 · class picture</h3><span class="pct" id="thPct"></span></div>
    <p class="task">Each student hunts a different shrimp, so every first strike is drawn as seen from the real shrimp (centre, facing right). A dot is where the student struck, its arrow the heading they chose. ${cls.length} students (simulated).</p>
    <div class="plot"><canvas id="thBoard"></canvas></div>
    <div class="key" style="margin:8px 0 12px"><span><i style="background:${OK}"></i>caught</span><span><i style="background:${BAD}"></i>got away</span><span><i style="background:${MINE}"></i>student on the left</span></div>
    <div id="thStats"></div>`;
  const tq = (id) => teacher.querySelector("#" + id);
  const VW = 6.4, VH = 4.8, at = (rel) => [VW / 2 + clamp(rel[0], -3, 3), VH / 2 + clamp(rel[1], -2.2, 2.2)];
  const mark = (b, ctx, s, width, alpha, ringed) => {
    const p = at(s.rel), a = (s.turn * Math.PI) / 180, col = s.caught ? OK : BAD;
    ctx.save(); ctx.globalAlpha = alpha;
    arrow(ctx, ...b.px(...p), ...b.px(p[0] + 0.45 * Math.cos(a), p[1] + 0.45 * Math.sin(a)), col, width);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(...b.px(...p), width + 1.2, 0, 7); ctx.fill();
    if (ringed) { ctx.strokeStyle = MINE; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(...b.px(...p), 9, 0, 7); ctx.stroke(); }
    ctx.restore();
  };
  const tBoard = new Board(tq("thBoard"), {
    w: VW, h: VH, grid: false,
    paint(b, ctx) {
      ctx.fillStyle = "#f4f6f3"; ctx.fillRect(0, 0, b.w, b.h);
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = SOFT; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(...b.px(VW / 2, VH / 2), HUNT.POS * b.scale, 0, 7); ctx.stroke(); ctx.restore();
      label(ctx, "within reach (1.2 cm)", ...b.px(VW / 2, VH / 2 - HUNT.POS - 0.28), SOFT);
      shrimp(b, ctx, { x: VW / 2, y: VH / 2, a: 0 }, { color: "#55607a", alpha: 0.45 });
      cls.forEach((s) => mark(b, ctx, s.hunt.first, 1.6, 0.75, false));
      st.strikes.slice(0, 1).forEach((s) => mark(b, ctx, s, 3, 1, true));
    },
  });
  tBoard.locked = true;

  function paintTeacher() {
    tBoard.draw();
    const mine = st.strikes[0], caughtAt = st.strikes.findIndex((s) => s.caught) + 1;
    const firsts = cls.map((s) => s.hunt.first); if (mine) firsts.push(mine);
    const needed = cls.map((s) => s.hunt.strikes); if (caughtAt) needed.push(caughtAt);
    const n = firsts.length, pct = (c) => Math.round((100 * c) / n);
    const caught = firsts.filter((s) => s.caught).length;
    const kinds = Object.keys(HUNT_KINDS).map((k) => [k, firsts.filter((s) => s.kind === k).length]).sort((a, b) => b[1] - a[1]);
    const bins = [1, 2, 3, 4].map((k) => needed.filter((v) => (k < 4 ? v === k : v >= 4)).length), top = Math.max(...bins, 1);
    const reads = cls.map((s) => s.hunt.readings); if (mine) reads.push(mine.readings);
    tq("thPct").innerHTML = `${pct(caught)}% <small>caught at the first strike</small>`;
    tq("thStats").innerHTML = `
      <table class="err">
        <tr class="ok"><td>Caught at the first strike<div class="bar" style="width:${pct(caught)}%"></div></td><td class="n">${caught} / ${n}</td></tr>
        ${kinds.filter(([, c]) => c).map(([k, c]) => `<tr><td>${HUNT_KINDS[k].label}<div class="bar" style="width:${pct(c)}%"></div></td><td class="n">${c}</td></tr>`).join("")}
      </table>
      <h4 class="tsub">Strikes needed to catch a shrimp</h4>
      <div class="dist">${bins.map((c, i) => `<div><b>${c}</b><i style="height:${Math.round((52 * c) / top)}px"></i>${i < 3 ? i + 1 : "4+"}</div>`).join("")}</div>
      <p class="how">Readings taken before the first strike: ${(reads.reduce((a, c) => a + c, 0) / reads.length).toFixed(1)} on average.${mine ? " Includes the student on the left." : ""}</p>`;
  }

  show(); paintTeacher();
}
