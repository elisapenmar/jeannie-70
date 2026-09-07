#!/usr/bin/env python3
"""Build images/og-preview.jpg, the card shown when the link is shared.

Without this the link previews as the bare cutout of Jeannie, whose
transparency messaging apps flatten to a muddy grey. This composes her onto
the actual invitation: dark room, mirror ball, her name.

    python3 scripts/make-og.py

1200x630 is the size Open Graph asks for and what iMessage, WhatsApp, Slack
and the rest crop to.
"""

import math
import pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 1200, 630
SS = 2                                   # supersample, for clean facet edges

FUTURA = "/System/Library/Fonts/Supplemental/Futura.ttc"


def font(size, index=1):
    try:
        return ImageFont.truetype(FUTURA, size, index=index)
    except Exception:
        return ImageFont.truetype("/System/Library/Fonts/HelveticaNeue.ttc", size, index=0)


def background(w, h):
    """Dark room with coloured bloom, built in numpy so the gradients are smooth."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    img = np.zeros((h, w, 3), np.float32)
    img[:] = np.array([7, 5, 14], np.float32)

    def glow(cx, cy, radius, colour, strength):
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
        f = np.clip(1.0 - d, 0, 1) ** 2 * strength
        for c in range(3):
            img[:, :, c] += f * colour[c]

    glow(w * 0.22, h * 0.12, w * 0.62, (58, 22, 92), 1.0)     # violet behind the ball
    glow(w * 0.08, h * 0.55, w * 0.45, (120, 26, 78), 0.55)   # magenta left
    glow(w * 0.72, h * 0.30, w * 0.50, (18, 70, 104), 0.45)   # cyan right
    glow(w * 0.55, h * 1.02, w * 0.70, (74, 20, 70), 0.60)    # floor
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def rays(w, h, origin):
    """Light fanning out from the ball."""
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ox, oy = origin
    reach = w * 1.6
    for i in range(22):
        a = math.radians(i * 360 / 22 + 7)
        half = math.radians(0.9 + (i % 3) * 0.5)
        pts = [(ox, oy)]
        for s in (a - half, a + half):
            pts.append((ox + math.cos(s) * reach, oy + math.sin(s) * reach))
        alpha = 16 if i % 2 else 9
        tint = [(255, 255, 255), (255, 215, 106), (255, 79, 163), (92, 225, 255)][i % 4]
        d.polygon(pts, fill=tint + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(6))


def mirror_ball(size, seed=7):
    """The same lat/long facet grid the page draws, rendered once and still."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    R = size / 2 - 1
    cx = cy = size / 2

    d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(14, 16, 26, 255))

    rng = np.random.default_rng(seed)
    ROWS, COLS = 20, 34
    Lx, Ly, Lz = -0.419, 0.499, 0.758
    Hx, Hy, Hz = -0.224, 0.266, 0.938
    flash = [(255, 255, 255), (255, 215, 106), (255, 79, 163), (92, 225, 255), (165, 107, 255)]

    for i in range(ROWS):
        lat0 = -math.pi / 2 + i * math.pi / ROWS
        lat1 = lat0 + math.pi / ROWS
        latM = (lat0 + lat1) / 2
        n = max(5, round(COLS * math.cos(latM)))
        step = 2 * math.pi / n
        for j in range(n):
            lon0 = j * step + 0.35
            lonM = lon0 + step / 2
            nz = math.cos(latM) * math.cos(lonM)
            if nz <= 0.045:
                continue
            nx, ny = math.cos(latM) * math.sin(lonM), math.sin(latM)

            pts = [(lat0, lon0), (lat0, lon0 + step), (lat1, lon0 + step), (lat1, lon0)]
            quad = [(cx + R * math.cos(la) * math.sin(lo), cy - R * math.sin(la)) for la, lo in pts]
            mx = sum(p[0] for p in quad) / 4
            my = sum(p[1] for p in quad) / 4
            quad = [(mx + (px - mx) * 0.85, my + (py - my) * 0.85) for px, py in quad]

            diff = max(0.0, nx * Lx + ny * Ly + nz * Lz)
            spec = max(0.0, nx * Hx + ny * Hy + nz * Hz)
            v = 28 + 186 * diff ** 1.2 + 225 * spec ** 24
            v *= 0.55 + 0.45 * min(1.0, nz * 1.7)
            v *= 0.84 + 0.30 * rng.random()
            r, g, b = v * 0.93, v * 0.97, v * 1.09

            if rng.random() > 0.945:
                f = flash[rng.integers(len(flash))]
                r, g, b = r * .35 + f[0] * .85, g * .35 + f[1] * .85, b * .35 + f[2] * .85

            d.polygon(quad, fill=(min(255, int(r)), min(255, int(g)), min(255, int(b)), 255))

    d.ellipse([cx - R * .15, cy - R * 1.02, cx + R * .15, cy - R * .9], fill=(140, 134, 163, 255))
    return img


def spaced(draw, xy, text, fnt, fill, tracking):
    """PIL has no letter-spacing, and this headline needs it."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return x


def glow_text(base, xy, text, fnt, fill, tracking=0, blur=18, glow=(255, 90, 180, 190)):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    spaced(ImageDraw.Draw(layer), xy, text, fnt, glow, tracking)
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))
    spaced(ImageDraw.Draw(base), xy, text, fnt, fill, tracking)


def main():
    card = background(W * SS, H * SS).convert("RGBA")

    # Ball high in the left corner, clear of the headline. The first pass had
    # the type running straight through it.
    BALL_D = int(195 * SS)
    ball_c = (int(170 * SS), int(122 * SS))
    card.alpha_composite(rays(W * SS, H * SS, ball_c))

    d = ImageDraw.Draw(card)
    d.line([(ball_c[0], 0), (ball_c[0], ball_c[1] - BALL_D // 2)],
           fill=(190, 184, 210, 255), width=3 * SS)
    ball = mirror_ball(BALL_D)
    halo = Image.new("RGBA", card.size, (0, 0, 0, 0))
    halo.paste(ball, (ball_c[0] - BALL_D // 2, ball_c[1] - BALL_D // 2), ball)
    card.alpha_composite(halo.filter(ImageFilter.GaussianBlur(26)))
    card.alpha_composite(halo)

    # Jeannie, full height on the right
    her = Image.open(ROOT / "images" / "mom-disco.png").convert("RGBA")
    target_h = int(H * SS)
    her = her.resize((round(her.width * target_h / her.height), target_h), Image.LANCZOS)
    hx, hy = int(770 * SS), 0

    floor = Image.new("RGBA", card.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(floor)
    fcx = hx + her.width // 2
    fd.ellipse([fcx - int(260 * SS), int(H * SS) - int(90 * SS),
                fcx + int(260 * SS), int(H * SS) + int(40 * SS)],
               fill=(255, 120, 200, 70))
    card.alpha_composite(floor.filter(ImageFilter.GaussianBlur(60)))

    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    shadow.paste(her, (hx, hy), her)
    card.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(30)))
    card.alpha_composite(shadow)

    # the words, in the clear space beneath the ball
    x = int(80 * SS)
    spaced(ImageDraw.Draw(card), (x, int(288 * SS)),
           "YOU'RE INVITED TO BOOGIE", font(16 * SS), (222, 208, 240, 255), 5 * SS)
    glow_text(card, (x - 3 * SS, int(322 * SS)), "JEANNIE",
              font(86 * SS), (255, 255, 255, 255), tracking=2 * SS,
              blur=11 * SS, glow=(190, 150, 255, 175))
    glow_text(card, (x - 3 * SS, int(418 * SS)), "TURNS 70",
              font(86 * SS), (255, 255, 255, 255), tracking=2 * SS,
              blur=11 * SS, glow=(255, 79, 163, 195))
    spaced(ImageDraw.Draw(card), (x, int(540 * SS)),
           "SATURDAY, JANUARY 23  .  PHOENIX", font(20 * SS), (255, 215, 106, 255), 3 * SS)

    out = card.convert("RGB").resize((W, H), Image.LANCZOS)
    dest = ROOT / "images" / "og-preview.jpg"
    out.save(dest, "JPEG", quality=90, optimize=True, progressive=True)
    print(f"{dest}  {dest.stat().st_size // 1024} KB  {W}x{H}")


if __name__ == "__main__":
    main()
