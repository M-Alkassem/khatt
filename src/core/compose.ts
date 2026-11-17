// Builds the final, self-contained animated SVG.

import { filledArea, inside, samplePoints, type Box } from "./path.ts";
import type { Palette } from "./catalog.ts";
import type { Scene } from "./layout.ts";
import { EM } from "./shape.ts";
import type { AnimOptions, Effect, EffectContext, EffectResult } from "./effect.ts";

export interface ComposeOptions {
  title: string;
  seed?: number;
  /** Freeze on this second instead of playing. Used for stills and video frames. */
  seek?: number;
  /** Longest side of the SVG's intrinsic size, in pixels. */
  size?: number;
  /** Extra room around the text, in em. */
  margin?: number;
}

export interface Composed {
  svg: string;
  duration: number;
  poster: number;
  loop: boolean;
  width: number;
  height: number;
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const num = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
};

export const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);

export function compose(scene: Scene, effect: Effect, palette: Palette, opts: ComposeOptions): Composed {
  const seed = opts.seed ?? hash(opts.title + effect.id);
  const p = "k" + (hash(`${opts.title}|${effect.id}|${palette.id}|${seed}`) % 46656).toString(36);
  const margin = (opts.margin ?? 0.45) * EM;
  const box = scene.box;
  const view: Box = { x0: box.x0 - margin, y0: box.y0 - margin, x1: box.x1 + margin, y1: box.y1 + margin };
  const areas = new Map<object, number>();

  const ctx: EffectContext = {
    pieces: scene.pieces,
    steps: scene.steps,
    box,
    view,
    em: EM,
    palette,
    p,
    rng: mulberry32(seed),
    stagger: (order, spread) => {
      const total = spread ?? Math.min(1.8, 0.14 * Math.max(1, scene.steps - 1));
      return scene.steps > 1 ? (total * order) / (scene.steps - 1) : 0;
    },
    sample: (piece, count) => samplePoints(piece.contours, piece.box, count, mulberry32(seed + piece.order * 7919)),
    inside: (piece, x, y) => inside(piece.contours, x, y),
    area: (piece) => {
      if (!areas.has(piece)) areas.set(piece, filledArea(piece.contours, piece.box, 2));
      return areas.get(piece)!;
    },
    anim: (name: string, seconds: number, o: AnimOptions = {}) =>
      `animation-name:${p}-${name};animation-duration:${num(seconds)}s;` +
      `animation-timing-function:${o.ease ?? "cubic-bezier(.22,.7,.2,1)"};` +
      `animation-iteration-count:${o.loop ? "infinite" : "1"};` +
      (o.alternate ? "animation-direction:alternate;" : ""),
    at: (seconds, extra = "") => `--d:${num(seconds)}s${extra ? ";" + extra : ""}`,
    n: num,
  };

  const out: EffectResult = effect.render(ctx);
  const w = view.x1 - view.x0;
  const h = view.y1 - view.y0;
  const size = opts.size ?? 960;
  const k = size / Math.max(w, h);
  const width = Math.round(w * k);
  const height = Math.round(h * k);
  const frozen = opts.seek !== undefined;
  const rootStyle = frozen ? ` style="--seek:${num(opts.seek!)}s;--play:paused"` : "";
  // Every animated element carries class "<p>-a" and an inline --d delay.
  // Pausing with a negative delay shows any frame exactly, with no script.
  const base =
    `.${p}-a{animation-delay:calc(var(--d,0s) - var(--seek,0s));animation-play-state:var(--play,running);animation-fill-mode:both}` +
    `.${p}-b{transform-box:fill-box;transform-origin:center}`;
  const bg =
    palette.bg === "none"
      ? ""
      : `<rect x="${num(view.x0)}" y="${num(view.y0)}" width="${num(w)}" height="${num(h)}" fill="${palette.bg}"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${num(view.x0)} ${num(view.y0)} ${num(w)} ${num(h)}" ` +
    `width="${width}" height="${height}" role="img" aria-label="${escapeXml(opts.title)}"${rootStyle}>` +
    `<title>${escapeXml(opts.title)}</title>` +
    `<style>${base}${out.css}</style>` +
    (out.defs ? `<defs>${out.defs}</defs>` : "") +
    bg +
    out.body +
    `</svg>`;

  return {
    svg,
    duration: out.duration,
    poster: out.poster ?? out.duration,
    loop: !!effect.loop,
    width,
    height,
  };
}

/** Returns the same drawing frozen on second `t`: the frame a still or video needs. */
export function freezeAt(svg: string, t: number): string {
  const style = `--seek:${num(t)}s;--play:paused`;
  if (/^<svg[^>]*\sstyle="/.test(svg)) return svg.replace(/^(<svg[^>]*\sstyle=")[^"]*"/, `$1${style}"`);
  return svg.replace(/^<svg /, `<svg style="${style}" `);
}
