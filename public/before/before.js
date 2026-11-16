// learn.phylab.uk — Before class: 1 check-in, 2 learn (catch up on what the check-in showed), 3 predict (not built yet).
// Demonstration layout: every row of the page has the student's part on the left and the teacher's view of it on the right.
import { openRecord } from "/assets/record.js";
import { startCheckin } from "/before/checkin.js";
import { buildLearn } from "/before/learn.js";
import { loadSample, renderSummary, renderQuestion } from "/assets/teacher-checkin.js";

const rec = openRecord("before");
const ORDER = ["check", "learn", "predict"];
let state = rec.get("state");
if (!state || !ORDER.includes(state.step) || !state.check) state = { step: "check", check: { attempts: [] } };
// The Learn step is built from the answers on the page; after a reload those are gone, so start from the check-in.
if (state.step === "learn") state.step = "check";
const save = () => rec.set("state", state);
const $ = (id) => document.getElementById(id);

// ---------- the two columns ----------
/** One row: the student's part, and the teacher's card for the same question beside it. */
const wrap = (id, html) => `<div class="row"><div class="scol">${html}</div><aside class="tcol">${id ? `<div class="card tcard" data-tq="${id}"></div>` : ""}</aside></div>`;
await loadSample();
function renderTeacher() {
  renderSummary($("tSumCheck"), { compact: true });
  renderSummary($("tSumLearn"), { compact: true });
  document.querySelectorAll("[data-tq]").forEach((box) => renderQuestion(box, box.dataset.tq, { compact: true }));
}

// ---------- moving between steps ----------
function show(step, log = true) {
  state.step = step; save();
  if (log) rec.event("step", { name: step });
  ORDER.forEach((s) => $("s-" + s).classList.toggle("on", s === step));
  const i = ORDER.indexOf(step);
  [...$("stepper").children].forEach((li, k) => { li.classList.toggle("done", k < i); li.classList.toggle("now", k === i); });
  if (step === "predict") rec.finish();
  window.scrollTo(0, 0);
}
document.addEventListener("visibilitychange", () => rec.event("step", { name: document.hidden ? "_away" : state.step })); // time away is not time on a step

// ---------- 1 · check-in ----------
let last = null; // the latest submission, with the question objects, for the Learn step
const checkin = startCheckin({
  inline: false, wrap,
  onSubmit(summary) {
    state.check.attempts.push({ t: Date.now(), score: summary.score, total: summary.total, skipped: summary.skipped, missed: summary.missed });
    save();
    rec.event("check-submit", { score: summary.score, skipped: summary.skipped });
    last = summary.detail;
    buildLearn({
      head: $("learnHead"), rows: $("learnRows"), detail: last, wrap,
      onOpen: (id, what, open) => rec.event("learn-toggle", { question: id, what, open }),
    });
    $("toLearn").hidden = false;
    renderTeacher();
    show("learn");
  },
  onRestart() { rec.event("check-retry"); $("toLearn").hidden = true; renderTeacher(); },
});
renderTeacher();
$("toLearn").addEventListener("click", () => show("learn"));

// ---------- 2 · learn ----------
$("learnBack").addEventListener("click", () => show("check"));
$("learnAgain").addEventListener("click", () => { checkin.restart(); show("check"); });
$("learnNext").addEventListener("click", () => show("predict"));

// ---------- 3 · predict ----------
$("predictBack").addEventListener("click", () => show(last ? "learn" : "check"));

show(state.step, true);
