"""Generate the OG share images and the favicon set.

Run from anywhere:  python3 tools/make-og-images.py   (needs Pillow)
Rerun it whenever a hero eyebrow or headline changes.

Built to brand book §12: charcoal ground, Newsreader headline, mono eyebrow
with dates, wordmark bottom-left. Rendered with the site's own WOFF2 files, so
the share card uses the same Newsreader and DM Sans as the pages do.
"""
import os
import re

from PIL import Image, ImageDraw, ImageFont

# The repo root, derived — so this runs from a clone anywhere.
SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = SITE + "/assets/fonts"

CHARCOAL = (20, 17, 15)
WHITE = (255, 255, 255)
GOLD = (201, 169, 110)
GOLD_LIGHT = (232, 192, 122)


def font(path, size, weight=None):
    """Load a face at `size`, setting the weight axis by NAME.

    The axis order is not the same in both families — DM Sans is
    [Optical size, Weight] and Newsreader is [Weight, Optical Size] — so
    positional set_variation_by_axes([weight]) silently sets optical size on
    DM Sans and leaves the weight at its 400 default. That rendered the
    wordmark's "Prentice" at 400 instead of 700 and made the monogram's light
    "1" indistinguishable from it. Match on the axis name instead, and pin
    optical size to the point size it is actually drawn at.
    """
    f = ImageFont.truetype(path, size)
    try:
        axes = f.get_variation_axes()
    except OSError:
        return f                                   # static face
    values = []
    for a in axes:
        name = a.get("name")
        name = name.decode() if isinstance(name, bytes) else (name or "")
        low = name.lower()
        if "weight" in low and weight is not None:
            values.append(max(a["minimum"], min(a["maximum"], weight)))
        elif "optical" in low:
            values.append(max(a["minimum"], min(a["maximum"], size)))
        else:
            values.append(a["default"])
    f.set_variation_by_axes(values)
    return f


def glow(img, cx, cy, radius, colour, peak):
    """A soft radial wash, matching the gold glow on the dark heroes."""
    w, h = img.size
    layer = Image.new("L", (w, h), 0)
    px = layer.load()
    step = 4                                  # coarse then smoothed; fast enough
    for y in range(0, h, step):
        for x in range(0, w, step):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d < radius:
                v = int(peak * (1 - d / radius) ** 2)
                for dy in range(step):
                    for dx in range(step):
                        if y + dy < h and x + dx < w:
                            px[x + dx, y + dy] = v
    img.paste(Image.new("RGB", (w, h), colour), (0, 0), layer)


def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for word in words:
        trial = (cur + " " + word).strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def og(path, eyebrow, headline, max_lines=3):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), CHARCOAL)
    glow(img, int(W * 0.10), int(H * 0.05), 560, (120, 95, 55), 60)
    d = ImageDraw.Draw(img)

    pad = 72
    mono = font(F + "/DMMono-400.woff2", 19)

    # Eyebrow, letter-spaced by hand — PIL has no tracking.
    x = pad
    for ch in eyebrow:
        d.text((x, 86), ch, font=mono, fill=GOLD_LIGHT)
        x += d.textlength(ch, font=mono) + 2.1

    # Headline: Newsreader 300, shrinking until it fits in max_lines.
    size = 76
    while size > 40:
        head = font(F + "/Newsreader.woff2", size, 300)
        lines = wrap(d, headline, head, W - pad * 2)
        if len(lines) <= max_lines:
            break
        size -= 4
    y = 170
    for line in lines:
        d.text((pad, y), line, font=head, fill=WHITE)
        y += int(size * 1.12)

    # Wordmark bottom-left.
    wm_b = font(F + "/DMSans.woff2", 34, 700)
    wm_l = font(F + "/DMSans.woff2", 34, 300)
    by = H - pad - 34
    d.text((pad, by), "Prentice", font=wm_b, fill=WHITE)
    d.text((pad + d.textlength("Prentice", font=wm_b), by), "1", font=wm_l, fill=GOLD)

    # Gold hairline above the wordmark.
    d.line([(pad, by - 28), (W - pad, by - 28)], fill=(58, 49, 41), width=1)

    img.save(path, "JPEG", quality=88, optimize=True)
    print(f"  {os.path.basename(path)}  {os.path.getsize(path)//1024} KB  ({len(lines)} lines @ {size}px)")


def icon(size):
    """P1 monogram: P in DM Sans 700 white, 1 in DM Sans 300 gold, on charcoal."""
    img = Image.new("RGB", (size, size), CHARCOAL)
    d = ImageDraw.Draw(img)
    s = int(size * 0.58)
    fb = font(F + "/DMSans.woff2", s, 700)
    fl = font(F + "/DMSans.woff2", s, 300)

    wp = d.textlength("P", font=fb)
    w1 = d.textlength("1", font=fl)
    # The thin light 1 makes the pair look right-heavy when centred
    # mathematically; the loader handoff offsets it left, so we do too.
    x = (size - (wp + w1)) / 2 - size * 0.047
    box = d.textbbox((0, 0), "P", font=fb)
    y = (size - (box[3] - box[1])) / 2 - box[1]

    d.text((x, y), "P", font=fb, fill=WHITE)
    d.text((x + wp, y), "1", font=fl, fill=GOLD)
    return img


def read_hero(page):
    """Take the eyebrow and H1 from the page itself.

    They were hard-coded here once, and the cohort dates then moved from
    Jan 25 to Jan 18 — so every share card advertised a start date the site
    no longer claimed, in an image nobody thinks to re-check. Reading the
    live markup means the cards cannot drift from the page again; rerunning
    this script is the whole update.
    """
    html = open(os.path.join(SITE, page), encoding="utf-8").read()
    hero = html[html.index('<div class="hero__col">'):html.index("</section>")]
    strip = lambda m: re.sub(r"<[^>]+>", "", m.group(1)).strip()
    eyebrow = strip(re.search(r'class="eyebrow eyebrow--on-dark"[^>]*>(.*?)</div>', hero, re.S))
    h1 = strip(re.search(r'class="hero__h1[^"]*"[^>]*>(.*?)</h1>', hero, re.S))
    return eyebrow, h1


if __name__ == "__main__":
    os.makedirs(SITE + "/assets/og", exist_ok=True)
    print("OG images (eyebrow and headline read from each page):")
    for page, out in [("index.html", "home.jpg"),
                      ("practices/index.html", "practices.jpg"),
                      ("sponsors/index.html", "sponsors.jpg")]:
        eyebrow, h1 = read_hero(page)
        print(f"  {out:<15} {eyebrow}")
        og(SITE + "/assets/og/" + out, eyebrow, h1)

    print("Icons:")
    icon(512).save(SITE + "/icon-512.png")
    icon(192).save(SITE + "/icon-192.png")
    icon(180).save(SITE + "/apple-touch-icon.png")
    ico = icon(64)
    ico.save(SITE + "/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    for n in ("icon-512.png", "icon-192.png", "apple-touch-icon.png", "favicon.ico"):
        print(f"  {n}  {os.path.getsize(SITE + '/' + n)//1024} KB")
