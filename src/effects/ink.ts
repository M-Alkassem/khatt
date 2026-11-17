import type { Effect } from "../core/effect.ts";

/** A pen traces each letter's outline from right to left, then the ink fills in. */
const ink: Effect = {
  id: "ink",
  name: "Pen",
  nameAr: "قلم",
  blurb: "A pen traces every letter, then the ink fills in.",
  palette: "paper",
  render(ctx) {
    const { p, palette, at, anim } = ctx;
    const trace = 1.1;
    const fill = 0.7;
    const css =
      `.${p}-t{fill:none;stroke:${palette.ink};stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:1;${anim("t", trace, { ease: "cubic-bezier(.45,.05,.35,1)" })}}` +
      `.${p}-f{fill:${palette.ink};${anim("f", fill)}}` +
      `@keyframes ${p}-t{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}` +
      `@keyframes ${p}-f{from{fill-opacity:0}to{fill-opacity:1}}`;
    let body = "";
    let end = 0;
    for (const piece of ctx.pieces) {
      const d = ctx.stagger(piece.order);
      body += `<path class="${p}-a ${p}-t" pathLength="1" d="${piece.d}" style="${at(d)}"/>`;
      body += `<path class="${p}-a ${p}-f" d="${piece.d}" style="${at(d + trace * 0.8)}"/>`;
      end = Math.max(end, d + trace * 0.8 + fill);
    }
    return { css, body, duration: end + 0.6 };
  },
};

export default ink;
