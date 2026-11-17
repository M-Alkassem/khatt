import type { Effect } from "../core/effect.ts";

/** Glowing tubes that flicker on one by one, then hum. */
const neon: Effect = {
  id: "neon",
  name: "Neon",
  nameAr: "نيون",
  blurb: "Glowing tubes flicker on, then hum softly.",
  palette: "neon",
  loop: true,
  render(ctx) {
    const { p, palette, at, anim } = ctx;
    const defs =
      `<filter id="${p}-glow" x="-40%" y="-40%" width="180%" height="180%">` +
      `<feGaussianBlur stdDeviation="2.6" result="b"/><feGaussianBlur in="SourceGraphic" stdDeviation="7" result="c"/>` +
      `<feMerge><feMergeNode in="c"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    const hum = 2.4;
    const css =
      `.${p}-tube{fill:none;stroke:${palette.ink};stroke-width:1.7;stroke-linejoin:round;${anim("on", 0.9, { ease: "steps(1,end)" })}}` +
      `.${p}-echo{fill:none;stroke:${palette.accent};stroke-width:.7;opacity:.55;${anim("on", 0.9, { ease: "steps(1,end)" })}}` +
      `.${p}-hum{${anim("hum", hum, { loop: true, ease: "ease-in-out" })}}` +
      `@keyframes ${p}-on{0%{opacity:0}15%{opacity:.9}25%{opacity:.1}40%{opacity:1}55%{opacity:.35}70%,100%{opacity:1}}` +
      `@keyframes ${p}-hum{0%,100%{opacity:1}50%{opacity:.82}}`;
    let tubes = "";
    let end = 0;
    for (const piece of ctx.pieces) {
      const d = ctx.stagger(piece.order, 1.2) + ctx.rng() * 0.35;
      tubes += `<path class="${p}-a ${p}-echo" d="${piece.d}" transform="translate(1.6 1.2)" style="${at(d)}"/>`;
      tubes += `<path class="${p}-a ${p}-tube" d="${piece.d}" style="${at(d)}"/>`;
      end = Math.max(end, d + 0.9);
    }
    const body = `<g filter="url(#${p}-glow)"><g class="${p}-a ${p}-hum" style="${at(end)}">${tubes}</g></g>`;
    return { css, defs, body, duration: end + hum, poster: end + 0.2 };
  },
};

export default neon;
