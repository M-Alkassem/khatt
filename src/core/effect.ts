// The effect contract. An effect turns laid-out letters into SVG with CSS animations.
//
// Effects are plain objects with no imports, so a new one can live in a single
// .mjs file and be passed to the command line with --effect ./my-effect.mjs.

import type { Box, Pt } from "./path.ts";
import type { Palette } from "./catalog.ts";
import type { Piece } from "./layout.ts";

export interface EffectContext {
  pieces: Piece[];
  /** Number of reading steps; piece.order runs from 0 to steps - 1. */
  steps: number;
  /** Bounding box of the text. */
  box: Box;
  /** Whole drawing area (text box plus margin). */
  view: Box;
  /** Font size in user units (100). */
  em: number;
  palette: Palette;
  /** Unique prefix for class names, ids and keyframes, so several drawings can share a page. */
  p: string;
  /** Seeded random numbers between 0 and 1, the same for the same input. */
  rng: () => number;
  /** Stagger: the delay for a reading step, spread over `spread` seconds. */
  stagger: (order: number, spread?: number) => number;
  /** Random points inside one piece, for particles. */
  sample: (piece: Piece, count: number) => Pt[];
  /** True when the point is inside the piece's ink. */
  inside: (piece: Piece, x: number, y: number) => boolean;
  /** Approximate filled area of a piece, in square units. */
  area: (piece: Piece) => number;
  /**
   * Animation longhands for a class. Never use the `animation` shorthand: it
   * would override the delay rule that lets Khatt pause on any frame.
   */
  anim: (name: string, seconds: number, opts?: AnimOptions) => string;
  /** Inline style that sets an element's delay in seconds. */
  at: (seconds: number, extra?: string) => string;
  /** Rounds a number for compact SVG output. */
  n: (value: number) => string;
}

export interface AnimOptions {
  ease?: string;
  loop?: boolean;
  alternate?: boolean;
}

export interface EffectResult {
  css: string;
  defs?: string;
  body: string;
  /** Seconds until the drawing settles (one-shot) or one full loop (looping). */
  duration: number;
  /** Seconds at which to take a still picture. Defaults to `duration`. */
  poster?: number;
}

export interface Effect {
  id: string;
  name: string;
  nameAr: string;
  blurb: string;
  /** Palette id the effect looks best with. */
  palette: string;
  loop?: boolean;
  render: (ctx: EffectContext) => EffectResult;
}
