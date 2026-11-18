// learn.phylab.uk — asking the AI from a page, and showing its answer with properly typeset maths.
// The model writes formulas in LaTeX between \( \) or \[ \]; they are turned into MathML by Temml (public/vendor/temml),
// loaded only when an answer contains a formula.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let temml = null;

/** Plain text with \( \) and \[ \] formulas → HTML paragraphs with MathML. */
export async function richText(text) {
  const t = String(text || "").trim();
  const hasMath = /\\\(|\\\[/.test(t);
  if (hasMath && !temml) {
    try { temml = (await import("/vendor/temml/temml.mjs")).default; } catch { temml = null; }
  }
  const tex = (src, display) => {
    if (!temml) return esc(src);
    try { return temml.renderToString(src, { displayMode: display, throwOnError: false }); } catch { return esc(src); }
  };
  return t.split(/\n\s*\n/).map((para) => {
    let html = "", rest = para;
    const re = /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/g;
    let m, last = 0;
    while ((m = re.exec(rest))) {
      html += esc(rest.slice(last, m.index)).replace(/\n/g, "<br>");
      html += m[1] !== undefined ? tex(m[1], true) : tex(m[2], false);
      last = re.lastIndex;
    }
    html += esc(rest.slice(last)).replace(/\n/g, "<br>");
    return `<p>${html}</p>`;
  }).join("");
}

export async function post(path, body) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.answer) throw new Error(data.error || "The answer could not be fetched.");
  return data.answer;
}

/**
 * A box where the student asks the mother platypus about their own attempt.
 * where: "teach" | "hunt"; state(): what the page knows about the attempt (sent with each question);
 * onEvent(name, data): to log questions in the student's record.
 */
export function askMother(box, { where, state, onEvent = () => {}, prompt = "Ask mother about your answer" }) {
  const history = [];
  box.innerHTML = `
    <div class="ask">
      <div class="ask-thread" aria-live="polite"></div>
      <form class="ask-form">
        <input type="text" maxlength="400" autocomplete="off" placeholder="${esc(prompt)}" aria-label="${esc(prompt)}">
        <button class="btn small" type="submit">Ask</button>
      </form>
      <p class="ask-note">Mother's replies come from an AI language model. Your answers are marked by fixed rules, not by the AI.</p>
    </div>`;
  const thread = box.querySelector(".ask-thread"), form = box.querySelector("form"), input = form.querySelector("input"), btn = form.querySelector("button");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q || btn.disabled) return;
    input.value = ""; btn.disabled = true;
    thread.insertAdjacentHTML("beforeend", `<div class="ask-q">${esc(q)}</div>`);
    const wait = document.createElement("div");
    wait.className = "mum ask-a"; wait.innerHTML = `<span class="tag">Mother</span><p class="muted">&hellip;</p>`;
    thread.appendChild(wait);
    onEvent("ask-mother", { where, question: q });
    try {
      const answer = await post("/api/mother", { where, question: q, state: state(), history });
      history.push({ role: "user", content: q }, { role: "assistant", content: answer });
      wait.innerHTML = `<span class="tag">Mother</span>${await richText(answer)}`;
      onEvent("mother-answer", { where, answer });
    } catch (err) {
      wait.innerHTML = `<span class="tag">Mother</span><p class="muted">${esc(err.message)}</p>`;
    }
    btn.disabled = false; input.focus();
  });
}
