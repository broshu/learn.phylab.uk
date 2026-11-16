// learn.phylab.uk — In class, question 1: draw the field lines of one positive and one negative charge.
// Student side: a board to draw on, then an automatic check for big mistakes.
// Teacher side: every drawing in the class overlaid in one picture, coloured right / wrong / unclear, with statistics.
import { fieldLines } from "/assets/field.js";
import { charge, INK, MINE } from "/assets/board.js";
import { W, H, CHARGES, KINDS, UNCLEAR, judge } from "/in-class/lines-judge.js";
import { makeClass } from "/in-class/lines-sample.js";

const OK = "#0d6b5f", BAD = "#c0392b", HUH = "#d98200";
const COLOR = { ok: OK, wrong: BAD, unclear: HUH };
const reference = fieldLines(CHARGES, { x0: 0, x1: W, y0: 0, y1: H }, 14);

/** A canvas showing the board in centimetres, redrawn by `paint`. */
function sheet(canvas, paint) {
  const s = { canvas, ctx: canvas.getContext("2d"), paint };
  s.resize = () => {
    const w = canvas.clientWidth || 600, dpr = window.devicePixelRatio || 1, h = Math.round((w * H) / W);
    canvas.style.height = h + "px"; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    s.w = w; s.h = h; s.k = w / W; s.dpr = dpr; s.draw();
  };
  s.px = (x, y) => [x * s.k, s.h - y * s.k];
  s.cm = (px, py) => [px / s.k, (s.h - py) / s.k];
  s.draw = () => { const c = s.ctx; c.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); c.clearRect(0, 0, s.w, s.h); paint(s, c); };
  s.path = (pts, color, width, alpha = 1, dash = null) => {
    if (pts.length < 2) return;
    const c = s.ctx; c.save(); c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width; c.lineCap = c.lineJoin = "round";
    if (dash) c.setLineDash(dash);
    c.beginPath(); pts.forEach((p, i) => { const [x, y] = s.px(...p); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.restore();
  };
  /** Arrowhead halfway along a line, in the direction it was drawn. */
  s.head = (pts, color, size = 10, alpha = 1) => {
    if (pts.length < 3) return;
    let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let run = 0, i = 1;
    for (; i < pts.length; i++) { run += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (run >= total / 2) break; }
    i = Math.min(i, pts.length - 1);
    const [x1, y1] = s.px(...pts[i]), [x0, y0] = s.px(...pts[Math.max(0, i - 2)]);
    const a = Math.atan2(y1 - y0, x1 - x0), c = s.ctx;
    c.save(); c.globalAlpha = alpha; c.fillStyle = color; c.beginPath();
    c.moveTo(x1 + size * 0.5 * Math.cos(a), y1 + size * 0.5 * Math.sin(a));
    c.lineTo(x1 - size * Math.cos(a - 0.45), y1 - size * Math.sin(a - 0.45));
    c.lineTo(x1 - size * Math.cos(a + 0.45), y1 - size * Math.sin(a + 0.45));
    c.closePath(); c.fill(); c.restore();
  };
  s.charges = (r = 13) => CHARGES.forEach((q) => { const [x, y] = s.px(q.x, q.y); charge(s.ctx, x, y, Math.sign(q.q), r); });
  new ResizeObserver(s.resize).observe(canvas);
  return s;
}

const midpoint = (pts) => pts[Math.floor(pts.length / 2)];

/**
 * Build the question. student / teacher: elements to fill. rec: the page record.
 * onDone(result) is called after each check.
 */
export function startDraw({ student, teacher, rec, onDone = () => {} }) {
  const saved = rec.get("draw") || {};
  let strokes = saved.strokes || [];
  let result = saved.checked ? judge(strokes) : null;
  let showField = false, live = null, drawing = null;

  // ---------- student ----------
  student.innerHTML = `
    <div class="fieldbox"><canvas id="dBoard" aria-label="Drawing board with a positive charge on the left and a negative charge on the right"></canvas></div>
    <div class="toolbar">
      <button class="btn small ghost" id="dUndo">Undo last line</button>
      <button class="btn small ghost" id="dClear">Clear</button>
      <label class="toggle" id="dFieldWrap" hidden><input type="checkbox" id="dField"> Show the real field</label>
      <span style="flex:1"></span>
      <button class="btn" id="dCheck">Check my drawing</button>
    </div>
    <div id="dFeedback" aria-live="polite"></div>`;
  const $ = (id) => student.querySelector("#" + id);

  const board = sheet($("dBoard"), (s) => {
    if (showField) reference.forEach((l) => { s.path(l, "#9aa3b5", 1.4, 0.7); s.head(l, "#9aa3b5", 7, 0.7); });
    strokes.forEach((l, i) => {
      const line = result && result.lines[i];
      const col = line ? COLOR[line.status] : MINE;
      s.path(l, col, 3, 1, line && line.status === "unclear" ? [7, 6] : null);
      s.head(l, col, 12);
      if (line && line.status !== "ok") { // number the lines the feedback talks about
        const [x, y] = s.px(...midpoint(l)), c = s.ctx;
        c.save(); c.fillStyle = "#fff"; c.strokeStyle = col; c.lineWidth = 2;
        c.beginPath(); c.arc(x + 14, y - 14, 10, 0, 7); c.fill(); c.stroke();
        c.fillStyle = col; c.font = "700 12px " + getComputedStyle(document.body).fontFamily; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(String(i + 1), x + 14, y - 14); c.restore();
      }
    });
    if (result) result.crossings.forEach((p) => { const [x, y] = s.px(p.x, p.y), c = s.ctx; c.save(); c.strokeStyle = BAD; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 9, 0, 7); c.stroke(); c.restore(); });
    if (drawing) { s.path(drawing, MINE, 3); s.head(drawing, MINE, 12); }
    s.charges();
    if (!strokes.length && !drawing) {
      const c = s.ctx; c.save(); c.fillStyle = "#8a93a6"; c.textAlign = "center"; c.font = Math.min(15, Math.max(11, s.w / 26)) + "px " + getComputedStyle(document.body).fontFamily;
      c.fillText("Drag to draw a line, in the direction the field points.", s.w / 2, s.h - 14); c.restore();
    }
  });

  const cv = board.canvas;
  cv.style.touchAction = "none"; cv.style.cursor = "crosshair";
  const at = (e) => { const r = cv.getBoundingClientRect(); return board.cm(e.clientX - r.left, e.clientY - r.top); };
  cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); drawing = [at(e)]; board.draw(); });
  cv.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = at(e), q = drawing[drawing.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.04) { drawing.push(p); board.draw(); }
  });
  const end = () => {
    if (!drawing) return;
    const l = drawing; drawing = null;
    if (l.length > 2) { strokes.push(l.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)])); changed("draw-line"); }
    else board.draw();
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

  function changed(event) {
    result = null; showField = false; $("dField").checked = false; $("dFieldWrap").hidden = true;
    $("dFeedback").innerHTML = "";
    rec.set("draw", { strokes, checked: false });
    rec.event(event, { lines: strokes.length });
    board.draw(); live = null; paintTeacher();
  }
  $("dUndo").addEventListener("click", () => { if (strokes.length) { strokes.pop(); changed("undo-line"); } });
  $("dClear").addEventListener("click", () => { if (strokes.length) { strokes = []; changed("clear"); } });
  $("dField").addEventListener("change", (e) => { showField = e.target.checked; rec.event("show-field", { on: showField }); board.draw(); });
  $("dCheck").addEventListener("click", check);

  function check() {
    result = judge(strokes);
    rec.set("draw", { strokes, checked: true });
    rec.event("check", { lines: strokes.length, verdict: result.verdict, kinds: result.kinds });
    $("dFeedback").innerHTML = feedback(result);
    $("dFieldWrap").hidden = !strokes.length;
    board.draw();
    live = strokes.length ? { id: "You", strokes, result } : null;
    paintTeacher();
    onDone(result);
  }

  function feedback(r) {
    if (r.verdict === "empty") return `<p class="note warn">Nothing drawn yet. Drag on the board to draw a field line.</p>`;
    const items = [];
    r.lines.forEach((l, i) => {
      for (const k of l.kinds) {
        const also = k === "cross" ? ` (with line ${l.with.map((j) => j + 1).join(", ")})` : "";
        items.push(`<li><b style="color:${BAD}">Line ${i + 1}: ${KINDS[k].label}${also}.</b> ${KINDS[k].why}</li>`);
      }
      if (l.status === "unclear") items.push(`<li><b style="color:${HUH}">Line ${i + 1}: not sure.</b> ${UNCLEAR[l.unclear[0]]} Your teacher will have a look; it is not counted as wrong.</li>`);
    });
    const few = r.lines.length < 4 ? `<p class="muted small" style="margin:8px 0 0">Tip: draw at least four lines, so the shape of the whole field shows.</p>` : "";
    const head = r.verdict === "clean"
      ? `<p class="note" style="margin:0"><strong>No big mistakes found in ${r.lines.length} line${r.lines.length > 1 ? "s" : ""}.</strong> Next, a classmate will look at your drawing and comment on it.</p>`
      : r.verdict === "unclear"
        ? `<p class="note warn" style="margin:0"><strong>No mistakes found, but some lines could not be read clearly.</strong> You can redraw them, or leave them for your teacher.</p>`
        : `<p class="note warn" style="margin:0"><strong>${r.wrong} of ${r.lines.length} lines ${r.wrong > 1 ? "have" : "has"} a mistake.</strong> Fix them (Undo, or draw again), then check again.</p>`;
    return `${head}${items.length ? `<ul class="tight" style="margin-top:12px">${items.join("")}</ul>` : ""}${few}
      <p class="muted small" style="margin:6px 0 0">The check looks only for big mistakes. Green: fine. Red: a mistake. Dashed orange: not sure.</p>`;
  }

  // ---------- teacher ----------
  const cls = makeClass();
  let filter = "all";
  teacher.innerHTML = `
    <div class="qhead"><h3>Field lines · class picture</h3><span class="pct" id="tPct"></span></div>
    <p class="task">All drawings on top of each other, ${cls.length} students (simulated). Thick lines: the student on the left, once checked.</p>
    <div class="toolbar" style="margin:6px 0 8px" id="tFilter">
      ${[["all", "All"], ["ok", "Fine"], ["wrong", "Mistakes"], ["unclear", "Not sure"]].map(([k, t]) => `<button class="btn small ${k === "all" ? "" : "ghost"}" data-f="${k}">${t}</button>`).join("")}
    </div>
    <div class="plot"><canvas id="tBoard"></canvas></div>
    <div class="key" style="margin:8px 0 12px"><span><i style="background:${OK}"></i>fine</span><span><i style="background:${BAD}"></i>mistake</span><span><i style="background:${HUH}"></i>not sure</span></div>
    <div id="tStats"></div>`;
  const tq = (id) => teacher.querySelector("#" + id);
  teacher.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
    filter = b.dataset.f;
    teacher.querySelectorAll("[data-f]").forEach((x) => x.classList.toggle("ghost", x !== b));
    tBoard.draw();
  }));
  const tBoard = sheet(tq("tBoard"), (s) => {
    for (const st of cls) st.strokes.forEach((l, i) => {
      const status = st.result.lines[i].status;
      if (filter !== "all" && status !== filter) return;
      s.path(l, COLOR[status], 1.4, 0.2);
    });
    if (live) live.strokes.forEach((l, i) => {
      const status = live.result.lines[i].status;
      if (filter !== "all" && status !== filter) return;
      s.path(l, COLOR[status], 3.2, 1, status === "unclear" ? [6, 5] : null); s.head(l, COLOR[status], 10);
    });
    s.charges(9);
  });

  function paintTeacher() {
    tBoard.draw();
    const all = live ? [...cls, live] : cls;
    const clean = all.filter((s) => s.result.verdict === "clean").length;
    const flagged = all.filter((s) => s.result.verdict === "unclear").length;
    const byKind = Object.keys(KINDS).map((k) => [k, all.filter((s) => s.result.kinds[k]).length]).sort((a, b) => b[1] - a[1]);
    const n = all.length, pct = (v) => Math.round((100 * v) / n);
    tq("tPct").innerHTML = `${pct(clean)}% <small>no big mistakes</small>`;
    tq("tStats").innerHTML = `
      <table class="err">
        <tr class="ok"><td>No big mistakes<div class="bar" style="width:${pct(clean)}%"></div></td><td class="n">${clean} / ${n}</td></tr>
        ${byKind.filter(([, v]) => v).map(([k, v]) => `<tr><td>${KINDS[k].label}<div class="bar" style="width:${pct(v)}%"></div></td><td class="n">${v}</td></tr>`).join("")}
        <tr class="rest"><td>Not sure, waiting for you to look<div class="bar" style="width:${pct(flagged)}%;background:${HUH}"></div></td><td class="n">${flagged}</td></tr>
      </table>
      <p class="how">Counted by student: one student can have more than one kind of mistake.${live ? " Includes the student on the left." : ""}</p>`;
  }

  if (result) { $("dFeedback").innerHTML = feedback(result); $("dFieldWrap").hidden = !strokes.length; live = strokes.length ? { id: "You", strokes, result } : null; }
  paintTeacher();
}
