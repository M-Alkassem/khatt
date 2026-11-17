// An example effect: rings of ink ripple out from each letter, like a drop in water.
// Copy this file to start your own. Run it with:
//   node scripts/khatt.mjs "قطرة" --effect ./examples/ripple.mjs -o ripple.html

export default {
  id: "ripple",
  name: "Ripple",
  nameAr: "تموّج",
  blurb: "Rings of ink ripple out from every letter.",
  palette: "zellige",
  loop: true,
  render(ctx) {
    const { p, palette, at, anim } = ctx;
    const period = 2.4;
    const css =
      `.${p}-in{fill:${palette.ink};${anim("in", 0.8)}}` +
      `.${p}-ring{fill:none;stroke:${palette.accent};stroke-width:1;${anim("ring", period, { loop: true, ease: "ease-out" })}}` +
      `@keyframes ${p}-in{from{opacity:0}to{opacity:1}}` +
      `@keyframes ${p}-ring{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.6)}}`;
    let rings = "";
    let letters = "";
    for (const piece of ctx.pieces) {
      const d = ctx.stagger(piece.order);
      letters += `<path class="${p}-a ${p}-in" d="${piece.d}" style="${at(d)}"/>`;
      for (let k = 0; k < 2; k++) {
        // ${p}-b scales each ring around its own centre.
        rings += `<path class="${p}-a ${p}-b ${p}-ring" d="${piece.d}" style="${at(d + 0.4 + (k * period) / 2)}"/>`;
      }
    }
    const end = ctx.stagger(ctx.steps - 1) + 0.8;
    return { css, body: rings + letters, duration: end + period, poster: end + period * 0.3 };
  },
};
