# Pastel Cinematic Clean — LUT

A soft, clean, cinematic pastel color grade for studio Instagram reels.

**File:** [`Pastel_Cinematic_Clean.cube`](../Pastel_Cinematic_Clean.cube) — a 33³ 3D LUT in the
universal `.cube` format. `.cube` is the standard "LUT file" that editing apps import.

## The look

- Lifted, slightly cool shadows — a faded-film "clean" base, never crushed blacks
- Soft highlight rolloff — creamy whites with no harsh clipping
- Gentle cinematic contrast — depth without heaviness
- Split toning — teal shadows, warm-peach highlights
- Pastel desaturation — soft, muted color for that calm studio feel

## How to apply it

- **CapCut / VN (mobile, for reels):** add your clip → Filters / Adjust → *Import LUT* → choose the `.cube` file. Dial intensity to taste (try 70–90%).
- **Instagram:** Instagram itself can't import LUTs, so grade in CapCut/VN first, export, then upload the graded reel.
- **Premiere Pro:** Lumetri Color → Creative → *Look* → Browse → select the `.cube`.
- **DaVinci Resolve:** right-click a clip → *LUT* → or Color page → LUTs.
- **Final Cut Pro:** add the *Custom LUT* effect → Choose Custom LUT.

> Tip: shoot/expose a touch brighter and flatter than usual — pastel grades read best on slightly low-contrast footage.

## Regenerating / tweaking

The LUT is generated from [`tools/generate_lut.py`](../tools/generate_lut.py) (pure Python, no
dependencies). Adjust the `lift`, `sat`, split-tone, or contrast values and re-run:

```bash
python3 tools/generate_lut.py
```
