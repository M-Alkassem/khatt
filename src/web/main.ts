import "./styles.css";
import { PALETTES, STYLES, paletteById, type Palette } from "../core/catalog.ts";
import { freezeAt, type Composed } from "../core/compose.ts";
import { Khatt, cleanText } from "../core/engine.ts";
import { LAYOUTS } from "../core/layout.ts";
import { EFFECTS, effectById } from "../effects/index.ts";
import { downloadBlob, exportMp4, exportPng, slug } from "./export.ts";

const fontUrls = import.meta.glob("../../fonts/*.ttf", { query: "?url", import: "default", eager: true }) as Record<
  string,
  string
>;
const urlFor = (file: string) => Object.entries(fontUrls).find(([k]) => k.endsWith("/" + file))?.[1] ?? "";
const khatt = new Khatt(async (file) => {
  const res = await fetch(urlFor(file));
  if (!res.ok) throw new Error(`Could not load ${file}`);
  return res.arrayBuffer();
});

interface State {
  text: string;
  style: string;
  layout: string;
  effect: string;
  /** null follows the effect's own palette. */
  palette: string | null;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $("stage");
const stageImg = $<HTMLImageElement>("stage-img");
const status = $("status");
const textArea = $<HTMLTextAreaElement>("text");

const state: State = readHash();
let current: Composed | null = null;
let renderToken = 0;
const urls = new Map<HTMLImageElement, string>();

function readHash(): State {
  const q = new URLSearchParams(location.hash.slice(1));
  const has = <T extends { id: string }>(list: T[], id: string | null) => !!id && list.some((x) => x.id === id);
  return {
    text: q.get("t") || "سلام",
    style: has(STYLES, q.get("s")) ? q.get("s")! : "ruqaa",
    layout: has(LAYOUTS, q.get("l")) ? q.get("l")! : "line",
    effect: has(EFFECTS, q.get("e")) ? q.get("e")! : "ink",
    palette: has(PALETTES, q.get("p")) ? q.get("p") : null,
  };
}

function writeHash(): void {
  const q = new URLSearchParams({ t: state.text, s: state.style, l: state.layout, e: state.effect });
  if (state.palette) q.set("p", state.palette);
  history.replaceState(null, "", "#" + q.toString());
}

const paletteFor = (effectId: string): Palette => paletteById(state.palette ?? effectById(effectId).palette);

function show(img: HTMLImageElement, svg: string): void {
  const old = urls.get(img);
  if (old) URL.revokeObjectURL(old);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  urls.set(img, url);
  img.src = url;
}

function setStageBackground(palette: Palette): void {
  stage.classList.toggle("transparent", palette.bg === "none");
  stage.style.background = palette.bg === "none" ? "" : palette.bg;
}

async function renderStage(): Promise<void> {
  const token = ++renderToken;
  const palette = paletteFor(state.effect);
  try {
    const out = await khatt.render({ ...opts(), effect: state.effect, palette, size: 1200 });
    if (token !== renderToken) return;
    current = out;
    setStageBackground(palette);
    show(stageImg, out.svg);
    stageImg.alt = cleanText(state.text);
    status.textContent = "";
  } catch (err) {
    if (token === renderToken) status.textContent = err instanceof Error ? err.message : String(err);
  }
}

const opts = () => ({ text: state.text, style: state.style, layout: state.layout });

let galleryToken = 0;
async function renderGallery(): Promise<void> {
  const token = ++galleryToken;
  for (const effect of EFFECTS) {
    const card = document.querySelector<HTMLElement>(`[data-effect="${effect.id}"]`);
    if (!card) continue;
    const palette = paletteFor(effect.id);
    const out = await khatt.render({ ...opts(), effect: effect.id, palette, size: 520 });
    if (token !== galleryToken) return;
    const thumb = card.querySelector<HTMLElement>(".thumb")!;
    thumb.style.background = palette.bg === "none" ? "" : palette.bg;
    thumb.classList.toggle("transparent", palette.bg === "none");
    show(card.querySelector("img")!, out.svg);
    card.dataset.svg = out.svg;
    // Let the page breathe between cards, so typing stays smooth.
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function renderStyleChips(): Promise<void> {
  for (const style of STYLES) {
    const chip = document.querySelector<HTMLElement>(`[data-style="${style.id}"]`);
    if (!chip) continue;
    const out = await khatt.render({ text: style.nameAr, style: style.id, effect: "ink", palette: "clear", size: 180 });
    show(chip.querySelector("img")!, freezeAt(out.svg, out.poster));
  }
}

function buildControls(): void {
  const styles = $("styles");
  for (const s of STYLES) {
    const b = el("button", { class: "chip", type: "button", role: "radio", "data-style": s.id, title: s.blurb });
    b.append(el("img", { alt: "", "aria-hidden": "true" }), el("span", {}, s.name));
    b.addEventListener("click", () => update({ style: s.id }));
    styles.append(b);
  }
  const layouts = $("layouts");
  for (const l of LAYOUTS) {
    const b = el("button", { type: "button", role: "radio", "data-layout": l.id });
    b.append(el("span", {}, l.name), el("span", { lang: "ar", class: "ar" }, l.nameAr));
    b.addEventListener("click", () => update({ layout: l.id }));
    layouts.append(b);
  }
  const palettes = $("palettes");
  const auto = el("button", { class: "swatch auto", type: "button", role: "radio", "data-palette": "", title: "Match the effect" });
  auto.append(el("span", {}, "Auto"));
  auto.addEventListener("click", () => update({ palette: null }));
  palettes.append(auto);
  for (const p of PALETTES) {
    const b = el("button", { class: "swatch", type: "button", role: "radio", "data-palette": p.id, title: `${p.name} · ${p.nameAr}` });
    b.style.setProperty("--bg", p.bg === "none" ? "transparent" : p.bg);
    b.style.setProperty("--ink", p.ink);
    b.style.setProperty("--accent", p.accent);
    if (p.bg === "none") b.classList.add("clear");
    b.append(el("span", { class: "sr-only" }, p.name));
    b.addEventListener("click", () => update({ palette: p.id }));
    palettes.append(b);
  }
  const grid = $("effects");
  for (const e of EFFECTS) {
    const card = el("button", { class: "card", type: "button", role: "radio", "data-effect": e.id });
    const thumb = el("div", { class: "thumb" });
    thumb.append(el("img", { alt: "", loading: "lazy" }));
    const meta = el("div", { class: "meta" });
    const title = el("div", { class: "title" });
    title.append(el("b", {}, e.name), el("span", { lang: "ar" }, e.nameAr));
    if (e.loop) title.append(el("span", { class: "badge" }, "loops"));
    meta.append(title, el("p", {}, e.blurb));
    card.append(thumb, meta);
    card.addEventListener("click", () => update({ effect: e.id }));
    card.addEventListener("mouseenter", () => {
      if (card.dataset.svg) show(card.querySelector("img")!, card.dataset.svg);
    });
    grid.append(card);
  }
}

function syncSelection(): void {
  const mark = (sel: string, on: (el: HTMLElement) => boolean) =>
    document.querySelectorAll<HTMLElement>(sel).forEach((b) => b.setAttribute("aria-checked", String(on(b))));
  mark("[data-style]", (b) => b.dataset.style === state.style);
  mark("[data-layout]", (b) => b.dataset.layout === state.layout);
  mark("[data-palette]", (b) => (b.dataset.palette || null) === state.palette);
  mark("[data-effect]", (b) => b.dataset.effect === state.effect);
}

function update(patch: Partial<State>): void {
  const before = { ...state };
  Object.assign(state, patch);
  writeHash();
  syncSelection();
  renderStage();
  const needsGallery =
    before.text !== state.text ||
    before.style !== state.style ||
    before.layout !== state.layout ||
    before.palette !== state.palette;
  if (needsGallery) renderGallery();
}

function el(tag: string, attrs: Record<string, string>, text?: string): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function busy(button: HTMLButtonElement, label: string): () => void {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  return () => {
    button.disabled = false;
    button.textContent = original;
  };
}

function wireActions(): void {
  $("replay").addEventListener("click", () => current && show(stageImg, current.svg));

  $("dl-svg").addEventListener("click", () => {
    if (!current) return;
    downloadBlob(new Blob([current.svg], { type: "image/svg+xml" }), `${slug(state)}.svg`);
  });

  $("dl-png").addEventListener("click", async () => {
    if (!current) return;
    const done = busy($("dl-png") as HTMLButtonElement, "Saving…");
    try {
      const blob = await exportPng(freezeAt(current.svg, current.poster), current.width, current.height, 2);
      downloadBlob(blob, `${slug(state)}.png`);
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : String(err);
    } finally {
      done();
    }
  });

  $("dl-mp4").addEventListener("click", async () => {
    if (!current) return;
    const button = $("dl-mp4") as HTMLButtonElement;
    const done = busy(button, "0%");
    try {
      const palette = paletteFor(state.effect);
      const blob = await exportMp4(current, palette.bg === "none" ? "#ffffff" : palette.bg, (f) => {
        button.textContent = `${Math.round(f * 100)}%`;
      });
      downloadBlob(blob, `${slug(state)}.mp4`);
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : String(err);
    } finally {
      done();
    }
  });

  $("copy-link").addEventListener("click", async () => {
    const button = $("copy-link") as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(location.href);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Copy failed";
    }
    setTimeout(() => (button.textContent = "Copy link"), 1400);
  });

  let typing = 0;
  textArea.addEventListener("input", () => {
    clearTimeout(typing);
    typing = window.setTimeout(() => update({ text: textArea.value }), 220);
  });

  // A shared link opened in a tab that already shows the studio.
  window.addEventListener("hashchange", () => {
    const next = readHash();
    textArea.value = next.text;
    update(next);
  });
}

buildControls();
wireActions();
textArea.value = state.text;
syncSelection();
writeHash();
renderStage().then(() => {
  renderGallery();
  renderStyleChips();
});
