import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PALETTES, STYLES } from "../src/core/catalog.ts";
import { freezeAt } from "../src/core/compose.ts";
import { Khatt, cleanText } from "../src/core/engine.ts";
import { LAYOUTS, layout } from "../src/core/layout.ts";
import { flatten, inside, contoursBox } from "../src/core/path.ts";
import { ShapingFont } from "../src/core/shape.ts";
import { EFFECTS } from "../src/effects/index.ts";

const fonts = new URL("../fonts/", import.meta.url);
const khatt = new Khatt((file) => readFile(new URL(file, fonts)));
const fontFor = async (id: string) => khatt.font(id);

/** Checks that every opened tag is closed, in order. */
function wellFormed(svg: string): boolean {
  const stack: string[] = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
    const [, closing, name, selfClosing] = m;
    if (selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) return false;
    } else stack.push(name);
  }
  return stack.length === 0;
}

describe("shaping", () => {
  it("joins Arabic letters instead of drawing them apart", async () => {
    const font = await fontFor("ruqaa");
    const joined = font.shape("سلام").lines[0];
    const apart = font.shape("س ل ا م").lines[0];
    expect(joined.width).toBeLessThan(apart.width * 0.8);
  });

  it("returns glyphs left to right, so the first letter of Arabic sits on the right", async () => {
    const font = await fontFor("naskh");
    const { glyphs } = font.shape("بحر").lines[0];
    expect(glyphs[0].cluster).toBeGreaterThan(glyphs[glyphs.length - 1].cluster);
  });

  it("loads every shipped font", async () => {
    for (const style of STYLES) {
      const font = await fontFor(style.id);
      expect(font).toBeInstanceOf(ShapingFont);
      expect(font.shape("خط").lines[0].glyphs.length).toBeGreaterThan(0);
    }
  });

  it("keeps up to four lines and drops blank ones", () => {
    expect(cleanText("  a \n\n b  ")).toBe("a\nb");
    expect(cleanText("   ")).toBe("سلام");
    expect(cleanText("1\n2\n3\n4\n5").split("\n")).toHaveLength(4);
  });
});

describe("geometry", () => {
  const square = flatten([
    { type: "M", values: [0, 0] },
    { type: "L", values: [10, 0] },
    { type: "L", values: [10, 10] },
    { type: "L", values: [0, 10] },
    { type: "Z", values: [] },
  ]);

  it("tests points against the fill", () => {
    expect(inside(square, 5, 5)).toBe(true);
    expect(inside(square, 15, 5)).toBe(false);
  });

  it("measures boxes", () => {
    expect(contoursBox(square)).toEqual({ x0: 0, y0: 0, x1: 10, y1: 10 });
  });

  it("flattens curves into many points", () => {
    const curve = flatten([
      { type: "M", values: [0, 0] },
      { type: "Q", values: [50, 80, 100, 0] },
      { type: "Z", values: [] },
    ]);
    expect(curve[0].length).toBeGreaterThan(10);
  });
});

describe("layouts", () => {
  it("gives every letter a reading step", async () => {
    const font = await fontFor("ruqaa");
    const scene = layout("line", font.shape("كتاب"));
    expect(scene.steps).toBe(new Set(scene.pieces.map((p) => p.order)).size);
    expect(Math.min(...scene.pieces.map((p) => p.order))).toBe(0);
  });

  it("mirrors every piece in the musanna", async () => {
    const font = await fontFor("ruqaa");
    const line = layout("line", font.shape("نور"));
    const mirror = layout("mirror", font.shape("نور"));
    expect(mirror.pieces.length).toBe(line.pieces.length * 2);
    expect(mirror.box.x0).toBeCloseTo(-mirror.box.x1, 0);
  });

  it("closes the ring with a centre star", async () => {
    const font = await fontFor("kufi");
    const ring = layout("circle", font.shape("حب"));
    expect(ring.pieces.at(-1)!.ornament).toBe(true);
    const w = ring.box.x1 - ring.box.x0;
    const h = ring.box.y1 - ring.box.y0;
    expect(w / h).toBeGreaterThan(0.85);
    expect(w / h).toBeLessThan(1.15);
  });

  it("bends the arc", async () => {
    const font = await fontFor("naskh");
    const arc = layout("arc", font.shape("خط عربي"));
    const byX = [...arc.pieces].sort((a, b) => a.cx - b.cx);
    const middle = byX[Math.floor(byX.length / 2)];
    // The ends of the arc hang lower than its middle.
    expect(byX[0].cy - middle.cy).toBeGreaterThan(25);
    expect(byX.at(-1)!.cy - middle.cy).toBeGreaterThan(25);
  });
});

describe("effects", () => {
  for (const effect of EFFECTS) {
    it(`${effect.id} draws well-formed, pausable SVG`, async () => {
      for (const id of ["line", "circle"]) {
        const out = await khatt.render({ text: "بسم الله", effect: effect.id, layout: id });
        expect(wellFormed(out.svg)).toBe(true);
        expect(out.svg).not.toMatch(/[{;]animation:/);
        expect(out.duration).toBeGreaterThan(0.5);
        expect(out.svg.length).toBeLessThan(400_000);
      }
    });
  }

  it("is deterministic", async () => {
    const a = await khatt.render({ text: "رمل", effect: "sand" });
    const b = await khatt.render({ text: "رمل", effect: "sand" });
    expect(a.svg).toBe(b.svg);
  });

  it("keeps several drawings apart on one page", async () => {
    const a = await khatt.render({ text: "واحد", effect: "ink" });
    const b = await khatt.render({ text: "اثنان", effect: "ink" });
    const prefix = (svg: string) => svg.match(/\.(k[a-z0-9]+)-a\{/)![1];
    expect(prefix(a.svg)).not.toBe(prefix(b.svg));
  });

  it("works with every palette", async () => {
    for (const palette of PALETTES) {
      const out = await khatt.render({ text: "لون", effect: "mosaic", palette: palette.id });
      expect(out.svg.includes('fill="none"/>')).toBe(false);
      expect(out.svg.includes("<rect") || palette.bg === "none").toBe(true);
    }
  });

  it("can frame any word in a fixed shape", async () => {
    for (const text of ["أ", "بسم الله الرحمن الرحيم"]) {
      const out = await khatt.render({ text, aspect: 1.5 });
      expect(out.width / out.height).toBeCloseTo(1.5, 1);
    }
  });

  it("freezes on any frame", async () => {
    const out = await khatt.render({ text: "قف", effect: "ink" });
    const still = freezeAt(out.svg, 1.25);
    expect(still.startsWith('<svg style="--seek:1.25s;--play:paused"')).toBe(true);
    expect(freezeAt(still, 2)).toContain("--seek:2s;--play:paused");
    expect(freezeAt(still, 2).match(/style="--seek/g)).toHaveLength(1);
  });
});

describe("command line", () => {
  const bin = new URL("../bin/khatt.ts", import.meta.url).pathname;

  it("writes an SVG and an HTML page", () => {
    const dir = mkdtempSync(join(tmpdir(), "khatt-"));
    try {
      execFileSync("node", [bin, "مرحبا", "-e", "gold", "-l", "arc", "-o", join(dir, "a.svg")]);
      execFileSync("node", [bin, "مرحبا", "--still", "-o", join(dir, "b.html")]);
      expect(readFileSync(join(dir, "a.svg"), "utf8")).toMatch(/^<svg /);
      expect(readFileSync(join(dir, "b.html"), "utf8")).toContain("--play:paused");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runs the bundled skill with a custom effect, without node_modules", () => {
    const dir = mkdtempSync(join(tmpdir(), "khatt-skill-"));
    try {
      const skill = new URL("../skills/khatt/", import.meta.url).pathname;
      execFileSync("node", ["scripts/khatt.mjs", "قطرة", "--effect", "./examples/ripple.mjs", "-o", join(dir, "r.svg")], {
        cwd: skill,
      });
      const svg = readFileSync(join(dir, "r.svg"), "utf8");
      expect(wellFormed(svg)).toBe(true);
      expect(svg).toMatch(/-ring\{/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("lists every option", () => {
    const out = execFileSync("node", [bin, "--list"], { encoding: "utf8" });
    for (const item of [...STYLES, ...LAYOUTS, ...EFFECTS, ...PALETTES]) expect(out).toContain(item.id);
  });
});
