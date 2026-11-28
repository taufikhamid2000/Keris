"""Surau: neighbourhood prayer halls where boys learned to read the Quran. Three
variants built from one parametric surau.

Run headless:
  blender -b -P scripts/blender/surau.py -- <out_dir>

Writes <out_dir>/surau.png and one GLB per variant: surau_kecil (small, pyramid roof),
surau_serambi (two-tier roof, front verandah, beduk and kentung) and surau_sungai
(riverside, gable roof, tall stilts and a bathing platform with a ladder to the water).
Each sits at the origin with the door at -Y and the mihrab at +Y (turn +Y to the qibla).
Ground level is Z=0; the riverside one's stilts reach down to Z=-2.2 for the riverbed.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, beam, blob, box, cyl  # noqa: E402

kit.reset()
SIRAP = kit.wood("sirap", (0.025, 0.015, 0.01), (0.11, 0.06, 0.03), scale=14, rough=0.85)

#          name             W    D    floor roof       serambi river
VARIANTS = [
    ("surau_kecil",   5.6, 5.6, 1.2, "pyramid", False, False),
    ("surau_serambi", 7.6, 7.6, 1.4, "tumpang", True,  False),
    ("surau_sungai",  6.0, 7.2, 1.6, "gable",   False, True),
]
EAVE = 2.5          # wall height above the floor

# ---------------------------------------------------------------- parts


def walls(c, W, D, f):
    """Plank dado, then open bars (jeriji) for air and light, then a plank frieze.
    The front has a door in the middle; the back leaves a gap for the mihrab."""
    for side, (length, fixed, along_y) in enumerate(((W, -D / 2, False), (W, D / 2, False), (D, -W / 2, True), (D, W / 2, True))):
        gap = 1.0 if side == 0 else (1.4 if side == 1 else 0.0)

        def put(m, w, lo, hi, mat=M["plank"], d=0.1, name="dinding"):
            if w <= 0.01:
                return
            if along_y:
                box((d, w, hi - lo), (fixed, m, (lo + hi) / 2), mat=mat, coll=c, name=name)
            else:
                box((w, d, hi - lo), (m, fixed, (lo + hi) / 2), mat=mat, coll=c, name=name)

        half = (length - gap) / 2
        for s in (-1, 1):
            m = s * (gap / 2 + half / 2)
            put(m, half, f, f + 0.9)
            put(m, half, f + 2.2, f + EAVE)
            n = int(half / 0.28)
            for k in range(n):
                put(s * (gap / 2 + (k + 0.5) * half / n), 0.06, f + 0.9, f + 2.2, M["trim"], 0.06, "jeriji")
        if side == 0:
            put(0, gap, f + 2.2, f + EAVE)
            for s in (-1, 1):
                put(s * (gap / 2 + 0.05), 0.1, f, f + 2.2, M["post"], 0.14, "jenang")
    for x in (-W / 2, W / 2):
        for y in (-D / 2, D / 2):
            box((0.16, 0.16, EAVE), (x, y, f + EAVE / 2), mat=M["post"], coll=c, name="tiang")


def stilts(c, W, D, f, base, extra=()):
    nx, ny = max(2, round(W / 2.2)) + 1, max(2, round(D / 2.2)) + 1
    pts = [(-W / 2 + W * i / (nx - 1), -D / 2 + D * j / (ny - 1)) for i in range(nx) for j in range(ny)] + list(extra)
    for x, y in pts:
        if base >= 0:
            box((0.45, 0.45, 0.25), (x, y, 0.12), mat=M["weathered"], coll=c, name="batu_alas")
        cyl(0.11, f - base, (x, y, (f + base) / 2), mat=M["post"], coll=c, verts=7, name="tiang")


def roof(c, kind, W, D, f, r):
    ov = 0.8
    ze = f + EAVE + 0.1
    ax, ay = W / 2 + ov, D / 2 + ov
    if kind == "pyramid":
        tn = math.tan(math.radians(42))
        kit.hip(0, 0, ax, ay, 0.05, 0.05, ze, ze + ay * tn, kit.M["thatch"], c)
        lathe_top(c, ze + ay * tn)
    elif kind == "tumpang":
        t1, t2 = math.tan(math.radians(32)), math.tan(math.radians(48))
        b1 = W * 0.27
        z1 = ze + (ax - b1) * t1
        kit.hip(0, 0, ax, ay, b1, b1, ze, z1, SIRAP, c)
        a2 = b1 + 0.9
        ze2 = ze + (ax - a2) * t1 + 0.6
        for s in (-1, 1):  # clerestory between tiers
            box((2 * b1, 0.08, ze2 - z1 + 1.0), (0, s * b1, (z1 - 0.4 + ze2 + 0.6) / 2), mat=M["trim"], coll=c, name="kerawang")
            box((0.08, 2 * b1, ze2 - z1 + 1.0), (s * b1, 0, (z1 - 0.4 + ze2 + 0.6) / 2), mat=M["trim"], coll=c, name="kerawang")
        kit.hip(0, 0, a2, a2, 0.05, 0.05, ze2, ze2 + a2 * t2, SIRAP, c)
        lathe_top(c, ze2 + a2 * t2)
    else:  # gable, ridge along Y so the gable end faces the river side (+X is the long eave)
        tn = math.tan(math.radians(40))
        zr = ze + ax * tn
        pts = [(-ax, ze), (0, zr), (ax, ze), (ax, ze - 0.2), (0, zr - 0.26), (-ax, ze - 0.2)]
        ob = kit.prism([(y, z) for y, z in pts], D + 2 * ov, 0.0, kit.M["thatch"], c, name="atap")
        ob.rotation_euler = (0, 0, math.pi / 2)
        beam((0, -ay, zr), (0, ay, zr), 0.1, M["trim"], c, verts=6, name="perabung")
        for s in (-1, 1):
            p = kit.prism([(-W / 2, ze - 0.1), (0, zr - 0.3), (W / 2, ze - 0.1)], 0.1, 0.0, M["trim"], c, name="tebar_layar")
            p.rotation_euler = (0, 0, math.pi / 2)
            p.location = (0, s * (D / 2 + 0.05), 0)
            for sx in (-1, 1):
                beam((sx * ax, s * ay, ze), (0, s * ay, zr), 0.07, M["trim"], c, verts=6, name="papan_cantik")
                beam((sx * 0.5, s * ay, zr - 0.6), (-sx * 0.4, s * ay, zr + 0.6), 0.06, M["trim"], c, verts=6, name="silang_gunting")


def lathe_top(c, z):
    kit.lathe([(0.0, 0.0), (0.18, 0.0), (0.22, 0.15), (0.1, 0.35), (0.12, 0.5), (0.0, 0.8)], (0, 0, z - 0.1), M["clay"], c, segs=12, name="mustaka")


def mihrab(c, D, f):
    y = D / 2 + 0.45
    box((1.5, 0.9, 2.3), (0, y, f + 1.15), mat=M["plank"], coll=c, name="mihrab")
    box((1.6, 1.0, 0.1), (0, y, f), mat=M["floor"], coll=c, name="lantai_mihrab")
    kit.hip(0, y, 1.0, 0.75, 0.05, 0.05, f + 2.3, f + 3.1, kit.M["thatch"], c, name="atap_mihrab")
    for x in (-0.6, 0.6):
        cyl(0.07, f, (x, y + 0.3, f / 2), mat=M["post"], coll=c, verts=7, name="tiang")


def stairs(c, f, y0, x=0.0, w=1.1):
    n = max(3, round(f / 0.28))
    for k in range(n):
        z = f - (k + 1) * f / n
        box((w, 0.3, 0.05), (x, y0 - 0.3 * (k + 0.5), z + f / n - 0.03), mat=M["plank"], coll=c, name="anak_tangga")
    for s in (-1, 1):
        beam((x + s * w / 2, y0, f), (x + s * w / 2, y0 - 0.3 * n, 0), 0.05, M["post"], c, verts=6, name="ibu_tangga")
    # a water jar to wash the feet before going up, with a coconut-shell dipper
    kit.tempayan(x + w / 2 + 0.6, y0 - 0.3 * n + 0.3, 0.0, 0.7, M["glaze"], coll=c)
    blob((x + w / 2 + 0.6, y0 - 0.3 * n + 0.3, 0.66), (0.08, 0.08, 0.05), M["trunk"], c, wobble=0.05, subdiv=2, smooth=True, name="gayung")


def surau(name, W, D, f, roof_kind, serambi, river, seed):
    c = kit.new_group(name)
    r = random.Random(seed)
    base = -2.2 if river else 0.0
    extra = []
    front = -D / 2
    if serambi:
        SD = 2.6
        front = -D / 2 - SD
        extra = [(-W / 2 + W * i / 3, -D / 2 - SD) for i in range(4)]
    if river:
        extra = [(W / 2 + 2.6, y) for y in (-1.6, 1.6)]
    stilts(c, W, D, f, base, extra)
    box((W + 0.2, D + 0.2, 0.12), (0, 0, f - 0.06), mat=M["floor"], coll=c, name="lantai")
    walls(c, W, D, f)
    mihrab(c, D, f)
    roof(c, roof_kind, W, D, f, r)
    for k in range(int(D / 1.1)):
        box((W - 0.8, 0.8, 0.015), (0, -D / 2 + 0.7 + k * 1.1, f + 0.01), mat=M["rattan"], coll=c, name="tikar")
    if serambi:
        fs = f - 0.25
        box((W + 0.2, SD, 0.1), (0, -D / 2 - SD / 2, fs - 0.05), mat=M["floor"], coll=c, name="lantai_serambi")
        for x, y in extra:
            cyl(0.08, EAVE - 0.3, (x, y, fs + (EAVE - 0.3) / 2), mat=M["post"], coll=c, verts=7, name="tiang_serambi")
        run = SD + 0.9
        ang = math.atan2(0.6, run)
        box((W + 1.2, math.hypot(run, 0.6), 0.14), (0, -D / 2 - run / 2 + 0.1, f + EAVE - 0.35), rot=(ang, 0, 0), mat=SIRAP, coll=c, name="atap_serambi")
        for s in (-1, 1):
            box((W / 2 - 0.6, 0.05, 0.55), (s * (W / 4 + 0.3), front, fs + 0.32), mat=M["trim"], coll=c, name="kekisi")
        # kentung hanging at the corner, a small beduk on its stand
        beam((-W / 2, front, fs + EAVE - 0.4), (-W / 2, front, fs + 1.6), 0.01, M["rope"], c, verts=4, name="tali")
        cyl(0.12, 0.9, (-W / 2, front, fs + 1.15), mat=M["post"], coll=c, verts=9, name="kentung")
        cyl(0.36, 0.8, (W / 2 - 0.7, front + 0.7, fs + 0.55), rot=(0, math.pi / 2, 0), mat=M["trim"], coll=c, verts=16, name="beduk")
        for s in (-1, 1):
            cyl(0.34, 0.03, (W / 2 - 0.7 + s * 0.41, front + 0.7, fs + 0.55), rot=(0, math.pi / 2, 0), mat=M["sack"], coll=c, verts=16, name="kulit_beduk")
        stairs(c, fs, front - 0.05)
    else:
        stairs(c, f, front - 0.05)
    if river:
        # bathing and ablution platform (pelantar) off the +X side, ladder down to the water
        px = W / 2 + 1.35
        box((2.7, 3.6, 0.1), (px, 0, f - 0.65), mat=M["weathered"], coll=c, name="pelantar")
        for y in (-1.6, 1.6):
            beam((W / 2 + 2.6, y, f - 0.6), (W / 2 + 2.6, y, f + 0.3), 0.04, M["post"], c, verts=6, name="tiang_pagar")
        beam((W / 2 + 2.6, -1.6, f + 0.3), (W / 2 + 2.6, 1.6, f + 0.3), 0.04, M["post"], c, verts=6, name="susur")
        box((0.9, 0.3, 0.05), (W / 2 + 0.2, 0, f - 0.32), mat=M["plank"], coll=c, name="anak_tangga")
        lx = W / 2 + 2.75
        for s in (-0.4, 0.4):
            beam((lx, s, f - 0.6), (lx + 0.3, s, -0.9), 0.04, M["post"], c, verts=6, name="tangga_air")
        for k in range(6):
            z = f - 0.75 - k * 0.38
            t = (f - 0.6 - z) / (f + 0.3)
            beam((lx + 0.3 * t, -0.4, z), (lx + 0.3 * t, 0.4, z), 0.03, M["post"], c, verts=6, name="mata_tangga")
        kit.tempayan(px - 0.6, 1.1, f - 0.6, 0.6, M["clay"], coll=c)
    return c


groups = [surau(*v, seed=i * 7 + 1) for i, v in enumerate(VARIANTS)]

# a riverbank: land behind y = -7, the river in front
SPOTS = [((-11.0, 3.0), 10), ((1.5, 7.5), -5), ((12.5, -6.0), -90)]
for g, ((x, y), yaw) in zip(groups, SPOTS):
    kit.place(g, (x, y, 0), math.radians(yaw))

box((240, 120, 3.0), (0, 53.0, -1.5), mat=kit.fibre("tebing", (0.30, 0.24, 0.13), (0.52, 0.44, 0.26), scale=(3, 3, 3), bump=0.3), coll=kit.SCENERY, name="tebing")
box((400, 400, 0.02), (0, 0, -0.6), mat=M["water"], coll=kit.SCENERY, name="sungai")
box((400, 400, 0.2), (0, 0, -2.4), mat=M["sand"], coll=kit.SCENERY, name="dasar")
kit.hills()
kit.environment(cam=(-1.0, -33.0, 3.4), target=(2.5, 1.0, 2.6), lens=28, sun_elev=16, sun_rot=-140, sky=0.08, sun=8.0, haze=0.002, exposure=0.3)
kit.render_and_export("surau", groups)
