// Bundles the command line into one file for the Claude skill, so it runs without npm install.
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { defineConfig } from "vite";

const out = "skills/khatt/scripts";

export default defineConfig({
  publicDir: false,
  ssr: { noExternal: true },
  build: {
    ssr: "bin/khatt.ts",
    outDir: out,
    emptyOutDir: true,
    target: "node20",
    minify: false,
    rollupOptions: { output: { entryFileNames: "khatt.mjs", assetFileNames: "[name][extname]" } },
  },
  plugins: [
    {
      name: "khatt-skill-assets",
      closeBundle() {
        cpSync("node_modules/harfbuzzjs/dist/harfbuzz.wasm", `${out}/harfbuzz.wasm`);
        mkdirSync("skills/khatt/fonts", { recursive: true });
        for (const f of readdirSync("fonts")) cpSync(`fonts/${f}`, `skills/khatt/fonts/${f}`);
      },
    },
  ],
});
