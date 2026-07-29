#!/usr/bin/env python3
"""Vendor every webfont into site/fonts/ so the page has no third-party requests.

Run once; re-run only to change families. Keeps the latin subset only.
"""

import re
import urllib.request
from pathlib import Path

FAMILIES = [
    # Base trio. Bricolage is the display voice of the site itself - a grotesk with
    # enough irregularity to not read as the default UI face.
    "Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800",
    "Archivo:wght@400;500;600;800",
    "IBM+Plex+Mono:wght@400;500;600",
    # Display faces, one per game theme, picked to match the game's own lettering.
    "Cinzel:wght@400;700;900",        # Dota 2 - engraved Roman caps
    "Chakra+Petch:wght@400;600;700",  # CS2 - angular, Stratum-adjacent
    "Oswald:wght@400;500;700",        # Arma 3 / War Thunder - condensed military
    "Jost:wght@400;500;700",          # Skyrim / MSFS - Futura, Skyrim's menu face
    "Anton",                          # GTA V - heavy poster weight
    "Overpass:wght@400;700;900",      # ETS2 / ATS - Highway Gothic's open cousin
    "Titillium+Web:wght@400;600;900",  # F1 2015 - the timing-screen face
    "Teko:wght@400;500;700",          # Apex, Call of Duty, PAYDAY - tall condensed
]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
OUT = Path(__file__).resolve().parent.parent / "site" / "fonts"


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read() if binary else r.read().decode("utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    css_out = []
    for fam in FAMILIES:
        css = fetch(f"https://fonts.googleapis.com/css2?family={fam}&display=swap")
        blocks = re.findall(r"@font-face\s*\{.*?\}", css, re.S)
        kept = 0
        for block in blocks:
            rng = re.search(r"unicode-range:\s*([^;]+);", block)
            # latin subset is the one covering basic ASCII/Latin-1
            if not rng or "U+0000-00FF" not in rng.group(1):
                continue
            url = re.search(r"url\((https://[^)]+\.woff2)\)", block)
            name = re.search(r"font-family:\s*'([^']+)'", block)
            weight = re.search(r"font-weight:\s*([^;]+);", block)
            if not (url and name):
                continue
            slug = name.group(1).lower().replace(" ", "-")
            w = (weight.group(1) if weight else "400").strip().replace(" ", "-")
            fname = f"{slug}-{w}.woff2"
            (OUT / fname).write_bytes(fetch(url.group(1), binary=True))
            css_out.append(
                block.replace(url.group(1), f"fonts/{fname}").replace("@font-face {", "@font-face {")
            )
            kept += 1
            print(f"  {fname}")
        if not kept:
            raise SystemExit(f"no latin subset found for {fam}")
    (OUT.parent / "fonts.css").write_text("\n".join(css_out) + "\n", encoding="utf-8")
    print(f"wrote {OUT.parent / 'fonts.css'} ({len(css_out)} faces)")


if __name__ == "__main__":
    main()
