"""Rumah kampung: ordinary Malay houses to fill the town and villages. Four variants, kept light
(a few hundred parts each) so they can be scattered by the hundred.

Run headless:
  blender -b -P scripts/blender/kampung.py -- <out_dir>

Writes <out_dir>/kampung.png and one GLB per variant:
  rumah_bujang   one-room house on stilts, nipah gable roof with crossed horns, front stair
  rumah_serambi  main house with a lower open serambi in front and a kitchen (dapur) behind,
                 joined by a covered bridge (selang)
  rumah_nelayan  fisherman's house on tall stilts with a fish-drying rack, a net on poles and
                 a sampan upturned on trestles
  teratak        a poor family's hut: woven bamboo walls, low hipped thatch, a pole ladder
Each sits at the origin with the front stair at -Y. Ground is Z=0. Every house has the tempayan of
water and ladle at the foot of the stair for washing feet before going up.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
import boats  # noqa: E402  (resets the scene; we borrow the sampan)

M = kit.M
ATAP = kit.fibre("atap_nipah", (0.10, 0.07, 0.035), (0.36, 0.27, 0.14), bump=0.5)
KELARAI = kit.fibre("kelarai", (0.30, 0.24, 0.12), (0.62, 0.52, 0.30), scale=(30, 30, 30), bump=0.4)
BAMBOO = kit.flat("buluh", (0.45, 0.40, 0.18), 0.6)


def gable(c, cx, cy, length, hw, ze, pitch=40, ov=0.7, mat=None, horns=True):
    """Gable roof, ridge along X, with gable panels, barge boards and crossed horns."""
    tn = math.tan(math.radians(pitch))
    a = hw + ov
    zr = ze + a * tn
    pts = [(-a, ze), (0, zr), (a, ze), (a, ze - 0.2), (0, zr - 0.26), (-a, ze - 0.2)]
    kit.prism([(cy + y, z) for y, z in pts], length, cx, mat or ATAP, c, name="atap")
    kit.beam((cx - length / 2, cy, zr), (cx + length / 2, cy, zr), 0.08, M["trim"], c, verts=6, name="perabung")
    for s in (-1, 1):
        kit.prism([(cy - hw, ze - 0.15), (cy, zr - 0.3), (cy + hw, ze - 0.15)], 0.08, cx + s * (length / 2 - 0.35), M["plank"], c, name="tebar_layar")
        xg = cx + s * length / 2
        for sy in (-1, 1):
            kit.beam((xg, cy + sy * a, ze), (xg, cy, zr), 0.06, M["trim"], c, verts=6, name="papan_cantik")
            if horns:
                kit.beam((xg, cy + sy * 0.45, zr - 0.45 * tn), (xg, cy - sy * 0.35, zr + 0.5), 0.05, M["trim"], c, verts=6, name="silang_gunting")
    return zr


def stilts(c, x0, x1, y0, y1, top, step=2.0, r=0.11):
    nx, ny = max(1, round((x1 - x0) / step)), max(1, round((y1 - y0) / step))
    for i in range(nx + 1):
        for j in range(ny + 1):
            x, y = x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny
            kit.box((0.36, 0.36, 0.2), (x, y, 0.1), mat=M["weathered"], coll=c, name="batu_alas")
            kit.cyl(r, top, (x, y, top / 2), mat=M["post"], coll=c, verts=7, name="tiang")


def floor(c, x0, x1, y0, y1, f):
    kit.box((x1 - x0 + 0.2, y1 - y0 + 0.2, 0.1), ((x0 + x1) / 2, (y0 + y1) / 2, f - 0.05), mat=M["floor"], coll=c, name="lantai")


def walls(c, x0, x1, y0, y1, f, h, mat, door=None, windows=1):
    """Four walls with an open-shuttered window per side and a door on 'S' or 'N'."""
    sides = (((x0, y0), (x1, y0), "S"), ((x1, y0), (x1, y1), "E"), ((x1, y1), (x0, y1), "N"), ((x0, y1), (x0, y0), "W"))
    for a, b, nm in sides:
        n = math.hypot(b[0] - a[0], b[1] - a[1])
        holes = [(n * (k + 1) / (windows + 1), 0.8, 0.75, 1.75) for k in range(windows)]
        if nm == door:
            holes = [h_ for h_ in holes if abs(h_[0] - n / 2) > 1.2] + [(n / 2, 0.95, 0.0, 2.0)]
        kit.wall(c, a, b, f, h, 0.07, mat, holes)
        ux, uy = (b[0] - a[0]) / n, (b[1] - a[1]) / n
        for s, w, lo, hi in holes:
            if lo > 0:  # shutters swung open against the wall
                for k in (-1, 1):
                    p = s + k * 0.62
                    kit.box((0.42 if abs(ux) > 0.5 else 0.04, 0.04 if abs(ux) > 0.5 else 0.42, hi - lo),
                            (a[0] + ux * p + uy * 0.06, a[1] + uy * p - ux * 0.06, f + (lo + hi) / 2), mat=M["trim"], coll=c, name="daun_tingkap")
    for x in (x0, x1):
        for y in (y0, y1):
            kit.box((0.14, 0.14, h), (x, y, f + h / 2), mat=M["post"], coll=c, name="tiang_seri")


def stair(c, x, y0, f, w=0.9):
    n = max(3, round(f / 0.3))
    for k in range(n):
        kit.box((w, 0.28, 0.05), (x, y0 - 0.28 * (k + 0.5), f * (n - k - 1) / n + f / n - 0.03), mat=M["plank"], coll=c, name="anak_tangga")
    for s in (-1, 1):
        kit.beam((x + s * w / 2, y0, f), (x + s * w / 2, y0 - 0.28 * n, 0), 0.045, M["post"], c, verts=6, name="ibu_tangga")
    return y0 - 0.28 * n


def foot_jar(c, x, y):
    """Tempayan of water and a coconut-shell ladle at the foot of the stair."""
    kit.tempayan(x, y, 0.0, k=0.9, mat=M["glaze"], coll=c)
    kit.blob((x + 0.05, y, 0.78), (0.07, 0.07, 0.04), M["trunk"], c, subdiv=1, name="gayung")
    kit.beam((x + 0.05, y, 0.78), (x + 0.3, y + 0.1, 0.86), 0.012, M["trim"], c, verts=4, name="hulu_gayung")


def firewood(c, x, y, rnd):
    for i in range(9):
        kit.cyl(0.06, 0.9, (x + (i % 3) * 0.13, y, 0.07 + (i // 3) * 0.12), rot=(math.pi / 2, 0, rnd.uniform(-0.1, 0.1)), mat=M["trunk"], coll=c, verts=6, name="kayu_api")


def rumah_bujang(name, rnd):
    c = kit.new_group(name)
    W, D, F, H = 6.0, 4.6, 1.6, 2.3
    stilts(c, -W / 2, W / 2, -D / 2, D / 2, F)
    floor(c, -W / 2, W / 2, -D / 2, D / 2, F)
    walls(c, -W / 2, W / 2, -D / 2, D / 2, F, H, M["plank"], door="S")
    gable(c, 0, 0, W + 1.2, D / 2, F + H, pitch=42)
    kit.box((1.3, 0.8, 0.06), (0, -D / 2 - 0.4, F - 0.05), mat=M["floor"], coll=c, name="lantai_tangga")
    yb = stair(c, 0, -D / 2 - 0.8, F)
    foot_jar(c, 0.9, yb + 0.2)
    firewood(c, W / 2 + 0.4, 0.8, rnd)
    return c


def rumah_serambi(name, rnd):
    c = kit.new_group(name)
    W, D, F, H = 8.0, 6.0, 1.8, 2.4
    FS, SD = F - 0.35, 2.6  # serambi floor and depth
    stilts(c, -W / 2, W / 2, -D / 2, D / 2, F)
    stilts(c, -W / 2, W / 2, -D / 2 - SD, -D / 2 - 1.3, FS)
    floor(c, -W / 2, W / 2, -D / 2, D / 2, F)
    floor(c, -W / 2, W / 2, -D / 2 - SD, -D / 2, FS)
    walls(c, -W / 2, W / 2, -D / 2, D / 2, F, H, M["plank"], door="S", windows=2)
    gable(c, 0, 0, W + 1.4, D / 2, F + H, pitch=42)
    # serambi: half-height railing, its own lower roof
    for x in [-W / 2 + i * 1.0 for i in range(9)]:
        if abs(x) > 0.6:
            kit.box((0.05, 0.05, 0.7), (x, -D / 2 - SD, FS + 0.35), mat=M["trim"], coll=c, name="jejari")
    for s in (-1, 1):
        kit.box((W / 2 - 0.6, 0.08, 0.08), (s * (W / 4 + 0.3), -D / 2 - SD, FS + 0.72), mat=M["trim"], coll=c, name="susur")
        kit.box((0.08, SD, 0.08), (s * W / 2, -D / 2 - SD / 2, FS + 0.72), mat=M["trim"], coll=c, name="susur")
    for x in (-W / 2, 0.0, W / 2):
        kit.cyl(0.1, 2.0, (x, -D / 2 - SD, FS + 1.0), mat=M["post"], coll=c, name="tiang_serambi")
    gable(c, 0, -D / 2 - SD / 2 + 0.1, W + 0.8, SD / 2, FS + 2.0, pitch=30, ov=0.6, horns=False)
    kit.box((1.5, 1.0, 0.04), (-1.8, -D / 2 - 1.3, FS + 0.02), mat=M["rattan"], coll=c, name="tikar")
    yb = stair(c, 0, -D / 2 - SD, FS)
    foot_jar(c, 0.9, yb + 0.2)
    # selang and dapur behind
    kit.box((1.6, 1.6, 0.1), (W / 2 - 1.4, D / 2 + 0.8, F - 0.3), mat=M["floor"], coll=c, name="selang")
    stilts(c, W / 2 - 2.2, W / 2 - 0.6, D / 2 + 0.4, D / 2 + 1.2, F - 0.3, step=1.6)
    kit.prism([(D / 2 - 0.1, F + 1.7), (D / 2 + 1.7, F + 1.7), (D / 2 + 0.8, F + 2.4)], 2.0, W / 2 - 1.4, ATAP, c, name="atap_selang")
    DX0, DX1, DY0, DY1 = W / 2 - 4.4, W / 2, D / 2 + 1.6, D / 2 + 5.2
    stilts(c, DX0, DX1, DY0, DY1, F - 0.3)
    floor(c, DX0, DX1, DY0, DY1, F - 0.3)
    walls(c, DX0, DX1, DY0, DY1, F - 0.3, 2.1, M["weathered"], door="N")
    gable(c, (DX0 + DX1) / 2, (DY0 + DY1) / 2, DX1 - DX0 + 1.0, (DY1 - DY0) / 2, F + 1.8, pitch=38, horns=False)
    firewood(c, DX0 - 1.0, DY1 - 0.5, rnd)
    kit.tempayan(DX1 + 0.6, DY1, 0.0, k=1.2, mat=M["clay"], coll=c)
    return c


def rumah_nelayan(name, rnd):
    c = kit.new_group(name)
    W, D, F, H = 6.0, 5.0, 2.4, 2.2
    stilts(c, -W / 2, W / 2, -D / 2, D / 2, F, r=0.12)
    floor(c, -W / 2, W / 2, -D / 2, D / 2, F)
    walls(c, -W / 2, W / 2, -D / 2, D / 2, F, H, KELARAI, door="S")
    gable(c, 0, 0, W + 1.2, D / 2, F + H, pitch=40)
    kit.box((W, 1.4, 0.08), (0, -D / 2 - 0.7, F - 0.05), mat=M["weathered"], coll=c, name="pelantar")
    stilts(c, -W / 2, W / 2, -D / 2 - 1.4, -D / 2 - 1.4, F - 0.05, step=3.0, r=0.08)
    yb = stair(c, -1.8, -D / 2 - 1.4, F)
    foot_jar(c, -0.9, yb + 0.2)
    # fish-drying rack (para) beside the house
    rx, ry = W / 2 + 2.2, -0.5
    for sx in (-1, 1):
        for sy in (-1, 1):
            kit.cyl(0.05, 1.0, (rx + sx * 1.2, ry + sy * 0.8, 0.5), mat=BAMBOO, coll=c, name="kaki_para")
    for k in range(9):
        kit.cyl(0.025, 2.6, (rx, ry - 0.8 + 0.2 * k, 1.0), rot=(0, math.pi / 2, 0), mat=BAMBOO, coll=c, name="bilah_para")
    for _ in range(22):
        kit.blob((rx + rnd.uniform(-1.1, 1.1), ry + rnd.uniform(-0.7, 0.7), 1.05), (0.14, 0.04, 0.02), M["weathered"], c,
                 wobble=0.1, subdiv=1, rot=(0, 0, rnd.uniform(0, 3.14)), name="ikan")
    # net hung between two poles
    for x in (-W / 2 - 2.6, -W / 2 - 0.6):
        kit.cyl(0.05, 2.6, (x, -1.0, 1.3), mat=BAMBOO, coll=c, name="tiang_jala")
    kit.sheet(2.0, 1.8, (-W / 2 - 1.6, -1.0, 1.6), mat=M["rope"], coll=c, sag=0.25, name="jala")
    # sampan upturned on trestles under the house
    s = boats.sampan(name + "_sampan", False)
    for ob in list(s.objects):
        s.objects.unlink(ob)
        c.objects.link(ob)
        ob.location = (ob.location.x, ob.location.y, -ob.location.z)
        ob.rotation_euler.x += math.pi
        ob.location.y += 1.2
        ob.location.z += 1.05
    bpy_remove(s)
    for x in (-1.5, 1.5):
        kit.box((0.12, 1.0, 0.6), (x, 1.2, 0.3), mat=M["post"], coll=c, name="kuda_kuda")
    return c


def bpy_remove(coll):
    import bpy
    bpy.data.collections.remove(coll)


def teratak(name, rnd):
    c = kit.new_group(name)
    W, D, F, H = 3.6, 3.0, 0.8, 1.9
    stilts(c, -W / 2, W / 2, -D / 2, D / 2, F, step=1.8, r=0.08)
    floor(c, -W / 2, W / 2, -D / 2, D / 2, F)
    walls(c, -W / 2, W / 2, -D / 2, D / 2, F, H, KELARAI, door="S", windows=0)
    kit.hip(0, 0, W / 2 + 0.6, D / 2 + 0.6, 0.6, 0.05, F + H, F + H + 1.6, mat=M["thatch"], coll=c, name="atap")
    kit.beam((0.0, -D / 2 - 1.0, 0.0), (0.0, -D / 2 - 0.05, F + 0.1), 0.07, BAMBOO, c, verts=6, name="tangga_galah")
    for k in range(3):
        z = 0.2 + 0.22 * k
        kit.cyl(0.02, 0.4, (0.0, -D / 2 - 1.0 + (z / (F + 0.1)) * 0.95, z), rot=(0, math.pi / 2, 0), mat=BAMBOO, coll=c, name="pijak")
    foot_jar(c, 0.7, -D / 2 - 0.9)
    kit.sack(-W / 2 - 0.5, 0.4, 0.0, k=0.8, seed=1.0, coll=c)
    return c


if __name__ == "__main__":
    rnd = random.Random(1511)
    groups = [rumah_bujang("rumah_bujang", rnd), rumah_serambi("rumah_serambi", rnd), rumah_nelayan("rumah_nelayan", rnd), teratak("teratak", rnd)]
    SPOTS = [((-13.0, 1.0), 12), ((-1.0, 4.0), 0), ((11.0, 1.5), -12), ((19.5, -2.5), -28)]
    for g, ((x, y), yaw) in zip(groups, SPOTS):
        kit.place(g, (x, y, 0), math.radians(yaw))

    kit.ground(0.0, kit.fibre("halaman", (0.30, 0.25, 0.14), (0.52, 0.46, 0.28), scale=(3, 3, 3), bump=0.3))
    kit.hills()
    kit.environment(cam=(3.0, -21.0, 6.5), target=(3.0, 1.0, 1.6), lens=17, sun_elev=22, sun_rot=-130, sky=0.08, sun=8.0, haze=0.002, exposure=0.2)
    kit.render_and_export("kampung", groups)
