---
name: khatt
description: Makes animated Arabic calligraphy (self-playing SVG or an HTML page) from Arabic, Persian or Urdu text, and invents new animation effects for it. Use when someone wants Arabic calligraphy, an animated Arabic word, name or greeting (Ramadan, Eid, weddings, birthdays), a calligraphy logo, sticker or banner, or asks to write something "in Arabic calligraphy".
---

# Khatt: animated Arabic calligraphy

Khatt shapes the text with HarfBuzz (letters joined, right to left, marks in place),
lays it out, and animates it with pure CSS inside one SVG file. No network, no install:
the script, its fonts and the shaping engine are all in this folder.

## Make a drawing

```bash
node scripts/khatt.mjs "النص" --style ruqaa --layout line --effect ink -o out.svg
```

Run it from this skill's folder, or use the full path to `scripts/khatt.mjs`.
Write the output where the user wants it (their project folder, Desktop, …).

| Option | Values |
|---|---|
| `--style` | `ruqaa` (everyday, slanted), `naskh` (classic book hand), `kufi` (angular), `nastaliq` (hanging Persian), `kano` (thick reed pen), `blaka` (bold geometric) |
| `--layout` | `line`, `arc`, `circle` (a ring with a star in the middle), `mirror` (the classic mirrored *musanna*) |
| `--effect` | `ink`, `gold`, `bleed`, `mosaic`, `sand`, `neon`, `stars`, `lantern`, `rise`, `stamp`, `reveal`, `wave`, or a path to a `.mjs` effect |
| `--palette` | `paper`, `night`, `neon`, `zellige`, `desert`, `clear` (transparent) |
| `--ink`, `--accent`, `--bg` | override colours, e.g. `--ink "#0b3d2e" --bg none` |
| `--still` | freeze on the finished drawing (good for logos and print) |
| `-o` | `.svg` for the file itself, `.html` for a page that replays on click |

Run `node scripts/khatt.mjs --list` to see everything with short descriptions.
Use `\n` inside the text for a second line (up to four lines).

## Choosing well

- **Names and English words:** Khatt draws Arabic script only. Transliterate first
  (Sara → سارة, Kamangir → كمنجير) and, when the spelling could go several ways,
  show the user your spelling before rendering.
- **Ramadan or Eid:** `lantern` or `gold` with `night`, style `naskh` or `ruqaa`.
- **Weddings and formal cards:** `gold`, `rise` or `ink`; try `--layout mirror`.
- **Logos:** `--still`, style `kufi` or `blaka`, `--palette clear`.
- **Social posts:** an animated `.svg` plays anywhere a browser does. For a video,
  point the user to the studio (https://m-alkassem.github.io/khatt/), which exports MP4.
- Short text looks best. Long sentences: `line` layout, two or three lines.

Open the result for the user when you can (e.g. `open out.html` on macOS).

## Make a new effect

When none of the twelve effects fits ("make the letters burn", "a Ramadan lantern
that swings"), write a new one. Start from `examples/ripple.mjs`. An effect is a
plain object with no imports:

```js
export default {
  id: "my-effect", name: "My effect", nameAr: "…", blurb: "…",
  palette: "night",          // default palette id
  loop: false,               // true if it keeps moving
  render(ctx) {
    // return { css, defs?, body, duration, poster? }
  },
};
```

`render(ctx)` gets:

- `ctx.pieces`: one entry per glyph: `d` (SVG path), `order` (reading order, 0 = first
  letter), `box` `{x0,y0,x1,y1}`, `cx`, `cy`. Mirrored copies share an order.
- `ctx.steps`, `ctx.box` (text box), `ctx.view` (whole canvas), `ctx.em` (font size, 100),
  `ctx.palette` (`bg`, `ink`, `accent`), `ctx.rng()` (seeded random).
- `ctx.stagger(order, spread?)`: delay for a letter, spread over `spread` seconds.
- `ctx.sample(piece, count)`: random points inside a letter, for particles.
- `ctx.inside(piece, x, y)`, `ctx.area(piece)`.
- `ctx.anim(name, seconds, { ease, loop, alternate })`: animation CSS for a class.
- `ctx.at(seconds, extraStyle?)`: the inline style that sets an element's delay.
- `ctx.n(number)`: rounds numbers for compact output.
- `ctx.p`: a unique prefix. Use it for every class, id and keyframe name.

Rules that keep the drawing pausable on any frame (stills and video export depend on it):

1. Every animated element gets `class="${p}-a ..."` and `style="${at(seconds)}"`.
2. Use `ctx.anim(...)` in your class rules. Never write the `animation:` shorthand
   or set `animation-delay` yourself.
3. Name keyframes `${p}-something`. Add `${p}-b` to an element to scale or rotate it
   around its own centre.
4. Animate CSS properties only (`opacity`, `transform`, `stroke-dashoffset`,
   `fill-opacity`, …). SMIL `<animate>` and scripts won't freeze correctly.
5. Keep it light: a few thousand elements at most.

Then run it:

```bash
node scripts/khatt.mjs "نار" --effect ./my-effect.mjs -o fire.html
```

If the user likes it, suggest they share it as a pull request to
https://github.com/M-Alkassem/khatt (effects live in `src/effects/`).
