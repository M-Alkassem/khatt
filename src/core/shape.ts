// Text shaping with HarfBuzz: joined Arabic letters, right-to-left order, marks in place.

import * as hb from "harfbuzzjs";
import { mapCmds, type Cmd } from "./path.ts";

/** Font size in user units. Every layout and effect is designed around it. */
export const EM = 100;

export interface ShapedGlyph {
  /** Outline in user units, y pointing down, baseline at y = 0. */
  cmds: Cmd[];
  /** Logical position of the character the glyph comes from, counted across all lines. */
  cluster: number;
  line: number;
}

export interface ShapedLine {
  glyphs: ShapedGlyph[];
  width: number;
}

export interface Shaped {
  lines: ShapedLine[];
  ascent: number;
  descent: number;
  lineHeight: number;
}

export class ShapingFont {
  private font: hb.Font;
  private scale: number;
  readonly ascent: number;
  readonly descent: number;
  readonly lineHeight: number;

  constructor(bytes: ArrayBuffer | Uint8Array) {
    this.font = new hb.Font(new hb.Face(new hb.Blob(bytes)));
    this.scale = EM / this.font.face.upem;
    const ext = this.font.hExtents();
    this.ascent = ext.ascender * this.scale;
    this.descent = -ext.descender * this.scale;
    this.lineHeight = (ext.ascender - ext.descender + ext.lineGap) * this.scale;
  }

  shape(text: string): Shaped {
    const lines: ShapedLine[] = [];
    let base = 0;
    text.split("\n").forEach((lineText, line) => {
      lines.push(this.shapeLine(lineText, line, base));
      base += lineText.length + 1;
    });
    return { lines, ascent: this.ascent, descent: this.descent, lineHeight: this.lineHeight };
  }

  private shapeLine(text: string, line: number, base: number): ShapedLine {
    const buf = new hb.Buffer();
    buf.addText(text);
    buf.guessSegmentProperties();
    hb.shape(this.font, buf);
    const infos = buf.getGlyphInfos();
    const positions = buf.getGlyphPositions();
    const s = this.scale;
    const glyphs: ShapedGlyph[] = [];
    let pen = 0;
    // HarfBuzz returns glyphs in visual order (left to right), even for Arabic.
    infos.forEach((info, i) => {
      const p = positions[i];
      const ox = pen + p.xOffset;
      const oy = p.yOffset;
      const raw = this.font.glyphToJson(info.codepoint) as Cmd[];
      if (raw.length > 0) {
        const cmds = mapCmds(raw, (x, y) => [(x + ox) * s, -(y + oy) * s]);
        glyphs.push({ cmds, cluster: base + info.cluster, line });
      }
      pen += p.xAdvance;
    });
    return { glyphs, width: pen * s };
  }
}
