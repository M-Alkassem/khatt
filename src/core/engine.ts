// One entry point for the studio and the command line: text in, animated SVG out.

import { paletteById, styleById, type Palette } from "./catalog.ts";
import { compose, type Composed } from "./compose.ts";
import type { Effect } from "./effect.ts";
import { layout } from "./layout.ts";
import { ShapingFont } from "./shape.ts";
import { effectById } from "../effects/index.ts";

export interface RenderOptions {
  text: string;
  style?: string;
  layout?: string;
  effect?: string | Effect;
  palette?: string | Palette;
  seek?: number;
  size?: number;
  seed?: number;
}

export type FontLoader = (file: string) => Promise<ArrayBuffer | Uint8Array>;

export class Khatt {
  private fonts = new Map<string, Promise<ShapingFont>>();
  private load: FontLoader;

  constructor(load: FontLoader) {
    this.load = load;
  }

  font(styleId: string): Promise<ShapingFont> {
    const style = styleById(styleId);
    let font = this.fonts.get(style.id);
    if (!font) {
      font = this.load(style.file).then((bytes) => new ShapingFont(bytes));
      this.fonts.set(style.id, font);
      font.catch(() => this.fonts.delete(style.id));
    }
    return font;
  }

  async render(opts: RenderOptions): Promise<Composed> {
    const text = cleanText(opts.text);
    const font = await this.font(opts.style ?? "ruqaa");
    const effect = typeof opts.effect === "object" ? opts.effect : effectById(opts.effect ?? "ink");
    const palette =
      typeof opts.palette === "object" ? opts.palette : paletteById(opts.palette ?? effect.palette);
    const scene = layout(opts.layout ?? "line", font.shape(text));
    return compose(scene, effect, palette, { title: text, seek: opts.seek, size: opts.size, seed: opts.seed });
  }
}

/** Trims each line and drops empty ones; falls back to a greeting. */
export function cleanText(text: string): string {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  return lines.length ? lines.slice(0, 4).join("\n") : "سلام";
}
