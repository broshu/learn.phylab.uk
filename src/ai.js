// learn.phylab.uk — the two places where the site calls a language model.
//   POST /api/mother   After class: the student asks the mother platypus (the AI tutor) a question about their own mistake.
//   POST /api/brief    Teacher view: a short note for the lecturer, written from the class's check-in results.
// Marking is never done here: every answer on the site is marked by fixed rules in the browser. The model only talks
// about a result those rules have already given.
// The page sends a description of the student's state; the instructions to the model are written here, on the server,
// so a visitor cannot change them.
// Model: Llama 3.3 70B on Cloudflare Workers AI (no data kept by the model service). In the study itself this would be
// replaced by the AI service the university approves.

export const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const MATH = `Write any formula in LaTeX between \\( and \\), for example \\(E \\propto 1/r^3\\) or \\(\\frac{E_1}{E_2}\\). Never use Markdown headings, bold or bullet lists.`;

// ---------- the physics the mother may rely on, the same model as the page (public/after/model.js) ----------
const SHRIMP = `
The game's physics: the shrimp's tail muscles act as a small electric dipole, the + charge toward the head and the − charge toward the tail, 1 cm apart. Far from the shrimp (distance r from its centre, dipole moment p):
- on its axis, ahead of the head or behind the tail: \\(E = \\frac{1}{4\\pi\\varepsilon_0}\\frac{2p}{r^3}\\), pointing the way the shrimp faces (from the − end toward the + end, continued outward);
- beside it, level with its middle: \\(E = \\frac{1}{4\\pi\\varepsilon_0}\\frac{p}{r^3}\\), pointing opposite to the way it faces.
So the field falls off like \\(1/r^3\\), not \\(1/r^2\\) as for one point charge: doubling the distance makes it 8 times weaker. At a fixed distance it is strongest on the axis. A platypus bill feels fields down to 50 µV/cm (1 µV/cm = \\(10^{-4}\\) N/C).`;

const TEACH = `
The task (with help, the mother's lesson): the shrimp faces right. A is 2 cm ahead of its centre on the axis (in front of the head), B is 2 cm beside its centre, C is 4 cm behind its centre on the axis (behind the tail). The student drags an arrow at each point for the field there.
Right answers: at A the field points away from the head (to the right, the + charge is nearer and pushes). At B it points to the left, from the + side toward the − side, opposite to the way the shrimp faces (the up and down parts cancel). At C it points toward the shrimp, which is also to the right (the − charge is nearer and pulls). C is twice as far as A, so its field is about 8 times weaker; the arrow at C must be much shorter than at A (less than half is accepted).
Second task: slide the bill round a circle of fixed distance and stop where the signal is strongest: on the axis, at either end.`;

const HUNT = `
The task (the hunt, alone): a shrimp is hidden in the silt. Part 1, find it: the student takes readings of the field (direction and size) around the silt, then places and turns a guessed shrimp. It counts as found within 1.2 cm and within 45° of the real heading. Then the platypus swims round behind the shrimp's tail, onto its axis. Part 2, how far: the student backs off along the axis, takes readings, works out how far ahead of the starting spot (0 on the ruler) the shrimp's centre is, and strikes. The strike must land within 0.5 cm.
Method for part 2: with \\(E_1\\) read at the start, a distance r from the shrimp, and \\(E_2\\) read after backing off by d: \\(\\frac{E_1}{E_2} = \\left(\\frac{r+d}{r}\\right)^3\\). Take the cube root of the ratio and solve for r. One reading alone cannot give r, because the shrimp's strength is unknown.
Kinds of mistake the rules recognise: in part 1 "position" (wrong place), "reversed" (head and tail swapped), "angle" (heading wrong); in part 2 "one" (only one reading), "square" (used 1/r², as for one point charge), "spot" (measured from where they backed off to instead of from the starting spot), "other".`;

const MOTHER = `You are the mother platypus in a physics game for first-year university students learning electric fields (Knight, Physics for Scientists and Engineers, chapter 23). You are teaching your young one to hunt shrimp by the weak electric field they give off. You speak to the student as your young one: warm, plain, brief, in English. You talk about physics, not about yourself.
Rules:
- Answer the student's question about their own attempt. Use the result already given by the game's marking (below); never contradict it and never mark the answer yourself.
- Be specific to what the student did. Explain the physics behind the mistake and give one next step. Prefer a guiding question or a hint over handing over a full worked answer; if the student is plainly stuck after asking twice, show the method.
- Never invent numbers: use only the numbers in the description below.
- If the question has nothing to do with this task or with electric fields, say kindly that you are here to teach hunting, and bring them back to it.
- At most 110 words. ${MATH}
${SHRIMP}`;

const BRIEF = `You help a university physics lecturer before a first-year class on electric fields (Knight, chapter 23). Students did a short check-in before class; it was marked automatically by fixed rules. From the results below, write a note the lecturer reads in half a minute before the class starts:
- First sentence: how the class did overall, in plain words.
- Then the one or two weaknesses that matter most for today's class (electric field lines and the field of a continuous charge, such as a thin rod), each with what the students most often did wrong and one concrete thing to do about it in the first minutes of class.
- No praise, no general advice, nothing that is not supported by the numbers. Refer to questions by their titles.
- At most 90 words, plain prose, no lists. ${MATH}`;

// ---------- helpers ----------
const clip = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const bad = (msg, status = 400) => Response.json({ error: msg }, { status });

async function run(env, system, user, history = []) {
  const messages = [{ role: "system", content: system }];
  for (const h of history.slice(-6)) {
    if (h && (h.role === "user" || h.role === "assistant")) messages.push({ role: h.role, content: clip(h.content, 900) });
  }
  messages.push({ role: "user", content: user });
  const out = await env.AI.run(MODEL, { messages, max_tokens: 400, temperature: 0.3 });
  const text = typeof out === "string" ? out : out && (out.response ?? out.result?.response);
  if (!text) throw new Error("empty answer");
  return String(text).trim();
}

/** A short description of the student's state, from the page, checked and cut to size here. */
function describeTeach(s = {}) {
  const lines = [];
  const pts = ["A", "B", "C"];
  if (s.arrows) for (const k of pts) {
    const v = s.arrows[k];
    if (!Array.isArray(v) || v.length !== 2 || (Math.abs(v[0]) < 0.12 && Math.abs(v[1]) < 0.12)) { lines.push(`Arrow at ${k}: not drawn.`); continue; }
    const ang = Math.round((Math.atan2(+v[1], +v[0]) * 180) / Math.PI), len = Math.hypot(+v[0], +v[1]).toFixed(1);
    lines.push(`Arrow at ${k}: pointing ${ang}° (0° = right, 90° = up), length ${len} units.`);
  }
  if (s.result) {
    const p = s.result;
    lines.push(`Marking: A ${tf(p.A)}, B ${tf(p.B)}, C ${tf(p.C)}, "C much shorter than A" ${tf(p.size)}.`);
  } else lines.push("The student has not pressed Check yet.");
  if (s.ring) lines.push(`Strongest-place task: ${s.ring.done ? "found" : s.ring.tries ? `not found yet after ${s.ring.tries} tries` : "not tried yet"}.`);
  if (s.helped) lines.push("The student has already looked at the hint showing the field of each charge on its own.");
  return lines.join("\n");
}
const tf = (v) => (v === true ? "right" : v === false ? "wrong" : "not drawn");

function describeHunt(s = {}) {
  const e = s.end || {};
  const lines = [];
  if (e.part === "find") {
    lines.push(`The shrimp got away in part 1 (finding it). Kind of mistake: ${clip(e.kind, 20)}.`);
    if (e.dist != null) lines.push(`The guess was ${(+e.dist).toFixed(2)} cm from the real shrimp; heading error ${Math.round(+e.turn || 0)}°.`);
    if (e.readings != null) lines.push(`Readings taken before guessing: ${+e.readings}.`);
  } else if (e.part === "measure") {
    lines.push(`The shrimp got away in part 2 (how far). Kind of mistake: ${clip(e.kind, 20)}.`);
    lines.push(`The student struck ${+e.ans} cm ahead of the starting spot; the shrimp was ${+s.r} cm ahead.`);
    if (Array.isArray(s.readings)) lines.push(`Readings along the axis (cm backed off from the start: µV/cm): ${s.readings.slice(0, 12).map((p) => `${+p.b}: ${+p.E}`).join("; ")}.`);
  } else lines.push("The student is in the middle of a hunt.");
  if (s.hunts) lines.push(`This was hunt number ${+s.hunts}.`);
  lines.push("The game has already shown the student a short explanation of this mistake; the question below is a follow-up.");
  return lines.join("\n");
}

async function hash(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- the two routes ----------
export async function handleAI(request, env, ctx, path) {
  if (request.method !== "POST") return bad("use POST", 405);
  if (!env.AI) return bad("AI is not set up on this server", 503);
  if (env.AI_LIMIT) {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const { success } = await env.AI_LIMIT.limit({ key: ip });
    if (!success) return bad("Too many questions in a short time. Wait a minute and try again.", 429);
  }
  let body;
  try { body = await request.json(); } catch { return bad("not JSON"); }

  try {
    if (path === "/api/mother") {
      const q = clip(body.question, 400);
      if (!q) return bad("empty question");
      const where = body.where === "hunt" ? "hunt" : "teach";
      const system = MOTHER + (where === "hunt" ? HUNT : TEACH);
      const user = `What the game knows about this attempt:\n${where === "hunt" ? describeHunt(body.state) : describeTeach(body.state)}\n\nThe student asks: ${q}`;
      const answer = await run(env, system, user, Array.isArray(body.history) ? body.history : []);
      return Response.json({ answer, model: MODEL });
    }

    if (path === "/api/brief") {
      const n = +body.n || 0;
      const qs = (Array.isArray(body.questions) ? body.questions : []).slice(0, 8).map((q) =>
        `- ${clip(q.title, 80)}: ${Math.round(+q.pct || 0)}% correct. Most common wrong answers: ${(Array.isArray(q.wrong) ? q.wrong : []).slice(0, 4).map((w) => `${clip(w[0], 80)} (${+w[1]})`).join("; ") || "none"}.`).join("\n");
      if (!n || !qs) return bad("no results");
      const user = `${n} students. Average ${(+body.mean || 0).toFixed(1)} of ${+body.of || 5} questions right.\n${qs}`;
      // the same results give the same note: kept for a day, so most visitors never wait for the model
      const key = new Request(`https://learn.phylab.uk/api/brief/cache/${await hash(BRIEF + user)}`);
      const cache = caches.default;
      const hit = await cache.match(key);
      if (hit) return hit;
      const answer = await run(env, BRIEF, user);
      const res = Response.json({ answer, model: MODEL }, { headers: { "cache-control": "public, max-age=86400" } });
      ctx.waitUntil(cache.put(key, res.clone()));
      return res;
    }
  } catch (err) {
    return bad("The model could not answer just now. Try again in a moment.", 502);
  }
  return bad("not found", 404);
}
