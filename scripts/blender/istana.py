"""Istana Melaka: the Sultan's palace, after the Sejarah Melayu description (17 bays,
tiered roofs, gilded finials, Chinese glass) and the 1980s replica, scaled up for the game.

Run headless:
  blender -b -P scripts/blender/istana.py -- <out_dir>

Writes <out_dir>/istana.png and istana.glb (palace at the origin, front facing -Y).
Layout: a long stilted hall of 17 bays along X, a taller central block with three
roof tiers, two-tier wings, a front verandah (serambi) and a gabled audience porch
(anjung) with the grand stair.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, beam, box, cyl, lathe  # noqa: E402

kit.reset()
SIRAP = kit.wood("sirap", (0.025, 0.015, 0.01), (0.11, 0.06, 0.03), scale=14, rough=0.85)
GOLD = kit.flat("emas", (0.95, 0.66, 0.2), 0.3, **{"Metallic": 1.0})

BAY = 3.2
NB = 17
HALF_L = BAY * NB / 2          # 27.2
HD = 7.0                       # half depth of the main hall
FLOOR = 2.4                    # main floor
FLOOR_LOW = 2.0                # verandah and porch
EAVE_WING, EAVE_MID = 5.4, 6.0
MID = 8.0                      # central block spans x -MID..MID

# ---------------------------------------------------------------- roofs


def _frame(cx, cy, along_y):
    """Local (x along ridge, y across, z) to world."""
    if along_y:
        return lambda x, y, z: (cx - y, cy + x, z)
    return lambda x, y, z: (cx + x, cy + y, z)


def gable(c, cx, cy, length, hw, z0, pitch, along_y=False, ends=(True, True), ov=1.2, t=0.25):
    """One gable roof slab with gilded eaves; ends=(-x end, +x end) get a carved
    gable panel (tebar layar), crossed horns and glass roundels. Returns the ridge z."""
    tn = math.tan(math.radians(pitch))
    a, zr, ze = hw + ov, z0 + hw * tn, z0 - ov * tn
    pts = [(-a, ze), (0, zr), (a, ze), (a, ze - t), (0, zr - t / math.cos(math.radians(pitch))), (-a, ze - t)]
    T = _frame(cx, cy, along_y)

    def orient(ob):
        ob.location = (cx, cy, 0)
        ob.rotation_euler = (0, 0, math.pi / 2 if along_y else 0)

    orient(kit.prism(pts, length, 0.0, SIRAP, c, name="bumbung"))
    for s in (-1, 1):
        beam(T(-length / 2, s * a, ze), T(length / 2, s * a, ze), 0.11, GOLD, c, verts=6, name="papan_cantik")
    for k, s in enumerate((-1, 1)):
        if not ends[k]:
            continue
        xe = s * (length / 2 - 0.35)
        orient(kit.prism([(-hw * 0.92, z0 - 0.1), (0, zr - 0.45), (hw * 0.92, z0 - 0.1)], 0.14, xe, M["trim"], c, name="tebar_layar"))
        xg = s * (length / 2 + 0.02)
        for sy in (-1, 1):
            beam(T(xg, sy * a, ze), T(xg, 0, zr), 0.09, GOLD, c, verts=6, name="kepala_cicak")
            beam(T(xg, sy * 0.9, zr - 0.9 * tn), T(xg, -sy * 0.7, zr + 0.8), 0.08, GOLD, c, verts=6, name="silang_gunting")
        for yy, zz, rr in ((0, z0 + hw * tn * 0.45, 0.35), (-hw * 0.42, z0 + 0.5, 0.22), (hw * 0.42, z0 + 0.5, 0.22)):
            p = T(s * (length / 2 - 0.25), yy, zz)
            cyl(rr, 0.06, p, rot=(0, math.pi / 2, 0) if not along_y else (math.pi / 2, 0, 0), mat=M["glaze"], coll=c, verts=14, name="cermin")
    return zr


def tiers(c, cx, cy, length, hw, z0, pitches, along_y=False, ends=(True, True), shrink=0.68, gap=0.7, ov=1.2):
    """Stacked gables (tumpang): each tier narrower and steeper, its eave lifted just
    clear of the roof below, with a lattice clerestory between. Returns the top ridge z."""
    T = _frame(cx, cy, along_y)
    zr = z0
    for k, p in enumerate(pitches):
        if k:
            h2 = hw * shrink
            t0, t1 = math.tan(math.radians(pitches[k - 1])), math.tan(math.radians(p))
            z_new = z0 + (hw - h2 - ov) * t0 + gap + ov * t1
            for s in (-1, 1):
                bot = z0 + (hw - h2) * t0 - 0.6
                a, b = T(-length / 2 + 1.6, s * h2, (bot + z_new) / 2), T(length / 2 - 1.6, s * h2, (bot + z_new) / 2)
                ctr = tuple((a[i] + b[i]) / 2 for i in range(3))
                size = (abs(b[0] - a[0]) or 0.12, abs(b[1] - a[1]) or 0.12, z_new - bot)
                box(size, ctr, mat=M["trim"], coll=c, name="kerawang")
            hw, z0, length = h2, z_new, length - 3.2
        zr = gable(c, cx, cy, length, hw, z0, p, along_y, ends, ov)
    return zr


# ---------------------------------------------------------------- walls, posts, floors


def wall(c, a0, a1, fixed, z0, z1, out, along_y=False):
    """Plank wall in bays with dark window openings and a carved panel above each."""
    n = max(1, round((a1 - a0) / BAY))
    bw = (a1 - a0) / n
    for i in range(n):
        m = a0 + bw * (i + 0.5)
        if along_y:
            P = lambda d, z: (fixed + d, m, z)  # noqa: E731
            S = lambda w, d, h: (d, w, h)  # noqa: E731
        else:
            P = lambda d, z: (m, fixed + d, z)  # noqa: E731
            S = lambda w, d, h: (w, d, h)  # noqa: E731
        box(S(bw - 0.04, 0.12, z1 - z0), P(0, (z0 + z1) / 2), mat=M["plank"], coll=c, name="dinding")
        box(S(1.1, 0.06, 1.5), P(out * 0.08, z0 + 1.35), mat=M["dark"], coll=c, name="tingkap")
        box(S(1.3, 0.06, 0.5), P(out * 0.08, z0 + 2.55), mat=M["trim"], coll=c, name="ukiran")
        box(S(bw, 0.08, 0.12), P(out * 0.1, z1 - 0.1), mat=GOLD, coll=c, name="lis_emas")


def post(c, x, y, top, r=0.18):
    box((0.6, 0.6, 0.3), (x, y, 0.15), mat=M["weathered"], coll=c, name="batu_alas")
    cyl(r, top - 0.3, (x, y, 0.3 + (top - 0.3) / 2), mat=M["post"], coll=c, verts=8, name="tiang")


def railing(c, a, b, z):
    """A carved lattice balustrade between two (x, y) points."""
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    ln = math.hypot(b[0] - a[0], b[1] - a[1])
    yaw = math.atan2(b[1] - a[1], b[0] - a[0])
    box((ln, 0.06, 0.65), (mx, my, z + 0.4), rot=(0, 0, yaw), mat=M["trim"], coll=c, name="kekisi")
    box((ln, 0.14, 0.08), (mx, my, z + 0.76), rot=(0, 0, yaw), mat=M["post"], coll=c, name="susur")


# ---------------------------------------------------------------- the palace

c = kit.new_group("istana")
xs = [-HALF_L + BAY * i for i in range(NB + 1)]

# stilts and the main hall
for x in xs:
    for y in (-HD, -HD / 2, 0, HD / 2, HD):
        edge = y in (-HD, HD) or x in (xs[0], xs[-1])
        top = (EAVE_MID if abs(x) <= MID else EAVE_WING) if edge else FLOOR
        post(c, x, y, top, 0.2 if abs(x) <= MID else 0.17)
box((2 * HALF_L + 0.4, 2 * HD + 0.4, 0.25), (0, 0, FLOOR - 0.12), mat=M["floor"], coll=c, name="lantai")
for s in (-1, 1):
    wall(c, -HALF_L, -MID, s * HD, FLOOR, EAVE_WING, s)
    wall(c, MID, HALF_L, s * HD, FLOOR, EAVE_WING, s)
    wall(c, -MID, MID, s * HD, FLOOR, EAVE_MID, s)
    wall(c, -HD, HD, s * HALF_L, FLOOR, EAVE_WING, s, along_y=True)
# the central block rises above the wings: a band of wall where they meet
for s in (-1, 1):
    box((0.15, 2 * HD, EAVE_MID - EAVE_WING + 1.2), (s * MID, 0, EAVE_WING + 0.3), mat=M["plank"], coll=c, name="dinding_tinggi")

# verandah (serambi) along the front, under a lean-to roof
SY = -HD - 3.0
for x in xs:
    post(c, x, SY, 5.0, 0.15)
box((2 * HALF_L + 0.4, 3.9, 0.2), (0, (SY - HD) / 2, FLOOR_LOW - 0.1), mat=M["floor"], coll=c, name="lantai_serambi")
run = HD - SY + 1.0
ang = math.atan2(0.7, run)
box((2 * HALF_L + 1.2, math.hypot(run, 0.7), 0.2), (0, (SY - 1.0 - HD) / 2, 5.15), rot=(ang, 0, 0), mat=SIRAP, coll=c, name="atap_serambi")
beam((-HALF_L - 0.6, SY - 1.0, 4.8), (HALF_L + 0.6, SY - 1.0, 4.8), 0.11, GOLD, c, verts=6, name="papan_cantik")
for x0, x1 in ((-HALF_L, -5.0), (5.0, HALF_L)):
    railing(c, (x0, SY), (x1, SY), FLOOR_LOW)

# audience porch (anjung) with its own two-tier gable facing the courtyard
AY0, AY1 = SY - 6.0, SY
for x in (-4.8, 4.8):
    for y in (AY0, AY0 + 3.0, AY1):
        post(c, x, y, 5.6, 0.2)
box((10.4, AY1 - AY0 + 0.4, 0.2), (0, (AY0 + AY1) / 2, FLOOR_LOW - 0.1), mat=M["floor"], coll=c, name="lantai_anjung")
for x in (-4.8, 4.8):
    railing(c, (x, AY0), (x, AY1), FLOOR_LOW)
for x0, x1 in ((-4.8, -2.4), (2.4, 4.8)):
    railing(c, (x0, AY0), (x1, AY0), FLOOR_LOW)
tiers(c, 0.0, (AY0 + AY1) / 2 - 0.4, AY1 - AY0 + 2.6, 5.4, 5.6, (40, 52), along_y=True, ends=(True, False))

# the grand stair
for k in range(10):
    zt = FLOOR_LOW - k * 0.2
    box((4.6, 0.38, zt), (0, AY0 - 0.2 - k * 0.38, zt / 2), mat=M["plank"], coll=c, name="anak_tangga")
for x in (-2.4, 2.4):
    box((0.2, 3.9, 0.3), (x, AY0 - 1.95, 1.0), rot=(math.atan2(2.0, 3.8), 0, 0), mat=M["trim"], coll=c, name="ibu_tangga")
    beam((x, AY0, FLOOR_LOW + 0.9), (x, AY0 - 3.9, 0.9), 0.06, GOLD, c, verts=6, name="susur_emas")
    for y, z in ((AY0, FLOOR_LOW), (AY0 - 3.9, 0.0)):
        cyl(0.08, 0.95, (x, y, z + 0.47), mat=M["post"], coll=c, verts=8, name="tiang_tangga")
        lathe([(0.0, 0.0), (0.1, 0.0), (0.12, 0.12), (0.0, 0.3)], (x, y, z + 0.95), GOLD, c, segs=10, name="buah_butung")

# main roofs: two-tier wings and a three-tier central block, with a gilded crown on top
wl = HALF_L - MID + 1.2
tiers(c, -(MID + HALF_L) / 2 - 0.6, 0, wl, HD, EAVE_WING, (32, 44), ends=(True, False))
tiers(c, (MID + HALF_L) / 2 + 0.6, 0, wl, HD, EAVE_WING, (32, 44), ends=(False, True))
top = tiers(c, 0, 0, 2 * MID + 2.0, HD, EAVE_MID, (40, 50, 58), gap=1.1)
lathe([(0.0, 0.0), (0.5, 0.0), (0.6, 0.3), (0.35, 0.7), (0.45, 1.0), (0.2, 1.6), (0.08, 2.6), (0.0, 3.0)], (0, 0, top - 0.3), GOLD, c, segs=16, name="mahkota")

# courtyard: a few banners on poles
for x in (-12.0, 12.0):
    cyl(0.08, 9.0, (x, SY - 9.0, 4.5), mat=M["post"], coll=c, verts=8, name="tiang_panji")
    kit.sheet(0.9, 3.0, (x + 0.45, SY - 9.0, 7.2), mat=M["gold_cloth"], coll=c, nx=2, ny=6, bulge=0.1, name="panji")

kit.ground(0.0, kit.fibre("halaman", (0.36, 0.28, 0.17), (0.60, 0.50, 0.34), scale=(3, 3, 3), bump=0.3))
kit.hills()
kit.environment(cam=(-34.0, -60.0, 6.0), target=(0.0, -3.0, 8.0), lens=42, sun_elev=16, sun_rot=-140, sky=0.08, sun=8.0, haze=0.002, exposure=0.3)
kit.place(c, (0, 0, 0))
kit.render_and_export("istana", [c])
