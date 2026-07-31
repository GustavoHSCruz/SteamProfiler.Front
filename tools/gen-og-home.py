"""Draws site/og-home.png, the link preview for the pages that are not a profile.

A profile already had one: og.py in the api renders that person's treemap on
demand, which is the best possible card because it is the thing itself. The
home page had nothing, so a link to steamprofiler.org pasted into Discord,
WhatsApp or a Slack channel arrived as a grey box with a title in it, and a
link with no picture beside four that have one is the one nobody opens.

This card is static because the home page is: it says the same thing to
everybody, so it can be a file in the repo rather than a render per request.

The treemap on the right is not decoration and not random. It is a squarified
layout over a made-up but honest distribution - one game with most of the
hours, a couple with some, a long tail of nearly nothing - because that is the
shape almost every real library turns out to have, and the card should show
what the site actually draws rather than a tidy grid that it never produces.

Fonts are the site's own woff2 files, read straight out of site/fonts. Pillow
reads woff2 through FreeType, so the card is set in Bricolage Grotesque and
IBM Plex Mono exactly like the page it advertises.

    python3 tools/gen-og-home.py           write site/og-home.png
    python3 tools/gen-og-home.py --check   fail if the file on disk has drifted
"""

import io
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

SITE = pathlib.Path("site")
OUT = SITE / "og-home.png"

W, H = 1200, 630          # what every scraper expects of an og:image
FOOT = 92                 # the strip along the bottom, as in og.py

BG = "#0b0a0e"            # --bg
PANEL = "#131219"         # --panel
LINE = "#282631"          # --line
TEXT = "#eeecf3"          # --text
DIM = "#8e8a9b"           # --dim
ACCENT = "#ffb454"        # --accent
ACCENT_D = "#c97f22"      # --accent-d
MUTED = "#4a4458"

DISPLAY = SITE / "fonts" / "bricolage-grotesque-800.woff2"
MONO = SITE / "fonts" / "ibm-plex-mono-500.woff2"


def squarify(values, x0, y0, w0, h0):
    """Bruls, Huizing & van Wijk, the same layout the page draws in the browser
    and the same one og.py draws for a profile. Kept to the shape of those two
    on purpose: three drawings of one library should not disagree."""
    out = []
    total = sum(values)
    if not total or w0 <= 0 or h0 <= 0:
        return out

    scale = (w0 * h0) / total
    x, y, w, h = x0, y0, w0, h0
    queue = [v * scale for v in values]
    row, row_area = [], 0.0

    def worst(areas, s, length):
        if not areas or s <= 0:
            return float("inf")
        mx, mn = max(areas), min(areas)
        s2, l2 = s * s, length * length
        return max((l2 * mx) / s2, s2 / (l2 * mn))

    def flush():
        nonlocal x, y, w, h, row, row_area
        if not row:
            return
        length = min(w, h)
        thick = row_area / length if length else 0
        off = 0.0
        for area in row:
            side = (area / row_area) * length if row_area else 0
            if w >= h:
                out.append((x, y + off, thick, side))
            else:
                out.append((x + off, y, side, thick))
            off += side
        if w >= h:
            x, w = x + thick, w - thick
        else:
            y, h = y + thick, h - thick
        row, row_area = [], 0.0

    while queue:
        area = queue[0]
        length = min(w, h)
        current = [a for a in row]
        if not row or worst(current + [area], row_area + area, length) <= worst(current, row_area, length):
            row.append(area)
            row_area += area
            queue.pop(0)
        else:
            flush()
    flush()
    return out


def draw() -> bytes:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    head = ImageFont.truetype(str(DISPLAY), 62)
    mono = ImageFont.truetype(str(MONO), 21)
    mono_s = ImageFont.truetype(str(MONO), 19)

    # ── The headline, left ───────────────────────────────────────────
    # Three lines, hand broken rather than wrapped: the break after "hours"
    # is what makes the question land, and no wrapper knows that.
    d.text((72, 96), "Where did your", font=head, fill=TEXT)
    d.text((72, 168), "Steam hours go?", font=head, fill=TEXT)
    d.text((72, 240), "Drawn to scale.", font=head, fill=ACCENT)

    d.text((72, 348), "one rectangle per game", font=mono, fill=DIM)
    d.text((72, 380), "area proportional to hours", font=mono, fill=DIM)
    d.text((72, 412), "no sign-in, no API key", font=mono, fill=DIM)

    # ── The map, right ───────────────────────────────────────────────
    mx, my, mw, mh = 648, 96, 480, 372
    d.rectangle([mx - 10, my - 10, mx + mw + 10, my + mh + 10], fill=PANEL, outline=LINE)

    hours = [1840, 610, 430, 300, 220, 170, 120, 90, 70, 55, 40, 32, 24, 18, 12, 9, 6, 4]
    cells = squarify(hours, mx, my, mw, mh)
    for i, (cx, cy, cw, ch) in enumerate(cells):
        if cw < 1 or ch < 1:
            continue
        fill = ACCENT if i == 0 else ACCENT_D if i < 3 else MUTED if i < 8 else LINE
        d.rectangle([cx, cy, cx + cw - 2, cy + ch - 2], fill=fill)

    # ── The strip ────────────────────────────────────────────────────
    d.rectangle([0, H - FOOT, W, H], fill=PANEL)
    d.line([0, H - FOOT, W, H - FOOT], fill=LINE)
    d.text((72, H - FOOT + 34), "steamprofiler.org", font=mono, fill=TEXT)
    right = "any public Steam profile"
    rw = d.textlength(right, font=mono_s)
    d.text((W - 72 - rw, H - FOOT + 36), right, font=mono_s, fill=DIM)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


if __name__ == "__main__":
    png = draw()
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_bytes() != png:
            print("og-home.png has drifted; run: python3 tools/gen-og-home.py")
            sys.exit(1)
        print("og-home.png current")
    else:
        OUT.write_bytes(png)
        print(f"wrote {OUT} ({len(png)} B)")
