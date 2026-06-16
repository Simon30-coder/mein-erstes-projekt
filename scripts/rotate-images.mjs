// Pre-rotates the raw source photos to upright portrait and writes them to /public.
// The originals are stored rotated 90° (subject lies sideways, head toward the
// left edge). Rotating 90° clockwise puts the head at the top => upright portrait.
//
// Run with: npm run rotate-images
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const rawDir = join(root, "raw");
const publicDir = join(root, "public");

mkdirSync(publicDir, { recursive: true });

const jobs = [
  { in: "before.jpeg", out: "before.jpeg" },
  { in: "after.jpeg", out: "after.jpeg" },
];

for (const job of jobs) {
  // The originals carry no useful EXIF orientation and decode sideways (head
  // toward the left edge). A single explicit 90° clockwise rotation stands the
  // subject upright. We intentionally do NOT call .rotate() (EXIF auto) first,
  // as that double-applies and lands the image back on its side.
  const meta = await sharp(join(rawDir, job.in)).metadata();
  await sharp(join(rawDir, job.in))
    .rotate(90) // explicit 90° clockwise correction -> upright portrait
    .jpeg({ quality: 92 })
    .toFile(join(publicDir, job.out));
  const outMeta = await sharp(join(publicDir, job.out)).metadata();
  console.log(
    `${job.in}: ${meta.width}x${meta.height} -> ${job.out}: ${outMeta.width}x${outMeta.height}`
  );
}

console.log("Done. Rotated images written to /public.");
