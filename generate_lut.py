#!/usr/bin/env python3
"""
Generate a cinematic "warm" 3D LUT in .cube format, tuned for Instagram Reels.

The look is a classic warm cinematic grade:
  - Gently lifted, slightly teal shadows (filmic faded blacks)
  - Warm orange-leaning midtones and highlights ("teal & orange", warm side)
  - Soft S-curve for cinematic contrast
  - Mild highlight roll-off so skin and skies don't clip
  - Small saturation lift for a rich, graded feel

Output: a 33^3 .cube LUT compatible with CapCut, VN, Premiere, DaVinci,
Lightroom, Photoshop, and most mobile editors used for Reels.
"""

SIZE = 33  # standard 33x33x33 cube — good quality, widely supported


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def lerp(a, b, t):
    return a + (b - a) * t


def smooth_contrast(x):
    """Soft S-curve around 0.5 for cinematic contrast (no harsh clipping)."""
    # Cubic-ish S-curve, gentle.
    strength = 0.18
    return clamp(x + strength * (x - 0.5) * (1.0 - abs(2.0 * x - 1.0)))


def lift_shadows(x, lift):
    """Raise the floor so blacks are milky/faded (film look)."""
    return lift + (1.0 - lift) * x


def highlight_rolloff(x, knee=0.75):
    """Compress highlights above the knee for a soft roll-off."""
    if x <= knee:
        return x
    t = clamp((x - knee) / (1.0 - knee))  # clamp so x>1 doesn't go complex
    # ease-out compression
    compressed = knee + (1.0 - knee) * (1.0 - (1.0 - t) ** 1.6)
    return compressed


def luminance(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def apply_warm_cinematic(r, g, b):
    # --- 1. Base tone: lifted shadows + soft contrast ---
    r = lift_shadows(r, 0.020)
    g = lift_shadows(g, 0.018)
    b = lift_shadows(b, 0.028)  # blue floor slightly higher -> teal shadows

    r = smooth_contrast(r)
    g = smooth_contrast(g)
    b = smooth_contrast(b)

    # --- 2. Warm color balance (per-tonal-range) ---
    lum = luminance(r, g, b)

    # Shadows lean cool/teal, highlights lean warm/orange.
    shadow_w = clamp(1.0 - lum * 1.6)      # strong in shadows
    highlight_w = clamp((lum - 0.45) / 0.55)  # ramps up in highlights

    # Teal in the shadows
    g += 0.012 * shadow_w
    b += 0.022 * shadow_w
    r -= 0.006 * shadow_w

    # Warm orange in mids/highlights
    r += 0.045 * highlight_w
    g += 0.014 * highlight_w
    b -= 0.030 * highlight_w

    # Overall warm bias (whole image)
    r += 0.018
    g += 0.004
    b -= 0.020

    # --- 3. Highlight roll-off ---
    r = highlight_rolloff(r)
    g = highlight_rolloff(g)
    b = highlight_rolloff(b)

    # --- 4. Gentle saturation lift ---
    lum2 = luminance(r, g, b)
    sat = 1.10
    r = lum2 + (r - lum2) * sat
    g = lum2 + (g - lum2) * sat
    b = lum2 + (b - lum2) * sat

    return clamp(r), clamp(g), clamp(b)


def main():
    lines = []
    lines.append("# Cinematic Warm — LUT for Instagram Reels")
    lines.append("# Warm teal & orange grade with lifted filmic shadows")
    lines.append("# Format: 33x33x33 .cube 3D LUT")
    lines.append('TITLE "Insta Reels - Cinematic Warm"')
    lines.append(f"LUT_3D_SIZE {SIZE}")
    lines.append("DOMAIN_MIN 0.0 0.0 0.0")
    lines.append("DOMAIN_MAX 1.0 1.0 1.0")
    lines.append("")

    # .cube order: red index changes fastest, then green, then blue.
    denom = SIZE - 1
    for bi in range(SIZE):
        for gi in range(SIZE):
            for ri in range(SIZE):
                r = ri / denom
                g = gi / denom
                b = bi / denom
                nr, ng, nb = apply_warm_cinematic(r, g, b)
                lines.append(f"{nr:.6f} {ng:.6f} {nb:.6f}")

    with open("Insta_Reels_Cinematic_Warm.cube", "w") as f:
        f.write("\n".join(lines) + "\n")

    print(f"Wrote Insta_Reels_Cinematic_Warm.cube ({SIZE}^3 = {SIZE**3} entries)")


if __name__ == "__main__":
    main()
