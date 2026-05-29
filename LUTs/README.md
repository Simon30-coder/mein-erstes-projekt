# Studio Reels — Cinematic LUT Pack

Three clean, cinematic color grades for studio Instagram reels. Each is a 33³ 3D
LUT in the universal `.cube` format — the standard "LUT file" editing apps import.

| Look | File | Vibe |
|------|------|------|
| **Pastel Cinematic Clean** | [`Pastel_Cinematic_Clean.cube`](../Pastel_Cinematic_Clean.cube) | Soft, muted, calm. Cool lifted shadows + creamy highlights. |
| **Golden Studio** | [`Golden_Studio.cube`](../Golden_Studio.cube) | Warm, glowy golden-hour. Honey highlights, flattering skin. |
| **Editorial** | [`Editorial.cube`](../Editorial.cube) | Crisp fashion look. Clean whites, cooler edge, more contrast. |

## The looks

**Pastel Cinematic Clean**
- Lifted, slightly cool shadows — a faded-film "clean" base, never crushed blacks
- Soft highlight rolloff — creamy whites with no harsh clipping
- Gentle contrast, teal shadows / warm-peach highlights, pastel desaturation

**Golden Studio**
- Warm honey lift carried through the shadows
- Glowy golden highlights with a soft shoulder
- Near-natural saturation so warmth reads rich, not faded

**Editorial**
- Minimal, slightly cool lift — deeper, cleaner blacks
- Neutral crisp whites and a touch more contrast
- Lightly desaturated for a polished magazine look

## How to apply it

- **CapCut (iPad "desktop-style" / Mac / PC):** open the **Filters** tab → **Import** → pick the `.cube`, then drag it onto your clip and set intensity (~70–90%). *Note: the basic CapCut phone app can't import custom LUTs — use the desktop-style app, or VN below.*
- **VN (free, mobile):** select clip → **Filters → LUT → Import** → choose the `.cube`.
- **Instagram:** Instagram itself can't import LUTs, so grade in CapCut/VN first, export, then upload the graded reel.
- **Premiere Pro:** Lumetri Color → Creative → *Look* → Browse → select the `.cube`.
- **DaVinci Resolve:** right-click a clip → *LUT* → or Color page → LUTs.
- **Final Cut Pro:** add the *Custom LUT* effect → Choose Custom LUT.

> These `.cube` files use a minimal header (`LUT_3D_SIZE` + data only) for maximum compatibility — some apps (notably CapCut) silently reject the optional `TITLE`/`DOMAIN` lines and import an empty LUT.

> Tip: shoot/expose a touch brighter and flatter than usual — these grades read best on slightly low-contrast footage.

## Regenerating / tweaking

The LUT is generated from [`tools/generate_lut.py`](../tools/generate_lut.py) (pure Python, no
dependencies). Adjust the `lift`, `sat`, split-tone, or contrast values and re-run:

```bash
python3 tools/generate_lut.py
```
