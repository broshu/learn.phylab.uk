// learn.phylab.uk — After class, step 3: the second hunt, alone, with a calculation. The shrimp is straight ahead
// on its own axis. The student backs off along the axis, takes readings, works out the distance from the way the
// reading falls (a dipole: 1/r³), and lunges that far. An optional question asks how far away a shrimp can be felt.
// Teacher side: the class's first answers, the kinds of mistake, and what this feeds into the next lesson.
import { Board, SOFT, MINE } from "/assets/board.js";
import { DIST, DIST_KINDS, RANGE_KINDS, RANGE, judgeDistance, judgeRange, axisField } from "/after/model.js";
import { water, silt, shrimp, bill, reading, label, fmt, num, M, MD, fr, k4, r3, inv, mum, OK, BAD } from "/after/scene.js";

const { W, H, y: Y, start: X0, back: BACK } = DIST;
const newR = () => +(4 + Math.floor(Math.random() * 21) / 10).toFixed(1); // 4.0 to 6.0 cm: far enough for the far-field formula
const E1E2 = fr(`<msub><mi>E</mi><mn>1</mn></msub>`, `<msub><mi>E</mi><mn>2</mn></msub>`);
const RATIO = MD(`${E1E2}<mo>=</mo><msup><mrow><mo>(</mo>${fr("<mrow><mi>r</mi><mo>+</mo><mi>d</mi></mrow>", "<mi>r</mi>")}<mo>)</mo></mrow><mn>3</mn></msup>`);

export function startDistance({ student, teacher, rec, cls }) {
  const st = rec.get("dist") || { r: newR(), back: 0, pins: [], strikes: [], last: null, ans: "" };
  const rg = rec.get("range") || { tries: [], ok: false };
  const keep = () => { rec.set("dist", st); rec.set("range", rg); };
  keep(); // kept from the start, so a refresh meets the same shrimp

  student.innerHTML = `
    <div class="fieldbox"><canvas id="dBoard" aria-label="The platypus bill on a dashed line that runs into silt. Drag the bill backwards along the line to read the field at different distances."></canvas></div>
    <div class="toolbar"><span class="readout" id="dRead"></span></div>
    <div class="two">
      <div>
        <table class="pins"><thead><tr><th>Backed off</th><th>Reading</th></tr></thead><tbody id="dPins"></tbody></table>
        <button class="btn small ghost" id="dClear">Clear readings</button>
      </div>
      <div>
        <label class="plabel" for="dAns">Distance from your starting spot (0 on the ruler) to the shrimp</label>
        <div class="ansrow"><input type="number" id="dAns" inputmode="decimal" min="0" step="0.1" autocomplete="off"><span>cm</span><button class="btn" id="dGo">Lunge</button></div>
      </div>
    </div>
    <div id="dFb" aria-live="polite"></div>

    <div class="card q" style="margin-top:26px">
      <span class="tag">Optional · harder</span>
      <p class="stem" style="margin-top:6px">Mother's last question. A shrimp of this kind has dipole moment ${M(`<mi>p</mi><mo>=</mo><mn>3.0</mn><mo>&#xD7;</mo><msup><mn>10</mn><mrow><mo>&#x2212;</mo><mn>16</mn></mrow></msup><mtext>&#xA0;C&#x2009;m</mtext>`)}. Your bill feels nothing weaker than 50 &micro;V/cm. Facing the shrimp along its axis, from how far away can you first feel it?</p>
      <p class="muted">${M(`${k4}<mo>=</mo><mn>8.99</mn><mo>&#xD7;</mo><msup><mn>10</mn><mn>9</mn></msup><mtext>&#xA0;N&#x2009;m&#xB2;/C&#xB2;</mtext>`)} &nbsp;·&nbsp; 1 &micro;V/cm = ${M("<msup><mn>10</mn><mrow><mo>&#x2212;</mo><mn>4</mn></mrow></msup>")} N/C</p>
      <div class="ansrow"><input type="number" id="rAns" inputmode="decimal" min="0" step="0.1" autocomplete="off"><span>cm</span><button class="btn" id="rGo">Check</button></div>
      <div id="rFb" aria-live="polite" style="margin-top:12px"></div>
    </div>`;
  const $ = (id) => student.querySelector("#" + id);

  let snout;
  const board = new Board($("dBoard"), {
    w: W, h: H, grid: false,
    paint(b, ctx) {
      water(b, ctx);
      silt(b, ctx, X0 + 1.4, 0.35, W + 1, H - 0.35, "silt");
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = SOFT; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(...b.px(0, Y)); ctx.lineTo(...b.px(W, Y)); ctx.stroke(); ctx.restore();
      label(ctx, "the shrimp's axis", ...b.px(0.3, H - 0.55), SOFT, "left");
      // the ruler: how far the bill has backed off from where it started
      ctx.save(); ctx.strokeStyle = "#1a2030"; ctx.fillStyle = "#1a2030"; ctx.lineWidth = 1.4; ctx.font = "12px -apple-system, 'Segoe UI', Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.beginPath(); ctx.moveTo(...b.px(X0 - BACK, 1)); ctx.lineTo(...b.px(X0, 1));
      for (let k = 0; k <= BACK * 2; k++) { const [x, y] = b.px(X0 - k / 2, 1); ctx.moveTo(x, y); ctx.lineTo(x, y + (k % 2 ? 4 : 8)); if (k % 2 === 0) ctx.fillText(String(k / 2), x, y + 10); }
      ctx.stroke(); ctx.restore();
      label(ctx, "cm backed off", ...b.px(X0 - BACK - 0.15, 0.32), "#1a2030", "left");
      st.pins.forEach((p) => reading(b, ctx, X0 - p.b, Y, [p.E, 0]));
      if (st.last) {
        const sx = X0 + st.r;
        bill(b, ctx, Math.min(X0 + st.last.ans, W - 0.2), Y, 0, 0.95);
        shrimp(b, ctx, { x: sx, y: Y, a: 0 }, { color: st.last.caught ? OK : BAD, charges: true });
        label(ctx, `${st.last.caught ? "shrimp" : "it was here"}: ${st.r} cm`, ...b.px(W - 0.3, Y + 1.3), st.last.caught ? OK : BAD, "right");
        return;
      }
      if (!snout) return;
      bill(b, ctx, snout.x, Y, 0, 0.95);
      reading(b, ctx, snout.x, Y, [axisField(st.r + st.back), 0], MINE, 3.4);
    },
    onChange(b, ended) {
      st.back = +(X0 - snout.x).toFixed(1);
      read();
      if (!ended) return;
      const E = +axisField(st.r + st.back).toPrecision(3);
      st.pins = st.pins.filter((p) => p.b !== st.back); st.pins.push({ b: st.back, E });
      st.pins.sort((p, q) => p.b - q.b); if (st.pins.length > 6) st.pins.shift();
      rec.event("dist-reading", { b: st.back }); keep(); pins(); b.draw();
    },
  });
  snout = board.addHandle({ x: X0 - st.back, y: Y, snap: 0.1, show: false, limit: (x) => [Math.max(X0 - BACK, Math.min(X0, x)), Y] });
  const read = () => { $("dRead").textContent = st.last ? `You lunged ${st.last.ans} cm.` : `Backed off ${st.back.toFixed(1)} cm · reading at your bill: ${fmt(axisField(st.r + st.back))}`; };
  function pins() {
    $("dPins").innerHTML = st.pins.length
      ? st.pins.map((p) => `<tr><td>${p.b.toFixed(1)} cm</td><td>${num(p.E)} &micro;V/cm</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">Drag your bill back along the dashed line. Each time you let go, the reading is noted here.</td></tr>`;
  }

  $("dAns").value = st.ans;
  $("dAns").addEventListener("input", (e) => { st.ans = e.target.value; keep(); });
  $("dAns").addEventListener("keydown", (e) => { if (e.key === "Enter") $("dGo").click(); });
  $("dClear").addEventListener("click", () => { if (st.last) return; st.pins = []; keep(); rec.event("dist-clear"); pins(); board.draw(); });
  $("dGo").addEventListener("click", () => {
    if (st.last) return;
    const ans = parseFloat($("dAns").value);
    if (!(ans > 0)) { $("dFb").innerHTML = `<p class="note warn" style="margin:12px 0 0">Type the distance in centimetres first.</p>`; return; }
    const j = judgeDistance(ans, st.r, st.pins);
    st.last = { kind: j.kind, caught: j.caught, ratio: +j.ratio.toFixed(3), ans, readings: st.pins.length };
    st.strikes.push(st.last);
    rec.event("dist-lunge", st.last); keep(); show(); paintTeacher();
  });

  function again() {
    Object.assign(st, { r: newR(), back: 0, pins: [], last: null, ans: "" });
    snout.x = X0; $("dAns").value = "";
    rec.event("dist-again", { strikes: st.strikes.length }); keep(); show();
  }

  function show() {
    const j = st.last;
    board.locked = !!j; ["dGo", "dClear", "dAns"].forEach((id) => { $(id).disabled = !!j; });
    read(); pins(); board.draw();
    if (!j) { $("dFb").innerHTML = ""; return; }
    const n = st.strikes.length;
    if (j.caught) {
      $("dFb").innerHTML = `<p class="note" style="margin:12px 0 0"><strong>Caught, on lunge ${n}.</strong> You said ${j.ans} cm; the shrimp was ${st.r} cm away. Two readings were enough, because the way a dipole's field falls with distance is known.</p>
        <div class="toolbar"><button class="btn small ghost" id="dAgain">Hunt another shrimp</button></div>`;
    } else {
      const why = {
        one: `<p>One reading cannot give the distance: a strong shrimp far away and a weak one close by can give the same reading. Back off, take a second reading, and use how much the reading has fallen.</p>`,
        square: `<p>Your answer fits a field that falls like ${inv(2)}. That is the field of a single point charge. A shrimp is a dipole: on its axis the field falls like ${inv(3)}, so backing off from ${M("<mi>r</mi>")} to ${M("<mi>r</mi><mo>+</mo><mi>d</mi>")} divides the reading by</p>${MD(`<msup><mrow><mo>(</mo>${fr("<mrow><mi>r</mi><mo>+</mo><mi>d</mi></mrow>", "<mi>r</mi>")}<mo>)</mo></mrow><mn>3</mn></msup>`)}`,
        spot: `<p>Your number is the distance from the place you backed off to. The lunge starts from your starting spot, 0 on the ruler, so ${M("<mi>r</mi>")} must be measured from there.</p>`,
        other: `<p>Use two readings and divide one by the other, so that the unknown dipole moment cancels. With ${M("<msub><mi>E</mi><mn>1</mn></msub>")} read at your starting spot, a distance ${M("<mi>r</mi>")} from the shrimp, and ${M("<msub><mi>E</mi><mn>2</mn></msub>")} read after backing off by ${M("<mi>d</mi>")}:</p>${RATIO}<p>Take the cube root of the ratio of your readings, then solve for ${M("<mi>r</mi>")}.</p>`,
      }[j.kind];
      $("dFb").innerHTML = `<div class="card burrow" style="margin-top:12px">${mum(`<h3>The shrimp got away</h3>
        <p>You lunged ${j.ans} cm; it was ${st.r} cm away, so you ${j.ans < st.r ? "stopped short" : "overshot and it darted aside"}.</p>${why}
        <button class="btn" id="dAgain">Go out again</button>`, "Back at the burrow · mother")}</div>`;
    }
    $("dAgain").addEventListener("click", again);
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
    <div class="qhead"><h3>Hunt 2 · class picture</h3><span class="pct" id="tdPct"></span></div>
    <p class="task">Each student's first answer, divided by the real distance of their own shrimp. ${cls.length} students (simulated).</p>
    <div class="dist wide" id="tdHist"></div>
    <div id="tdStats"></div>`;
  const next = document.createElement("div");
  next.className = "card tcard"; teacher.after(next);
  const tq = (id) => teacher.querySelector("#" + id);
  const EDGES = [0, 0.5, 0.7, 0.85, 1.15, 1.5, Infinity], NAMES = ["under 0.5", "0.5 to 0.7", "0.7 to 0.85", "right", "1.15 to 1.5", "over 1.5"];

  function paintTeacher() {
    const mine = st.strikes[0];
    const firsts = cls.map((s) => s.dist.first); if (mine) firsts.push(mine);
    const n = firsts.length, pct = (c) => Math.round((100 * c) / n);
    const caught = firsts.filter((s) => s.caught).length;
    const bins = NAMES.map((_, i) => firsts.filter((s) => s.ratio >= EDGES[i] && s.ratio < EDGES[i + 1]).length), top = Math.max(...bins, 1);
    const mineBin = mine ? NAMES.findIndex((_, i) => mine.ratio >= EDGES[i] && mine.ratio < EDGES[i + 1]) : -1;
    const kinds = Object.keys(DIST_KINDS).map((k) => [k, firsts.filter((s) => s.kind === k).length]).sort((a, b) => b[1] - a[1]);
    tq("tdPct").innerHTML = `${pct(caught)}% <small>caught at the first lunge</small>`;
    tq("tdHist").innerHTML = bins.map((c, i) => `<div${i === mineBin ? ' class="me"' : ""}><b>${c}</b><i style="height:${Math.round((70 * c) / top)}px;background:${i === 3 ? OK : BAD}"></i>${NAMES[i]}</div>`).join("");
    const tried = cls.filter((s) => s.range).map((s) => s.range); if (rg.tries.length) tried.push(rg.tries[0]);
    const rk = Object.keys(RANGE_KINDS).map((k) => [k, tried.filter((s) => s.kind === k).length]);
    tq("tdStats").innerHTML = `
      <p class="how" style="margin:8px 0 12px">Answers near 0.6 come from treating the shrimp as one point charge (${inv(2)}).${mine ? " The outlined bar holds the student on the left." : ""}</p>
      <table class="err">
        <tr class="ok"><td>Caught at the first lunge<div class="bar" style="width:${pct(caught)}%"></div></td><td class="n">${caught} / ${n}</td></tr>
        ${kinds.filter(([, c]) => c).map(([k, c]) => `<tr><td>${DIST_KINDS[k].label}<div class="bar" style="width:${pct(c)}%"></div></td><td class="n">${c}</td></tr>`).join("")}
      </table>
      <h4 class="tsub">Optional question: sensing range</h4>
      <table class="err">
        <tr class="ok"><td>Right at the first try</td><td class="n">${tried.filter((s) => s.kind === "ok").length} / ${tried.length} who tried</td></tr>
        ${rk.filter(([, c]) => c).map(([k, c]) => `<tr><td>${RANGE_KINDS[k].label}</td><td class="n">${c}</td></tr>`).join("")}
      </table>`;

    // what the unaided work feeds into: the first check of the next lesson
    const hunt = (rec.get("hunt") || {}).strikes || [];
    const dir = cls.filter((s) => ["reversed", "angle"].includes(s.hunt.first.kind)).length + (hunt[0] && ["reversed", "angle"].includes(hunt[0].kind) ? 1 : 0);
    const cube = firsts.filter((s) => s.kind === "square").length;
    const units = tried.filter((s) => s.kind === "units").length;
    next.innerHTML = `
      <div class="qhead"><h3>Feeds the next lesson</h3></div>
      <p class="task">The two hunts are done without help, so their mistakes decide each student's first check next lesson.</p>
      <table class="err">
        <tr><td>Direction of a dipole's field (from hunt 1)</td><td class="n">${dir} students</td></tr>
        <tr><td>Dipole ${inv(3)} against point charge ${inv(2)} (from hunt 2)</td><td class="n">${cube} students</td></tr>
        <tr><td>Unit conversion (from the optional question)</td><td class="n">${units} students</td></tr>
      </table>
      <p class="how">A student can appear in more than one row. Students with no mistake start the next lesson without an extra item.</p>`;
  }

  show(); showRange(); paintTeacher();
  return { refresh: paintTeacher };
}
