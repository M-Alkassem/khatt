import type { Effect } from "../core/effect.ts";
import bleed from "./bleed.ts";
import gold from "./gold.ts";
import ink from "./ink.ts";
import lantern from "./lantern.ts";
import mosaic from "./mosaic.ts";
import neon from "./neon.ts";
import reveal from "./reveal.ts";
import rise from "./rise.ts";
import sand from "./sand.ts";
import stamp from "./stamp.ts";
import stars from "./stars.ts";
import wave from "./wave.ts";

export const EFFECTS: Effect[] = [ink, gold, bleed, mosaic, sand, neon, stars, lantern, rise, stamp, reveal, wave];

export const effectById = (id: string): Effect => EFFECTS.find((e) => e.id === id) ?? EFFECTS[0];
