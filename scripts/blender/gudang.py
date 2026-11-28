"""Gudang: merchants' warehouses (godowns) along the Melaka river. Three variants built from
one parametric warehouse.

Run headless:
  blender -b -P scripts/blender/gudang.py -- <out_dir>

Writes <out_dir>/gudang.png and one GLB per variant:
  gudang_kayu    long timber godown on low stilts, battened plank walls, steep atap gable roof,
                 double doors onto a loading platform with a ramp
  gudang_batu    a rich merchant's fire-resistant store: laterite walls on a plinth, barred vents,
                 heavy door, clay-tile roof with upturned ridge ends
  gudang_sungai  riverside godown on tall stilts with a landing stage over the water, a derrick
                 for hoisting cargo from boats and steps down to the river
Each sits at the origin with the doors at -Y. Ground is Z=0; the riverside one's front piles reach
the riverbed at Z=-3.6 (bank edge at Y=-4, water at Z=-1.2, as in the terrain's lower river).
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402

kit.reset()
M = kit.M
LATERITE = kit.fibre("laterit", (0.22, 0.11, 0.07), (0.46, 0.28, 0.18), scale=(6, 6, 6), bump=0.8)
TILE = kit.fibre("genting", (0.16, 0.06, 0.035), (0.36, 0.15, 0.08), scale=(2, 40, 2), bump=0.9, rough=0.8)
OLD = kit.wood("kayu_tua", (0.05, 0.035, 0.022), (0.16, 0.11, 0.07), scale=5, rough=0.9)
BED, WATER, EDGE = -3.6, -1.2, -4.0


def wall(c, a, b, z0, h, t, mat, holes=(), battens=None):
    """Axis-aligned wall from a to b (x, y) with rectangular holes (s_centre, width, z_bottom, z_top)
    measured along the wall from a; optional vertical battens on the outside."""
    (ax, ay), (bx, by) = a, b
    n = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / n, (by - ay) / n
    along_x = abs(ux) > 0.5

    def piece(s0, s1, zb, zt):
        if s1 - s0 < 0.01 or zt - zb < 0.01:
            return
        s = (s0 + s1) / 2
        size = (s1 - s0, t, zt - zb) if along_x else (t, s1 - s0, zt - zb)
        kit.box(size, (ax + ux * s, ay + uy * s, z0 + (zb + zt) / 2), mat=mat, coll=c, name="dinding")

    cuts = sorted(holes)
    s = 0.0
    for hc, hw, zb, zt in cuts:
        piece(s, hc - hw / 2, 0, h)
        piece(hc - hw / 2, hc + hw / 2, 0, zb)
        piece(hc - hw / 2, hc + hw / 2, zt, h)
        s = hc + hw / 2
    piece(s, n, 0, h)
    if battens:
        nx, ny = -uy, ux  # outward normal when walls run anticlockwise
        k = 0.3
        while k < n - 0.2:
            if not any(abs(k - hc) < hw / 2 + 0.05 for hc, hw, _, _ in cuts):
                kit.box((0.07, 0.07, h) if True else None, (ax + ux * k + nx * (t / 2 + 0.03), ay + uy * k + ny * (t / 2 + 0.03), z0 + h / 2),
                        mat=battens, coll=c, name="bilah")
            k += 0.55


def gable_roof(c, W, D, ze, rise, over, mat, trim):
    kit.hip(0, 0, W / 2 + over, D / 2 + over + 0.4, W / 2 + over, 0.05, ze, ze + rise, mat=mat, coll=c, trim=trim, name="atap")
    for sx in (-1, 1):  # gable panels
        kit.prism([(-D / 2 - 0.1, ze), (D / 2 + 0.1, ze), (0, ze + rise * (D / 2 + 0.1) / (D / 2 + over + 0.4) - 0.05)], 0.08,
                  sx * (W / 2 + 0.05), mat=M["plank"], coll=c, name="tebar_layar")


def stilts(c, W, D, base, top, step=2.0, front_to=None):
    nx, ny = int(round(W / step)), int(round(D / step))
    for i in range(nx + 1):
        for j in range(ny + 1):
            x, y = -W / 2 + i * W / nx, -D / 2 + j * D / ny
            b = base(y)
            kit.cyl(0.14, top - b, (x, y, (top + b) / 2), mat=OLD, coll=c, name="tiang")
            if top - b > 2.5:
                kit.beam((x, y, b + 0.3), (x, y + D / ny * 0.9, top - 0.3), 0.05, OLD, c, verts=6, name="silang") if j < ny else None


def cargo(c, rnd, x0, y0, x1, y1, z, n):
    """A cluster of sacks, jars and bales on a floor."""
    for _ in range(n):
        x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        r = rnd.random()
        if r < 0.45:
            for k in range(rnd.randint(1, 3)):
                kit.sack(x + rnd.uniform(-0.1, 0.1), y, z + k * 0.42, k=1.0, seed=rnd.random() * 9, yaw=rnd.uniform(0, 3), coll=c)
        elif r < 0.7:
            kit.tempayan(x, y, z, k=rnd.uniform(0.8, 1.2), mat=rnd.choice((M["glaze"], M["clay"])), coll=c)
        elif r < 0.88:
            cloth = rnd.choice((M["indigo"], M["red"], M["gold_cloth"], M["sack"]))
            kit.box((0.9, 0.6, 0.55), (x, y, z + 0.28), rot=(0, 0, rnd.uniform(-0.3, 0.3)), mat=cloth, coll=c, name="bandela")
            for o in (-0.25, 0.25):
                kit.box((0.04, 0.63, 0.58), (x + o, y, z + 0.28), mat=M["rope"], coll=c, name="tali")
        else:
            kit.box((0.8, 0.8, 0.7), (x, y, z + 0.35), rot=(0, 0, rnd.uniform(-0.2, 0.2)), mat=M["plank"], coll=c, name="peti")


def dacing(c, x, y, z):
    """A steelyard hanging in the doorway: beam, hook and counterweight."""
    kit.beam((x, y, z + 0.6), (x, y, z), 0.01, M["rope"], c, verts=4, name="tali")
    kit.beam((x - 0.5, y, z), (x + 0.4, y, z), 0.02, M["trim"], c, verts=6, name="dacing")
    kit.blob((x + 0.35, y, z - 0.12), (0.05, 0.05, 0.07), M["iron"], c, subdiv=1, name="batu_dacing")
    kit.sack(x - 0.45, y, z - 0.7, k=0.6, seed=2.0, coll=c)


def gudang_kayu(name, rnd):
    c = kit.new_group(name)
    W, D, F, H = 14.0, 8.0, 1.0, 3.2
    stilts(c, W, D, lambda y: -0.3, F)
    kit.box((W + 0.2, D + 0.2, 0.12), (0, 0, F + 0.06), mat=M["floor"], coll=c, name="lantai")
    z0 = F + 0.12
    corners = [(-W / 2, -D / 2), (W / 2, -D / 2), (W / 2, D / 2), (-W / 2, D / 2)]
    holes = [[(W / 2, 2.6, 0, 2.5)], [(D / 2, 0.8, 1.6, 2.2)], [], [(D / 2, 0.8, 1.6, 2.2)]]
    for i in range(4):
        wall(c, corners[i], corners[(i + 1) % 4], z0, H, 0.08, M["plank"], holes[i], battens=OLD)
    for sx in (-1, 1):  # doors folded open
        kit.box((1.3, 0.08, 2.5), (sx * 1.95, -D / 2 - 0.65, z0 + 1.25), rot=(0, 0, sx * 1.3), mat=OLD, coll=c, name="pintu")
    gable_roof(c, W, D, z0 + H, 3.6, 0.9, M["thatch"], M["trim"])
    # loading platform and ramp at the doors
    kit.box((5.0, 2.4, 0.12), (0, -D / 2 - 1.2, F + 0.02), mat=M["plank"], coll=c, name="pelantar")
    for x in (-2.3, 2.3):
        kit.cyl(0.1, F + 0.3, (x, -D / 2 - 2.3, F / 2 - 0.15), mat=OLD, coll=c, name="tiang")
    a = math.atan2(F, 3.2)
    kit.box((1.8, 3.4, 0.1), (0, -D / 2 - 2.4 - 1.6, F / 2), rot=(a, 0, 0), mat=M["plank"], coll=c, name="tangga_sorong")
    cargo(c, rnd, -W / 2 + 0.8, -D / 2 + 0.8, W / 2 - 0.8, D / 2 - 0.8, z0, 34)
    cargo(c, rnd, -2.2, -D / 2 - 2.2, 2.2, -D / 2 - 0.4, F + 0.08, 5)
    dacing(c, 0.0, -D / 2 + 0.2, z0 + 2.1)
    return c


def gudang_batu(name, rnd):
    c = kit.new_group(name)
    W, D, P, H, T = 11.0, 7.0, 0.6, 3.6, 0.5
    kit.box((W + 1.0, D + 1.0, P), (0, 0, P / 2), mat=LATERITE, coll=c, name="tapak")
    for i in range(3):  # steps up to the door
        kit.box((2.4, 0.4, P - i * 0.2), (0, -D / 2 - 0.7 - i * 0.4, (P - i * 0.2) / 2), mat=LATERITE, coll=c, name="anak_tangga")
    corners = [(-W / 2, -D / 2), (W / 2, -D / 2), (W / 2, D / 2), (-W / 2, D / 2)]
    vents = [(1.6, 0.5, 2.6, 3.1), (W - 1.6, 0.5, 2.6, 3.1)]
    holes = [[(W / 2, 1.6, 0, 2.3)] + vents, [(D / 2, 0.5, 2.6, 3.1)], vents, [(D / 2, 0.5, 2.6, 3.1)]]
    for i in range(4):
        wall(c, corners[i], corners[(i + 1) % 4], P, H, T, LATERITE, holes[i])
    for x in (-W / 2 + 1.6, W / 2 - 1.6):  # iron bars in the front vents
        for k in (-0.15, 0, 0.15):
            kit.cyl(0.02, 0.5, (x + k, -D / 2, P + 2.85), mat=M["iron"], coll=c, name="jeriji")
    kit.box((1.5, 0.12, 2.3), (0.0, -D / 2 + 0.3, P + 1.15), rot=(0, 0, 0.5), mat=OLD, coll=c, name="pintu")
    for z in (0.5, 1.2, 1.9):
        kit.box((1.5, 0.03, 0.06), (0.0, -D / 2 + 0.24, P + z), rot=(0, 0, 0.5), mat=M["iron"], coll=c, name="besi_pintu")
    kit.box((W + 0.2, D + 0.2, 0.25), (0, 0, P + H + 0.12), mat=M["post"], coll=c, name="alang")
    ze = P + H + 0.25
    gable_roof(c, W, D, ze, 2.6, 0.7, TILE, M["post"])
    for sx in (-1, 1):  # upturned ridge ends
        kit.box((0.9, 0.3, 0.25), (sx * (W / 2 + 0.9), 0, ze + 2.7), rot=(0, -sx * 0.35, 0), mat=TILE, coll=c, name="hujung_perabung")
    kit.box((W + 1.8, 0.35, 0.25), (0, 0, ze + 2.62), mat=TILE, coll=c, name="perabung")
    cargo(c, rnd, -W / 2 + 0.8, -D / 2 + 0.8, W / 2 - 0.8, D / 2 - 0.8, P, 18)
    for k in range(6):  # porcelain bowls stacked at the door
        kit.cyl(0.18, 0.08, (1.6, -D / 2 - 0.6, P + 0.04 + k * 0.08), mat=M["porcelain"], coll=c, r2=0.12, verts=14, name="mangkuk")
    for k in range(4):
        kit.cyl(0.18, 0.08, (1.95, -D / 2 - 0.45, P + 0.04 + k * 0.08), mat=M["blue"], coll=c, r2=0.12, verts=14, name="mangkuk")
    return c


def gudang_sungai(name, rnd):
    c = kit.new_group(name)
    W, D, F, H = 10.0, 7.0, 2.2, 3.0
    y_off = 1.0  # building stands back from the bank edge; landing stage reaches over the water
    for i in range(6):
        for j in range(5):
            x, y = -W / 2 + i * W / 5, y_off - D / 2 + j * D / 4
            kit.cyl(0.15, F + 0.4, (x, y, F / 2 - 0.2), mat=OLD, coll=c, name="tiang")
    kit.box((W + 0.2, D + 0.2, 0.12), (0, y_off, F + 0.06), mat=M["floor"], coll=c, name="lantai")
    z0 = F + 0.12
    y0, y1 = y_off - D / 2, y_off + D / 2
    corners = [(-W / 2, y0), (W / 2, y0), (W / 2, y1), (-W / 2, y1)]
    holes = [[(W / 2, 2.4, 0, 2.4)], [(D / 2, 0.8, 1.5, 2.1)], [(W / 2, 1.2, 0, 2.2)], [(D / 2, 0.8, 1.5, 2.1)]]
    for i in range(4):
        wall(c, corners[i], corners[(i + 1) % 4], z0, H, 0.08, M["plank"], holes[i], battens=OLD)
    ze = z0 + H
    kit.hip(0, y_off, W / 2 + 0.8, D / 2 + 1.3, W / 2 + 0.8, 0.05, ze, ze + 3.0, mat=M["thatch"], coll=c, name="atap")
    for sx in (-1, 1):
        kit.prism([(y0 - 0.1, ze), (y1 + 0.1, ze), (y_off, ze + 2.3)], 0.08, sx * (W / 2 + 0.05), mat=M["plank"], coll=c, name="tebar_layar")
    # landing stage from the doors out over the river
    sy0, sy1 = y0, EDGE - 5.0
    kit.box((7.0, sy0 - sy1, 0.12), (0, (sy0 + sy1) / 2, F + 0.02), mat=M["plank"], coll=c, name="pelantar")
    for x in (-3.3, 0.0, 3.3):
        for y in (y0 - 0.2, EDGE + 0.5, EDGE - 2.5, sy1 + 0.2):
            b = BED if y < EDGE else -0.3
            kit.cyl(0.15, F - b, (x, y, (F + b) / 2), mat=OLD, coll=c, name="cerucuk")
    for x in (-3.45, 3.45):
        kit.beam((x, sy1, F + 1.0), (x, y0, F + 1.0), 0.05, M["post"], c, verts=6, name="susur")
    # derrick: mast, angled boom and a sack on the hoist rope
    mx, my = 3.0, sy1 + 0.5
    kit.cyl(0.14, 7.0, (mx, my, F + 3.5), mat=OLD, coll=c, name="tiang_kren")
    tip = (mx - 1.2, my - 4.0, F + 6.2)
    kit.beam((mx, my, F + 1.2), tip, 0.1, OLD, c, name="lengan_kren")
    kit.beam((mx, my, F + 6.9), tip, 0.02, M["rope"], c, verts=4, name="tali")
    kit.beam(tip, (tip[0], tip[1], WATER + 1.6), 0.02, M["rope"], c, verts=4, name="tali")
    kit.sack(tip[0], tip[1], WATER + 1.1, k=1.0, seed=4.0, coll=c)
    # steps down to the water on the side of the stage
    for k in range(7):
        z = F - 0.45 * (k + 1)
        kit.box((1.0, 0.35, 0.08), (-3.95, sy1 + 0.6 + k * 0.38, z), mat=M["weathered"], coll=c, name="anak_tangga")
    kit.beam((-4.4, sy1 + 0.4, WATER - 0.2), (-4.4, sy1 + 3.2, F + 0.9), 0.06, OLD, c, verts=6, name="tangga_tepi")
    cargo(c, rnd, -W / 2 + 0.8, y0 + 0.8, W / 2 - 0.8, y1 - 0.8, z0, 20)
    cargo(c, rnd, -2.6, sy1 + 0.6, 2.2, y0 - 0.6, F + 0.08, 9)
    return c


rnd = random.Random(1511)
groups = [gudang_kayu("gudang_kayu", rnd), gudang_sungai("gudang_sungai", rnd), gudang_batu("gudang_batu", rnd)]
SPOTS = [((-19.0, 5.0), 0), ((0.0, 0.0), 0), ((17.0, 4.0), -8)]
for g, ((x, y), yaw) in zip(groups, SPOTS):
    kit.place(g, (x, y, 0), math.radians(yaw))

bank = kit.fibre("tebing", (0.30, 0.24, 0.13), (0.52, 0.44, 0.26), scale=(3, 3, 3), bump=0.3)
kit.box((240, 120, 4.0), (0, EDGE + 60, -2.0), mat=bank, coll=kit.SCENERY, name="tebing")
kit.box((400, 400, 0.02), (0, 0, WATER), mat=M["water"], coll=kit.SCENERY, name="sungai")
kit.box((400, 400, 0.2), (0, 0, BED - 0.1), mat=M["sand"], coll=kit.SCENERY, name="dasar")
kit.hills()
kit.environment(cam=(-7.0, -27.0, 4.8), target=(0.0, 2.0, 2.8), lens=24, sun_elev=20, sun_rot=-135, sky=0.08, sun=8.0, haze=0.002, exposure=0.2)
kit.render_and_export("gudang", groups)
