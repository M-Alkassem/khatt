import type { Effect } from "../core/effect.ts";

/** The words are made of twinkling stars. */
const stars: Effect = {
  id: "stars",
  name: "Stars",
  nameAr: "نجوم",
  blurb: "Words made of twinkling stars on a night sky.",
  palette: "night",
  loop: true,
  render(ctx) {
    const { p, palette, at, anim, n, rng } = ctx;
    const css =
      `.${p}-in{${anim("in", 0.8, { ease: "ease-out" })}}` +
      `.${p}-tw{${anim("tw", 2.2, { loop: true, ease: "ease-in-out" })}}` +
      `.${p}-ghost{fill:${palette.ink};opacity:.07}` +
      `@keyframes ${p}-in{from{opacity:0;transform:scale(0)}to{opacity:1;transform:none}}` +
      `@keyframes ${p}-tw{0%,100%{opacity:1}50%{opacity:.25}}`;
    const total = ctx.pieces.reduce((s, q) => s + ctx.area(q), 0) || 1;
    let body = ctx.pieces.map((q) => `<path class="${p}-ghost" d="${q.d}"/>`).join("");
    let end = 0;
    for (const piece of ctx.pieces) {
      const d = ctx.stagger(piece.order, 1.4);
      const count = Math.max(4, Math.round((520 * ctx.area(piece)) / total));
      for (const [x, y] of ctx.sample(piece, count)) {
        const big = rng() < 0.12;
        const r = big ? 1.4 + rng() * 0.8 : 0.45 + rng() * 0.6;
        const color = rng() < 0.2 ? palette.accent : palette.ink;
        const dot = `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}"/>`;
        body +=
          `<g class="${p}-a ${p}-b ${p}-in" style="${at(d + rng() * 0.5)}">` +
          `<g class="${p}-a ${p}-tw" style="${at(-rng() * 2.2)}">${dot}</g></g>`;
        end = Math.max(end, d + 1.3);
      }
    }
    return { css, body, duration: end + 2.2, poster: end + 0.3 };
  },
};

export default stars;
