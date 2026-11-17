// Renders the animated SVGs shown in the README: npm run gallery
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Khatt } from "../src/core/engine.ts";
import { freezeAt } from "../src/core/compose.ts";
import { STYLES } from "../src/core/catalog.ts";

const khatt = new Khatt((file) => readFile(new URL(`../fonts/${file}`, import.meta.url)));
const out = new URL("../docs/gallery/", import.meta.url);
await mkdir(out, { recursive: true });

const effects: [string, string, string, string?][] = [
  ["ink", "قلم", "ruqaa"],
  ["gold", "بسم الله", "naskh"],
  ["bleed", "حبر", "ruqaa"],
  ["mosaic", "فاس", "kufi"],
  ["sand", "صحراء", "ruqaa"],
  ["neon", "دمشق", "blaka"],
  ["stars", "ليل", "naskh"],
  ["lantern", "رمضان كريم", "ruqaa"],
  ["rise", "أمل", "naskh"],
  ["stamp", "ختم", "kufi"],
  ["reveal", "كشف", "nastaliq"],
  ["wave", "بحر", "kano"],
];

const save = async (name: string, svg: string) => writeFile(new URL(name, out), svg);

for (const [effect, text, style] of effects) {
  const r = await khatt.render({ text, effect, style, size: 640 });
  await save(`${effect}.svg`, r.svg);
}

const hero = await khatt.render({ text: "خط", effect: "ink", style: "ruqaa", size: 900 });
await save("hero.svg", hero.svg);

for (const [layout, text, effect] of [
  ["arc", "أهلاً وسهلاً", "gold"],
  ["circle", "سبحان الله", "ink"],
  ["mirror", "نور", "gold"],
] as const) {
  const r = await khatt.render({ text, layout, effect, style: layout === "circle" ? "naskh" : "ruqaa", size: 640 });
  await save(`layout-${layout}.svg`, r.svg);
}

for (const style of STYLES) {
  const r = await khatt.render({ text: "كمنجير", style: style.id, effect: "ink", palette: "paper", size: 480 });
  await save(`style-${style.id}.svg`, freezeAt(r.svg, r.poster));
}
console.log("Gallery written to docs/gallery/");
