import type { Effect } from "../core/effect.ts";

/** Grains of sand blow in from the right and gather into the letters. */
const sand: Effect = {
  id: "sand",
  name: "Sand",
  nameAr: "رمل",
  blurb: "Grains blow in on the wind and gather into letters.",
  palette: "desert",
  render(ctx) {
    const { p, palette, at, anim, n, rng } = ctx;
    const fly = 1.7;
    const css =
      `.${p}-g{${anim("g", fly, { ease: "cubic-bezier(.3,.6,.2,1)" })}}` +
      `.${p}-f{fill:${palette.ink};${anim("f", 0.6)}}` +
      `@keyframes ${p}-g{0%{opacity:0;transform:translate(var(--x),var(--y))}12%{opacity:1}72%{opacity:1;transform:none}100%{opacity:0;transform:none}}` +
      `@keyframes ${p}-f{from{opacity:0}to{opacity:1}}`;
    const total = ctx.pieces.reduce((s, q) => s + ctx.area(q), 0) || 1;
    const budget = 900;
    let grains = "";
    let letters = "";
    let end = 0;
    for (const piece of ctx.pieces) {
      const d = ctx.stagger(piece.order, 1.1);
      const count = Math.max(6, Math.round((budget * ctx.area(piece)) / total));
      for (const [x, y] of ctx.sample(piece, count)) {
        const dx = ctx.em * (0.8 + rng() * 2.2);
        const dy = ctx.em * (rng() - 0.5) * 1.4;
        const color = rng() < 0.25 ? palette.accent : palette.ink;
        grains +=
          `<circle class="${p}-a ${p}-g" cx="${n(x)}" cy="${n(y)}" r="${n(0.5 + rng() * 0.6)}" fill="${color}" ` +
          `style="${at(d + rng() * 0.4, `--x:${n(dx)}px;--y:${n(dy)}px`)}"/>`;
      }
      letters += `<path class="${p}-a ${p}-f" d="${piece.d}" style="${at(d + fly * 0.62)}"/>`;
      end = Math.max(end, d + 0.4 + fly);
    }
    return { css, body: letters + grains, duration: end + 0.4 };
  },
};

export default sand;
