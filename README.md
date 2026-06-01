# mein-erstes-projekt

## Insta Reels — Cinematic Warm LUT

`Insta_Reels_Cinematic_Warm.cube` is a 33×33×33 3D color LUT in the standard
`.cube` format. It gives footage a warm cinematic grade:

- Lifted, slightly teal shadows (filmic faded blacks)
- Warm orange-leaning mids and highlights ("teal & orange", warm side)
- Soft S-curve contrast and gentle highlight roll-off
- Mild saturation lift

### How to use it on Reels

The `.cube` file works in the editors people actually use for Reels:

- **CapCut** — *Adjustment → LUT → Import* the `.cube` file, set strength to taste.
- **VN Editor** — *Filters → Import → CUBE*.
- **Premiere Pro / DaVinci Resolve** — apply as a Lumetri / Color LUT.
- **Lightroom / Photoshop** — *Color Lookup* / *Profile* import.

Tip: dial the intensity back to ~70–80% if skin tones look too orange, then
export and upload to Reels.

### Regenerating the LUT

The LUT is produced by `generate_lut.py` (pure Python, no dependencies):

```bash
python3 generate_lut.py
```

Tweak the constants in `apply_warm_cinematic()` to adjust warmth, contrast,
shadow lift, or saturation.
