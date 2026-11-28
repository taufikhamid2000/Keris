"""Jambatan: the timber bridge over the Melaka river, the key point of the 1511 fighting.
Two variants built from one parametric bridge.

Run headless:
  blender -b -P scripts/blender/jambatan.py -- <out_dir>

Writes <out_dir>/jambatan.png and one GLB per variant:
  jambatan       peacetime: pile trestle, humped deck so sampan pass under, roofed rest pavilion at mid-span
  jambatan_1511  the same bridge made a fighting position: log stockades with firing steps across both
                 approaches, a plank breastwork with lela swivel guns at the crest, sharpened stakes in the shallows
The span runs along X (bank to bank), the river flows along Y. Bank ground is Z=0 at |X| >= 38 m;
the water is at Z=-1.2 and the piles reach the riverbed at Z=-3.6, matching the terrain's lower river.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402

kit.reset()
M = kit.M
L = 84.0          # deck length, bank to bank plus approaches
HW = 2.2          # half the deck width
RISE = 2.4        # hump at mid-span
BANK = 38.0       # river half-width
BED, WATER = -3.6, -1.2
OLD = kit.wood("kayu_tua", (0.035, 0.025, 0.018), (0.12, 0.085, 0.055), scale=5, rough=0.9)


def deck_z(x):
    return 0.5 + RISE * (1 - (2 * x / L) ** 2)


def ground_z(x):
    return 0.0 if abs(x) >= BANK else BED


def trestle(c, rnd):
    box_, beam = kit.box, kit.beam
    xs = [-L / 2 + 1.5 + 3 * i for i in range(int(L / 3))]
    for x in xs:
        top = deck_z(x) - 0.32
        g = ground_z(x)
        lean = rnd.uniform(-0.04, 0.04)
        ys = (-HW + 0.1, 0.0, HW - 0.1) if top - g > 3 else (-HW + 0.1, HW - 0.1)
        for y in ys:
            beam((x + lean, y, g - 0.4), (x, y, top), 0.2 + rnd.uniform(0, 0.04), OLD, c, name="cerucuk")
        box_((0.24, 2 * HW + 0.5, 0.22), (x, 0, top + 0.05), mat=OLD, coll=c, name="rasuk")
        if top - g > 2.5:  # cross bracing on the tall bents
            zb = max(g, WATER - 0.4)
            beam((x, -HW + 0.1, zb), (x, HW - 0.1, top - 0.3), 0.06, OLD, c, verts=6, name="silang")
            beam((x, HW - 0.1, zb), (x, -HW + 0.1, top - 0.3), 0.06, OLD, c, verts=6, name="silang")
    for a, b in zip(xs, xs[1:]):
        for y in (-1.6, -0.55, 0.55, 1.6):
            beam((a, y, deck_z(a) - 0.18), (b, y, deck_z(b) - 0.18), 0.1, M["post"], c, verts=6, name="gelegar")
    # deck planks laid across, following the hump
    x = -L / 2
    while x < L / 2:
        w = rnd.uniform(0.28, 0.4)
        xm = x + w / 2
        slope = -8 * RISE * xm / (L * L)
        kit.box((w - 0.03, 2 * HW + rnd.uniform(-0.1, 0.1), 0.07), (xm, rnd.uniform(-0.05, 0.05), deck_z(xm)),
                rot=(0, -math.atan(slope), rnd.uniform(-0.015, 0.015)), mat=rnd.choice((M["plank"], M["weathered"])), coll=c, name="papan")
        x += w
    # railings
    px = [-L / 2 + 0.2 + 2 * i for i in range(int(L / 2))]
    for y in (-HW - 0.05, HW + 0.05):
        for a in px:
            beam((a, y, deck_z(a)), (a, y, deck_z(a) + 1.05), 0.06, M["post"], c, verts=6, name="tiang_pagar")
        for a, b in zip(px, px[1:]):
            beam((a, y, deck_z(a) + 1.0), (b, y, deck_z(b) + 1.0), 0.05, M["trim"], c, verts=6, name="susur")
            beam((a, y, deck_z(a) + 0.5), (b, y, deck_z(b) + 0.5), 0.035, M["post"], c, verts=6, name="susur")


def pavilion(c):
    z0 = deck_z(0)
    for x in (-4.2, 0.0, 4.2):
        for y in (-HW - 0.1, HW + 0.1):
            kit.cyl(0.11, 2.6, (x, y, z0 + 1.3), mat=M["post"], coll=c, name="tiang")
    for y in (-HW - 0.1, HW + 0.1):
        kit.beam((-4.4, y, z0 + 2.6), (4.4, y, z0 + 2.6), 0.09, M["post"], c, verts=6, name="alang")
    ze = z0 + 2.55
    kit.hip(0, 0, 5.4, HW + 1.1, 4.2, 0.05, ze, ze + 2.3, mat=M["thatch"], coll=c, name="atap")
    for sx in (-1, 1):  # benches along the rails
        kit.box((7.6, 0.4, 0.06), (0, sx * (HW - 0.25), z0 + 0.45), mat=M["plank"], coll=c, name="bangku")


def stockade(c, side, rnd):
    """Log palisade across one approach with a gate gap and a firing step behind it."""
    x0 = side * (L / 2 + 5)
    for y in [i * 0.34 - 13 for i in range(int(26 / 0.34))]:
        if abs(y) < 1.8:
            continue
        h = rnd.uniform(3.4, 4.1)
        lean = side * rnd.uniform(0, 0.08)
        kit.cyl(0.16, h, (x0 + lean, y, h / 2 - 0.4), mat=OLD, coll=c, verts=7, name="kayu_kubu")
        kit.cyl(0.16, 0.35, (x0 + lean, y, h - 0.25), mat=OLD, coll=c, verts=7, r2=0.01, name="hujung")
    for z in (1.0, 2.6):
        kit.box((0.12, 26, 0.16), (x0 + side * 0.25, 0, z), mat=M["post"], coll=c, name="pengikat")
    for sy in (-1, 1):  # firing step on the bridge side, facing the landing beaches
        kit.box((1.4, 10.5, 0.1), (x0 - side * 1.0, sy * 7.5, 1.5), mat=M["plank"], coll=c, name="pelantar")
        for y in (sy * 3.0, sy * 7.5, sy * 12.0):
            kit.cyl(0.08, 1.5, (x0 - side * 1.0, y, 0.75), mat=M["post"], coll=c, name="tiang")
    # gate leaves standing open
    for sy in (-1, 1):
        kit.box((0.14, 1.8, 3.2), (x0 - side * 0.7, sy * 2.6, 1.5), rot=(0, 0, sy * side * 0.9), mat=OLD, coll=c, name="pintu")


def lela(c, x, y, z, yaw):
    """A small bronze swivel gun on a forked post."""
    kit.cyl(0.07, 1.0, (x, y, z - 0.5), mat=M["post"], coll=c, name="tiang_lela")
    kit.box((0.06, 0.24, 0.18), (x, y, z + 0.05), mat=M["iron"], coll=c, name="cabang")
    rot = (0, math.radians(92), yaw)
    kit.cyl(0.075, 1.35, (x, y, z + 0.16), rot=rot, mat=M["brass"], coll=c, r2=0.055, verts=12, name="lela")
    kit.cyl(0.095, 0.12, (x - 0.62 * math.cos(yaw), y - 0.62 * math.sin(yaw), z + 0.16), rot=rot, mat=M["brass"], coll=c, verts=12, name="lela_pangkal")


def war_dress(c, rnd):
    z0 = deck_z(0)
    for sx in (-1, 1):  # plank breastworks across the deck either side of the crest, a gap to pass
        x = sx * 6.5
        for y in (-1.25, 1.25):
            kit.box((0.12, 1.7, 1.3), (x, y, deck_z(x) + 0.65), mat=OLD, coll=c, name="benteng")
        lela(c, x - sx * 0.6, -1.25, deck_z(x) + 1.2, 0 if sx < 0 else math.pi)
        lela(c, x - sx * 0.6, 1.25, deck_z(x) + 1.2, 0 if sx < 0 else math.pi)
    for side in (-1, 1):
        stockade(c, side, rnd)
        # sharpened stakes in the shallows, pointing downstream and up at landing boats
        for _ in range(26):
            x = side * rnd.uniform(BANK - 9, BANK - 1)
            y = rnd.uniform(-22, 22)
            if abs(y) < 3.5:
                continue
            kit.beam((x, y, BED + 0.2), (x - side * rnd.uniform(0.3, 0.9), y + rnd.uniform(-0.6, 0.6), WATER + rnd.uniform(0.5, 1.2)),
                     0.07, OLD, c, verts=6, name="ranjau")
    # powder keg and shot by the western gun
    kit.cyl(0.25, 0.5, (-7.6, 0.4, deck_z(-7.6) + 0.27), mat=M["plank"], coll=c, name="tong")
    for i in range(5):
        kit.blob((-7.3 + 0.12 * i, -0.4, deck_z(-7.3) + 0.06), (0.05, 0.05, 0.05), M["iron"], c, wobble=0.02, subdiv=1, name="peluru")
    _ = z0


def bridge(name, war, seed):
    c = kit.new_group(name)
    rnd = random.Random(seed)
    trestle(c, rnd)
    pavilion(c)
    if war:
        war_dress(c, rnd)
    else:  # a few baskets and a seller's mat in the pavilion
        z0 = deck_z(0)
        kit.box((1.6, 1.0, 0.02), (-1.5, 1.2, z0 + 0.05), mat=M["rattan"], coll=c, name="tikar")
        for i, x in enumerate((-2.0, -1.3, -0.6)):
            kit.cyl(0.25, 0.32, (x, 1.25, z0 + 0.2), mat=M["rattan"], coll=c, r2=0.32, name="bakul")
        kit.tempayan(1.6, -1.4, z0 + 0.03, k=0.8, coll=c)
    return c


groups = [bridge("jambatan_1511", True, 3), bridge("jambatan", False, 7)]
kit.place(groups[0], (0, 0, 0))
kit.place(groups[1], (0, 70, 0))

# river channel running along Y, banks either side
bank = kit.fibre("tebing", (0.30, 0.24, 0.13), (0.52, 0.44, 0.26), scale=(3, 3, 3), bump=0.3)
for sx in (-1, 1):
    kit.box((200, 400, 4.0), (sx * (BANK + 100), 30, -2.0), mat=bank, coll=kit.SCENERY, name="tebing")
kit.box((400, 400, 0.02), (0, 30, WATER), mat=M["water"], coll=kit.SCENERY, name="sungai")
kit.box((400, 400, 0.2), (0, 30, BED - 0.1), mat=M["sand"], coll=kit.SCENERY, name="dasar")
kit.environment(cam=(-62, -30, 13), target=(-12, 6, 1), lens=28, sun_elev=22, sun_rot=-120, sky=0.08, sun=8.0, haze=0.002, exposure=0.1)
kit.render_and_export("jambatan", groups)
