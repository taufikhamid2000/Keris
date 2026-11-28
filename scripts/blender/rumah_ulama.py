"""Rumah ulama: a religious scholar's house where advanced students came to read kitab.
The sultan himself went to such a house to study (Sejarah Melayu).

Run headless:
  blender -b -P scripts/blender/rumah_ulama.py -- <out_dir>

Writes <out_dir>/rumah_ulama.png and rumah_ulama.glb (at the origin, front facing -Y).
Compound: the main house (rumah ibu) with a front verandah and a kitchen wing joined by
a covered bridge (selang); a teaching pavilion (balai pengajian) linked by a covered
walkway, set out with book rests, writing boards and the teacher's seat; a well, fruit
trees and a bamboo fence.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, beam, blob, box, cyl, lathe  # noqa: E402

kit.reset()
c = kit.new_group("rumah_ulama")
r = random.Random(5)
BAMBOO = kit.flat("buluh", (0.45, 0.40, 0.18), 0.6)
ATAP = kit.fibre("atap_nipah", (0.10, 0.07, 0.035), (0.36, 0.27, 0.14), bump=0.5)

# ---------------------------------------------------------------- parts


def gable(cx, cy, length, hw, ze, pitch=40, ov=0.8, mat=None, horns=True):
    """Gable roof with the ridge along X, carved gable panels and crossed horns."""
    tn = math.tan(math.radians(pitch))
    a = hw + ov
    zr = ze + a * tn
    pts = [(-a, ze), (0, zr), (a, ze), (a, ze - 0.2), (0, zr - 0.26), (-a, ze - 0.2)]
    kit.prism([(cy + y, z) for y, z in pts], length, cx, mat or ATAP, c, name="atap")
    beam((cx - length / 2, cy, zr), (cx + length / 2, cy, zr), 0.09, M["trim"], c, verts=6, name="perabung")
    for s in (-1, 1):
        xe = cx + s * (length / 2 - 0.4)
        kit.prism([(cy - hw, ze - 0.15), (cy, zr - 0.3), (cy + hw, ze - 0.15)], 0.08, xe, M["trim"], c, name="tebar_layar")
        xg = cx + s * length / 2
        for sy in (-1, 1):
            beam((xg, cy + sy * a, ze), (xg, cy, zr), 0.07, M["trim"], c, verts=6, name="papan_cantik")
            if horns:
                beam((xg, cy + sy * 0.5, zr - 0.5 * tn), (xg, cy - sy * 0.4, zr + 0.55), 0.06, M["trim"], c, verts=6, name="silang_gunting")
    return zr


def stilts(x0, x1, y0, y1, top, step=2.0):
    nx, ny = max(1, round((x1 - x0) / step)), max(1, round((y1 - y0) / step))
    for i in range(nx + 1):
        for j in range(ny + 1):
            x, y = x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny
            box((0.4, 0.4, 0.22), (x, y, 0.11), mat=M["weathered"], coll=c, name="batu_alas")
            cyl(0.11, top, (x, y, top / 2), mat=M["post"], coll=c, verts=7, name="tiang")


def walls(x0, x1, y0, y1, f, h, door_side=None, windows=2):
    """Plank walls on a rectangle with shuttered windows (shutters swung open) per side."""
    sides = (("S", x0, x1, y0, False, -1), ("N", x0, x1, y1, False, 1), ("W", y0, y1, x0, True, -1), ("E", y0, y1, x1, True, 1))
    for name, a0, a1, fixed, along_y, out in sides:
        L = a1 - a0
        opens = [a0 + L * (k + 1) / (windows + 1) for k in range(windows)]
        door = (a0 + a1) / 2 if name == door_side else None
        if door is not None:
            opens = [p for p in opens if abs(p - door) > 1.2]
        cuts = sorted([(p, 0.9, 0.8, 1.9) for p in opens] + ([(door, 1.0, 0.0, 2.1)] if door is not None else []))

        def put(m, w, lo, hi, mat=M["plank"], d=0.1, off=0.0, rot=0.0, nm="dinding"):
            if w <= 0.01 or hi <= lo:
                return
            if along_y:
                box((d, w, hi - lo), (fixed + off, m, (lo + hi) / 2), rot=(0, 0, rot), mat=mat, coll=c, name=nm)
            else:
                box((w, d, hi - lo), (m, fixed + off, (lo + hi) / 2), rot=(0, 0, rot), mat=mat, coll=c, name=nm)

        edge = a0
        for p, w, lo, hi in cuts:
            put((edge + p - w / 2) / 2, p - w / 2 - edge, f, f + h)
            put(p, w, f, f + lo)
            put(p, w, f + hi, f + h)
            if lo > 0:  # open shutters (daun tingkap) hinged at the sides
                for s in (-1, 1):
                    put(p + s * (w / 2 + 0.2), 0.42, f + lo, f + hi, M["trim"], 0.04, out * 0.25, s * out * 0.9, "daun_tingkap")
                put(p, w + 0.2, f + hi, f + hi + 0.25, M["trim"], 0.06, out * 0.05, 0, "kerawang")
            edge = p + w / 2
        put((edge + a1) / 2, a1 - edge, f, f + h)
    for x in (x0, x1):
        for y in (y0, y1):
            box((0.16, 0.16, h), (x, y, f + h / 2), mat=M["post"], coll=c, name="tiang_seri")


def stair(x, y0, f, w=1.0, toward=-1):
    n = max(3, round(f / 0.28))
    for k in range(n):
        z = f * (n - k - 1) / n
        box((w, 0.3, 0.05), (x, y0 + toward * 0.3 * (k + 0.5), z + f / n - 0.03), mat=M["plank"], coll=c, name="anak_tangga")
    for s in (-1, 1):
        beam((x + s * w / 2, y0, f), (x + s * w / 2, y0 + toward * 0.3 * n, 0), 0.05, M["post"], c, verts=6, name="ibu_tangga")
    return y0 + toward * 0.3 * n


def rehal(x, y, z, yaw):
    """The X-shaped folding book rest, with an open kitab on it."""
    for s in (-1, 1):
        box((0.3, 0.02, 0.32), (x, y, z + 0.13), rot=(s * 0.6, 0, yaw), mat=M["trim"], coll=c, name="rehal")
    box((0.32, 0.24, 0.03), (x, y, z + 0.27), rot=(0.3, 0, yaw), mat=M["porcelain"], coll=c, name="kitab")


# ---------------------------------------------------------------- rumah ibu, serambi, dapur

F = 1.8
HX, HY0, HY1 = 4.2, -3.0, 3.0               # rumah ibu x -4.2..4.2
stilts(-HX, HX, HY0, HY1, F)
box((2 * HX + 0.2, HY1 - HY0 + 0.2, 0.12), (0, 0, F - 0.06), mat=M["floor"], coll=c, name="lantai")
walls(-HX, HX, HY0, HY1, F, 2.4, door_side="S", windows=3)
gable(0, 0, 2 * HX + 1.6, (HY1 - HY0) / 2, F + 2.5, 42, mat=ATAP)

FS = F - 0.35                                 # serambi, a step down, open with a railing
SY0 = HY0 - 2.6
stilts(-HX, HX, SY0, HY0, FS)
box((2 * HX + 0.2, 2.6, 0.1), (0, (SY0 + HY0) / 2, FS - 0.05), mat=M["floor"], coll=c, name="lantai_serambi")
for x in (-HX, -HX / 2, HX / 2, HX):
    box((0.12, 0.12, 2.3), (x, SY0, FS + 1.15), mat=M["post"], coll=c, name="tiang_serambi")
for x0, x1 in ((-HX, -0.6), (0.6, HX)):
    box((x1 - x0, 0.05, 0.6), ((x0 + x1) / 2, SY0, FS + 0.35), mat=M["trim"], coll=c, name="kekisi")
run = HY0 - SY0 + 0.8
ang = math.atan2(0.7, run)
box((2 * HX + 1.2, math.hypot(run, 0.7), 0.14), (0, (SY0 - 0.8 + HY0) / 2, FS + 2.45), rot=(ang, 0, 0), mat=ATAP, coll=c, name="atap_serambi")
yb = stair(0, SY0 - 0.05, FS)
kit.tempayan(0.9, yb + 0.3, 0.0, 0.7, M["glaze"], coll=c)

# kitchen wing behind, joined by a roofed bridge (selang)
KY0, KY1 = HY1 + 1.6, HY1 + 5.6
stilts(-2.8, 2.0, KY0, KY1, F - 0.2)
box((5.0, KY1 - KY0 + 0.2, 0.1), (-0.4, (KY0 + KY1) / 2, F - 0.25), mat=M["floor"], coll=c, name="lantai_dapur")
walls(-2.8, 2.0, KY0, KY1, F - 0.2, 2.1, windows=1)
gable(-0.4, (KY0 + KY1) / 2, 6.2, (KY1 - KY0) / 2, F + 2.0, 38, horns=False)
box((1.4, KY0 - HY1, 0.1), (-1.6, (HY1 + KY0) / 2, F - 0.15), mat=M["floor"], coll=c, name="selang")
box((2.0, KY0 - HY1 + 0.6, 0.12), (-1.6, (HY1 + KY0) / 2, F + 2.3), mat=ATAP, coll=c, name="atap_selang")
for s in (-1, 1):
    for y in (HY1 + 0.2, KY0 - 0.2):
        cyl(0.06, 2.4, (-1.6 + s * 0.7, y, F + 1.1), mat=M["post"], coll=c, verts=6, name="tiang_selang")
for k in range(3):  # firewood stack under the kitchen
    cyl(0.07, 1.4, (0.6, KY1 - 0.6 - k * 0.12, 0.08 + (k % 2) * 0.12), rot=(0, math.pi / 2, 0), mat=M["trunk"], coll=c, verts=6, name="kayu_api")

# ---------------------------------------------------------------- balai pengajian (teaching pavilion)

BX, BY = 10.0, -1.0
BW, BD, FB = 3.2, 2.8, 1.0                    # half width, half depth, floor
stilts(BX - BW, BX + BW, BY - BD, BY + BD, FB, step=2.1)
box((2 * BW + 0.2, 2 * BD + 0.2, 0.1), (BX, BY, FB - 0.05), mat=M["floor"], coll=c, name="lantai_balai")
for sx in (-1, 1):
    for sy in (-1, 1):
        box((0.14, 0.14, 2.4), (BX + sx * BW, BY + sy * BD, FB + 1.2), mat=M["post"], coll=c, name="tiang_balai")
for (ax, ay), (bx, by) in (((-1, -1), (-0.3, -1)), ((0.3, -1), (1, -1)), ((-1, 1), (1, 1)), ((1, -1), (1, 1))):
    p, q = (BX + ax * BW, BY + ay * BD), (BX + bx * BW, BY + by * BD)
    ln, yaw = math.hypot(q[0] - p[0], q[1] - p[1]), math.atan2(q[1] - p[1], q[0] - p[0])
    box((ln, 0.05, 0.55), ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, FB + 0.32), rot=(0, 0, yaw), mat=M["trim"], coll=c, name="kekisi")
tn = math.tan(math.radians(38))
kit.hip(BX, BY, BW + 0.9, BD + 0.9, 1.0, 0.05, FB + 2.4, FB + 2.4 + (BD + 0.9) * tn, ATAP, c)
stair(BX, BY - BD - 0.05, FB, w=1.0)
box((2 * BW - 0.4, 2 * BD - 0.4, 0.015), (BX, BY, FB + 0.01), mat=M["rattan"], coll=c, name="tikar")
# teacher's seat at the back: a low dais with a cushion, a lamp and a book chest
box((1.6, 1.0, 0.2), (BX, BY + BD - 0.7, FB + 0.1), mat=M["trim"], coll=c, name="tempat_guru")
box((0.8, 0.6, 0.12), (BX, BY + BD - 0.7, FB + 0.26), mat=M["red"], coll=c, name="kusyen")
rehal(BX, BY + BD - 1.35, FB + 0.2, math.pi)
box((0.7, 0.45, 0.45), (BX + 1.4, BY + BD - 0.5, FB + 0.22), mat=M["post"], coll=c, name="peti_kitab")
for k in range(4):
    box((0.28, 0.2, 0.05), (BX + 1.4, BY + BD - 0.5, FB + 0.47 + k * 0.05), mat=(M["porcelain"], M["gold_cloth"], M["red"])[k % 3], coll=c, name="kitab")
lathe([(0.0, 0.0), (0.08, 0.0), (0.04, 0.5), (0.12, 0.55), (0.0, 0.6)], (BX - 1.0, BY + BD - 0.6, FB), M["brass"], c, segs=10, name="pelita")
kit.lamp((BX - 1.0, BY + BD - 0.6, FB + 0.66), c, energy=20.0)
# students' places: book rests in two rows facing the teacher, writing boards (papan luh)
for row, y in enumerate((BY - 0.2, BY - 1.4)):
    for k in range(4):
        x = BX - 2.0 + k * 1.33
        rehal(x, y, FB, 0.0)
        box((0.6, 0.5, 0.01), (x, y - 0.35, FB + 0.02), mat=M["sack"], coll=c, name="alas_duduk")
for k in range(5):
    box((0.28, 0.03, 0.55), (BX - BW + 0.25 + k * 0.32, BY + BD - 0.12, FB + 0.38), rot=(0.25, 0, 0), mat=M["trim"], coll=c, name="papan_luh")

# covered walkway (selang) from the serambi to the balai
box((BX - BW - HX, 1.4, 0.08), ((HX + BX - BW) / 2, -1.6, FB + 0.2), mat=M["floor"], coll=c, name="titian")
for x in (HX + 0.6, (HX + BX - BW) / 2, BX - BW - 0.3):
    for y in (-2.3, -0.9):
        cyl(0.05, FB + 2.3, (x, y, (FB + 2.3) / 2), mat=M["post"], coll=c, verts=6, name="tiang_titian")
box((BX - BW - HX + 0.4, 2.0, 0.1), ((HX + BX - BW) / 2, -1.6, FB + 2.35), mat=ATAP, coll=c, name="atap_titian")

# ---------------------------------------------------------------- yard

WX, WY = -7.0, -4.0                           # well
lathe([(0.0, 0.0), (0.8, 0.0), (0.8, 0.7), (0.62, 0.7), (0.62, 0.2), (0.0, 0.2)], (WX, WY, 0.0), M["weathered"], c, segs=18, smooth=False, name="perigi")
cyl(0.6, 0.04, (WX, WY, 0.5), mat=M["water"], coll=c, verts=18, name="air")
beam((WX - 0.9, WY, 0.0), (WX - 0.9, WY, 2.4), 0.06, M["post"], c, name="tiang_timba")
beam((WX - 0.9, WY, 2.4), (WX + 0.5, WY, 1.4), 0.03, M["post"], c, name="galah")
beam((WX + 0.5, WY, 1.4), (WX + 0.5, WY, 0.9), 0.01, M["rope"], c, verts=4, name="tali")
for k, (x, y) in enumerate(((-9.5, 3.0), (6.0, 6.5), (15.5, 4.0))):
    beam((x, y, 0), (x + 0.2, y, 2.6), 0.15, M["trunk"], c, name="pokok")
    blob((x + 0.2, y, 3.6), (1.8, 1.8, 1.5), M["leaf"], c, wobble=0.35, seed=k, subdiv=2, smooth=True, name="rimbun")
    for f in range(6):
        a = f * 1.05
        blob((x + 0.2 + math.cos(a) * 1.3, y + math.sin(a) * 1.3, 3.0 + r.uniform(-0.3, 0.3)), (0.09, 0.09, 0.11), M["fruit_yel"] if k == 1 else M["fruit_red"], c, wobble=0.05, subdiv=1, smooth=True, name="buah")
# bamboo fence along the front with a gap for the path
for x0, x1 in ((-11.0, -1.0), (1.0, 17.0)):
    n = int((x1 - x0) / 0.5)
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        cyl(0.05, 1.3 + r.uniform(-0.1, 0.1), (x, -9.0, 0.65), mat=BAMBOO, coll=c, verts=6, name="pagar_buluh")
    for z in (0.5, 1.1):
        beam((x0, -9.05, z), (x1, -9.05, z), 0.03, BAMBOO, c, verts=6, name="palang")
for x in (-1.0, 1.0):
    cyl(0.08, 1.8, (x, -9.0, 0.9), mat=M["post"], coll=c, verts=8, name="tiang_pintu")

# ---------------------------------------------------------------- render
kit.place(c, (0, 0, 0))
kit.ground(0.0, kit.fibre("halaman", (0.30, 0.25, 0.14), (0.52, 0.46, 0.28), scale=(3, 3, 3), bump=0.3))
kit.hills()
kit.environment(cam=(17.0, -19.0, 7.5), target=(4.0, 0.0, 1.4), lens=30, sun_elev=16, sun_rot=-140, sky=0.08, sun=8.0, haze=0.002, exposure=0.3)
kit.render_and_export("rumah_ulama", [c])
