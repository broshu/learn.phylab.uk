// learn.phylab.uk — Before class, step 2 (Learn): catching up on what the check-in showed.
// For every check-in question there is supplementary knowledge prepared in advance (below), a note for each
// kind of mistake the marking rules can name, and a worked solution built from the student's own numbers
// (the solution() of each question in /before/checkin.js). After submitting, the page shows these for the
// questions that were not right or not answered; the questions that were right keep their solutions folded away.
import { Board } from "/assets/board.js";
import { FieldView, formatField } from "/assets/field.js";

const M = (s) => `<math>${s}</math>`;
const MD = (s) => `<math display="block">${s}</math>`;
const V = (l) => M(`<mover><mi>${l}</mi><mo>&#x2192;</mo></mover>`);
const v = (l) => `<mover><mi>${l}</mi><mo>&#x2192;</mo></mover>`;
const K = `<mfrac><mn>1</mn><mrow><mn>4</mn><mi>&#x3C0;</mi><msub><mi>&#x3B5;</mi><mn>0</mn></msub></mrow></mfrac>`;

// ---------- the prepared knowledge, one entry per check-in question ----------
export const KNOWLEDGE = {
  vectors: {
    why: "In this lesson the field of several charges is found by adding the field of each charge as vectors, so this has to be automatic.",
    body: `
      <p>A vector has a size and a direction. On a grid it is easiest to write it as components: how far it goes to the right and how far up, ${M(`${v("A")}<mo>=</mo><mo>(</mo><msub><mi>A</mi><mi>x</mi></msub><mo>,</mo><msub><mi>A</mi><mi>y</mi></msub><mo>)</mo>`)}.</p>
      <p><strong>Adding.</strong> Add the components separately:</p>
      ${MD(`${v("A")}<mo>+</mo>${v("B")}<mo>=</mo><mo>(</mo><msub><mi>A</mi><mi>x</mi></msub><mo>+</mo><msub><mi>B</mi><mi>x</mi></msub><mo>,</mo><mspace width="0.3em"/><msub><mi>A</mi><mi>y</mi></msub><mo>+</mo><msub><mi>B</mi><mi>y</mi></msub><mo>)</mo>`)}
      <p>On a drawing this is the tip-to-tail rule: slide ${V("B")}, without turning it, so that it starts at the tip of ${V("A")}. The sum runs from the start of ${V("A")} to the tip of the moved ${V("B")}. When both vectors start at the same point, this is the diagonal of the parallelogram they make.</p>
      <p><strong>The size of a sum</strong> comes from its components. Writing the sum as ${V("C")}, ${M(`<mo>|</mo>${v("C")}<mo>|</mo><mo>=</mo><msqrt><msubsup><mi>C</mi><mi>x</mi><mn>2</mn></msubsup><mo>+</mo><msubsup><mi>C</mi><mi>y</mi><mn>2</mn></msubsup></msqrt>`)}. It equals ${M(`<mo>|</mo>${v("A")}<mo>|</mo><mo>+</mo><mo>|</mo>${v("B")}<mo>|</mo>`)} only when the two vectors point the same way; otherwise it is shorter, and if they point in opposite directions they partly cancel.</p>
      <p><strong>Not to be confused with the difference.</strong> ${M(`${v("A")}<mo>&#x2212;</mo>${v("B")}<mo>=</mo>${v("A")}<mo>+</mo><mo>(</mo><mo>&#x2212;</mo>${v("B")}<mo>)</mo>`)}, where ${M(`<mo>&#x2212;</mo>${v("B")}`)} has the same length as ${V("B")} and points the opposite way. Drawn from one starting point, the difference is the arrow joining the two tips, the other diagonal of the parallelogram.</p>`,
    errors: {
      "Drew one of the two vectors again": "Your arrow is the same as one of the two vectors you were given. The sum has to contain both: go along the first, then along the second from its tip.",
      "Drew the difference, not the sum": "Your arrow joins the tips of the two vectors. That is the difference, the other diagonal of the parallelogram. The sum is the diagonal that starts at the common starting point.",
      "Added the two lengths": "Your arrow is about as long as the two vectors put together. That only happens when they point the same way; these two point in different directions, so the sum is shorter.",
      "Direction right, length wrong": "Your arrow points the right way but its length is more than 20% off. Count the components on the grid to place the tip exactly.",
      "Length right, direction wrong": "Your arrow has about the right length but points more than 15° away from the sum. Check that the second vector was moved to the tip of the first without being turned.",
      "Direction and length both off": "Both the direction and the length of your arrow are off. Work it out with components, as in the solution below, before drawing.",
    },
  },

  pointField: {
    why: "Every field picture in this lesson, including field lines, is built from this one result.",
    body: `
      <p>A charge changes the space around it: at every point there is an electric field ${V("E")}. The field at a point is the force that a small test charge ${M("<mi>q</mi>")} would feel there, divided by that charge, ${M(`${v("E")}<mo>=</mo>${v("F")}<mo>/</mo><mi>q</mi>`)}. It exists whether or not anything is placed there to feel it.</p>
      <p><strong>Field of a point charge ${M("<mi>Q</mi>")}.</strong></p>
      ${MD(`<mi>E</mi><mo>=</mo>${K}<mfrac><mrow><mo>|</mo><mi>Q</mi><mo>|</mo></mrow><msup><mi>r</mi><mn>2</mn></msup></mfrac>`)}
      <ul class="tight">
        <li>Direction: straight away from a positive charge, straight toward a negative one, along the line through the charge and the point.</li>
        <li>Strength depends only on the distance ${M("<mi>r</mi>")}: every point on a circle around the charge has a field of the same strength.</li>
        <li>Inverse square: at ${M("<mn>2</mn><mi>r</mi>")} the field is ${M("<mfrac><mn>1</mn><mn>4</mn></mfrac>")} as strong, at ${M("<mn>3</mn><mi>r</mi>")} it is ${M("<mfrac><mn>1</mn><mn>9</mn></mfrac>")}.</li>
        <li>The arrow for the field at a point is drawn with its tail on that point.</li>
      </ul>
      <p><strong>Try it.</strong> Drag the yellow sensor around the charge. Compare the reading at 2 cm with the reading at 4 cm, and at two different points 3 cm away.</p>`,
    tryIt(box) {
      box.innerHTML = `<div class="fieldbox"><canvas></canvas></div><div class="readout"></div>`;
      const out = box.querySelector(".readout");
      const view = new FieldView(box.querySelector("canvas"), {
        widthCm: 14, aspect: 0.5, draggable: "probe", showVectors: true, charges: [{ x: 0, y: 0, q: 1 }], probe: { x: 2, y: 0 },
        onChange: (w) => { const [, , m] = w.probeField(); out.textContent = `Distance from the charge: ${Math.hypot(w.probe.x, w.probe.y).toFixed(1)} cm  ·  field: ${formatField(m)}`; },
      });
      view.onChange(view);
    },
    errors: {
      "All three arrows point the wrong way for this sign of charge": "All three of your arrows point the wrong way. A positive charge pushes a positive test charge away from it, so its field points away; a negative charge pulls a positive test charge in, so its field points toward it.",
      "Arrows not along the line to the charge": "At least one of your arrows has a sideways part. The field of a single point charge points exactly along the line from the charge to the point.",
      "Different lengths at the same distance": "Points 1 and 3 are the same distance from the charge, so the field is equally strong there, whichever side of the charge they are on.",
      "At twice the distance, drawn shorter but still half as long or more (should be a quarter)": "You made the field weaker farther away, which is right, but not weak enough. The field falls with the square of the distance: twice as far gives one quarter, not one half.",
      "At twice the distance, drawn about the same length": "You drew the field about as strong at twice the distance. The field of a point charge weakens quickly with distance: twice as far, one quarter as strong.",
      "Drawn stronger farther from the charge": "You drew the field stronger farther from the charge. It is the other way round: the field is strongest close to the charge and falls as one over the distance squared.",
    },
  },

  coulomb: {
    why: "The field of a point charge comes straight out of Coulomb's law, and the same proportional reasoning is used all through the lesson.",
    body: `
      <p><strong>Coulomb's law.</strong> Two point charges ${M("<msub><mi>q</mi><mn>1</mn></msub>")} and ${M("<msub><mi>q</mi><mn>2</mn></msub>")} a distance ${M("<mi>r</mi>")} apart exert forces on each other of size</p>
      ${MD(`<mi>F</mi><mo>=</mo>${K}<mfrac><mrow><mo>|</mo><msub><mi>q</mi><mn>1</mn></msub><mo>|</mo><mo>|</mo><msub><mi>q</mi><mn>2</mn></msub><mo>|</mo></mrow><msup><mi>r</mi><mn>2</mn></msup></mfrac><mspace width="2em"/>${K}<mo>&#x2248;</mo><mn>8.99</mn><mo>&#xD7;</mo><msup><mn>10</mn><mn>9</mn></msup><mtext>&#xA0;N</mtext><mspace width="0.15em"/><msup><mtext>m</mtext><mn>2</mn></msup><mo>/</mo><msup><mtext>C</mtext><mn>2</mn></msup>`)}
      <ul class="tight">
        <li>The forces act along the line joining the charges: repulsive for like charges, attractive for opposite charges.</li>
        <li>The two forces form a Newton's third law pair: equal in size and opposite in direction, even when one charge is much bigger than the other.</li>
      </ul>
      <p><strong>Reasoning with ratios.</strong> You rarely need the constant. The force is proportional to each charge and to ${M("<mn>1</mn><mo>/</mo><msup><mi>r</mi><mn>2</mn></msup>")}:</p>
      <table class="ratios">
        <tr><td>one charge halved</td><td>force ${M("<mo>&#xD7;</mo><mfrac><mn>1</mn><mn>2</mn></mfrac>")}</td></tr>
        <tr><td>distance halved</td><td>force ${M("<mo>&#xD7;</mo><mn>4</mn>")}</td></tr>
        <tr><td>distance doubled</td><td>force ${M("<mo>&#xD7;</mo><mfrac><mn>1</mn><mn>4</mn></mfrac>")}</td></tr>
        <tr><td>distance ${M("<mo>&#xD7;</mo><mfrac><mn>1</mn><msqrt><mn>2</mn></msqrt></mfrac>")}</td><td>force ${M("<mo>&#xD7;</mo><mn>2</mn>")}</td></tr>
      </table>
      <p><strong>Try it.</strong> Change the charge on B and the distance, and watch the force, in units of the original force ${M("<mi>F</mi>")}.</p>`,
    tryIt(box) {
      box.innerHTML = `<div class="sliders">
          <label>Charge on B <b data-v="q"></b><input type="range" min="0.25" max="2" step="0.25" value="0.5" data-i="q"></label>
          <label>Distance <b data-v="r"></b><input type="range" min="0.4" max="2" step="0.01" value="1" data-i="r"></label>
        </div><div class="readout"></div>`;
      const qq = (s) => box.querySelector(s);
      const sync = () => {
        const q = +qq('[data-i="q"]').value, r = +qq('[data-i="r"]').value;
        qq('[data-v="q"]').textContent = `${q} × the original`; qq('[data-v="r"]').textContent = `${r.toFixed(2)} × the original`;
        qq(".readout").textContent = `Force between the spheres: ${(q / (r * r)).toFixed(2)} F`;
      };
      box.querySelectorAll("input").forEach((i) => i.addEventListener("input", sync));
      sync();
    },
    errors: {
      "Halved the distance (the force would be 2F)": "You halved the distance. Because the force goes as one over the distance squared, that makes it four times larger, which against the halved charge leaves 2F, not F.",
      "Left the sphere where it was (the force would be F/2)": "You left sphere B where it was. With half the charge, the force there is only F/2, so B has to come closer.",
      "Moved the sphere farther away": "You moved B farther away. That weakens the force even more; with half the charge, B has to come closer to get F back.",
      "Moved the sphere much too close": "You moved B much too close. Only the factor of 2 lost with the charge has to be made up, so the distance squared halves; the distance itself shrinks only to about 0.71 of what it was.",
      "Moved closer, but not to the right distance": "Closer was right, but not by the right amount. The distance squared must halve, so the distance becomes the original divided by the square root of 2.",
    },
  },

  force: {
    why: "Once a field is known, this is how it is used: the force on any charge placed in it.",
    body: `
      <p>The field at a point tells you the force on any charge you put there:</p>
      ${MD(`${v("F")}<mo>=</mo><mi>q</mi>${v("E")}`)}
      <ul class="tight">
        <li>A positive charge is pushed along ${V("E")}; a negative charge is pushed opposite to ${V("E")}.</li>
        <li>The size of the force is ${M("<mo>|</mo><mi>q</mi><mo>|</mo><mi>E</mi>")}. For charges of the same size, the larger force is where the field is stronger, whatever the sign.</li>
        <li>Only the field at the charge's own position counts. A charge is not pushed by its own field.</li>
      </ul>
      <p><strong>Reading a field picture.</strong> In a picture of field vectors, each arrow shows the direction of the field at its centre, and a longer arrow means a stronger field. In a picture of field lines, which you meet in this lesson, the field points along the line and is stronger where the lines are closer together.</p>
      <p><strong>Under a thundercloud.</strong> The base of the cloud is negative and the ground below becomes positive, so between them the field points from the ground up toward the cloud. A positive droplet there is pushed up, a negative droplet down.</p>`,
    errors: {
      "Force on the negative charge drawn along the field (should be opposite)": "Your force on the negative droplet points along the field. For a negative charge, F = qE points opposite to the field.",
      "Force on the positive charge drawn against the field": "Your force on the positive droplet points against the field. For a positive charge the force points the same way as the field.",
      "Both forces reversed": "Both of your forces are reversed: the positive droplet should be pushed along the field and the negative one against it.",
      "A force not along the field at that point": "At least one of your forces is not along the line of the field at that droplet. Take the direction from the grey arrows right next to the droplet, not from the cloud.",
      "Larger force drawn where the field is weaker": "You drew the larger force on the droplet in the weaker field. The charges are the same size, so the force is larger where the field is stronger.",
      "The two forces drawn about equally strong, although the field strengths differ": "You drew the two forces about equally strong. The droplets carry charges of the same size but sit in fields of different strength, so the forces differ by the same factor as the fields.",
    },
  },

  rod: {
    why: "In class you will set up the same integral again, with charge in place of mass.",
    body: `
      <p><strong>Gravity between point masses.</strong> ${M("<mi>F</mi><mo>=</mo><mi>G</mi><msub><mi>m</mi><mn>1</mn></msub><msub><mi>m</mi><mn>2</mn></msub><mo>/</mo><msup><mi>r</mi><mn>2</mn></msup>")}, attractive, along the line joining the two. It has the same form as Coulomb's law.</p>
      <p><strong>Objects that are not points.</strong> Cut the object into small pieces. Each piece is small enough to act like a point mass, so its pull follows the law above. The total force is the vector sum of the pulls of all the pieces.</p>
      <p><strong>A small piece of a uniform rod.</strong> The mass per unit length is ${M("<mi>&#x3BB;</mi><mo>=</mo><mi>M</mi><mo>/</mo><mi>L</mi>")}, so a piece of length ${M("<mi>d</mi><mi>y</mi>")} has mass ${M("<mi>d</mi><mi>m</mi><mo>=</mo><mi>&#x3BB;</mi><mi>d</mi><mi>y</mi>")}. This is the same step you used to find the centre of mass or the moment of inertia of a rod.</p>
      <p><strong>Use symmetry before integrating.</strong> Pair each piece above the centre with the matching piece below it. Their pulls are equally strong and tilted by the same angle, so the parts along the rod cancel and only the parts toward the rod are left. You then integrate only that part, which is the pull multiplied by the cosine of its angle to the line to the centre.</p>
      <p><strong>From a sum to an integral.</strong> As the pieces get smaller, the sum of their pulls becomes an integral over the rod, with limits at the two ends of the rod, measured from wherever you put ${M("<mi>y</mi><mo>=</mo><mn>0</mn>")}.</p>`,
    tryIt(box, item) { item.explore(box); },
    // the rod has its own note for each part (from /before/rod.js)
  },
};

// ---------- the Learn step ----------
const STATUS = (r) => (r.ok ? "Right" : r.skipped ? "Not answered" : "Not right");

/**
 * Fill the Learn step.
 * rows: the element that receives one row per question; wrap(id, html) puts a question's teacher card beside it.
 * head: the element for the summary at the top. detail: the check-in results, with each question's object in it.
 */
export function buildLearn({ head, rows, detail, wrap, onOpen = () => {} }) {
  const todo = detail.filter((r) => !r.ok), done = detail.filter((r) => r.ok);
  const number = (r) => detail.indexOf(r) + 1;
  head.innerHTML = `
    <h1>Learn</h1>
    <p class="intro">${todo.length
      ? `The check-in showed ${todo.length === 1 ? "one thing" : `${todo.length} things`} to catch up on before class. For each one: what went wrong in your answer, the knowledge it needs, and a worked solution with your own numbers.`
      : "You answered every question correctly, so there is nothing you need to catch up on. The worked solutions are below if you want to compare your reasoning."}</p>
    <div class="card">
      <p class="score">${done.length} of ${detail.length} right</p>
      <ol class="todo">${detail.map((r) => `<li class="${r.ok ? "ok" : r.skipped ? "skip" : "no"}"><a href="#learn-${r.it.id}">${r.it.topic}</a> <span>${STATUS(r)}</span></li>`).join("")}</ol>
    </div>`;

  rows.innerHTML = todo.map((r) => wrap(r.it.id, `
      <article class="card learn" id="learn-${r.it.id}">
        <span class="tag ${r.skipped ? "" : "no"}">Question ${number(r)} · ${STATUS(r)}</span>
        <h2>${r.it.topic}</h2>
        ${r.skipped ? `<p class="muted">You did not answer this one. Read the knowledge it needs, then follow the solution.</p>` : `
        <h3>Your answer</h3>
        ${r.it.custom ? r.it.partsHtml(r) + r.it.review(r).replace(/<p class="cap">[\s\S]*?<\/p>$/, "") : `
          <div class="fieldbox"><canvas data-review></canvas></div>
          <p class="cap">Orange: what you drew. Green: the answer.${r.it.legend ? " " + r.it.legend : ""}</p>
          <p class="what"><strong>${r.error}.</strong> ${(KNOWLEDGE[r.it.id].errors || {})[r.error] || ""}</p>`}`}
        <h3>What this question needs</h3>
        <p class="why">${KNOWLEDGE[r.it.id].why}</p>
        ${KNOWLEDGE[r.it.id].body}
        ${KNOWLEDGE[r.it.id].tryIt ? `<div data-try></div>` : ""}
        <details class="sol" open><summary>Worked solution</summary>${r.it.solution()}</details>
      </article>`)).join("") + (done.length ? wrap(null, `
      <article class="card learn">
        <span class="tag">Answered correctly</span>
        <h2>The other ${done.length === 1 ? "question" : `${done.length} questions`}</h2>
        ${done.map((r) => `<details class="sol"><summary>${number(r)}. ${r.it.topic}: worked solution</summary>${r.it.solution()}</details>`).join("")}
      </article>`) : "");

  for (const r of todo) {
    const card = rows.querySelector(`#learn-${r.it.id}`);
    const canvas = card.querySelector("[data-review]");
    if (canvas) { const b = new Board(canvas, { w: r.it.w, h: r.it.h, grid: r.it.grid, paint: (bd, ctx) => r.it.paint(bd, ctx, true) }); b.locked = true; b.draw(); }
    const tryBox = card.querySelector("[data-try]");
    if (tryBox) KNOWLEDGE[r.it.id].tryIt(tryBox, r.it);
    card.querySelector("details.sol").addEventListener("toggle", (e) => onOpen(r.it.id, "solution", e.target.open));
  }
  // brackets and absolute-value bars keep their normal size next to vector arrows
  for (const box of [head, rows]) box.querySelectorAll("mo").forEach((m) => { const t = m.textContent.trim(); if (t && "()|".includes(t)) m.setAttribute("stretchy", "false"); });
  rows.querySelectorAll("details.sol:not([open])").forEach((d) => d.addEventListener("toggle", () => onOpen("answered", "solution", d.open)));
}
