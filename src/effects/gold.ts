import type { Effect } from "../core/effect.ts";

/** Letters rise in gold leaf, then a light sweeps across them, again and again. */
const gold: Effect = {
  id: "gold",
  name: "Gold leaf",
  nameAr: "ذهب",
  blurb: "Gold letters with a light that keeps sweeping across.",
  palette: "night",
  loop: true,
  render(ctx) {
    const { p, box, at, anim, n } = ctx;
    const w = box.x1 - box.x0;
    const h = box.y1 - box.y0;
    const band = Math.max(ctx.em * 0.6, w * 0.22);
    const defs =
      `<linearGradient id="${p}-g" x1="0" y1="${n(box.y0)}" x2="0" y2="${n(box.y1)}" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0" stop-color="#fff1b8"/><stop offset=".35" stop-color="#e2b04a"/>` +
      `<stop offset=".6" stop-color="#9c6b1c"/><stop offset=".8" stop-color="#e9c46a"/><stop offset="1" stop-color="#7a5212"/></linearGradient>` +
      `<linearGradient id="${p}-s" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
      `<stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<clipPath id="${p}-c">${ctx.pieces.map((q) => `<path d="${q.d}"/>`).join("")}</clipPath>`;
    const intro = ctx.stagger(ctx.steps - 1) + 0.9;
    const sweep = 2.8;
    const css =
      `.${p}-l{fill:url(#${p}-g);${anim("l", 0.9)}}` +
      `.${p}-sh{fill:#000;opacity:.35;${anim("sh", 0.9)}}` +
      `.${p}-x{${anim("x", sweep, { loop: true, ease: "cubic-bezier(.5,0,.3,1)" })}}` +
      `@keyframes ${p}-l{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}` +
      `@keyframes ${p}-sh{from{opacity:0}to{opacity:.35}}` +
      `@keyframes ${p}-x{0%{transform:translateX(0)}55%,100%{transform:translateX(${n(w + band * 2)}px)}}`;
    let shadow = "";
    let letters = "";
    for (const piece of ctx.pieces) {
      const d = ctx.stagger(piece.order);
      shadow += `<path class="${p}-a ${p}-sh" d="${piece.d}" transform="translate(1.2 1.8)" style="${at(d)}"/>`;
      letters += `<path class="${p}-a ${p}-l" d="${piece.d}" style="${at(d)}"/>`;
    }
    const shine =
      `<g clip-path="url(#${p}-c)"><rect class="${p}-a ${p}-x" x="${n(box.x0 - band * 2)}" y="${n(box.y0)}" ` +
      `width="${n(band)}" height="${n(h)}" fill="url(#${p}-s)" style="${at(intro)}"/></g>`;
    return { css, defs, body: shadow + letters + shine, duration: intro + sweep, poster: intro + sweep * 0.3 };
  },
};

export default gold;
