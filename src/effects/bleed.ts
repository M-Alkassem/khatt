import type { Effect } from "../core/effect.ts";

/** Wet ink spreads into the paper, then settles into a crisp letter. */
const bleed: Effect = {
  id: "bleed",
  name: "Ink bleed",
  nameAr: "حبر",
  blurb: "Wet ink soaks into the paper, then dries sharp.",
  palette: "paper",
  render(ctx) {
    const { p, palette, at, anim } = ctx;
    const defs =
      `<filter id="${p}-wet" x="-30%" y="-30%" width="160%" height="160%">` +
      `<feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="7"/>` +
      `<feDisplacementMap in="SourceGraphic" scale="7"/><feGaussianBlur stdDeviation="2.2"/></filter>`;
    const css =
      `.${p}-w{fill:${palette.ink};filter:url(#${p}-wet);${anim("w", 1.4, { ease: "ease-out" })}}` +
      `.${p}-s{fill:${palette.ink};${anim("s", 0.8, { ease: "ease-in-out" })}}` +
      `@keyframes ${p}-w{0%{opacity:0;transform:scale(.92)}35%{opacity:.85}100%{opacity:0;transform:scale(1.06)}}` +
      `@keyframes ${p}-s{from{opacity:0}to{opacity:1}}`;
    let body = "";
    let end = 0;
    for (const piece of ctx.pieces) {
      const d = ctx.stagger(piece.order);
      body += `<path class="${p}-a ${p}-b ${p}-w" d="${piece.d}" style="${at(d)}"/>`;
      body += `<path class="${p}-a ${p}-s" d="${piece.d}" style="${at(d + 0.45)}"/>`;
      end = Math.max(end, d + 1.4);
    }
    return { css, defs, body, duration: end + 0.5 };
  },
};

export default bleed;
