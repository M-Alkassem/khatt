import type { Effect } from "../core/effect.ts";

/** The words slam down like a seal, then the frame and ink speckles appear. */
const stamp: Effect = {
  id: "stamp",
  name: "Seal",
  nameAr: "ختم",
  blurb: "Pressed down like a seal, with a frame and ink speckles.",
  palette: "paper",
  render(ctx) {
    const { p, palette, box, at, anim, n, em, rng } = ctx;
    const pad = em * 0.18;
    const x0 = box.x0 - pad;
    const y0 = box.y0 - pad;
    const w = box.x1 - box.x0 + pad * 2;
    const h = box.y1 - box.y0 + pad * 2;
    const css =
      `.${p}-m{${anim("m", 0.55, { ease: "cubic-bezier(.5,0,.75,0)" })}}` +
      `.${p}-k{fill:${palette.accent}}` +
      `.${p}-fr{fill:none;stroke:${palette.accent};stroke-dasharray:1;${anim("fr", 0.7, { ease: "ease-out" })}}` +
      `.${p}-dot{fill:${palette.accent};${anim("dot", 0.35, { ease: "cubic-bezier(.3,1.6,.5,1)" })}}` +
      `@keyframes ${p}-m{0%{opacity:0;transform:scale(1.9) rotate(-7deg)}70%{opacity:1;transform:scale(.97) rotate(1deg)}100%{opacity:1;transform:none}}` +
      `@keyframes ${p}-fr{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}` +
      `@keyframes ${p}-dot{from{opacity:0;transform:scale(0)}to{opacity:.8;transform:none}}`;
    const letters = ctx.pieces.map((q) => `<path class="${p}-k" d="${q.d}"/>`).join("");
    let body = `<g class="${p}-a ${p}-b ${p}-m" style="${at(0)}">${letters}</g>`;
    const r = em * 0.12;
    body += `<rect class="${p}-a ${p}-fr" pathLength="1" x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" stroke-width="3" style="${at(0.5)}"/>`;
    body += `<rect class="${p}-a ${p}-fr" pathLength="1" x="${n(x0 + 5)}" y="${n(y0 + 5)}" width="${n(w - 10)}" height="${n(h - 10)}" rx="${n(r * 0.7)}" stroke-width="1" style="${at(0.62)}"/>`;
    for (let i = 0; i < 26; i++) {
      const side = rng();
      const t = rng();
      const x = side < 0.5 ? x0 + t * w : side < 0.75 ? x0 - rng() * em * 0.15 : x0 + w + rng() * em * 0.15;
      const y = side < 0.25 ? y0 - rng() * em * 0.15 : side < 0.5 ? y0 + h + rng() * em * 0.15 : y0 + rng() * h;
      body += `<circle class="${p}-a ${p}-b ${p}-dot" cx="${n(x)}" cy="${n(y)}" r="${n(0.4 + rng() * 1.3)}" style="${at(0.48 + rng() * 0.25)}"/>`;
    }
    return { css, body, duration: 1.9 };
  },
};

export default stamp;
