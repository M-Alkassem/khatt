import type { Effect } from "../core/effect.ts";

/** Warm lantern light: the words glow and sparks drift up around them. */
const lantern: Effect = {
  id: "lantern",
  name: "Lantern",
  nameAr: "فانوس",
  blurb: "A warm glow and sparks drifting up, for Ramadan nights.",
  palette: "night",
  loop: true,
  render(ctx) {
    const { p, palette, box, at, anim, n, em, rng } = ctx;
    const defs =
      `<filter id="${p}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>` +
      `<radialGradient id="${p}-sp"><stop offset="0" stop-color="#fff6d6"/><stop offset=".5" stop-color="${palette.accent}"/>` +
      `<stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/></radialGradient>`;
    const pulse = 3;
    const css =
      `.${p}-in{${anim("in", 1.2, { ease: "ease-out" })}}` +
      `.${p}-gl{fill:${palette.accent};${anim("gl", pulse, { loop: true, ease: "ease-in-out" })}}` +
      `.${p}-sp{${anim("sp", 4, { loop: true, ease: "linear" })}}` +
      `@keyframes ${p}-in{from{opacity:0}to{opacity:1}}` +
      `@keyframes ${p}-gl{0%,100%{opacity:.45}50%{opacity:.95}}` +
      `@keyframes ${p}-sp{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(var(--x),var(--y))}}`;
    const shapes = ctx.pieces.map((q) => `<path d="${q.d}"/>`).join("");
    let body =
      `<g class="${p}-a ${p}-in" style="${at(0)}">` +
      `<g filter="url(#${p}-glow)"><g class="${p}-a ${p}-gl" style="${at(0)}">${shapes}</g></g>` +
      `<g fill="${palette.ink}">${shapes}</g></g>`;
    const w = box.x1 - box.x0;
    for (let i = 0; i < 34; i++) {
      const x = box.x0 + rng() * w;
      const y = box.y1 - rng() * (box.y1 - box.y0) * 0.4;
      body +=
        `<circle class="${p}-a ${p}-sp" cx="${n(x)}" cy="${n(y)}" r="${n(0.8 + rng() * 1.6)}" fill="url(#${p}-sp)" ` +
        `style="${at(-rng() * 4, `--x:${n((rng() - 0.5) * em * 0.5)}px;--y:${n(-em * (0.6 + rng() * 0.9))}px`)}"/>`;
    }
    return { css, defs, body, duration: 6, poster: 2.2 };
  },
};

export default lantern;
