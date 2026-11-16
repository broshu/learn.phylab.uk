// learn.phylab.uk — the cards used in the rod integral, shared by the student page and the teacher view.
export const frac = (a, b) => `<mfrac>${a}${b}</mfrac>`;
export const root = `<msqrt><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><msup><mi>r</mi><mn>2</mn></msup></msqrt>`;

/** [id, MathML] */
export const CARDS = [
  ["M/L", frac("<mi>M</mi>", "<mi>L</mi>")], ["M", "<mi>M</mi>"], ["ML", "<mi>M</mi><mi>L</mi>"],
  ["y2+r2", "<msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><msup><mi>r</mi><mn>2</mn></msup>"], ["r2", "<msup><mi>r</mi><mn>2</mn></msup>"], ["y2", "<msup><mi>y</mi><mn>2</mn></msup>"],
  ["r/root", frac("<mi>r</mi>", root)], ["y/root", frac("<mi>y</mi>", root)], ["1", "<mn>1</mn>"],
  ["-L/2", "<mo>&#x2212;</mo>" + frac("<mi>L</mi>", "<mn>2</mn>")], ["+L/2", "<mo>+</mo>" + frac("<mi>L</mi>", "<mn>2</mn>")], ["0", "<mn>0</mn>"], ["L", "<mi>L</mi>"],
];
export const cardHtml = (id) => `<math><mstyle displaystyle="true">${CARDS.find((c) => c[0] === id)[1]}</mstyle></math>`;
