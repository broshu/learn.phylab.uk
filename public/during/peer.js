// learn.phylab.uk — In class, step 2: peer feedback on a classmate's field-line drawing.
// The student circles places on the drawing and writes a comment for each circle. This is feedback, not marking.
// Teacher side: the same drawing with every reviewer's circles, their comments, and whether the reviewers
// found the mistakes the automatic check had found.
import { charge } from "/assets/board.js";
import { CHARGES, KINDS, judge } from "/during/lines-judge.js";
import { rng, wobble } from "/during/lines-sample.js";
import { sheet } from "/during/draw.js";

const THEIRS = "#3b4356", MINE = "#7b3fbf";
const REVIEWER = ["#2a8a9a", "#b0682a"];

// ---------- the classmate's drawing: rough, with some real mistakes in it ----------
const r = rng(7);
const arc = (h0, h1, from = 0, to = 1, flip = false) => {
  const pts = [];
  for (let t = from; t <= to + 1e-9; t += 0.004) {
    const a = Math.PI * t, h = h0 + (h1 - h0) * t;
    pts.push([5 - 1.75 * Math.cos(a), 3 + h * Math.sin(a)]);
  }
  return flip ? pts.reverse() : pts;
};
const loopLine = () => { // leaves + to the upper left, makes a clear loop and crosses itself
  const pts = [];
  for (let t = 0; t <= 1; t += 0.002) {
    const s = 2.7 * t, u = 2 * Math.PI * Math.max(0, Math.min(1, (t - 0.3) / 0.45));
    pts.push([3.0 - s * 0.8 - 0.55 * Math.sin(u), 3.15 + s * 0.62 + 0.55 * (1 - Math.cos(u))]);
  }
  return pts;
};
const straight = (x0, y0, x1, y1) => Array.from({ length: 120 }, (_, i) => [x0 + ((x1 - x0) * i) / 119, y0 + ((y1 - y0) * i) / 119]);
export const DRAWING = [
  arc(1.2, 1.4),                    // 1 top, fine
  arc(0.55, 2.1),                   // 2 top, rises across line 1
  arc(-1.3, -1.1, 0, 1, true),      // 3 bottom, drawn from − to +
  loopLine(),                       // 4 curls and crosses itself
  straight(9.3, 3.5, 7.1, 3.1).reverse(), // 5 right of −, arrow pointing away from it
  straight(2.95, 2.8, 1.2, 0.9),    // 6 lower left, fine
].map((l) => wobble(l, 0.06, r));
const CHECK = judge(DRAWING);

/** The mistakes the automatic check found: a point (crossings) or a whole line (wrong direction and the rest). */
function mistakes() {
  const out = [];
  CHECK.lines.forEach((l, i) => l.kinds.forEach((k) => {
    if (k === "cross") return;
    out.push(k === "self" ? { kind: k, line: i, at: [l.selfAt.x, l.selfAt.y] } : { kind: k, line: i, pts: l.p });
  }));
  CHECK.crossings.forEach((c) => {
    if (out.some((m) => m.kind === "self" && Math.hypot(m.at[0] - c.x, m.at[1] - c.y) < 0.05)) return;
    out.push({ kind: "cross", at: [c.x, c.y] });
  });
  return out;
}
const MISTAKES = mistakes();

/** Did a reviewer's circle take in this mistake? Judged loosely, by the circle's bounding box. */
function covers(mark, m) {
  const pad = 0.3, xs = mark.map((p) => p[0]), ys = mark.map((p) => p[1]);
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const inside = ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  return m.at ? inside(m.at) : m.pts.some(inside);
}

// simulated reviewers of the same drawing (two classmates), until real class data exists
const ell = (cx, cy, rx, ry) => Array.from({ length: 41 }, (_, i) => [cx + rx * Math.cos((i / 40) * 2 * Math.PI), cy + ry * Math.sin((i / 40) * 2 * Math.PI)]);
const SIM = [
  { who: "Classmate A", marks: [
      { pts: wobble(ell(5.35, 4.35, 0.55, 0.42), 0.03, r), text: "These two lines cross here. Can the field point two ways at one point?" },
      { pts: wobble(ell(5, 1.8, 0.7, 0.45), 0.03, r), text: "I think this arrow should point to the right, towards the minus." } ],
    overall: "Nice curved shape between the charges." },
  { who: "Classmate B", marks: [
      { pts: wobble(ell(1.55, 4.55, 0.75, 0.65), 0.03, r), text: "Why does this line go round in a loop?" } ],
    overall: "" },
];

/**
 * Build the step. student / teacher: elements to fill. rec: the page record.
 */
export function startPeer({ student, teacher, rec }) {
  const saved = rec.get("peer") || {};
  let marks = saved.marks || [];          // [{ pts, text }]
  let overall = saved.overall || "";
  let sent = !!saved.sent;
  let drawing = null;
  const font = () => getComputedStyle(document.body).fontFamily;

  student.innerHTML = `
    <p class="muted small" style="margin:0 0 8px">A classmate's drawing, without their name. Click anything you want to talk about to circle it, then write a comment for each circle.</p>
    <div class="fieldbox"><canvas id="pBoard" aria-label="A classmate's field-line drawing to comment on"></canvas></div>
    <div class="toolbar">
      <button class="btn small ghost" id="pUndo">Remove last circle</button>
      <span class="muted small">Click a place to circle it, or drag around a bigger area.</span>
    </div>
    <ol class="pnotes" id="pNotes"></ol>
    <label class="plabel" for="pOverall">Overall comment <span class="muted small">(optional)</span></label>
    <textarea id="pOverall" rows="2" placeholder="Something done well, or one thing to try next time."></textarea>
    <p class="muted small" style="margin:8px 0 0">Good feedback says <em>where</em>, <em>what</em> you notice and <em>why</em>. A question works well, for example: "These two lines cross here. Can the field point two ways at one point?"</p>
    <div class="toolbar" style="justify-content:flex-end"><span class="muted small" id="pMsg"></span><button class="btn" id="pSend">Send feedback</button><button class="btn ghost" id="pEdit" hidden>Edit my feedback</button></div>`;
  const $ = (id) => student.querySelector("#" + id);
  $("pOverall").value = overall;

  const labelAt = (pts) => { // top right of the mark
    let best = pts[0]; for (const p of pts) if (p[0] + p[1] > best[0] + best[1]) best = p; return best;
  };
  const numberTag = (s, pts, n, col) => {
    const [x, y] = s.px(...labelAt(pts)), c = s.ctx;
    c.save(); c.fillStyle = col; c.beginPath(); c.arc(x + 6, y - 6, 10, 0, 7); c.fill();
    c.fillStyle = "#fff"; c.font = `700 12px ${font()}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(n), x + 6, y - 6); c.restore();
  };
  const paintDrawing = (s) => {
    DRAWING.forEach((l) => { s.path(l, THEIRS, 2.4); s.head(l, THEIRS, 11); });
    s.charges();
  };

  const board = sheet($("pBoard"), (s) => {
    paintDrawing(s);
    marks.forEach((m, i) => { s.path(m.pts, MINE, 2.6, 0.9); numberTag(s, m.pts, i + 1, MINE); });
    if (drawing) s.path(drawing, MINE, 2.6, 0.9);
  });
  const cv = board.canvas;
  cv.style.touchAction = "none";
  // the pointer is the circle itself: a click (or tap) drops it where it is; dragging draws a bigger one by hand
  const R = 0.45; // cm
  const ring = () => {
    const d = Math.min(120, Math.round(2 * R * (board.k || 60)) + 6), c = d / 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${c}" cy="${c}" r="${c - 2.5}" fill="none" stroke="#fff" stroke-width="4"/><circle cx="${c}" cy="${c}" r="${c - 2.5}" fill="none" stroke="${MINE}" stroke-width="2"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${c} ${c}, crosshair`;
  };
  const setCursor = () => { cv.style.cursor = sent ? "default" : ring(); };
  new ResizeObserver(setCursor).observe(cv);
  const at = (e) => { const b = cv.getBoundingClientRect(); return board.cm(e.clientX - b.left, e.clientY - b.top); };
  cv.addEventListener("pointerdown", (e) => { if (sent) return; cv.setPointerCapture(e.pointerId); drawing = [at(e)]; });
  cv.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = at(e), q = drawing[drawing.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.04) { drawing.push(p); board.draw(); }
  });
  const end = () => {
    if (!drawing) return;
    let m = drawing; drawing = null;
    const xs = m.map((p) => p[0]), ys = m.map((p) => p[1]);
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (spread < 0.25) { // a click, not a drag: drop the small circle here
      const [cx, cy] = m[0];
      m = Array.from({ length: 41 }, (_, i) => [cx + R * Math.cos((i / 40) * 2 * Math.PI), cy + R * Math.sin((i / 40) * 2 * Math.PI)]);
    }
    if (m.length > 4) {
      marks.push({ pts: m.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]), text: "" });
      rec.event("peer-circle", { n: marks.length });
      save(); renderNotes(true);
    }
    board.draw();
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

  function save() { rec.set("peer", { marks, overall, sent }); }
  function renderNotes(focusLast = false) {
    $("pNotes").innerHTML = marks.map((m, i) => `
      <li><span class="pnum">${i + 1}</span>
        <textarea rows="2" data-i="${i}" placeholder="What do you notice here, and why?" ${sent ? "disabled" : ""}>${m.text.replace(/</g, "&lt;")}</textarea></li>`).join("");
    $("pNotes").querySelectorAll("textarea").forEach((t) => t.addEventListener("input", () => { marks[+t.dataset.i].text = t.value; save(); paintTeacher(); }));
    if (focusLast && marks.length) $("pNotes").querySelector(`[data-i="${marks.length - 1}"]`).focus();
    paintTeacher();
  }
  $("pOverall").addEventListener("input", (e) => { overall = e.target.value; save(); paintTeacher(); });
  $("pUndo").addEventListener("click", () => { if (sent || !marks.length) return; marks.pop(); rec.event("peer-uncircle"); save(); renderNotes(); board.draw(); });
  $("pSend").addEventListener("click", () => {
    const written = marks.filter((m) => m.text.trim()).length;
    if (!written && !overall.trim()) { $("pMsg").textContent = "Write at least one comment first."; return; }
    const empty = marks.length - written;
    sent = true; save(); lock();
    rec.event("peer-send", { circles: marks.length, comments: written, overall: !!overall.trim() });
    $("pMsg").textContent = `Sent to your classmate${empty ? ` (${empty} circle${empty > 1 ? "s" : ""} without a comment)` : ""}.`;
    paintTeacher();
  });
  $("pEdit").addEventListener("click", () => { sent = false; save(); lock(); $("pMsg").textContent = ""; rec.event("peer-edit"); });
  function lock() {
    $("pSend").hidden = sent; $("pEdit").hidden = !sent; $("pOverall").disabled = sent; $("pUndo").disabled = sent;
    $("pNotes").querySelectorAll("textarea").forEach((t) => (t.disabled = sent));
    setCursor();
  }

  // ---------- teacher ----------
  teacher.innerHTML = `
    <div class="qhead"><h3>Peer feedback · this drawing</h3><span class="pct" id="tpCount"></span></div>
    <p class="task">Every reviewer's circles on the same drawing. Purple: the student on the left.</p>
    <div class="plot"><canvas id="tpBoard"></canvas></div>
    <div class="key" style="margin:8px 0 12px" id="tpKey"></div>
    <h4 class="tsub">Did the reviewers find the mistakes?</h4>
    <table class="err" id="tpFound"></table>
    <p class="how">Mistakes found by the automatic check, and how many reviewers circled each one.</p>
    <h4 class="tsub">Comments the author will receive</h4>
    <div id="tpComments"></div>`;
  const tq = (id) => teacher.querySelector("#" + id);
  const reviewers = () => {
    const mine = { who: "Student on the left", color: MINE, marks: marks.filter((m) => m.pts.length), overall, live: true, sent };
    return [...SIM.map((s, i) => ({ ...s, color: REVIEWER[i] })), ...(marks.length || overall.trim() ? [mine] : [])];
  };
  const tBoard = sheet(tq("tpBoard"), (s) => {
    paintDrawing(s);
    for (const rv of reviewers()) rv.marks.forEach((m, i) => { s.path(m.pts, rv.color, 2.2, 0.9); numberTag(s, m.pts, i + 1, rv.color); });
  });
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function paintTeacher() {
    tBoard.draw();
    const rvs = reviewers();
    tq("tpCount").innerHTML = `${rvs.length} <small>reviewer${rvs.length > 1 ? "s" : ""}</small>`;
    tq("tpKey").innerHTML = rvs.map((rv) => `<span><i style="background:${rv.color}"></i>${rv.who}</span>`).join("");
    tq("tpFound").innerHTML = MISTAKES.map((m) => {
      const n = rvs.filter((rv) => rv.marks.some((mk) => covers(mk.pts, m))).length;
      const where = m.kind === "cross" ? "two lines" : `line ${m.line + 1}`;
      return `<tr class="${n ? "ok" : ""}"><td>${KINDS[m.kind].label} <span class="muted">(${where})</span><div class="bar" style="width:${(100 * n) / rvs.length}%"></div></td><td class="n">${n} / ${rvs.length}</td></tr>`;
    }).join("");
    tq("tpComments").innerHTML = rvs.map((rv) => {
      const lines = rv.marks.map((m, i) => m.text.trim() ? `<li><b style="color:${rv.color}">${i + 1}</b> ${esc(m.text)}</li>` : `<li><b style="color:${rv.color}">${i + 1}</b> <span class="muted">(circle, no comment yet)</span></li>`);
      if (rv.overall && rv.overall.trim()) lines.push(`<li><b style="color:${rv.color}">Overall</b> ${esc(rv.overall)}</li>`);
      const state = rv.live ? (rv.sent ? "sent" : "writing now…") : "sent";
      return `<div class="tcomm"><div class="who"><i style="background:${rv.color}"></i>${rv.who} <span class="muted small">· ${state}</span></div><ul>${lines.join("") || '<li class="muted">nothing yet</li>'}</ul></div>`;
    }).join("");
  }

  renderNotes(); lock(); board.draw();
}
