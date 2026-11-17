import type { Effect } from "../core/effect.ts";

/** Zellige tiles spin into place, a wave spreading out from the centre. */
const mosaic: Effect = {
  id: "mosaic",
  name: "Zellige",
  nameAr: "فسيفساء",
  blurb: "Little tiles spin into place, like a Moroccan wall.",
  palette: "zellige",
  render(ctx) {
    const { p, palette, box, at, anim, n } = ctx;
    const cell = ctx.em * 0.075;
    const tile = cell * 0.84;
    const pop = 0.7;
    const css =
      `.${p}-t{${anim("t", pop, { ease: "cubic-bezier(.3,1.5,.5,1)" })}}` +
      `@keyframes ${p}-t{from{opacity:0;transform:rotate(45deg) scale(0)}to{opacity:1;transform:none}}`;
    const defs = `<clipPath id="${p}-c">${ctx.pieces.map((q) => `<path d="${q.d}"/>`).join("")}</clipPath>`;
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    const reach = Math.hypot(box.x1 - cx, box.y1 - cy) || 1;
    const colors = [palette.ink, palette.ink, palette.accent, palette.ink, mix(palette.ink, palette.bg)];
    let tiles = "";
    let i = 0;
    for (let y = box.y0; y < box.y1; y += cell) {
      let j = 0;
      for (let x = box.x0; x < box.x1; x += cell) {
        const mx = x + cell / 2;
        const my = y + cell / 2;
        const hit = ctx.pieces.some(
          (q) =>
            mx >= q.box.x0 - cell && mx <= q.box.x1 + cell && my >= q.box.y0 - cell && my <= q.box.y1 + cell &&
            [[mx, my], [x, y], [x + cell, y], [x, y + cell], [x + cell, y + cell]].some(([a, b]) => ctx.inside(q, a, b)),
        );
        if (hit) {
          const delay = (Math.hypot(mx - cx, my - cy) / reach) * 1.6;
          const color = colors[(i * 3 + j * 7 + ((i * j) % 5)) % colors.length];
          tiles +=
            `<rect class="${p}-a ${p}-b ${p}-t" x="${n(x)}" y="${n(y)}" width="${n(tile)}" height="${n(tile)}" ` +
            `fill="${color}" style="${at(delay)}"/>`;
        }
        j++;
      }
      i++;
    }
    return { css, defs, body: `<g clip-path="url(#${p}-c)">${tiles}</g>`, duration: 1.6 + pop + 0.6 };
  },
};

function mix(a: string, b: string): string {
  if (!a.startsWith("#") || !b.startsWith("#")) return a;
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round((((pa >> s) & 255) + ((pb >> s) & 255)) / 2);
  return "#" + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0");
}

export default mosaic;
