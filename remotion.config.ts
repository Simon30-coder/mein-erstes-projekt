import {Config} from '@remotion/cli/config';

// Transparent renders need PNG frames; the alpha-capable codec is chosen
// per-command (see package.json scripts), so it isn't pinned here.
Config.setVideoImageFormat('png');
