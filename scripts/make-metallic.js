// Turns the flat red logo SVG into a metallic one by replacing the solid fill
// with a vertical gradient (dark -> red -> bright highlight band -> dark),
// which reads as polished/chrome red metal.
const fs = require('fs');

const SRC = 'public/logo-red.svg';
const OUT = 'public/logo-metallic.svg';

const svg = fs.readFileSync(SRC, 'utf8');

// Metallic RED sheen, tuned to the reference's luminous, lit-from-within look:
// brighter overall (no deep-dark blowout to near-black), with a bright-red
// highlight band. Still clearly red and metallic, just glowing rather than dim.
const gradient = `
\t<defs>
\t\t<linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
\t\t\t<stop offset="0%" stop-color="#7a0c0c"/>
\t\t\t<stop offset="12%" stop-color="#bf1515"/>
\t\t\t<stop offset="30%" stop-color="#ef2727"/>
\t\t\t<stop offset="45%" stop-color="#ff4d4d"/>
\t\t\t<stop offset="50%" stop-color="#ff7d7d"/>
\t\t\t<stop offset="58%" stop-color="#f53333"/>
\t\t\t<stop offset="78%" stop-color="#cf1a1a"/>
\t\t\t<stop offset="100%" stop-color="#820b0b"/>
\t\t</linearGradient>
\t</defs>`;

const out = svg
  .replace(/(<svg[^>]*>)/, `$1${gradient}`)
  .replace(/fill="#FF0000"/i, 'fill="url(#metal)"');

fs.writeFileSync(OUT, out);
console.log('wrote', OUT, out.length, 'bytes');
