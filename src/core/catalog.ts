// The calligraphy styles (open fonts) and colour palettes Khatt ships with.

export interface StyleInfo {
  id: string;
  name: string;
  nameAr: string;
  file: string;
  font: string;
  blurb: string;
}

export const STYLES: StyleInfo[] = [
  {
    id: "ruqaa",
    name: "Ruqʿah",
    nameAr: "رقعة",
    file: "ArefRuqaa-Bold.ttf",
    font: "Aref Ruqaa",
    blurb: "The quick everyday hand: short, slanted, confident.",
  },
  {
    id: "naskh",
    name: "Naskh",
    nameAr: "نسخ",
    file: "Amiri-Bold.ttf",
    font: "Amiri",
    blurb: "The classic book hand, rounded and calm.",
  },
  {
    id: "kufi",
    name: "Kufic",
    nameAr: "كوفي",
    file: "ReemKufi.ttf",
    font: "Reem Kufi",
    blurb: "Straight lines and angles, the oldest Arabic style.",
  },
  {
    id: "nastaliq",
    name: "Nastaʿlīq",
    nameAr: "نستعليق",
    file: "NotoNastaliqUrdu.ttf",
    font: "Noto Nastaliq Urdu",
    blurb: "Hanging words that cascade down to the line.",
  },
  {
    id: "kano",
    name: "Kano",
    nameAr: "كانو",
    file: "Alkalami-Regular.ttf",
    font: "Alkalami",
    blurb: "A reed-pen hand from Kano, thick and lively.",
  },
  {
    id: "blaka",
    name: "Geometric",
    nameAr: "هندسي",
    file: "Blaka-Regular.ttf",
    font: "Blaka",
    blurb: "Bold geometric shapes, made for logos and posters.",
  },
];

export interface Palette {
  id: string;
  name: string;
  nameAr: string;
  /** Background colour, or "none" for a transparent background. */
  bg: string;
  ink: string;
  accent: string;
}

export const PALETTES: Palette[] = [
  { id: "paper", name: "Paper", nameAr: "ورق", bg: "#f3ead7", ink: "#1d1a16", accent: "#a3302a" },
  { id: "night", name: "Night", nameAr: "ليل", bg: "#0e1322", ink: "#f2e6c4", accent: "#d9a441" },
  { id: "neon", name: "Neon", nameAr: "نيون", bg: "#08070f", ink: "#ff4fd8", accent: "#3fe7ff" },
  { id: "zellige", name: "Zellige", nameAr: "زليج", bg: "#f1ece2", ink: "#0f5d55", accent: "#c4583f" },
  { id: "desert", name: "Desert", nameAr: "صحراء", bg: "#ecd2a4", ink: "#47280f", accent: "#b9652a" },
  { id: "clear", name: "Clear", nameAr: "شفاف", bg: "none", ink: "#151515", accent: "#c4302b" },
];

export const styleById = (id: string): StyleInfo => STYLES.find((s) => s.id === id) ?? STYLES[0];
export const paletteById = (id: string): Palette => PALETTES.find((p) => p.id === id) ?? PALETTES[0];
