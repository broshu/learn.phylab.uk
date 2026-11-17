// learn.phylab.uk — the full teacher page: every teacher panel of the lesson in one place, one tab per part.
// The check-in is drawn by /assets/teacher-checkin.js. The in-class and after-class panels come from the same modules
// as on the student pages; their student side is built out of sight, because the teacher cards are worked out from it.
// Each part loads only when its tab is first opened (the in-class part brings three.js with it).
import { QUESTIONS, loadSample, mine, clearMine, renderSummary, renderQuestion, STORE } from "/assets/teacher-checkin.js";
import { openRecord } from "/assets/record.js";

const $ = (id) => document.getElementById(id);

// ---------- before class: the check-in ----------
await loadSample();
function renderCheckin() {
  const own = mine().length;
  $("mineNote").textContent = own
    ? `${own} submission${own === 1 ? "" : "s"} made in this browser ${own === 1 ? "is" : "are"} added to them and outlined in black.`
    : "Answer the check-in yourself and your submission is added here, outlined in black.";
  $("clearMine").hidden = !own;
  renderSummary($("tiles"));
  $("questions").innerHTML = QUESTIONS.map((q) => `<article class="card qcard" id="q-${q.id}"></article>`).join("");
  for (const q of QUESTIONS) renderQuestion($("q-" + q.id), q.id);
}
$("clearMine").addEventListener("click", () => { clearMine(); renderCheckin(); });
window.addEventListener("storage", (e) => { if (e.key === STORE || e.key === null) renderCheckin(); });
renderCheckin();

// ---------- in class and after class ----------
const fail = (box, err) => { box.innerHTML = `<p class="none">This panel could not load (${err.message}). Reload the page to try again.</p>`; };
const PARTS = {
  before: null,
  async during() {
    const rec = openRecord("during");
    const [{ startDraw }, { startPeer }, { startMatch }] = await Promise.all([
      import("/during/draw.js"), import("/during/peer.js"), import("/during/match.js"),
    ]);
    try { startDraw({ student: $("drawStudent"), teacher: $("drawTeacher"), rec }); } catch (e) { fail($("drawTeacher"), e); }
    try { startPeer({ student: $("peerStudent"), teacher: $("peerTeacher"), rec }); } catch (e) { fail($("peerTeacher"), e); }
    try { startMatch({ student: null, teacher: $("matchTeacher"), rec }); } catch (e) { fail($("matchTeacher"), e); }
  },
  async after() {
    const rec = openRecord("after");
    const [{ makeClass }, { startTeach }, { startHunt }] = await Promise.all([
      import("/after/sample.js"), import("/after/teach.js"), import("/after/hunt.js"),
    ]);
    const cls = makeClass();
    try { startTeach({ student: $("teachStudent"), teacher: $("teachTeacher"), rec, cls }); } catch (e) { fail($("teachTeacher"), e); }
    try { startHunt({ student: $("huntStudent"), teacher: $("huntTeacher"), rec, cls }); } catch (e) { fail($("huntTeacher"), e); }
  },
};
const loaded = new Set(["before"]);

function open(tab) {
  if (!(tab in PARTS)) tab = "before";
  document.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  document.querySelectorAll(".tpanel").forEach((p) => p.classList.toggle("on", p.id === "p-" + tab));
  if (!loaded.has(tab)) {
    loaded.add(tab);
    PARTS[tab]().catch((e) => { loaded.delete(tab); fail($("p-" + tab), e); });
  }
  window.dispatchEvent(new Event("resize")); // canvases in a panel that was hidden take their size now
}
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
  history.replaceState(null, "", "#" + b.dataset.tab);
  open(b.dataset.tab);
}));
open(location.hash.slice(1));
window.addEventListener("hashchange", () => open(location.hash.slice(1)));
