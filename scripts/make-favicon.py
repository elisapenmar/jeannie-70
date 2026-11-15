#!/usr/bin/env python3
"""Render the browser tab icon: the same mirror ball the page draws.

Reuses make_og's sphere so the icon and the page can never drift apart.
Transparent background on purpose, since a tab strip may be light or dark and
the ball itself reads against both.

    python3 scripts/make-favicon.py
"""
import importlib.util
import pathlib

from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent

spec = importlib.util.spec_from_file_location("make_og", ROOT / "scripts" / "make-og.py")
og = importlib.util.module_from_spec(spec)
spec.loader.exec_module(og)


def icon(px):
    """Supersampled, because facet edges alias badly at tab size."""
    big = px * 4
    ball = og.mirror_ball(big, seed=11)

    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    # A soft halo so the ball still reads as lit when shrunk to 16 pixels.
    glow = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    glow.paste(ball, (0, 0), ball)
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(big // 28)))
    canvas.alpha_composite(ball)
    return canvas.resize((px, px), Image.LANCZOS)


for size, name in ((512, "favicon-512.png"), (180, "apple-touch-icon.png"), (32, "favicon-32.png")):
    out = ROOT / "images" / name
    icon(size).save(out, "PNG", optimize=True)
    print(f"{out.name}  {out.stat().st_size // 1024} KB  {size}x{size}")
