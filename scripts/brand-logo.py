"""Draws the GRace logo as SVG, traced from the owner's reference artwork (108 px) at 3x scale.

Run from the repo root after `npm run build` or `npm run dev` has fetched the Geist font:
    python scripts/brand-logo.py
"""
import base64, glob, math, pathlib

# Geist (OFL), the app's own font, embedded so the logo renders the same everywhere.
woff = max(glob.glob(".next/static/media/*.p.woff2"), key=lambda p: pathlib.Path(p).stat().st_size)
FONT = base64.b64encode(pathlib.Path(woff).read_bytes()).decode()
STYLE = ('  <defs><style>@font-face{font-family:"GraceSans";src:url(data:font/woff2;base64,' + FONT +
         ') format("woff2");font-weight:100 900;} text{font-family:"GraceSans","Segoe UI",Arial,sans-serif;}</style></defs>\n')

ORANGE, ECHO, INK = "#ff6a00", "#ffc49a", "#111111"
CX, CY, RO, RI = 150, 132, 105, 66      # C centre, outer and inner radius
TOP = math.radians(-38)                 # where the upper arm ends (round end)
CUT = CY + 57                           # the lower arm ends in a flat cut at this height


def c_shape(fill, dx=0, dy=0):
    p = lambda r, a: (CX + dx + r * math.cos(a), CY + dy + r * math.sin(a))
    ox, oy = p(RO, TOP); ix, iy = p(RI, TOP)
    cut_o = CX + dx + math.sqrt(RO**2 - (CUT - CY) ** 2)
    cut_i = CX + dx + math.sqrt(RI**2 - (CUT - CY) ** 2)
    cap = (RO - RI) / 2
    return (f'  <path d="M{ox:.1f} {oy:.1f} A{RO} {RO} 0 1 0 {cut_o:.1f} {CUT + dy} H{cut_i:.1f} '
            f'A{RI} {RI} 0 1 1 {ix:.1f} {iy:.1f} A{cap} {cap} 0 0 0 {ox:.1f} {oy:.1f}Z" fill="{fill}"/>\n')


def ticks():
    out = ""
    for x1, y1, x2, y2 in ((151, 6, 151, 23), (151, 244, 151, 261), (27, 128, 44, 128), (258, 128, 276, 128)):
        out += f'  <line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>\n'
    return out


race = f'  <text transform="translate(147 179) skewX(-12)" font-size="50" font-weight="800" letter-spacing="-2" fill="{INK}">RACE</text>\n'
art = c_shape(ECHO, -8, 6) + c_shape(ORANGE) + ticks() + race
head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="{}" role="img" aria-label="GRace Car Rentals">\n'

logo = (head.format("0 0 318 318") + STYLE + '  <rect width="318" height="318" fill="#ffffff"/>\n' + art
        + f'  <text transform="translate(157 296) skewX(-14)" text-anchor="middle" font-size="22" font-weight="600" letter-spacing="5" fill="{INK}">CAR RENTALS</text>\n</svg>\n')
icon = head.format("2 -12 290 290") + STYLE + art + "</svg>\n"

for path, svg in (("public/brand/grace-logo.svg", logo), ("public/brand/grace-mark.svg", icon), ("src/app/icon.svg", icon)):
    pathlib.Path(path).write_bytes(svg.encode("utf-8"))
