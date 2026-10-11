"""Genera los iconos PNG de AplicaClimate (PWA + Android) a partir de la misma paleta del icono SVG.

Uso:  python scripts/make_icons.py
Salida: icons/icon-192.png, icons/icon-512.png, icons/icon-1024.png, icons/maskable-512.png
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
SS = 4  # supersampling


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def draw_icon(size, maskable=False):
    S = size * SS
    scale = S / 512.0
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    # fondo con degradado vertical
    bg = Image.new("RGB", (1, S))
    top, bottom = (18, 48, 85), (11, 18, 32)
    px = bg.load()
    for y in range(S):
        c = lerp(top, bottom, y / max(1, S - 1))
        px[0, y] = c
    bg = bg.resize((S, S))
    img.paste(bg, (0, 0))

    d = ImageDraw.Draw(img)

    def sc(v):
        return v * scale

    inner = 0.72 if maskable else 1.0  # en maskable el contenido va más centrado
    ox = oy = (S - S * inner) / 2.0
    img2 = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(img2)

    # sol
    sun_c = (ox + sc(196 * inner), oy + sc(176 * inner))
    sun_r = sc(62 * inner)
    d2.ellipse([sun_c[0] - sun_r, sun_c[1] - sun_r, sun_c[0] + sun_r, sun_c[1] + sun_r],
               fill=(255, 209, 102, 255))

    # nube
    d2.ellipse([ox + sc(150 * inner), oy + sc(182 * inner), ox + sc(318 * inner), oy + sc(322 * inner)],
               fill=(232, 238, 252, 242))
    d2.ellipse([ox + sc(196 * inner), oy + sc(150 * inner), ox + sc(320 * inner), oy + sc(300 * inner)],
               fill=(232, 238, 252, 242))
    d2.rounded_rectangle([ox + sc(148 * inner), oy + sc(240 * inner), ox + sc(360 * inner), oy + sc(348 * inner)],
                         radius=sc(52 * inner), fill=(232, 238, 252, 242))

    # pin de ubicación
    cx = ox + sc(256 * inner)
    r = sc(84 * inner)
    cy = oy + sc(300 * inner)
    d2.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(74, 168, 255, 255))
    tip = [(cx, cy + sc(212 * inner)), (cx - sc(52 * inner), cy + sc(26 * inner)),
           (cx + sc(52 * inner), cy + sc(26 * inner))]
    d2.polygon(tip, fill=(74, 168, 255, 255))
    hole = sc(32 * inner)
    d2.ellipse([cx - hole, cy - hole, cx + hole, cy + hole], fill=(11, 18, 32, 255))

    img = Image.alpha_composite(img, img2)
    img = img.resize((size, size), Image.LANCZOS)

    if not maskable:
        img.putalpha(rounded_mask(size, round(size * 0.219)))
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for size in (192, 512, 1024):
        draw_icon(size).save(os.path.join(OUT, "icon-%d.png" % size))
        print("creado icons/icon-%d.png" % size)
    draw_icon(512, maskable=True).save(os.path.join(OUT, "maskable-512.png"))
    print("creado icons/maskable-512.png")


if __name__ == "__main__":
    main()
