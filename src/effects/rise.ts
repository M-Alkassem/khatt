import type { Effect } from "../core/effect.ts";

/** Letters float up into place, then a swash is drawn beneath them. */
const rise: Effect = {
  id: "rise",
  name: "Rise",
  nameAr: "نهوض",
  blurb: "Letters float up into place and a swash underlines them.",
  palette: "night",
  render(ctx) {
    const { p, palette, box, at, anim, n, em } = ctx;
    const up = 0.9;
    const css =
      `.${p}-u{fill:${palette.ink};${anim("u", up, { ease: "cubic-bezier(.2,1.25,.4,1)" })}}` +
      `.${p}-s{fill:none;stroke:${palette.accent};stroke-width:2.4;stroke-linecap:round;stroke-dasharray:1;${anim("s", 1.1, { ease: "cubic-bezier(.6,0,.2,1)" })}}` +
      `@keyframes ${p}-u{from{opacity:0;transform:translateY(${n(em * 0.28)}px) scale(.94)}to{opacity:1;transform:none}}` +
      `@keyframes ${p}-s{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`;
    let body = "";
    let end = 0;
    for (const piece of ctx.pieces) {
      const d = ctx.stagger(piece.order);
      body += `<path class="${p}-a ${p}-b ${p}-u" d="${piece.d}" style="${at(d)}"/>`;
      end = Math.max(end, d + up);
    }
    // A pen swash drawn from right to left under the words, like a kashida flourish.
    const y = box.y1 + em * 0.14;
    const w = box.x1 - box.x0;
    const swash =
      `M${n(box.x1 + em * 0.05)} ${n(y - em * 0.08)}` +
      `C${n(box.x1 - w * 0.25)} ${n(y + em * 0.12)} ${n(box.x0 + w * 0.3)} ${n(y + em * 0.1)} ${n(box.x0 + w * 0.12)} ${n(y - em * 0.02)}` +
      `S${n(box.x0 - em * 0.05)} ${n(y - em * 0.18)} ${n(box.x0 + w * 0.02)} ${n(y - em * 0.12)}`;
    body += `<path class="${p}-a ${p}-s" pathLength="1" d="${swash}" style="${at(end - 0.2)}"/>`;
    return { css, body, duration: end + 1.4 };
  },
};

export default rise;
