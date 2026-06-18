// Vectorizes the raster "more" logo into a tight, red SVG for crisp 3D rotation.
const sharp = require('sharp');
const potrace = require('potrace');
const fs = require('fs');

const SRC = 'public/logo-source.jpeg';
const OUT = 'public/logo-red.svg';
const RED = '#FF0000';

(async () => {
  // 1) Normalize -> grayscale -> hard threshold so only the near-black wordmark
  //    survives (the light background + right-edge shadow band drop to white).
  const pre = await sharp(SRC)
    .grayscale()
    .normalize()
    .threshold(120)
    .toBuffer();

  // 2) Trim the surrounding white so the SVG viewBox hugs the wordmark.
  const trimmed = await sharp(pre)
    .trim({threshold: 10})
    .toBuffer();

  const meta = await sharp(trimmed).metadata();
  console.log('trimmed size:', meta.width, 'x', meta.height);

  const tmp = 'scripts/_trimmed.png';
  await sharp(trimmed).png().toFile(tmp);

  // 3) Trace to vector. turdSize drops speckles; the wordmark is solid black.
  potrace.trace(
    tmp,
    {
      color: RED,
      background: 'transparent',
      threshold: 128,
      turdSize: 80,
      optTolerance: 0.4,
    },
    (err, svg) => {
      if (err) throw err;
      fs.writeFileSync(OUT, svg);
      console.log('wrote', OUT, svg.length, 'bytes');
    }
  );
})();
