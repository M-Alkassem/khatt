// Compositions: a plain line, an arc, a ring, and the mirrored musanna.

import {
  cmdsToD,
  contoursBox,
  contoursToD,
  emptyBox,
  flatten,
  mapCmds,
  unionBox,
  type Box,
  type Cmd,
  type Contour,
  type Pt,
} from "./path.ts";
import { EM, type Shaped, type ShapedGlyph } from "./shape.ts";

export interface Piece {
  d: string;
  contours: Contour[];
  box: Box;
  /** Reading order, 0 for the first letter. Mirrored copies share their original's order. */
  order: number;
  cx: number;
  cy: number;
  ornament?: boolean;
}

export interface Scene {
  pieces: Piece[];
  /** Number of distinct reading steps (max order + 1). */
  steps: number;
  box: Box;
}

export interface LayoutInfo {
  id: string;
  name: string;
  nameAr: string;
}

export const LAYOUTS: LayoutInfo[] = [
  { id: "line", name: "Line", nameAr: "سطر" },
  { id: "arc", name: "Arc", nameAr: "قوس" },
  { id: "circle", name: "Circle", nameAr: "دائرة" },
  { id: "mirror", name: "Mirror", nameAr: "مثنّى" },
];

function piece(contours: Contour[], d: string, order: number, ornament = false): Piece {
  const box = contoursBox(contours);
  return { d, contours, box, order, cx: (box.x0 + box.x1) / 2, cy: (box.y0 + box.y1) / 2, ornament };
}

function affinePiece(cmds: Cmd[], order: number, f: (x: number, y: number) => Pt): Piece {
  const moved = mapCmds(cmds, f);
  return piece(flatten(moved), cmdsToD(moved), order);
}

function warpedPiece(cmds: Cmd[], order: number, f: (x: number, y: number) => Pt): Piece {
  const contours = flatten(cmds, 1.5).map((c) => c.map(([x, y]) => f(x, y)));
  return piece(contours, contoursToD(contours), order);
}

function readingOrder(shaped: Shaped): Map<number, number> {
  const clusters = new Set<number>();
  for (const line of shaped.lines) for (const g of line.glyphs) clusters.add(g.cluster);
  const ranks = new Map<number, number>();
  [...clusters].sort((a, b) => a - b).forEach((c, i) => ranks.set(c, i));
  return ranks;
}

function finish(pieces: Piece[]): Scene {
  let box = emptyBox();
  let steps = 0;
  for (const p of pieces) {
    box = unionBox(box, p.box);
    steps = Math.max(steps, p.order + 1);
  }
  return { pieces, steps, box };
}

function eachGlyph(shaped: Shaped, fn: (g: ShapedGlyph, lineWidth: number) => void): void {
  for (const line of shaped.lines) for (const g of line.glyphs) fn(g, line.width);
}

export function layoutLine(shaped: Shaped): Scene {
  const order = readingOrder(shaped);
  const pieces: Piece[] = [];
  eachGlyph(shaped, (g, width) => {
    const dy = g.line * shaped.lineHeight;
    pieces.push(affinePiece(g.cmds, order.get(g.cluster)!, (x, y) => [x - width / 2, y + dy]));
  });
  return finish(pieces);
}

export function layoutArc(shaped: Shaped): Scene {
  const order = readingOrder(shaped);
  const widest = Math.max(1, ...shaped.lines.map((l) => l.width));
  const span = Math.min(2.6, Math.max(1.8, widest / (EM * 2.4)));
  const radius = widest / span;
  const pieces: Piece[] = [];
  eachGlyph(shaped, (g, width) => {
    const r0 = radius - g.line * shaped.lineHeight;
    pieces.push(
      warpedPiece(g.cmds, order.get(g.cluster)!, (x, y) => {
        const phi = (x - width / 2) / radius;
        const r = r0 - y;
        return [r * Math.sin(phi), radius - r * Math.cos(phi)];
      }),
    );
  });
  return finish(pieces);
}

/** An eight-pointed star (two overlapping squares), a classic centre ornament. */
function star(cx: number, cy: number, r: number): Contour[] {
  const square = (rot: number): Contour =>
    [0, 1, 2, 3].map((k) => {
      const a = rot + (k * Math.PI) / 2;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
    });
  const inner = (rot: number): Contour =>
    [0, 1, 2, 3].map((k) => {
      const a = rot - (k * Math.PI) / 2;
      return [cx + r * 0.42 * Math.cos(a), cy + r * 0.42 * Math.sin(a)] as Pt;
    });
  // The inner squares run the other way, so they cut a window into the star.
  return [square(0), square(Math.PI / 4), inner(0), inner(Math.PI / 4)];
}

export function layoutCircle(shaped: Shaped): Scene {
  const order = readingOrder(shaped);
  const glyphs = shaped.lines.flatMap((l, i) => {
    const before = shaped.lines.slice(0, i).reduce((s, x) => s + x.width + EM * 0.5, 0);
    return l.glyphs.map((g) => ({ g, x0: before }));
  });
  const width = shaped.lines.reduce((s, l) => s + l.width, 0) + EM * 0.5 * (shaped.lines.length - 1);
  const gap = EM * 0.45;
  let repeats = 1;
  while (repeats < 8 && (repeats * (width + gap)) / (2 * Math.PI) < EM * 1.7) repeats++;
  const length = repeats * (width + gap);
  const radius = length / (2 * Math.PI);
  const steps = order.size;
  const pieces: Piece[] = [];
  for (let rep = 0; rep < repeats; rep++) {
    const start = rep * (width + gap);
    for (const { g, x0 } of glyphs) {
      pieces.push(
        warpedPiece(g.cmds, rep * steps + order.get(g.cluster)!, (x, y) => {
          const phi = ((start + x0 + x) / length) * 2 * Math.PI;
          const r = radius - y;
          return [r * Math.sin(phi), -r * Math.cos(phi)];
        }),
      );
    }
  }
  const starContours = star(0, 0, Math.max(EM * 0.25, (radius - shaped.descent) * 0.42));
  pieces.push(piece(starContours, contoursToD(starContours), repeats * steps, true));
  return finish(pieces);
}

export function layoutMirror(shaped: Shaped): Scene {
  const line = layoutLine(shaped);
  const gap = EM * 0.08;
  const shift = gap / 2 - line.box.x0;
  const pieces: Piece[] = [];
  for (const p of line.pieces) {
    const right = p.contours.map((c) => c.map(([x, y]) => [x + shift, y] as Pt));
    const left = p.contours.map((c) => c.map(([x, y]) => [-(x + shift), y] as Pt).reverse());
    pieces.push(piece(right, translateD(p.d, shift, 1), p.order));
    pieces.push(piece(left, translateD(p.d, shift, -1), p.order));
  }
  return finish(pieces);
}

/** Moves a path horizontally, optionally mirroring it around x = 0. */
function translateD(d: string, dx: number, sign: 1 | -1): string {
  const cmds: Cmd[] = [];
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  for (const m of d.matchAll(re)) {
    const values = m[2].trim() ? m[2].trim().split(/[\s,]+/).map(Number) : [];
    cmds.push({ type: m[1], values });
  }
  return cmdsToD(mapCmds(cmds, (x, y) => [sign * (x + dx), y]));
}

export function layout(id: string, shaped: Shaped): Scene {
  switch (id) {
    case "arc":
      return layoutArc(shaped);
    case "circle":
      return layoutCircle(shaped);
    case "mirror":
      return layoutMirror(shaped);
    default:
      return layoutLine(shaped);
  }
}
