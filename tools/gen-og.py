"""Draws the link previews: one card per page that is not a profile.

A profile already had one: og.py in the api renders that person's treemap on
demand, which is the best possible card because it is the thing itself. The
home page had nothing, so a link to steamprofiler.org pasted into Discord,
WhatsApp or a Slack channel arrived as a grey box with a title in it, and a
link with no picture beside four that have one is the one nobody opens.

These cards are static because the pages are: each says the same thing to
everybody, so they can be files in the repo rather than a render per request.

One card per page rather than one for the site. A link to /support and a link
to /privacy arriving in the same chat as the same picture is a picture that has
stopped saying anything, and the picture is the half of a link preview that is
read first. So the layout is shared - headline left, motif right, wordmark
along the bottom - and what changes is the words and the motif, which is what
makes the four of them read as one site and still tell each other apart.

The treemap on the right is not decoration and not random. It is a squarified
layout over a made-up but honest distribution - one game with most of the
hours, a couple with some, a long tail of nearly nothing - because that is the
shape almost every real library turns out to have, and the card should show
what the site actually draws rather than a tidy grid that it never produces.

Fonts are the site's own woff2 files, read straight out of site/fonts. Pillow
reads woff2 through FreeType, so the card is set in Bricolage Grotesque and
IBM Plex Mono exactly like the page it advertises.

    python3 tools/gen-og.py           write every card into site/
    python3 tools/gen-og.py --check   fail if any file on disk has drifted
"""

import io
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

SITE = pathlib.Path("site")

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


# ── The motifs ───────────────────────────────────────────────────────
# Each one draws inside the same box on the right. They are all built out of
# the site's own rectangles rather than icons: the thing this site does is put
# rectangles on a screen, and a card that borrowed a padlock or a speech bubble
# from an icon set would be advertising a different site.

BOX = (648, 96, 480, 372)          # x, y, w, h - the same on every card


def frame(d):
    x, y, w, h = BOX
    d.rectangle([x - 10, y - 10, x + w + 10, y + h + 10], fill=PANEL, outline=LINE)


def motif_library(d):
    """The treemap: one game with most of the hours and a long tail behind it,
    which is the shape almost every real library turns out to have."""
    x, y, w, h = BOX
    hours = [1840, 610, 430, 300, 220, 170, 120, 90, 70, 55, 40, 32, 24, 18, 12, 9, 6, 4]
    for i, (cx, cy, cw, ch) in enumerate(squarify(hours, x, y, w, h)):
        if cw < 1 or ch < 1:
            continue
        fill = ACCENT if i == 0 else ACCENT_D if i < 3 else MUTED if i < 8 else LINE
        d.rectangle([cx, cy, cx + cw - 2, cy + ch - 2], fill=fill)


def motif_prose(d):
    """A post: a heading and paragraphs set as bars. The blog is the one part
    of this site that is words, so its motif is the shape of words."""
    x, y, w, h = BOX
    d.rectangle([x, y, x + w * 0.62, y + 26], fill=ACCENT)
    at = y + 62
    for run in (0.96, 0.99, 0.72, 0, 0.94, 0.88, 0.99, 0.55, 0, 0.92, 0.61):
        if run:
            d.rectangle([x, at, x + w * run, at + 12], fill=MUTED if run > 0.7 else LINE)
            at += 26
        else:
            at += 16


def motif_board(d):
    """The message board: cards, each with a vote beside it."""
    x, y, w, h = BOX
    at = y
    for i, (tall, lit) in enumerate(((84, True), (74, False), (74, False), (94, False))):
        if at + tall > y + h:
            break
        d.rectangle([x, at, x + w, at + tall], fill=PANEL, outline=LINE)
        d.rectangle([x + 14, at + 14, x + 52, at + tall - 14],
                    fill=ACCENT_D if lit else LINE)
        d.rectangle([x + 68, at + 18, x + w - 30, at + 30], fill=MUTED)
        d.rectangle([x + 68, at + 42, x + w - 90, at + 52], fill=LINE)
        at += tall + 12


def motif_support(d):
    """What the money is for: one bar that is the server and a row of small
    ones that are the months it keeps running."""
    x, y, w, h = BOX
    d.rectangle([x, y, x + w, y + 96], fill=PANEL, outline=LINE)
    d.rectangle([x + 18, y + 18, x + 18 + (w - 36) * 0.34, y + 78], fill=ACCENT)
    at = y + 124
    for i in range(12):
        cx = x + (i % 6) * (w / 6)
        cy = at + (i // 6) * 116
        d.rectangle([cx, cy, cx + w / 6 - 12, cy + 96],
                    fill=ACCENT_D if i < 2 else MUTED if i < 5 else LINE)


def motif_privacy(d):
    """What is kept and what is not: one cell lit and the rest struck through.
    The policy is a list of things this site does not hold, so the picture is
    mostly empty on purpose."""
    x, y, w, h = BOX
    cols, rows = 4, 5
    cw, ch = w / cols, h / rows
    for i in range(cols * rows):
        cx, cy = x + (i % cols) * cw, y + (i // cols) * ch
        box = [cx, cy, cx + cw - 10, cy + ch - 10]
        if i == 0:
            d.rectangle(box, fill=ACCENT)
            continue
        d.rectangle(box, outline=LINE)
        d.line([box[0] + 10, box[3] - 10, box[2] - 10, box[1] + 10], fill=MUTED, width=3)


# ── The cards ────────────────────────────────────────────────────────
# Headlines are hand broken rather than wrapped: where a line ends is part of
# how it reads, and no wrapper knows that. Three mono lines under it, which is
# the most that fits before the block stops being read at a glance.

CARDS = {
    "og-home.png": {
        "head": [("Your whole Steam", TEXT), ("library, drawn", TEXT), ("to scale.", ACCENT)],
        "lines": ["one rectangle per game", "area proportional to hours",
                  "no sign-in, no API key"],
        "motif": motif_library,
        "right": "any public Steam profile",
    },
    "og-blog.png": {
        "head": [("Notes on what", TEXT), ("this site is", TEXT), ("made of.", ACCENT)],
        "lines": ["how it reads Steam", "what the numbers cannot say",
                  "written in three languages"],
        "motif": motif_prose,
        "right": "the blog",
    },
    "og-feedback.png": {
        "head": [("Bugs, ideas and", TEXT), ("what is missing.", TEXT),
                 ("In the open.", ACCENT)],
        "lines": ["every message is public", "the reply is public too",
                  "no account to write one"],
        "motif": motif_board,
        "right": "the message board",
    },
    "og-support.png": {
        "head": [("Free, and staying", TEXT), ("free. This is", TEXT),
                 ("what it costs.", ACCENT)],
        "lines": ["a home server and a domain", "donations only, no tiers",
                  "nothing is behind a payment"],
        "motif": motif_support,
        "right": "support the site",
    },
    "og-privacy.png": {
        "head": [("What this site", TEXT), ("keeps about you:", TEXT),
                 ("almost nothing.", ACCENT)],
        "lines": ["no accounts, no tracking cookies", "no record of who looked up whom",
                  "every revision kept on file"],
        "motif": motif_privacy,
        "right": "the privacy policy",
    },
}


def draw(card) -> bytes:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    head = ImageFont.truetype(str(DISPLAY), 62)
    mono = ImageFont.truetype(str(MONO), 21)
    mono_s = ImageFont.truetype(str(MONO), 19)

    # ── The headline, left ───────────────────────────────────────────
    for i, (text, fill) in enumerate(card["head"]):
        d.text((72, 96 + i * 72), text, font=head, fill=fill)

    for i, text in enumerate(card["lines"]):
        d.text((72, 348 + i * 32), text, font=mono, fill=DIM)

    # ── The motif, right ─────────────────────────────────────────────
    frame(d)
    card["motif"](d)

    # ── The strip ────────────────────────────────────────────────────
    d.rectangle([0, H - FOOT, W, H], fill=PANEL)
    d.line([0, H - FOOT, W, H - FOOT], fill=LINE)
    d.text((72, H - FOOT + 34), "steamprofiler.org", font=mono, fill=TEXT)
    right = card["right"]
    rw = d.textlength(right, font=mono_s)
    d.text((W - 72 - rw, H - FOOT + 36), right, font=mono_s, fill=DIM)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


if __name__ == "__main__":
    drifted = []
    for name, card in CARDS.items():
        png = draw(card)
        out = SITE / name
        if "--check" in sys.argv:
            if not out.exists() or out.read_bytes() != png:
                drifted.append(name)
        else:
            out.write_bytes(png)
            print(f"wrote {out} ({len(png)} B)")
    if "--check" in sys.argv:
        if drifted:
            print(f"drifted: {', '.join(drifted)}; run: python3 tools/gen-og.py")
            sys.exit(1)
        print(f"{len(CARDS)} cards current")
