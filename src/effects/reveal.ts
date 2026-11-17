import type { Effect } from "../core/effect.ts";

/** A golden pen edge sweeps from right to left and reveals the words behind it. */
const reveal: Effect = {
  id: "reveal",
  name: "Reveal",
  nameAr: "كشف",
  blurb: "A pen edge sweeps right to left and uncovers the words.",
  palette: "desert",
  render(ctx) {
    const { p, palette, box, at, anim, n, em } = ctx;
    const pad = em * 0.15;
    const x0 = box.x0 - pad;
    const x1 = box.x1 + pad;
    const y0 = box.y0 - pad;
    const h = box.y1 - box.y0 + pad * 2;
    const w = x1 - x0;
    const sweep = 1.8;
    const ease = "cubic-bezier(.65,0,.35,1)";
    const defs =
      `<clipPath id="${p}-c"><rect class="${p}-a ${p}-m" x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" style="${at(0.1)}"/></clipPath>`;
    const css =
      `.${p}-m{transform-box:fill-box;transform-origin:right center;${anim("m", sweep, { ease })}}` +
      `.${p}-e{stroke:${palette.accent};stroke-width:2.2;stroke-linecap:round;${anim("e", sweep, { ease })}}` +
      `@keyframes ${p}-m{from{transform:scaleX(0)}to{transform:scaleX(1)}}` +
      `@keyframes ${p}-e{0%{opacity:0;transform:translateX(0)}8%{opacity:1}92%{opacity:1}100%{opacity:0;transform:translateX(-${n(w)}px)}}`;
    const letters = ctx.pieces.map((q) => `<path d="${q.d}"/>`).join("");
    const body =
      `<g clip-path="url(#${p}-c)" fill="${palette.ink}">${letters}</g>` +
      `<line class="${p}-a ${p}-e" x1="${n(x1)}" y1="${n(y0)}" x2="${n(x1)}" y2="${n(y0 + h)}" style="${at(0.1)}"/>`;
    return { css, defs, body, duration: sweep + 0.7 };
  },
};

export default reveal;
