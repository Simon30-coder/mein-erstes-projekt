#!/usr/bin/env python3
"""Generate a soft pastel, cinematic 3D LUT (.cube) for studio Instagram reels.

The look is built from a few stacked, gentle operations applied in linear-ish
display space (input is treated as 0-1 normalized sRGB):

  1. Lifted, slightly cool shadows .... faded-film "clean" base
  2. Soft highlight rolloff ........... no harsh clipping, creamy whites
  3. Gentle contrast (low-strength) ... cinematic depth without crushing
  4. Split toning .................... teal shadows / warm-peach highlights
  5. Pastel desaturation ............. pulls everything toward a soft look

Output: a 33x33x33 IRIDAS/.cube LUT, the universal format imported by
Premiere, DaVinci, CapCut, VN, Final Cut, Lightroom, etc.
"""

SIZE = 33          # 33^3 grid — the standard high-quality LUT resolution
TITLE = "Pastel Cinematic Clean"


def clamp(x, lo=0.0, hi=1.0):
    return lo if x < lo else hi if x > hi else x


def lerp(a, b, t):
    return a + (b - a) * t


def luma(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def soft_contrast(x, strength):
    """Gentle S-curve centered on mid grey. strength ~0.1-0.2 is subtle."""
    # smoothstep-style curve blended with identity by `strength`
    s = x * x * (3.0 - 2.0 * x)
    return lerp(x, s, strength)


def grade(r, g, b):
    # ---- 1. Lifted, slightly cool shadows (faded film base) ----
    lift = 0.045                       # raise the black point
    r = lift * 0.92 + (1.0 - lift) * r # warm channel lifted a touch less
    g = lift * 1.00 + (1.0 - lift) * g
    b = lift * 1.12 + (1.0 - lift) * b # cooler lift in blue -> clean shadows

    # ---- 2. Soft highlight rolloff (creamy, no clipping) ----
    knee = 0.78
    def rolloff(c):
        if c <= knee:
            return c
        # compress the top range into a gentle shoulder
        t = (c - knee) / (1.0 - knee)
        return knee + (1.0 - knee) * (1.0 - (1.0 - t) ** 2) * 0.93
    r, g, b = rolloff(r), rolloff(g), rolloff(b)

    # ---- 3. Gentle cinematic contrast ----
    r = soft_contrast(r, 0.14)
    g = soft_contrast(g, 0.14)
    b = soft_contrast(b, 0.14)

    # ---- 4. Split toning: teal shadows / warm-peach highlights ----
    l = luma(r, g, b)
    shadow_w = clamp(1.0 - l * 1.6)    # strongest in shadows
    high_w = clamp((l - 0.55) * 1.8)   # strongest in highlights

    # teal push in shadows (down red, up green/blue slightly)
    r -= 0.020 * shadow_w
    g += 0.010 * shadow_w
    b += 0.022 * shadow_w
    # warm peach in highlights (up red, gentle green, down blue)
    r += 0.026 * high_w
    g += 0.012 * high_w
    b -= 0.020 * high_w

    # ---- 5. Pastel desaturation ----
    sat = 0.84                         # <1 softens colors toward pastel
    l2 = luma(r, g, b)
    r = lerp(l2, r, sat)
    g = lerp(l2, g, sat)
    b = lerp(l2, b, sat)

    return clamp(r), clamp(g), clamp(b)


def main():
    lines = []
    lines.append(f'TITLE "{TITLE}"')
    lines.append(f"LUT_3D_SIZE {SIZE}")
    lines.append("DOMAIN_MIN 0.0 0.0 0.0")
    lines.append("DOMAIN_MAX 1.0 1.0 1.0")
    lines.append("")

    denom = SIZE - 1
    # .cube ordering: red index varies fastest
    for bi in range(SIZE):
        for gi in range(SIZE):
            for ri in range(SIZE):
                r, g, b = grade(ri / denom, gi / denom, bi / denom)
                lines.append(f"{r:.6f} {g:.6f} {b:.6f}")

    with open("Pastel_Cinematic_Clean.cube", "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"Wrote Pastel_Cinematic_Clean.cube ({SIZE}^3 = {SIZE**3} entries)")


if __name__ == "__main__":
    main()
