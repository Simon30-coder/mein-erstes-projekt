#!/usr/bin/env python3
"""Generate cinematic 3D LUTs (.cube) for studio Instagram reels.

Each look is built from the same stack of gentle, stacked operations applied to
0-1 normalized sRGB values; only the parameters differ between presets:

  1. Lift ............ raise & tint the black point (faded base)
  2. Highlight knee .. soft shoulder so whites roll off, never clip harshly
  3. Contrast ........ low-strength S-curve for cinematic depth
  4. Split tone ...... separate color push in shadows vs. highlights
  5. Saturation ...... global softening (or lift) of color

Presets:
  - Pastel Cinematic Clean : lifted cool shadows, creamy highlights, soft pastel
  - Golden Studio          : warm glowy golden-hour, honey highlights
  - Editorial              : crisp cool fashion look, clean whites, more contrast

Output: 33x33x33 IRIDAS/.cube LUTs — the universal format imported by
Premiere, DaVinci, CapCut, VN, Final Cut, Lightroom, etc.
"""

SIZE = 33          # 33^3 grid — the standard high-quality LUT resolution


def clamp(x, lo=0.0, hi=1.0):
    return lo if x < lo else hi if x > hi else x


def lerp(a, b, t):
    return a + (b - a) * t


def luma(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def soft_contrast(x, strength):
    """Gentle S-curve centered on mid grey. strength ~0.1-0.2 is subtle.
    Negative strength softens (lowers) contrast instead."""
    s = x * x * (3.0 - 2.0 * x)
    return lerp(x, s, strength)


def grade(r, g, b, p):
    # ---- 1. Lift: raise & tint the black point ----
    lift = p["lift"]
    lr, lg, lb = p["lift_tint"]
    r = lift * lr + (1.0 - lift) * r
    g = lift * lg + (1.0 - lift) * g
    b = lift * lb + (1.0 - lift) * b

    # ---- 2. Highlight rolloff (soft shoulder) ----
    knee = p["knee"]
    shoulder = p["shoulder"]

    def rolloff(c):
        if c <= knee:
            return c
        t = (c - knee) / (1.0 - knee)
        return knee + (1.0 - knee) * (1.0 - (1.0 - t) ** 2) * shoulder

    r, g, b = rolloff(r), rolloff(g), rolloff(b)

    # ---- 3. Contrast ----
    cs = p["contrast"]
    r, g, b = soft_contrast(r, cs), soft_contrast(g, cs), soft_contrast(b, cs)

    # ---- 4. Split toning ----
    l = luma(r, g, b)
    shadow_w = clamp(1.0 - l * p["shadow_falloff"])
    high_w = clamp((l - p["high_pivot"]) * p["high_falloff"])
    sr, sg, sb = p["shadow_push"]
    hr, hg, hb = p["high_push"]
    r += sr * shadow_w + hr * high_w
    g += sg * shadow_w + hg * high_w
    b += sb * shadow_w + hb * high_w

    # ---- 5. Saturation ----
    sat = p["sat"]
    l2 = luma(r, g, b)
    r = lerp(l2, r, sat)
    g = lerp(l2, g, sat)
    b = lerp(l2, b, sat)

    return clamp(r), clamp(g), clamp(b)


PRESETS = {
    # Soft pastel: cool lifted shadows, creamy highlights, muted color.
    "Pastel_Cinematic_Clean": {
        "title": "Pastel Cinematic Clean",
        "lift": 0.045, "lift_tint": (0.92, 1.00, 1.12),
        "knee": 0.78, "shoulder": 0.93,
        "contrast": 0.14,
        "shadow_falloff": 1.6, "high_pivot": 0.55, "high_falloff": 1.8,
        "shadow_push": (-0.020, 0.010, 0.022),
        "high_push": (0.026, 0.012, -0.020),
        "sat": 0.84,
    },
    # Golden studio: warm honey lift, glowy golden highlights, gentle warmth
    # carried through shadows. Color kept near-natural (not muted).
    "Golden_Studio": {
        "title": "Golden Studio",
        "lift": 0.050, "lift_tint": (1.15, 1.00, 0.80),
        "knee": 0.82, "shoulder": 0.97,
        "contrast": 0.12,
        "shadow_falloff": 1.5, "high_pivot": 0.45, "high_falloff": 1.6,
        "shadow_push": (0.014, 0.004, -0.016),
        "high_push": (0.040, 0.020, -0.034),
        "sat": 0.98,
    },
    # Editorial: crisp and clean. Minimal, slightly cool lift, neutral creamy
    # whites, a touch more contrast, lightly desaturated for a fashion look.
    "Editorial": {
        "title": "Editorial",
        "lift": 0.022, "lift_tint": (0.85, 0.95, 1.05),
        "knee": 0.84, "shoulder": 1.00,
        "contrast": 0.22,
        "shadow_falloff": 1.7, "high_pivot": 0.60, "high_falloff": 1.7,
        "shadow_push": (-0.018, -0.004, 0.014),
        "high_push": (0.006, 0.004, 0.000),
        "sat": 0.90,
    },
}


def write_lut(filename, p):
    denom = SIZE - 1
    lines = [
        f'TITLE "{p["title"]}"',
        f"LUT_3D_SIZE {SIZE}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
        "",
    ]
    # .cube ordering: red index varies fastest
    for bi in range(SIZE):
        for gi in range(SIZE):
            for ri in range(SIZE):
                r, g, b = grade(ri / denom, gi / denom, bi / denom, p)
                lines.append(f"{r:.6f} {g:.6f} {b:.6f}")
    with open(filename, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Wrote {filename} ({SIZE}^3 = {SIZE**3} entries)")


def main():
    for name, p in PRESETS.items():
        write_lut(f"{name}.cube", p)


if __name__ == "__main__":
    main()
