// Turning a drawing into files: PNG stills and MP4 videos, all in the browser.

import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, getFirstEncodableVideoCodec } from "mediabunny";
import { freezeAt, type Composed } from "../core/compose.ts";

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slug(s: { text: string; effect: string }): string {
  const words = s.text.trim().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 32);
  return `khatt-${words || "text"}-${s.effect}`;
}

async function loadSvg(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportPng(frozenSvg: string, width: number, height: number, scale: number): Promise<Blob> {
  const img = await loadSvg(frozenSvg);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the PNG"))), "image/png"),
  );
}

/** A square 1080 video: the drawing plays, then holds on the finished frame. */
export async function exportMp4(drawing: Composed, background: string, progress: (f: number) => void): Promise<Blob> {
  const size = 1080;
  const fps = 30;
  const seconds = drawing.loop ? Math.max(4, drawing.duration) : drawing.duration + 1;
  const frames = Math.round(seconds * fps);
  const codec = await getFirstEncodableVideoCodec(["avc", "vp9", "av1"], { width: size, height: size });
  if (!codec) throw new Error("This browser can't encode video. Try Chrome, Edge or Safari 17+.");

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec, bitrate: QUALITY_HIGH });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const pad = size * 0.08;
  const k = Math.min((size - pad * 2) / drawing.width, (size - pad * 2) / drawing.height);
  const w = drawing.width * k;
  const h = drawing.height * k;
  for (let i = 0; i < frames; i++) {
    const t = drawing.loop ? i / fps : Math.min(i / fps, drawing.duration);
    const img = await loadSvg(freezeAt(drawing.svg, t));
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    await source.add(i / fps, 1 / fps);
    progress((i + 1) / frames);
  }
  await output.finalize();
  return new Blob([output.target.buffer!], { type: "video/mp4" });
}
