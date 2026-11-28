"""Melaka market stalls in five variants, built from one parametric stall.

Run headless:
  blender -b -P scripts/blender/market.py -- <out_dir>

Writes <out_dir>/market.png (all variants in one street shot) and one GLB per stall:
stall_fruit, stall_cloth, stall_pottery, stall_spice, stall_coconut. Each stall sits
at the origin with its customer side facing -Y.

To add a variant, add a line to VARIANTS. Colour, rotation and small scale changes are
done in the game, so variants here differ in shape: roof, counter and goods.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, beam, blob, box, cyl, lathe  # noqa: E402

kit.reset()
STRIPES = {"red": (M["red"], M["porcelain"]), "indigo": (M["indigo"], M["gold_cloth"]), "gold": (M["gold_cloth"], M["red"])}

#           name        roof      width depth counter  goods      awning colours
VARIANTS = [
    ("fruit",    "gable",   3.0, 2.0, "table", "fruit", None),
    ("cloth",    "awning",  3.2, 2.0, "table", "cloth", "indigo"),
    ("pottery",  "leanto",  3.4, 2.2, "mat",   "pottery", None),
    ("spice",    "awning",  2.6, 1.8, "table", "spice", "red"),
    ("coconut",  "leanto",  2.4, 1.8, "mat",   "coconut", None),
]

# ---------------------------------------------------------------- parts


def frame(c, r, W, D, eave):
    for x in (-W / 2, W / 2):
        for y in (-D / 2, D / 2):
            h = eave + (0.5 if y > 0 else 0) + r.uniform(-0.05, 0.05)
            cyl(0.07, h, (x + r.uniform(-0.03, 0.03), y, h / 2), rot=(r.uniform(-0.03, 0.03), r.uniform(-0.03, 0.03), 0), mat=M["post"], coll=c, verts=7, name="tiang")
    box((W + 0.2, 0.09, 0.09), (0, -D / 2, eave), mat=M["post"], coll=c, name="alang")
    box((W + 0.2, 0.09, 0.09), (0, D / 2, eave + 0.5), mat=M["post"], coll=c, name="alang")


def roof_gable(c, W, D, eave):
    ridge = eave + 1.2
    half = D / 2 + 0.45
    ang = math.atan2(ridge - eave - 0.25, half)
    s = math.hypot(half, ridge - eave) + 0.1
    for side in (-1, 1):
        box((W + 0.7, s, 0.18), (0, side * (s / 2) * math.cos(ang), ridge - (s / 2) * math.sin(ang) + 0.1), rot=(side * -ang, 0, 0), mat=M["thatch"], coll=c, name="atap")
    box((W + 0.8, 0.26, 0.16), (0, 0, ridge + 0.16), mat=M["thatch"], coll=c, name="perabung")
    for x in (-W / 2, W / 2):
        beam((x, 0, eave + 0.25), (x, 0, ridge), 0.06, M["post"], c, name="tunjuk")


def roof_leanto(c, W, D, eave):
    lo, hi = eave - 0.1, eave + 0.75
    run = D + 1.0
    ang = math.atan2(hi - lo, run)
    box((W + 0.6, math.hypot(run, hi - lo), 0.18), (0, 0.0, (lo + hi) / 2 + 0.12), rot=(ang, 0, 0), mat=M["thatch"], coll=c, name="atap")


def roof_awning(c, W, D, eave, colours):
    n = 6
    sw = (W + 0.5) / n
    run = D + 0.8
    tilt = math.atan2(0.5, D)
    for i in range(n):
        x = -(W + 0.5) / 2 + sw * (i + 0.5)
        kit.sheet(sw + 0.01, run, (x, 0, eave + 0.3), rot=(math.pi / 2 - tilt, 0, 0), mat=colours[i % 2], coll=c, bulge=-0.12, nx=4, ny=6, name="kain_bumbung")
    # a scalloped valance along the front edge
    for i in range(n):
        x = -(W + 0.5) / 2 + sw * (i + 0.5)
        kit.sheet(sw, 0.28, (x, -run / 2 * math.cos(tilt) - 0.02, eave - 0.02), mat=colours[(i + 1) % 2], coll=c, sag=0.07, nx=4, ny=2, name="kain_tepi")


def counter(c, kind, W, D):
    """Returns the height goods sit at and the area (x half-width, y range) to fill."""
    if kind == "table":
        top = 0.8
        box((W - 0.3, D * 0.55, 0.06), (0, -D * 0.12, top - 0.03), mat=M["plank"], coll=c, name="meja")
        for x in (-W / 2 + 0.25, W / 2 - 0.25):
            for y in (-D * 0.36, D * 0.12):
                box((0.07, 0.07, top - 0.06), (x, y, (top - 0.06) / 2), mat=M["post"], coll=c, name="kaki")
        box((W - 0.4, 0.04, 0.35), (0, -D * 0.39, top - 0.25), mat=M["trim"], coll=c, name="papan_depan")
        return top, (W / 2 - 0.35, -D * 0.36, D * 0.1)
    box((W - 0.2, D * 0.8, 0.02), (0, 0, 0.01), mat=M["rattan"], coll=c, name="tikar")
    return 0.02, (W / 2 - 0.3, -D * 0.35, D * 0.3)


def basket(c, x, y, z, rad, mat=None):
    lathe([(0.0, 0.0), (rad * 0.7, 0.0), (rad, rad * 0.45), (rad * 1.02, rad * 0.5), (0.0, rad * 0.5)], (x, y, z), mat or M["rattan"], c, segs=14, name="bakul")
    return z + rad * 0.5


def goods(c, r, kind, top, area):
    hx, y0, y1 = area
    if kind == "fruit":
        mats = (M["fruit_red"], M["fruit_yel"], M["fruit_grn"])
        for i, x in enumerate((-hx + 0.3, -0.2, hx - 0.5)):
            z = basket(c, x, y0 + 0.35, top, 0.32)
            m = mats[i % 3]
            for k in range(9):
                a, d = r.uniform(0, 6.28), r.uniform(0, 0.22)
                blob((x + math.cos(a) * d, y0 + 0.35 + math.sin(a) * d, z + 0.04 + (0.22 - d) * 0.4), (0.07, 0.07, 0.07), m, c, wobble=0.05, subdiv=2, smooth=True, name="buah")
        # banana bunches hanging from the front beam
        for x in (-0.9, 0.4, 1.1):
            for k in range(7):
                blob((x + r.uniform(-0.1, 0.1), -0.95 + r.uniform(-0.05, 0.05), 1.75 - k * 0.04 + r.uniform(-0.05, 0.05)), (0.035, 0.035, 0.11), M["fruit_yel"], c, wobble=0.05, subdiv=1, smooth=True, rot=(r.uniform(-0.4, 0.4), r.uniform(-0.4, 0.4), 0), name="pisang")
            beam((x, -0.95, 1.95), (x, -0.95, 2.2), 0.008, M["rope"], c, verts=4, name="tali")
        for k in range(3):
            kit.sack(hx - 0.1 - k * 0.5, y1 + 0.3, 0.0, 0.8, seed=k, coll=c)
    elif kind == "cloth":
        mats = (M["red"], M["indigo"], M["gold_cloth"], M["porcelain"])
        for row in range(2):
            for i in range(6):
                x = -hx + 0.25 + i * (2 * hx - 0.5) / 5
                cyl(0.09, 0.45, (x, y0 + 0.3 + row * 0.25, top + 0.09 + row * 0.12), rot=(math.pi / 2, 0, 0), mat=mats[(i + row) % 4], coll=c, verts=10, name="gulungan_kain")
        for i, x in enumerate((-1.0, -0.2, 0.7)):
            kit.sheet(0.55, 0.9, (x, -1.0, 1.55), mat=mats[i], coll=c, bulge=0.04, nx=3, ny=4, name="kain_gantung")
    elif kind == "pottery":
        for i in range(5):
            x = -hx + 0.3 + i * (2 * hx - 0.6) / 4
            kit.tempayan(x, y0 + 0.25 + (i % 2) * 0.35, top, r.uniform(0.55, 0.9), M["glaze"] if i % 2 else M["clay"], coll=c)
        for i in range(4):
            x = -hx + 0.4 + i * 0.5
            lathe([(0.0, 0.0), (0.1, 0.0), (0.16, 0.08), (0.15, 0.17), (0.1, 0.22), (0.11, 0.25), (0.0, 0.25)], (x, y1, top), M["clay"], c, segs=12, name="periuk")
        for k in range(5):
            lathe([(0.0, 0.0), (0.06, 0.0), (0.13, 0.05), (0.15, 0.07), (0.0, 0.07)], (hx - 0.3, y1 - 0.1, top + k * 0.045), M["porcelain"] if k % 2 else M["blue"], c, segs=14, name="mangkuk")
    elif kind == "spice":
        heaps = (M["fruit_red"], M["fruit_yel"], M["clay"], M["trunk"], M["leaf"])
        for i in range(5):
            x = -hx + 0.25 + i * (2 * hx - 0.5) / 4
            y = y0 + 0.3 + (i % 2) * 0.3
            z = basket(c, x, y, top, 0.22)
            lathe([(0.0, 0.0), (0.2, 0.0), (0.0, 0.16)], (x, y, z - 0.03), heaps[i], c, segs=12, smooth=False, name="rempah")
        for k in range(2):
            kit.sack(-hx + 0.2 + k * 0.55, y1 + 0.35, 0.0, 0.85, seed=k + 3, coll=c)
        cyl(0.012, 0.6, (0.0, y1, top + 0.3), mat=M["brass"], coll=c, verts=6, name="dacing")
        beam((-0.25, y1, top + 0.55), (0.25, y1, top + 0.55), 0.01, M["brass"], c, verts=6, name="dacing")
    elif kind == "coconut":
        for k in range(18):
            a, d = r.uniform(0, 6.28), r.uniform(0, 0.5)
            blob((math.cos(a) * d * 1.6 - 0.2, y0 + 0.5 + math.sin(a) * d * 0.6, 0.12 + (0.5 - d) * 0.35), (0.13, 0.13, 0.14), M["trunk"], c, wobble=0.1, seed=k, subdiv=2, smooth=True, name="kelapa")
        for k in range(5):
            blob((hx - 0.2 - k * 0.22, y0 + 0.2, 0.13), (0.12, 0.12, 0.13), M["fruit_grn"], c, wobble=0.1, seed=k + 9, subdiv=2, smooth=True, name="kelapa_muda")
        box((0.5, 0.3, 0.3), (-hx + 0.3, y1, 0.15), mat=M["post"], coll=c, name="bangku")
        beam((-hx + 0.3, y1, 0.32), (-hx + 0.55, y1 - 0.25, 0.45), 0.015, M["iron"], c, verts=6, name="parang")


def stall(name, roof, W, D, kind, goods_kind, awning, seed):
    c = kit.new_group("stall_" + name)
    r = random.Random(seed)
    eave = 2.1
    frame(c, r, W, D, eave)
    if roof == "gable":
        roof_gable(c, W, D, eave + 0.25)
    elif roof == "leanto":
        roof_leanto(c, W, D, eave)
    else:
        roof_awning(c, W, D, eave, STRIPES[awning])
    top, area = counter(c, kind, W, D)
    goods(c, r, goods_kind, top, area)
    return c


groups = []
for i, v in enumerate(VARIANTS):
    c = stall(*v, seed=i * 11 + 1)
    groups.append(c)

# a street: stalls in a gentle curve facing the camera side
for i, c in enumerate(groups):
    x = -9.0 + i * 4.6
    kit.place(c, (x, 0.4 * (i - 2) ** 2, 0), math.radians(-6 + i * 3))

kit.ground(0.0, kit.fibre("tanah", (0.30, 0.22, 0.13), (0.52, 0.42, 0.28), scale=(3, 3, 3), bump=0.3))
kit.hills()
kit.environment(cam=(-12.5, -7.5, 2.3), target=(-1.0, 0.8, 1.1), lens=28, sun_elev=14, sun_rot=-140, sky=0.08, sun=8.0, haze=0.002, exposure=0.3)
kit.render_and_export("market", groups)
