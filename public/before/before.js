// learn.phylab.uk — Before class: check-in, reading, simulation, prediction, one written question.
import { FieldView, formatField } from "/assets/field.js";
import { openRecord } from "/assets/record.js";
import { startCheckin } from "/before/checkin.js";

const rec = openRecord("before");
const ORDER = ["check", "read", "explore", "predict", "ask", "done"];
const fresh = () => ({
  step: "check",
  check: { attempts: [] },
  explore: { answers: {}, charges: [] },
  predict: { strokes: [], why: "" },
  ask: { text: "", allClear: false },
});
let state = rec.get("state") || fresh();
const save = () => rec.set("state", state);
const $ = (id) => document.getElementById(id);

// ---------- moving between steps ----------
function show(step, log = true) {
  state.step = step; save();
  if (log) rec.event("step", { name: step });
  ORDER.forEach((s) => $("s-" + s).classList.toggle("on", s === step));
  const i = ORDER.indexOf(step);
  [...$("stepper").children].forEach((li, k) => {
    li.classList.toggle("done", k < i);
    li.classList.toggle("now", k === i);
  });
  if (step === "done") { rec.finish(); buildRecord(); }
  $("sideCheck").hidden = step !== "check"; $("sideOther").hidden = step === "check"; // the teacher's side of the demonstration
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => show(ORDER[ORDER.indexOf(state.step) + 1])));
document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => show(ORDER[ORDER.indexOf(state.step) - 1])));
// time away from the page is not counted as time on a step
document.addEventListener("visibilitychange", () => {
  if (state.step === "done") return;
  rec.event("step", { name: document.hidden ? "_away" : state.step });
});

// ---------- 1 · check-in ----------
// The questions themselves live in /before/checkin.js; this page only keeps the outcome of each attempt.
startCheckin({
  onSubmit(summary) {
    state.check.attempts.push({ t: Date.now(), score: summary.score, total: summary.total, skipped: summary.skipped, missed: summary.missed });
    save();
    rec.event("check-submit", { score: summary.score, skipped: summary.skipped });
    $("checkAfter").hidden = false;
  },
  onRestart() { rec.event("check-retry"); },
});
$("checkContinue").addEventListener("click", () => show("read"));
if (state.check.attempts.length) $("checkAfter").hidden = false;

// ---------- shared helpers for field pictures ----------
/** If the board holds exactly one positive and one negative charge, return the dipole's centre. */
function dipoleCentre(view) {
  const c = view.charges;
  if (c.length !== 2 || c[0].q * c[1].q >= 0) return null;
  return [(c[0].x + c[1].x) / 2, (c[0].y + c[1].y) / 2];
}
function dipoleCircle(view, ctx) {
  const mid = dipoleCentre(view); if (!mid || !view.probe) return;
  const r = Math.hypot(view.probe.x - mid[0], view.probe.y - mid[1]);
  const [px, py] = view.toPx(mid[0], mid[1]);
  ctx.save();
  ctx.setLineDash([5, 5]); ctx.strokeStyle = "#e8a200"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(px, py, r * view.scale, 0, 2 * Math.PI); ctx.stroke();
  ctx.restore();
}
function reading(view) {
  const [, , m] = view.probeField();
  let text = `Field at the sensor: ${formatField(m)}`;
  const mid = dipoleCentre(view);
  if (mid) text += `  ·  ${Math.hypot(view.probe.x - mid[0], view.probe.y - mid[1]).toFixed(1)} cm from the centre of the dipole`;
  return text;
}

// ---------- 2 · reading ----------
new FieldView($("cvAdd"), {
  widthCm: 14, aspect: 0.5, draggable: "probe", showParts: true,
  charges: [{ x: -3, y: 0, q: 1 }, { x: 3, y: 0, q: -1 }], probe: { x: 0.5, y: 2 },
  onChange: (v) => { $("roAdd").textContent = "Net " + reading(v).split("  ·  ")[0].replace("Field", "field"); },
});
const dip = new FieldView($("cvDip"), {
  widthCm: 14, aspect: 0.5, draggable: "probe", showVectors: true,
  charges: [{ x: -0.5, y: 0, q: -1 }, { x: 0.5, y: 0, q: 1 }], probe: { x: 4, y: 0 },
  onChange: (v) => { $("roDip").textContent = reading(v); },
});
dip.overlay = dipoleCircle; dip.draw();
const line1 = new FieldView($("cvLine1"), { widthCm: 10, aspect: 0.8, draggable: "none", showLines: true, charges: [{ x: 0, y: 0, q: 1 }] });
const line2 = new FieldView($("cvLine2"), { widthCm: 10, aspect: 0.8, draggable: "none", showLines: true, charges: [{ x: -1.6, y: 0, q: 1 }, { x: 1.6, y: 0, q: -1 }] });
$("bothToggle").addEventListener("change", (e) => {
  line1.showVectors = line2.showVectors = e.target.checked;
  line1.draw(); line2.draw();
  rec.event("read-toggle-vectors", { on: e.target.checked });
});
document.querySelectorAll("#cvAdd, #cvDip").forEach((c) => c.addEventListener("pointerup", () => rec.event("read-sensor", { figure: c.id })));
$("roAdd").textContent = "Net field at the sensor: drag it to read the field.";
$("roDip").textContent = reading(dip);

// ---------- 3 · explore ----------
const sim = new FieldView($("cvSim"), {
  widthCm: 16, aspect: 0.6, draggable: "all",
  charges: state.explore.charges, probe: { x: 0, y: 3 },
  onChange: (v, released) => {
    $("roSim").textContent = v.charges.length ? reading(v) : "Add a charge to begin. Each charge is 1 nC. Drag charges and the yellow sensor.";
    if (released) { state.explore.charges = v.charges.map((c) => ({ ...c })); save(); }
    checkTasks();
  },
});
sim.overlay = dipoleCircle;
const act = (name, fn) => () => { fn(); state.explore.charges = sim.charges.map((c) => ({ ...c })); save(); rec.event("explore", { action: name, charges: sim.charges.length }); checkTasks(); };
$("addPos").onclick = act("add-positive", () => sim.addCharge(+1));
$("addNeg").onclick = act("add-negative", () => sim.addCharge(-1));
$("removeSel").onclick = act("remove", () => sim.removeSelected());
$("clearAll").onclick = act("clear", () => sim.clear());
$("tVec").onchange = (e) => { sim.showVectors = e.target.checked; sim.draw(); rec.event("explore", { action: "vectors", on: e.target.checked }); };
$("tLine").onchange = (e) => { sim.showLines = e.target.checked; sim.draw(); rec.event("explore", { action: "lines", on: e.target.checked }); };

const EXPLORE_Q = {
  density: { right: "stronger", box: "fbDensity", task: "task2",
    yes: "Yes. That is rule 2: closer lines, stronger field.",
    no: "Look again with the sensor: the reading is largest where the lines crowd together. Closer lines mean a stronger field (rule 2)." },
  axis: { right: "axis", box: "fbAxis", task: "task3",
    yes: "Yes. At the same distance, the field on the axis of a dipole is about twice the field in the bisecting plane.",
    no: "Compare the two readings on the dashed circle again. On the line through the charges the field is about twice as strong as out to the side." },
};
function drawExploreAnswers() {
  for (const [name, q] of Object.entries(EXPLORE_Q)) {
    const given = state.explore.answers[name];
    const box = document.querySelector(`.choices[data-q="${name}"]`);
    [...box.children].forEach((b) => {
      b.disabled = !!given;
      b.classList.toggle("right", !!given && b.dataset.v === q.right);
      b.classList.toggle("wrong", !!given && b.dataset.v === given && given !== q.right);
    });
    $(q.box).textContent = given ? (given === q.right ? q.yes : q.no) : "";
    $(q.task).classList.toggle("done", !!given);
  }
}
document.querySelectorAll(".choices[data-q]").forEach((box) => box.addEventListener("click", (e) => {
  const b = e.target.closest(".choice"); if (!b || b.disabled) return;
  state.explore.answers[box.dataset.q] = b.dataset.v; save();
  rec.event("explore-answer", { question: box.dataset.q, answer: b.dataset.v });
  drawExploreAnswers(); checkTasks();
}));
function checkTasks() {
  const hasDipole = sim.charges.some((c) => c.q > 0) && sim.charges.some((c) => c.q < 0);
  if (hasDipole && !state.explore.builtDipole) { state.explore.builtDipole = true; save(); rec.event("explore", { action: "built-dipole" }); }
  $("task1").classList.toggle("done", !!state.explore.builtDipole);
  $("exploreNext").disabled = !(state.explore.builtDipole && state.explore.answers.density && state.explore.answers.axis);
}
drawExploreAnswers(); checkTasks();

// ---------- 4 · predict ----------
const pad = $("cvPad"), pctx = pad.getContext("2d");
let stroke = null;
function drawPad() {
  const w = pad.clientWidth, h = pad.clientHeight, dpr = window.devicePixelRatio || 1;
  if (pad.width !== Math.round(w * dpr)) { pad.width = Math.round(w * dpr); pad.height = Math.round(h * dpr); }
  pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pctx.clearRect(0, 0, w, h);
  pctx.strokeStyle = pctx.fillStyle = "#1a2030"; pctx.lineWidth = 2.5; pctx.lineCap = pctx.lineJoin = "round";
  for (const s of [...state.predict.strokes, ...(stroke ? [stroke] : [])]) {
    if (s.length < 2) continue;
    pctx.beginPath();
    s.forEach(([x, y], i) => (i ? pctx.lineTo(x * w, y * h) : pctx.moveTo(x * w, y * h)));
    pctx.stroke();
    if (s === stroke) continue;
    const [bx, by] = [s[s.length - 1][0] * w, s[s.length - 1][1] * h];
    const k = Math.max(0, s.length - 6);
    const a = Math.atan2(by - s[k][1] * h, bx - s[k][0] * w);
    pctx.beginPath();
    pctx.moveTo(bx + 4 * Math.cos(a), by + 4 * Math.sin(a));
    pctx.lineTo(bx - 11 * Math.cos(a - 0.45), by - 11 * Math.sin(a - 0.45));
    pctx.lineTo(bx - 11 * Math.cos(a + 0.45), by - 11 * Math.sin(a + 0.45));
    pctx.closePath(); pctx.fill();
  }
  const n = state.predict.strokes.length;
  $("padCount").textContent = n === 0 ? "No lines yet" : n === 1 ? "1 line" : `${n} lines`;
  $("predictNext").disabled = n === 0;
}
const padPoint = (e) => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
pad.addEventListener("pointerdown", (e) => { stroke = [padPoint(e)]; pad.setPointerCapture(e.pointerId); e.preventDefault(); });
pad.addEventListener("pointermove", (e) => { if (!stroke) return; stroke.push(padPoint(e)); drawPad(); });
const endStroke = () => {
  if (!stroke) return;
  const long = stroke.length > 3 && Math.hypot(stroke[0][0] - stroke[stroke.length - 1][0], stroke[0][1] - stroke[stroke.length - 1][1]) + stroke.length * 0.002 > 0.03;
  if (long) { state.predict.strokes.push(stroke.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)])); save(); rec.event("predict-line", { lines: state.predict.strokes.length }); }
  stroke = null; drawPad();
};
pad.addEventListener("pointerup", endStroke);
pad.addEventListener("pointercancel", endStroke);
$("padUndo").onclick = () => { state.predict.strokes.pop(); save(); rec.event("predict-undo"); drawPad(); };
$("padClear").onclick = () => { state.predict.strokes = []; save(); rec.event("predict-clear"); drawPad(); };
$("why").value = state.predict.why;
$("why").addEventListener("input", (e) => { state.predict.why = e.target.value; save(); });
new ResizeObserver(drawPad).observe(pad);

// ---------- 5 · ask ----------
function checkAsk() { $("askNext").disabled = !(state.ask.allClear || state.ask.text.trim().length > 0); }
$("unclear").value = state.ask.text;
$("allClear").checked = state.ask.allClear;
$("unclear").addEventListener("input", (e) => { state.ask.text = e.target.value; save(); checkAsk(); });
$("allClear").addEventListener("change", (e) => { state.ask.allClear = e.target.checked; save(); checkAsk(); });
checkAsk();

// ---------- done ----------
function buildRecord() {
  const t = rec.timeOnSteps();
  const mmss = (s) => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
  const names = { check: "Check-in", read: "Read", explore: "Explore", predict: "Predict", ask: "Ask" };
  const times = Object.keys(names).filter((k) => t[k] != null).map((k) => `${names[k]}: ${mmss(t[k])}`).join("<br>");
  const total = Object.keys(names).reduce((s, k) => s + (t[k] || 0), 0);
  const tries = state.check.attempts.map((a, i) => `Attempt ${i + 1}: ${a.score} of ${a.total || 4}${a.skipped ? `, ${a.skipped} not answered` : ""}`).join("<br>");
  const shown = [...new Set(state.check.attempts.flatMap((a) => a.missed || []))];
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const rows = [
    ["Time on task", `${mmss(total)} in total<br><span class="muted">${times}</span>`],
    ["Check-in", tries || "Not submitted"],
    ["Refreshers shown", shown.length ? shown.join("; ") : "None"],
    ["Explore: lines and strength", state.explore.answers.density || "—"],
    ["Explore: axis and side", { axis: "on the line through the charges", side: "out to the side", equal: "equal in both places" }[state.explore.answers.axis] || "—"],
    ["Prediction", `${state.predict.strokes.length} line${state.predict.strokes.length === 1 ? "" : "s"} drawn${state.predict.why.trim() ? "<br>Reason: " + esc(state.predict.why.trim()) : ""}`],
    ["Still unclear", state.ask.allClear && !state.ask.text.trim() ? "Nothing so far" : esc(state.ask.text.trim())],
    ["Events logged", String(rec.raw.events.length)],
  ];
  $("recTable").innerHTML = rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
}
$("restart").onclick = () => { rec.reset(); location.reload(); };

show(state.step, true);
