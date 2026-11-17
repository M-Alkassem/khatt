// Outline geometry: glyph commands, flattening, warping and point sampling.

export type Pt = [number, number];
export type Contour = Pt[];
export type Box = { x0: number; y0: number; x1: number; y1: number };

export interface Cmd {
  type: string; // M, L, Q, C or Z
  values: number[];
}

const fmt = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? "0" : String(r);
};

export function mapCmds(cmds: Cmd[], f: (x: number, y: number) => Pt): Cmd[] {
  return cmds.map((c) => {
    const values: number[] = [];
    for (let i = 0; i < c.values.length; i += 2) {
      const [x, y] = f(c.values[i], c.values[i + 1]);
      values.push(x, y);
    }
    return { type: c.type, values };
  });
}

export function cmdsToD(cmds: Cmd[]): string {
  let d = "";
  for (const c of cmds) d += c.type + c.values.map(fmt).join(" ");
  return d;
}

export function contoursToD(contours: Contour[]): string {
  let d = "";
  for (const c of contours) {
    if (c.length < 2) continue;
    d += "M" + fmt(c[0][0]) + " " + fmt(c[0][1]);
    for (let i = 1; i < c.length; i++) d += "L" + fmt(c[i][0]) + " " + fmt(c[i][1]);
    d += "Z";
  }
  return d;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);

/** Turns curves into polylines. `tol` is the target segment length in user units. */
export function flatten(cmds: Cmd[], tol = 2): Contour[] {
  const out: Contour[] = [];
  let cur: Contour = [];
  let x = 0;
  let y = 0;
  const steps = (len: number) => Math.min(48, Math.max(2, Math.ceil(len / tol)));
  for (const c of cmds) {
    const v = c.values;
    if (c.type === "M") {
      if (cur.length > 1) out.push(cur);
      cur = [[v[0], v[1]]];
      x = v[0];
      y = v[1];
    } else if (c.type === "L") {
      cur.push([v[0], v[1]]);
      x = v[0];
      y = v[1];
    } else if (c.type === "Q") {
      const n = steps(dist(x, y, v[0], v[1]) + dist(v[0], v[1], v[2], v[3]));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const e = t * t;
        cur.push([a * x + b * v[0] + e * v[2], a * y + b * v[1] + e * v[3]]);
      }
      x = v[2];
      y = v[3];
    } else if (c.type === "C") {
      const n = steps(dist(x, y, v[0], v[1]) + dist(v[0], v[1], v[2], v[3]) + dist(v[2], v[3], v[4], v[5]));
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const m = 1 - t;
        const a = m * m * m;
        const b = 3 * m * m * t;
        const e = 3 * m * t * t;
        const f = t * t * t;
        cur.push([a * x + b * v[0] + e * v[2] + f * v[4], a * y + b * v[1] + e * v[3] + f * v[5]]);
      }
      x = v[4];
      y = v[5];
    } else if (c.type === "Z") {
      if (cur.length > 1) out.push(cur);
      cur = [];
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

export function emptyBox(): Box {
  return { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
}

export function growBox(b: Box, x: number, y: number): void {
  if (x < b.x0) b.x0 = x;
  if (y < b.y0) b.y0 = y;
  if (x > b.x1) b.x1 = x;
  if (y > b.y1) b.y1 = y;
}

export function contoursBox(contours: Contour[], into = emptyBox()): Box {
  for (const c of contours) for (const [x, y] of c) growBox(into, x, y);
  return into;
}

export function unionBox(a: Box, b: Box): Box {
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

export function isEmptyBox(b: Box): boolean {
  return !(b.x1 >= b.x0 && b.y1 >= b.y0);
}

/** Non-zero winding test, matching how fonts fill their outlines. */
export function inside(contours: Contour[], x: number, y: number): boolean {
  let winding = 0;
  for (const c of contours) {
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
      const [xi, yi] = c[i];
      const [xj, yj] = c[j];
      if (yj <= y) {
        if (yi > y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) > 0) winding++;
      } else if (yi <= y && (xi - xj) * (y - yj) - (x - xj) * (yi - yj) < 0) {
        winding--;
      }
    }
  }
  return winding !== 0;
}

/** Area of the filled shape, estimated on a coarse grid. */
export function filledArea(contours: Contour[], box: Box, cell = 2): number {
  let hits = 0;
  for (let y = box.y0 + cell / 2; y < box.y1; y += cell) {
    for (let x = box.x0 + cell / 2; x < box.x1; x += cell) if (inside(contours, x, y)) hits++;
  }
  return hits * cell * cell;
}

/** Random points inside the shape (rejection sampling). */
export function samplePoints(contours: Contour[], box: Box, count: number, rng: () => number): Pt[] {
  const pts: Pt[] = [];
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  if (!(w > 0 && h > 0)) return pts;
  for (let tries = 0; pts.length < count && tries < count * 60; tries++) {
    const x = box.x0 + rng() * w;
    const y = box.y0 + rng() * h;
    if (inside(contours, x, y)) pts.push([x, y]);
  }
  return pts;
}
