import type { Effect } from "../core/effect.ts";

/** Letters ride a slow wave, one after another, forever. */
const wave: Effect = {
  id: "wave",
  name: "Wave",
  nameAr: "موج",
  blurb: "Letters ride a slow wave, one after another.",
  palette: "zellige",
  loop: true,
  render(ctx) {
    const { p, palette, at, anim, em } = ctx;
    const period = 2.6;
    const lift = em * 0.07;
    const defs = `<filter id="${p}-soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>`;
    const css =
      `.${p}-w{fill:${palette.ink};${anim("w", period, { loop: true, ease: "ease-in-out" })}}` +
      `.${p}-r{fill:${palette.ink};${anim("r", period, { loop: true, ease: "ease-in-out" })}}` +
      `@keyframes ${p}-w{0%,100%{transform:translateY(0)}25%{transform:translateY(-${lift}px)}75%{transform:translateY(${lift}px)}}` +
      // The shadow stays on the water and darkens as the letter comes down to it.
      `@keyframes ${p}-r{0%,100%{opacity:.14}25%{opacity:.06}75%{opacity:.24}}`;
    let shadows = "";
    let letters = "";
    for (const piece of ctx.pieces) {
      // A negative delay starts every letter at a different point of the wave.
      const d = -((piece.order % 12) / 12) * period;
      shadows += `<path class="${p}-a ${p}-r" d="${piece.d}" style="${at(d)}"/>`;
      letters += `<path class="${p}-a ${p}-w" d="${piece.d}" style="${at(d)}"/>`;
    }
    const body = `<g filter="url(#${p}-soft)" transform="translate(0 ${em * 0.12})">${shadows}</g>${letters}`;
    return { css, defs, body, duration: period * 2, poster: period * 0.4 };
  },
};

export default wave;
