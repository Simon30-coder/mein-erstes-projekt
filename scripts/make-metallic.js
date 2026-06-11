// Turns the flat red logo SVG into a metallic one by replacing the solid fill
// with a vertical gradient (dark -> red -> bright highlight band -> dark),
// which reads as polished/chrome red metal.
const fs = require('fs');

const SRC = 'public/logo-red.svg';
const OUT = 'public/logo-metallic.svg';

const svg = fs.readFileSync(SRC, 'utf8');

// Metallic RED sheen — stays clearly red throughout: deep red top and bottom
// for volume, a brighter (but still red) highlight band in the middle. No
// near-white blowout, so it reads as polished red metal rather than chrome.
const gradient = `
\t<defs>
\t\t<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
\t\t\t<stop offset="0%" stop-color="#3d0404"/>
\t\t\t<stop offset="12%" stop-color="#8c0a0a"/>
\t\t\t<stop offset="30%" stop-color="#c91414"/>
\t\t\t<stop offset="45%" stop-color="#f52424"/>
\t\t\t<stop offset="50%" stop-color="#ff5252"/>
\t\t\t<stop offset="58%" stop-color="#ee1c1c"/>
\t\t\t<stop offset="78%" stop-color="#b00f0f"/>
\t\t\t<stop offset="100%" stop-color="#3a0404"/>
\t\t</linearGradient>
\t</defs>`;

const out = svg
  .replace(/(<svg[^>]*>)/, `$1${gradient}`)
  .replace(/fill="#FF0000"/i, 'fill="url(#metal)"');

fs.writeFileSync(OUT, out);
console.log('wrote', OUT, out.length, 'bytes');
