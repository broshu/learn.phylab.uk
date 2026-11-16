// learn.phylab.uk — full teacher page for the check-in. The drawing itself lives in /assets/teacher-checkin.js.
import { QUESTIONS, loadSample, mine, clearMine, renderSummary, renderQuestion, STORE } from "/assets/teacher-checkin.js";

const $ = (id) => document.getElementById(id);
await loadSample();

function render() {
  const own = mine().length;
  $("mineNote").textContent = own
    ? `${own} submission${own === 1 ? "" : "s"} made in this browser ${own === 1 ? "is" : "are"} added to them and outlined in black.`
    : "Answer the check-in yourself and your submission is added here, outlined in black.";
  $("clearMine").hidden = !own;
  renderSummary($("tiles"));
  $("questions").innerHTML = QUESTIONS.map((q) => `<article class="card qcard" id="q-${q.id}"></article>`).join("");
  for (const q of QUESTIONS) renderQuestion($("q-" + q.id), q.id);
}

$("clearMine").addEventListener("click", () => { clearMine(); render(); });
window.addEventListener("storage", (e) => { if (e.key === STORE || e.key === null) render(); });
render();
