#!/usr/bin/env node
// khatt: animated Arabic calligraphy from the command line.

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Khatt } from "../src/core/engine.ts";
import { freezeAt } from "../src/core/compose.ts";
import { PALETTES, STYLES } from "../src/core/catalog.ts";
import { LAYOUTS } from "../src/core/layout.ts";
import { EFFECTS } from "../src/effects/index.ts";
import type { Effect } from "../src/core/effect.ts";

const HELP = `khatt: animated Arabic calligraphy

Usage:
  khatt "سلام" [options]

Options:
  -s, --style <id>     ${STYLES.map((s) => s.id).join(", ")} (default ruqaa)
  -l, --layout <id>    ${LAYOUTS.map((l) => l.id).join(", ")} (default line)
  -e, --effect <id>    ${EFFECTS.map((e) => e.id).join(", ")}, or a path to your own .mjs effect
  -p, --palette <id>   ${PALETTES.map((p) => p.id).join(", ")} (default: the effect's own)
      --ink <color>    override the ink colour
      --accent <color> override the accent colour
      --bg <color>     override the background ("none" for transparent)
  -o, --out <file>     output file, .svg or .html (default khatt.svg)
      --still          freeze on the finished drawing instead of animating
      --list           show every style, layout, effect and palette
  -h, --help           show this help

Use \\n in the text for a new line.`;

const fontsDir = new URL("../fonts/", import.meta.url);

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      style: { type: "string", short: "s" },
      layout: { type: "string", short: "l" },
      effect: { type: "string", short: "e" },
      palette: { type: "string", short: "p" },
      ink: { type: "string" },
      accent: { type: "string" },
      bg: { type: "string" },
      out: { type: "string", short: "o" },
      still: { type: "boolean" },
      list: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) return void console.log(HELP);
  if (values.list) return void console.log(listing());
  const text = positionals.join(" ").replace(/\\n/g, "\n");
  if (!text.trim()) {
    console.log(HELP);
    process.exitCode = 1;
    return;
  }

  const effect = await pickEffect(values.effect);
  const base = PALETTES.find((p) => p.id === (values.palette ?? effect.palette)) ?? PALETTES[0];
  const palette = {
    ...base,
    ink: values.ink ?? base.ink,
    accent: values.accent ?? base.accent,
    bg: values.bg ?? base.bg,
  };
  const khatt = new Khatt((file) => readFile(new URL(file, fontsDir)));
  const out = await khatt.render({ text, style: values.style, layout: values.layout, effect, palette });
  const svg = values.still ? freezeAt(out.svg, out.poster) : out.svg;
  const file = values.out ?? "khatt.svg";
  const content = file.endsWith(".html") ? page(text, svg, palette.bg) : svg;
  await writeFile(file, content);
  console.log(`Wrote ${file} (${(content.length / 1024).toFixed(0)} KB, ${out.duration.toFixed(1)} s${out.loop ? ", loops" : ""})`);
}

async function pickEffect(id: string | undefined): Promise<Effect> {
  if (id && /[\\/.]/.test(id)) {
    const mod = await import(pathToFileURL(resolve(id)).href);
    const effect = (mod.default ?? mod.effect) as Effect;
    if (!effect || typeof effect.render !== "function") throw new Error(`${id} does not export an effect`);
    return effect;
  }
  const found = EFFECTS.find((e) => e.id === (id ?? "ink"));
  if (!found) throw new Error(`Unknown effect "${id}". Run khatt --list to see them all.`);
  return found;
}

function listing(): string {
  const rows = (title: string, items: { id: string; name: string; nameAr: string; blurb?: string }[]) =>
    `${title}\n` + items.map((i) => `  ${i.id.padEnd(9)} ${i.name} · ${i.nameAr}${i.blurb ? `  ${i.blurb}` : ""}`).join("\n");
  return [rows("Styles", STYLES), rows("Layouts", LAYOUTS), rows("Effects", EFFECTS), rows("Palettes", PALETTES)].join("\n\n");
}

function page(title: string, svg: string, bg: string): string {
  const color = bg === "none" ? "#ffffff" : bg;
  return `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/[<&]/g, "")}</title>
<style>html,body{margin:0;height:100%;background:${color}}body{display:grid;place-items:center}svg{width:min(92vw,1100px);height:auto;max-height:92vh}</style>
</head><body onclick="location.reload()">${svg}</body></html>
`;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
