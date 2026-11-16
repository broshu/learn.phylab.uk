// learn.phylab.uk — Before class: 1 check-in, 2 learn (catch up on what the check-in showed), 3 predict (not built yet).
// Demonstration layout: every row of the page has the student's part on the left and the teacher's view of it on the right.
import { openRecord, resetButton } from "/assets/record.js";
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
  document.querySelectorAll("[data-tq]").forEach((box) => renderQuestion(box, box.dataset.tq, { compact: true, live: live[box.dataset.tq] }));
}

// ---------- moving between steps ----------
function show(step, log = true) {
  state.step = step; save();
  if (log) rec.event("step", { name: step });
  ORDER.forEach((s) => $("s-" + s).classList.toggle("on", s === step));
  const i = ORDER.indexOf(step);
  [...$("stepper").children].forEach((li, k) => { li.classList.toggle("done", k < i); li.classList.toggle("now", k === i); });
  $("colhead").classList.toggle("solo-head", step === "learn");
  document.body.classList.toggle("solo-step", step === "learn"); // Learn has no back end beside it
  $("learnEmpty").hidden = !!last;
  if (step === "predict") rec.finish();
  window.scrollTo(0, 0);
}
document.addEventListener("visibilitychange", () => rec.event("step", { name: document.hidden ? "_away" : state.step })); // time away is not time on a step

// ---------- 1 · check-in ----------
let last = null; // the latest submission, with the question objects, for the Learn step
const live = {};  // answers drawn but not yet submitted, shown at once in the teacher's cards
function showLive(id, result) {
  live[id] = result;
  const box = document.querySelector(`[data-tq="${id}"]`); if (!box) return;
  renderQuestion(box, id, { compact: true, live: result });
  box.classList.remove("flash"); void box.offsetWidth; box.classList.add("flash");
}
const checkin = startCheckin({
  inline: false, wrap, onLive: showLive,
  onSubmit(summary) {
    state.check.attempts.push({ t: Date.now(), score: summary.score, total: summary.total, skipped: summary.skipped, missed: summary.missed });
    save();
    rec.event("check-submit", { score: summary.score, skipped: summary.skipped });
    last = summary.detail;
    for (const k in live) delete live[k]; // now part of the submission itself
    buildLearn({
      head: $("learnHead"), rows: $("learnRows"), detail: last, wrap: (id, html) => wrap(null, html),
      onOpen: (id, what, open) => rec.event("learn-toggle", { question: id, what, open }),
    });
    $("toLearn").hidden = false;
    renderTeacher();
    show("learn");
  },
  onRestart() { for (const k in live) delete live[k]; rec.event("check-retry"); $("toLearn").hidden = true; renderTeacher(); },
});
renderTeacher();
$("toLearn").addEventListener("click", () => show("learn"));
// the step bar works as tabs: a reviewer can open any step at any time
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
$("submitNow").addEventListener("click", () => $("submit").click());

// ---------- 2 · learn ----------
$("learnBack").addEventListener("click", () => show("check"));
$("learnAgain").addEventListener("click", () => { checkin.restart(); show("check"); });
$("learnNext").addEventListener("click", () => show("predict"));

// ---------- 3 · predict ----------
$("predictBack").addEventListener("click", () => show("learn"));

show(state.step, true);
resetButton(document.getElementById("resetDemo"));
