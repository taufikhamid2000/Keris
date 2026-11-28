"""Balairung: the throne hall inside the Istana's central block, with two side rooms in
the wings (armoury on the left, treasury on the right).

Run headless:
  blender -b -P scripts/blender/balairung.py -- <out_dir>

Writes <out_dir>/balairung.png and balairung.glb. It shares the Istana's origin and
dimensions (hall x -8..8, y -7..7, floor at z 2.4; front door at -Y opens onto the anjung),
so the engine can swap it in when the player enters.

Court seating follows rank: a carpeted aisle at floor level, raised side platforms for
the chiefs, a broad step for the ministers and the throne dais at the back.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, beam, blob, box, cyl, lathe  # noqa: E402

kit.reset()
GOLD = kit.flat("emas", (0.95, 0.66, 0.2), 0.3, **{"Metallic": 1.0})
LACQUER = kit.flat("lakuer", (0.38, 0.04, 0.03), 0.35)
SIRAP = kit.wood("sirap", (0.025, 0.015, 0.01), (0.11, 0.06, 0.03), scale=14, rough=0.85)

F = 2.4                 # floor
HD, MID, WING = 7.0, 8.0, 14.4
EAVE_MID, EAVE_WING = 6.0, 5.4
PITCH = math.tan(math.radians(40))
c = kit.new_group("balairung")

# ---------------------------------------------------------------- walls with openings


def wall(a0, a1, fixed, z1, kinds, along_y=False):
    """A wall split into equal bays; kinds lists 'solid', 'window' or 'door' per bay."""
    bw = (a1 - a0) / len(kinds)

    def put(m, w, z0, z1_, mat=M["plank"], d=0.14, off=0.0, name="dinding"):
        if w <= 0 or z1_ <= z0:
            return
        if along_y:
            box((d, w, z1_ - z0), (fixed + off, m, (z0 + z1_) / 2), mat=mat, coll=c, name=name)
        else:
            box((w, d, z1_ - z0), (m, fixed + off, (z0 + z1_) / 2), mat=mat, coll=c, name=name)

    for i, k in enumerate(kinds):
        m = a0 + bw * (i + 0.5)
        if k == "solid":
            put(m, bw, F, z1)
            put(m, bw * 0.6, F + 1.0, F + 2.4, M["trim"], 0.18, name="ukiran")
            continue
        ow = 1.2 if k == "window" else 1.8
        lo = F + (0.9 if k == "window" else 0.0)
        hi = F + (2.3 if k == "window" else 2.7)
        put(m - (bw + ow) / 4, (bw - ow) / 2, F, z1)
        put(m + (bw + ow) / 4, (bw - ow) / 2, F, z1)
        put(m, ow, F, lo)
        put(m, ow, hi + 0.55, z1)
        put(m, ow, hi, hi + 0.55, M["trim"], 0.1, name="kerawang")  # carved lattice transom
        for s in (-1, 1):
            put(m + s * (ow / 2 + 0.06), 0.12, lo, hi + 0.55, GOLD, 0.2, name="jenang")
    put((a0 + a1) / 2, a1 - a0, z1 - 0.3, z1 - 0.18, GOLD, 0.2, name="lis_emas")


# hall: front (door to the anjung in the middle bay), back (door behind the throne), sides into the wings
wall(-MID, MID, -HD, EAVE_MID, ["window", "window", "door", "window", "window"])
wall(-MID, MID, HD, EAVE_MID, ["window", "solid", "door", "solid", "window"])
wall(-HD, HD, -MID, EAVE_MID, ["solid", "door", "solid"], along_y=True)
wall(-HD, HD, MID, EAVE_MID, ["solid", "door", "solid"], along_y=True)
# wing rooms
for s in (-1, 1):
    a, b = sorted((s * MID, s * WING))
    wall(a, b, -HD, EAVE_WING, ["window", "window"])
    wall(a, b, HD, EAVE_WING, ["window", "solid"])
    wall(-HD, HD, s * WING, EAVE_WING, ["solid", "window", "solid"], along_y=True)
    box((WING - MID, 2 * HD, 0.15), (s * (MID + WING) / 2, 0, EAVE_WING + 0.08), mat=M["plank"], coll=c, name="siling")
    for y in (-3.5, 0.0, 3.5):
        beam((a, y, EAVE_WING - 0.1), (b, y, EAVE_WING - 0.1), 0.1, M["post"], c, verts=6, name="gelegar")

box((2 * WING, 2 * HD, 0.25), (0, 0, F - 0.12), mat=M["floor"], coll=c, name="lantai")

# ---------------------------------------------------------------- roof seen from inside

ridge = EAVE_MID + HD * PITCH
pts = [(-HD - 0.3, EAVE_MID - 0.25), (0, ridge), (HD + 0.3, EAVE_MID - 0.25), (HD + 0.3, EAVE_MID - 0.5), (0, ridge - 0.3), (-HD - 0.3, EAVE_MID - 0.5)]
kit.prism([(y, z + 0.3) for y, z in pts[:3]] + [(y, z + 0.3) for y, z in pts[3:]], 2 * MID + 0.4, 0.0, SIRAP, c, name="bumbung")
for s in (-1, 1):
    kit.prism([(-HD, EAVE_MID), (0, ridge), (HD, EAVE_MID)], 0.15, s * MID, M["plank"], c, name="dinding_tebar")
beam((-MID, 0, ridge - 0.1), (MID, 0, ridge - 0.1), 0.16, M["post"], c, name="tulang_perabung")
for x in (-6.4, -3.2, 0.0, 3.2, 6.4):
    beam((x, -HD, EAVE_MID), (x, HD, EAVE_MID), 0.14, M["post"], c, name="alang")
    beam((x, 0, EAVE_MID), (x, 0, ridge - 0.1), 0.1, M["post"], c, name="tiang_gantung")
    for s in (-1, 1):
        beam((x, s * HD, EAVE_MID), (x, 0, ridge), 0.09, M["post"], c, name="kasau")
for k in range(1, 10):
    for s in (-1, 1):
        y = s * HD * (1 - k / 10)
        beam((-MID, y, EAVE_MID + (HD - abs(y)) * PITCH + 0.05), (MID, y, EAVE_MID + (HD - abs(y)) * PITCH + 0.05), 0.04, M["post"], c, verts=4, name="reng")

# ---------------------------------------------------------------- the court

# lacquered pillars with gilded bands
for x in (-4.8, 4.8):
    for y in (-3.5, 0.0, 3.5):
        cyl(0.22, EAVE_MID - F, (x, y, (F + EAVE_MID) / 2), mat=LACQUER, coll=c, verts=12, name="tiang_seri")
        for z in (F + 0.15, F + 2.2, EAVE_MID - 0.25):
            cyl(0.25, 0.12, (x, y, z), mat=GOLD, coll=c, verts=12, name="gelang_emas")

# raised side platforms for the chiefs, mats and bolsters on top
for s in (-1, 1):
    box((2.6, 9.0, 0.3), (s * 6.6, -0.5, F + 0.15), mat=M["floor"], coll=c, name="seri_balai")
    box((2.6, 9.0, 0.02), (s * 6.6, -0.5, F + 0.31), mat=M["rattan"], coll=c, name="tikar")
    box((0.06, 9.0, 0.3), (s * 5.3, -0.5, F + 0.15), mat=GOLD, coll=c, name="lis_emas")
    for y in (-4.0, -1.5, 1.0, 3.5):
        cyl(0.13, 0.7, (s * 7.6, y, F + 0.45), rot=(math.pi / 2, 0, 0), mat=M["red"] if y < 0 else M["gold_cloth"], coll=c, verts=10, name="bantal")

# the ministers' step and the throne dais
box((2 * MID - 0.4, 3.4, 0.4), (0, 5.1, F + 0.2), mat=M["floor"], coll=c, name="tingkat_bendahara")
box((2 * MID - 0.4, 0.06, 0.4), (0, 3.4, F + 0.2), mat=GOLD, coll=c, name="lis_emas")
box((6.0, 2.2, 0.5), (0, 5.8, F + 0.65), mat=LACQUER, coll=c, name="peterana")
for k in range(2):
    box((2.0, 0.4, 0.25 * (k + 1)), (0, 4.5 - 0.4 * (1 - k) + 0.2, F + 0.4 + 0.125 * (k + 1)), mat=M["trim"], coll=c, name="anak_tangga")
TOP = F + 0.9
# the throne: carved seat, red cushion, gilded back with a flame-shaped crest
box((1.6, 1.0, 0.55), (0, 6.0, TOP + 0.27), mat=M["trim"], coll=c, name="singgahsana")
box((1.4, 0.8, 0.15), (0, 5.95, TOP + 0.62), mat=M["red"], coll=c, name="kusyen")
box((1.6, 0.14, 1.6), (0, 6.45, TOP + 1.2), mat=GOLD, coll=c, name="sandaran")
kit.prism([(-0.8, TOP + 2.0), (0, TOP + 2.8), (0.8, TOP + 2.0)], 0.12, 0.0, GOLD, c, name="mahkota_takhta").rotation_euler = (0, 0, 0)
for s in (-1, 1):
    box((0.18, 0.9, 0.5), (s * 0.85, 6.0, TOP + 0.8), mat=GOLD, coll=c, name="tangan_takhta")
# canopy over the throne
for x in (-1.6, 1.6):
    for y in (4.9, 6.7):
        cyl(0.06, 3.6, (x, y, TOP + 1.8), mat=GOLD, coll=c, verts=8, name="tiang_langit")
box((3.6, 2.2, 0.08), (0, 5.8, TOP + 3.6), mat=M["gold_cloth"], coll=c, name="langit_langit")
for s in (-1, 1):
    kit.sheet(3.6, 0.5, (0, 5.8 + s * 1.1, TOP + 3.35), mat=M["red"], coll=c, sag=0.08, nx=8, ny=2, name="tirai")
# royal yellow umbrellas (payung ubur-ubur) either side
for x in (-2.6, 2.6):
    cyl(0.03, 3.0, (x, 6.2, TOP + 1.5), mat=GOLD, coll=c, verts=6, name="batang_payung")
    lathe([(0.0, 0.0), (0.95, 0.0), (0.0, 0.45)], (x, 6.2, TOP + 2.9), M["gold_cloth"], c, segs=16, smooth=False, name="payung")
    kit.sheet(1.9, 0.3, (x, 6.2 - 0.95, TOP + 2.8), mat=M["gold_cloth"], coll=c, sag=0.05, nx=6, ny=2, name="rumbai")
# curtains (tabir) over the back door to the inner palace
for k, x in enumerate((-2.4, -0.8, 0.8, 2.4)):
    kit.sheet(1.6, 3.3, (x, HD - 0.3, F + 0.4 + 1.65), mat=M["red"] if k % 2 else M["gold_cloth"], coll=c, bulge=0.06, nx=3, ny=6, name="tabir")
beam((-3.4, HD - 0.3, F + 3.9), (3.4, HD - 0.3, F + 3.9), 0.05, GOLD, c, name="kayu_tabir")

# carpet down the aisle
box((2.0, 10.0, 0.02), (0, -2.0, F + 0.01), mat=M["red"], coll=c, name="permaidani")
for s in (-1, 1):
    box((0.12, 10.0, 0.022), (s * 0.95, -2.0, F + 0.012), mat=M["gold_cloth"], coll=c, name="tepi_permaidani")

# the nobat: drums, a gong and the long trumpet, by the front left
for i, (x, y, r, h) in enumerate(((-6.9, -5.7, 0.32, 0.6), (-6.2, -5.9, 0.28, 0.55), (-7.3, -4.9, 0.4, 0.75))):
    lathe([(0.0, 0.0), (r * 0.8, 0.0), (r, h * 0.5), (r * 0.9, h), (0.0, h)], (x, y, F), LACQUER, c, segs=16, name="gendang")
    cyl(r * 0.92, 0.02, (x, y, F + h + 0.01), mat=M["sack"], coll=c, verts=16, name="kulit")
for x in (-5.5, -4.1):
    beam((x, -6.4, F), (x, -6.4, F + 1.9), 0.06, LACQUER, c, name="ancak_gong")
beam((-5.6, -6.4, F + 1.85), (-4.0, -6.4, F + 1.85), 0.06, LACQUER, c, name="ancak_gong")
kit.torus(0.42, 0.06, (-4.8, -6.4, F + 1.2), rot=(math.pi / 2, 0, 0), mat=GOLD, coll=c, name="gong")
cyl(0.42, 0.04, (-4.8, -6.4, F + 1.2), rot=(math.pi / 2, 0, 0), mat=GOLD, coll=c, verts=20, name="gong")
blob((-4.8, -6.45, F + 1.2), (0.1, 0.06, 0.1), GOLD, c, wobble=0.0, subdiv=2, smooth=True, name="busut_gong")

# hanging brass lamps from the tie beams, and standing lamps by the dais
for x in (-3.2, 0.0, 3.2):
    for y in (-3.5, 1.5):
        top = (x, y, EAVE_MID)
        beam(top, (x, y, EAVE_MID - 1.6), 0.01, GOLD, c, verts=4, name="rantai")
        lathe([(0.0, 0.0), (0.22, 0.05), (0.28, 0.16), (0.0, 0.16)], (x, y, EAVE_MID - 1.75), GOLD, c, segs=12, name="pelita_gantung")
        kit.lamp((x, y, EAVE_MID - 1.55), c, energy=90.0)
for x in (-3.4, 3.4):
    cyl(0.04, 1.5, (x, 4.0, TOP - 0.45 + 0.75), mat=GOLD, coll=c, verts=8, name="kaki_pelita")
    lathe([(0.0, 0.0), (0.16, 0.04), (0.2, 0.12), (0.0, 0.12)], (x, 4.0, TOP + 1.05), GOLD, c, segs=12, name="pelita")
    kit.lamp((x, 4.0, TOP + 1.2), c, energy=70.0)

# ---------------------------------------------------------------- side rooms


def spear(x, y, lean=0.0):
    beam((x, y, F), (x + lean, y, F + 2.4), 0.025, M["post"], c, verts=6, name="lembing")
    blob((x + lean * 1.04, y, F + 2.5), (0.04, 0.02, 0.14), M["iron"], c, wobble=0.0, subdiv=1, name="mata_lembing")


# armoury (left): spear racks, shields and a keris stand
for y in (-5.0, 5.0):
    beam((-WING + 0.4, y - 1.2, F + 1.6), (-WING + 0.4, y + 1.2, F + 1.6), 0.05, M["post"], c, name="rak")
    for k in range(7):
        spear(-WING + 0.3, y - 1.1 + k * 0.36, 0.08)
for k, y in enumerate((-2.5, 2.5)):
    cyl(0.45, 0.06, (-WING + 0.25, y, F + 1.8), rot=(0, math.pi / 2, 0), mat=LACQUER if k else M["rattan"], coll=c, verts=18, name="perisai")
box((1.4, 0.5, 0.9), (-11.2, 0.0, F + 0.45), mat=M["trim"], coll=c, name="peti_keris")
for k in range(5):
    beam((-11.7 + k * 0.25, 0.0, F + 0.9), (-11.7 + k * 0.25 + 0.04, 0.05, F + 1.35), 0.02, GOLD if k % 2 else M["post"], c, verts=5, name="keris")

# treasury (right): bound chests, porcelain and bolts of cloth
for i, (x, y) in enumerate(((11.0, -5.6), (12.6, -5.6), (13.4, -3.8), (13.4, 4.2))):
    box((1.2, 0.8, 0.7), (x, y, F + 0.35), mat=M["trim"], coll=c, name="peti")
    for dx in (-0.4, 0.4):
        box((0.06, 0.82, 0.72), (x + dx, y, F + 0.35), mat=GOLD, coll=c, name="pengikat")
for k in range(5):
    kit.tempayan(9.2 + k * 0.7, 5.9, F, 0.7, M["porcelain"] if k % 2 else M["blue"], coll=c)
for row in range(3):
    for k in range(5 - row):
        cyl(0.12, 1.3, (13.4, -0.9 + k * 0.26 + row * 0.13, F + 0.12 + row * 0.22), rot=(0, math.pi / 2, 0), mat=(M["red"], M["indigo"], M["gold_cloth"])[(k + row) % 3], coll=c, verts=10, name="kain")

# ---------------------------------------------------------------- outside, light and render
kit.place(c, (0, 0, 0))
kit.ground(0.0, kit.fibre("halaman", (0.36, 0.28, 0.17), (0.60, 0.50, 0.34), scale=(3, 3, 3), bump=0.3))
kit.hills()
kit.environment(cam=(-2.6, -6.6, F + 2.2), target=(0.5, 6.0, F + 2.5), lens=18, sun_elev=16, sun_rot=-140, sky=0.08, sun=8.0, haze=0.002, exposure=1.7)
kit.render_and_export("balairung", [c])
