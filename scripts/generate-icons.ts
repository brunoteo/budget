#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { formatHex, oklch } from "culori";
import sharp from "sharp";

const ROOT = process.cwd();
const SRC_SVG = join(ROOT, "public/icon.svg");
const OUT_DIR = join(ROOT, "public");

const TERRA_500 = formatHex(oklch({ mode: "oklch", l: 0.581, c: 0.133, h: 38 })) ?? "#C36842";
const CLAY_50  = formatHex(oklch({ mode: "oklch", l: 0.974, c: 0.010, h: 60 })) ?? "#F8F4EE";

async function makePng(size: number, name: string, opts: { background?: string } = {}) {
  const svg = await readFile(SRC_SVG);
  let img = sharp(svg, { density: 384 }).resize(size, size);
  if (opts.background) img = img.flatten({ background: opts.background });
  const buf = await img.png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(OUT_DIR, name), buf);
  console.log(`wrote ${name} (${buf.byteLength} bytes)`);
}

async function makeFavicon() {
  const svg = await readFile(SRC_SVG);
  const png32 = await sharp(svg, { density: 96 }).resize(32, 32).png().toBuffer();
  await writeFile(join(OUT_DIR, "favicon.ico"), png32);
  console.log(`wrote favicon.ico (${png32.byteLength} bytes)`);
}

async function main() {
  console.log(`Resolved tokens → terra-500=${TERRA_500}  clay-50=${CLAY_50}`);
  await makePng(192, "icon-192.png");
  await makePng(512, "icon-512.png");
  await makePng(512, "icon-mask-512.png", { background: TERRA_500 });
  await makeFavicon();
}

main().catch((e) => { console.error(e); process.exit(1); });
