// learn.phylab.uk — check-in question: the gravitational pull of a thin rod on a ball in its bisecting plane.
// It is the gravity twin of the charged rod treated in class (Knight, Example 23.3): same picture,
// same symmetry argument, same integral. Students have met each ingredient before: Newton's law of
// gravity, the mass of a small piece of a uniform rod, and adding up small pieces with an integral.
import { Board, arrow, symbol, INK, SOFT, MINE, RIGHT } from "/assets/board.js";
import { judgeRod, ROD_KEY, rodFactor } from "/assets/checkin-judge.js";
import { CARDS, cardHtml, frac, root } from "/assets/rod-cards.js";

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const len = (v) => Math.hypot(v[0], v[1]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const M = (s) => `<math>${s}</math>`;
const D = (s) => `<math><mstyle displaystyle="true">${s}</mstyle></math>`;

export function rodGravity() {
  const ratio = pick([1, 2, 4]);                       // L / r
  const rodX = 3, yc = 3.5, half = 2.5, rb = (2 * half) / ratio, ball = [rodX + rb, yc];
  const pieceY = yc + 1.9 + Math.random() * 0.4;       // the highlighted piece, in the upper half
  const pairDy = 1.6, a = Math.min(1.6, rb * 0.55);    // the two symmetric pieces and the drawn size of their pulls
  const unit = (v) => [v[0] / len(v), v[1] / len(v)];
  const toPiece = unit(sub([rodX, pieceY], ball)), toCentre = [-1, 0];
  const pulls = [1, -1].map((s) => { const u = unit(sub([rodX, yc + s * pairDy], ball)); return [u[0] * a, u[1] * a]; });
  const k = rodFactor(ratio);

  let el, onChange = () => {}, boardA, boardB, boardC, tipA, tipB, mark, lockedA = false, locked = false;
  const blanks = { dm: null, dist: null, factor: null, lower: null, upper: null };
  const q = (sel) => el.querySelector(sel);
  const est = () => ((mark.x - 1) / 10) * 1.5;

  function drawRod(b, ctx, pieces) {
    const [x, y0] = b.px(rodX, yc - half), [, y1] = b.px(rodX, yc + half), [bx, by] = b.px(...ball);
    ctx.strokeStyle = "#cfd5df"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    symbol(ctx, [{ t: "r" }], (x + bx) / 2, by + 20, SOFT, 16);
    ctx.strokeStyle = "#7b8496"; ctx.lineWidth = 9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    // length L, marked to the left of the rod
    ctx.strokeStyle = SOFT; ctx.lineWidth = 1.2; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.moveTo(x - 26, y0); ctx.lineTo(x - 26, y1); ctx.moveTo(x - 31, y0); ctx.lineTo(x - 21, y0); ctx.moveTo(x - 31, y1); ctx.lineTo(x - 21, y1); ctx.stroke();
    symbol(ctx, [{ t: "L" }], x - 40, (y0 + y1) / 2 + 6, SOFT, 16);
    for (const py of pieces) {
      const [, p0] = b.px(rodX, py - 0.22), [, p1] = b.px(rodX, py + 0.22);
      ctx.strokeStyle = MINE; ctx.lineWidth = 11; ctx.lineCap = "butt";
      ctx.beginPath(); ctx.moveTo(x, p0); ctx.lineTo(x, p1); ctx.stroke();
    }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(bx, by, 8, 0, 7); ctx.fill();
    symbol(ctx, [{ t: "m" }], bx + 16, by - 10, INK, 16);
  }

  function mount(container, number, changed) {
    el = container; onChange = changed;
    el.innerHTML = `
      <p class="stem"><span class="n">${number}.</span>A thin, uniform rod has mass ${M("<mi>M</mi>")} and length ${M("<mi>L</mi>")}. A small ball of mass ${M("<mi>m</mi>")} sits a distance ${M("<mi>r</mi>")} from the centre of the rod, on the line that cuts the rod in half at right angles. The three parts below build up the gravitational force of the rod on the ball.</p>

      <h3 class="part">Part A · One small piece, then two</h3>
      <p>The highlighted piece of the rod pulls on the ball. Drag from the ball to draw that pull.</p>
      <div class="fieldbox"><canvas data-c="a"></canvas></div>
      <p style="margin-top:10px"><button class="btn small ghost" data-a="lock" disabled>Keep this arrow and go on</button></p>
      <div data-s="pair" hidden>
        <p>Now two pieces, placed symmetrically, with the pull of each one on the ball. Drag from the ball to draw the sum of the two pulls.</p>
        <div class="fieldbox"><canvas data-c="b"></canvas></div>
      </div>

      <h3 class="part">Part B · Set up the integral</h3>
      <p>Measure ${M("<mi>y</mi>")} along the rod from its centre. A small piece at height ${M("<mi>y</mi>")} has length ${M("<mi>d</mi><mi>y</mi>")} and mass ${M("<mi>d</mi><mi>m</mi>")}. Adding up the pulls of all the pieces gives the force on the ball. Drag a card into each of the five boxes.</p>
      <div class="eq">
        <div class="eqrow">${M("<mi>d</mi><mi>m</mi><mo>=</mo>")}<span class="blank" data-b="dm"></span>${M("<mi>d</mi><mi>y</mi>")}</div>
        <div class="eqrow">${M("<mi>F</mi><mo>=</mo>")}
          <span class="int"><span class="blank lim" data-b="upper"></span><span class="sign">&#x222B;</span><span class="blank lim" data-b="lower"></span></span>
          <span class="cfrac"><span>${M("<mi>G</mi><mi>m</mi>")}</span><span class="blank" data-b="dist"></span></span>
          ${M("<mo>&#xD7;</mo>")}<span class="blank" data-b="factor"></span>${M("<mi>d</mi><mi>m</mi>")}
        </div>
        <div class="eqnote"><span>the pull of one small piece</span><span>the part of that pull that points straight at the rod</span></div>
      </div>
      <div class="cards">${CARDS.map(([id]) => `<button class="tile" data-t="${id}">${cardHtml(id)}</button>`).sort(() => Math.random() - 0.5).join("")}</div>

      <h3 class="part">Part C · Use the result</h3>
      <p>The integral is a standard one that can be looked up; you are not asked to work it out. It gives</p>
      <math display="block"><mi>F</mi><mo>=</mo><mfrac><mrow><mi>G</mi><mi>M</mi><mi>m</mi></mrow><mrow><mi>r</mi><msqrt><msup><mi>r</mi><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><mi>L</mi><mo>/</mo><mn>2</mn><mo>)</mo></mrow><mn>2</mn></msup></msqrt></mrow></mfrac></math>
      <p>If all the mass of the rod sat at its centre, the force would be ${D("<msub><mi>F</mi><mtext>point</mtext></msub><mo>=</mo>" + frac("<mrow><mi>G</mi><mi>M</mi><mi>m</mi></mrow>", "<msup><mi>r</mi><mn>2</mn></msup>"))}. For this rod, ${M(`<mi>L</mi><mo>=</mo>${ratio === 1 ? "" : `<mn>${ratio}</mn>`}<mi>r</mi>`)}. Work out ${M("<mi>F</mi><mo>/</mo><msub><mi>F</mi><mtext>point</mtext></msub>")} and drag the marker to it.</p>
      <div class="fieldbox"><canvas data-c="c"></canvas></div>
      <div class="readout" data-r="c">Drag the marker.</div>
      <div data-s="explore"></div>`;

    // Part A, first arrow
    boardA = new Board(q('[data-c="a"]'), { w: 12, h: 7, grid: false, onChange: () => { q('[data-a="lock"]').disabled = lockedA || len(sub([tipA.x, tipA.y], ball)) < 0.4; onChange(); } });
    tipA = boardA.addHandle({ x: ball[0], y: ball[1] });
    boardA.paint = (b, ctx) => {
      drawRod(b, ctx, [pieceY]);
      const [x] = b.px(rodX, 0), [, py] = b.px(0, pieceY), [, cy] = b.px(0, yc);
      ctx.strokeStyle = SOFT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 14, cy); ctx.lineTo(x + 14, py); ctx.moveTo(x + 9, py); ctx.lineTo(x + 19, py); ctx.stroke();
      symbol(ctx, [{ t: "y" }], x + 26, (py + cy) / 2 + 5, SOFT, 16);
      if (len(sub([tipA.x, tipA.y], ball)) > 0.1) arrow(ctx, ...b.px(...ball), ...b.px(tipA.x, tipA.y), MINE, 3.5);
    };
    boardA.draw();
    q('[data-a="lock"]').addEventListener("click", () => {
      lockedA = true; boardA.locked = true; boardA.draw();
      q('[data-a="lock"]').disabled = true; q('[data-a="lock"]').textContent = "Arrow kept";
      q('[data-s="pair"]').hidden = false; boardB.resize(); onChange();
    });

    // Part A, the symmetric pair
    boardB = new Board(q('[data-c="b"]'), { w: 12, h: 7, grid: false, onChange });
    tipB = boardB.addHandle({ x: ball[0], y: ball[1] });
    boardB.paint = (b, ctx, review) => {
      drawRod(b, ctx, [yc + pairDy, yc - pairDy]);
      for (const f of pulls) arrow(ctx, ...b.px(...ball), ...b.px(ball[0] + f[0], ball[1] + f[1]), INK, 2.6);
      if (len(sub([tipB.x, tipB.y], ball)) > 0.1) arrow(ctx, ...b.px(...ball), ...b.px(tipB.x, tipB.y), MINE, 3.5);
    };
    boardB.draw();

    // Part B, cards: drag a card onto a box, or tap a card and then a box
    let held = null;
    const tile = (id) => q(`.tile[data-t="${CSS.escape(id)}"]`);
    const refresh = () => {
      el.querySelectorAll(".blank").forEach((b) => { const id = blanks[b.dataset.b]; b.innerHTML = id ? cardHtml(id) : ""; b.classList.toggle("filled", !!id); });
      el.querySelectorAll(".tile").forEach((t) => { t.hidden = Object.values(blanks).includes(t.dataset.t); t.classList.toggle("held", t.dataset.t === held); });
      onChange();
    };
    const place = (name, id) => { if (locked) return; blanks[name] = id; held = null; refresh(); };
    el.querySelectorAll(".blank").forEach((b) => b.addEventListener("click", () => {
      if (locked) return;
      if (held) place(b.dataset.b, held); else if (blanks[b.dataset.b]) { blanks[b.dataset.b] = null; refresh(); }
    }));
    el.querySelectorAll(".tile").forEach((t) => t.addEventListener("pointerdown", (e) => {
      if (locked) return;
      e.preventDefault();
      const id = t.dataset.t, start = [e.clientX, e.clientY];
      let ghost = null;
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - start[0], ev.clientY - start[1]) > 6) {
          ghost = t.cloneNode(true); ghost.classList.add("ghost"); document.body.appendChild(ghost);
        }
        if (ghost) { ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px"; }
      };
      const up = (ev) => {
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
        if (!ghost) { held = held === id ? null : id; refresh(); return; } // a tap: pick the card up
        ghost.remove();
        const target = document.elementFromPoint(ev.clientX, ev.clientY);
        const box = target && target.closest(".blank");
        if (box && el.contains(box)) place(box.dataset.b, id);
      };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    }));
    refresh();

    // Part C, the scale
    boardC = new Board(q('[data-c="c"]'), { w: 12, h: 2.3, grid: false, onChange: () => { q('[data-r="c"]').textContent = mark.touched ? `Your value: ${est().toFixed(2)}` : "Drag the marker."; onChange(); } });
    mark = boardC.addHandle({ x: 1, y: 1.3, limit: (x) => [Math.max(1, Math.min(11, x)), 1.3] });
    boardC.paint = (b, ctx, review) => paintScale(b, ctx, review === true);
    boardC.draw();
  }

  function paintScale(b, ctx, review) {
    const y = 1.3, at = (v) => 1 + (v / 1.5) * 10;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(...b.px(1, y)); ctx.lineTo(...b.px(11, y));
    for (let v = 0; v <= 1.5001; v += 0.05) { const [x, py] = b.px(at(v), y), big = Math.abs(v * 4 - Math.round(v * 4)) < 1e-6; ctx.moveTo(x, py); ctx.lineTo(x, py + (big ? 11 : 6)); }
    ctx.stroke();
    ctx.fillStyle = INK; ctx.font = "600 13px -apple-system, Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (const v of [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5]) { const [x, py] = b.px(at(v), y); ctx.fillText(String(v), x, py + 14); }
    if (review) { const [x, py] = b.px(at(k), y); ctx.fillStyle = RIGHT; ctx.beginPath(); ctx.moveTo(x, py - 4); ctx.lineTo(x - 8, py - 20); ctx.lineTo(x + 8, py - 20); ctx.closePath(); ctx.fill(); ctx.textBaseline = "bottom"; ctx.fillText(k.toFixed(2), x, py - 23); }
    if (mark.touched) { const [x, py] = b.px(mark.x, y); ctx.fillStyle = MINE; ctx.beginPath(); ctx.arc(x, py, 7, 0, 7); ctx.fill(); }
  }

  /** After submitting: the same picture as a simulation. Cut the rod into pieces and add up their pulls. */
  function explore() {
    const box = q('[data-s="explore"]');
    box.innerHTML = `
      <h3 class="part">Try it: cut the rod into pieces</h3>
      <p>Each piece is treated as a point mass. Thin arrows show the pull of each piece (drawn larger so that you can see them); the thick arrow is their sum.</p>
      <div class="fieldbox"><canvas data-c="x"></canvas></div>
      <div class="sliders">
        <label>Number of pieces <b data-v="n"></b><input type="range" min="0" max="6" step="1" value="0" data-i="n"></label>
        <label>Length of the rod <b data-v="q"></b><input type="range" min="0.25" max="6" step="0.05" value="${ratio}" data-i="q"></label>
      </div>
      <div class="readout" data-r="x"></div>`;
    const state = { n: 1, q: ratio };
    const bx = new Board(q('[data-c="x"]'), { w: 12, h: 7, grid: false });
    bx.locked = true;
    const centre = [3, 3.5], r = 4.2, at = [centre[0] + r, centre[1]];
    bx.paint = (b, ctx) => {
      const halfLen = Math.min(3.2, (state.q * r) / 2), scale = halfLen / ((state.q * r) / 2); // long rods are drawn to fit
      const rr = r * scale, p = [centre[0] + rr, centre[1]];
      const [x, y0] = b.px(centre[0], centre[1] - halfLen), [, y1] = b.px(centre[0], centre[1] + halfLen);
      ctx.strokeStyle = "#7b8496"; ctx.lineWidth = 9; ctx.lineCap = "butt"; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      let fx = 0;
      for (let i = 0; i < state.n; i++) {
        const y = -halfLen + ((i + 0.5) * 2 * halfLen) / state.n, d = Math.hypot(rr, y);
        const f = (rr * rr) / (d * d), ux = -rr / d, uy = y / d;     // pull of the whole rod's mass placed here, in units of F_point
        fx += (f * -ux) / state.n;
        if (state.n > 1) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; const [, py] = b.px(0, centre[1] + y - halfLen / state.n); ctx.beginPath(); ctx.moveTo(x - 6, py); ctx.lineTo(x + 6, py); ctx.stroke(); }
        arrow(ctx, ...b.px(...p), ...b.px(p[0] + ux * f * 1.5, p[1] + uy * f * 1.5), "rgba(26,32,48,0.28)", 1.6);
      }
      arrow(ctx, ...b.px(...p), ...b.px(p[0] - fx * 1.5, p[1]), RIGHT, 4);
      const [px, py] = b.px(...p); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px, py, 8, 0, 7); ctx.fill();
      const Fp = M("<msub><mi>F</mi><mtext>point</mtext></msub>");
      q('[data-r="x"]').innerHTML = `Sum of the ${state.n} piece${state.n === 1 ? "" : "s"}: ${fx.toFixed(3)} ${Fp} &nbsp;·&nbsp; from the integral: ${rodFactor(state.q).toFixed(3)} ${Fp}`;
    };
    const sync = () => {
      state.n = 2 ** +q('[data-i="n"]').value; state.q = +q('[data-i="q"]').value;
      q('[data-v="n"]').textContent = state.n; q('[data-v="q"]').innerHTML = M(`<mi>L</mi><mo>=</mo><mn>${state.q.toFixed(2)}</mn><mi>r</mi>`);
      bx.draw();
    };
    box.querySelectorAll("input").forEach((i) => i.addEventListener("input", sync));
    sync();
  }

  return {
    id: "rod", topic: "The pull of a rod: adding up small pieces", custom: true, mount,
    ready: () => lockedA && len(sub([tipB.x, tipB.y], ball)) > 0.3 && Object.values(blanks).every(Boolean) && mark.touched,
    judge: () => judgeRod({ ratio, toPiece, toCentre, pulls }, { va: sub([tipA.x, tipA.y], ball), vb: sub([tipB.x, tipB.y], ball), blanks: { ...blanks }, est: +est().toFixed(3) }),
    lock() {
      locked = true; lockedA = true;
      for (const b of [boardA, boardB, boardC]) { b.locked = true; b.draw(); }
      q('[data-a="lock"]').disabled = true;
      el.querySelectorAll(".tile").forEach((t) => (t.disabled = true));
    },
    /** Show what was right and wrong, part by part, then open the simulation. */
    showResult(res) {
      boardA.paint = ((old) => (b, ctx) => { old(b, ctx); arrow(ctx, ...b.px(...ball), ...b.px(ball[0] + toPiece[0] * 1.8, ball[1] + toPiece[1] * 1.8), RIGHT, 3.5, [6, 5]); })(boardA.paint);
      boardB.paint = ((old) => (b, ctx) => { old(b, ctx); arrow(ctx, ...b.px(...ball), ...b.px(ball[0] + pulls[0][0] + pulls[1][0], ball[1]), RIGHT, 3.5, [6, 5]); })(boardB.paint);
      boardC.paint = (b, ctx) => paintScale(b, ctx, true);
      for (const b of [boardA, boardB, boardC]) b.draw();
      q('[data-s="pair"]').hidden = false;
      el.querySelectorAll(".blank").forEach((b) => b.classList.add(blanks[b.dataset.b] === ROD_KEY[b.dataset.b] ? "right" : "wrong"));
      explore();
    },
    review: (res) => {
      const p = res.parts, lines = [];
      if (!p.piece.ok) lines.push("<p><strong>One piece.</strong> Gravity pulls the ball toward the piece itself, along the line joining the two, not toward the middle of the rod.</p>");
      if (!p.pair.ok) lines.push("<p><strong>Two pieces.</strong> The two pulls are equally strong and tilted by the same angle, one up and one down. Their parts along the rod cancel; what is left points straight at the rod.</p>");
      if (!p.integral.ok) lines.push(`<p><strong>The integral.</strong> A uniform rod has mass ${D(frac("<mi>M</mi>", "<mi>L</mi>"))} per unit length, so a piece of length ${M("<mi>d</mi><mi>y</mi>")} has mass ${D(frac("<mi>M</mi>", "<mi>L</mi>"))}${M("<mi>d</mi><mi>y</mi>")}, the same step as for the centre of mass or the moment of inertia of a rod. A piece at height ${M("<mi>y</mi>")} is a distance ${D(root)} from the ball. Only the part of its pull that points at the rod survives, which is the fraction ${D(frac("<mi>r</mi>", root))}. The pieces run from ${D("<mo>&#x2212;</mo>" + frac("<mi>L</mi>", "<mn>2</mn>"))} to ${D("<mo>+</mo>" + frac("<mi>L</mi>", "<mn>2</mn>"))}.</p>`);
      if (!p.ratio.ok) lines.push(`<p><strong>The ratio.</strong> Dividing the result by ${M("<msub><mi>F</mi><mtext>point</mtext></msub>")} leaves ${D(frac("<mi>r</mi>", "<msqrt><msup><mi>r</mi><mn>2</mn></msup><mo>+</mo><msup><mrow><mo>(</mo><mi>L</mi><mo>/</mo><mn>2</mn><mo>)</mo></mrow><mn>2</mn></msup></msqrt>"))}, which is ${k.toFixed(2)} for this rod. It is less than 1: most of the rod is farther from the ball than its centre is, and pulls partly sideways.</p>`);
      return lines.join("") + `<p class="cap">On your answer above, green dashed arrows and the green marker show the correct answers, and each box is outlined green or red. Below it the picture is now a simulation you can play with.</p>`;
    },
    solve() {
      tipA.x = ball[0] + toPiece[0] * 1.8; tipA.y = ball[1] + toPiece[1] * 1.8; tipA.touched = true;
      lockedA = true; boardA.locked = true; q('[data-s="pair"]').hidden = false; boardB.resize();
      tipB.x = ball[0] + pulls[0][0] + pulls[1][0]; tipB.y = ball[1]; tipB.touched = true;
      Object.assign(blanks, ROD_KEY);
      mark.x = 1 + (k / 1.5) * 10; mark.touched = true;
      el.querySelectorAll(".blank").forEach((b) => { b.innerHTML = cardHtml(blanks[b.dataset.b]); b.classList.add("filled"); });
      el.querySelectorAll(".tile").forEach((t) => (t.hidden = Object.values(blanks).includes(t.dataset.t)));
      q('[data-r="c"]').textContent = `Your value: ${est().toFixed(2)}`;
      for (const b of [boardA, boardB, boardC]) b.draw();
    },
  };
}
