"""Kedai: shops on the Melaka street, 1511. Timber shop-dwellings, not the brick shophouses of later
centuries. Four variants built from shared parts.

Run headless:
  blender -b -P scripts/blender/kedai.py -- <out_dir>

Writes <out_dir>/kedai.png and one GLB per variant:
  kedai_deret   a row of three shops under one long roof on low stilts; each bay's front closes with
                board shutters (one propped up as an awning, one taken down and stacked, one shut),
                with a display platform under the deep front eave
  kedai_kecil   a single small shop-house with a propped shutter, a lean-to awning, strings of dried
                fish and bananas, baskets of pepper
  kedai_cina    a Chinese merchant's deep, narrow shop with a clay-tile roof, a counter, shelves of
                porcelain and red lanterns
  gerai         an open market stall: four posts, a thatched roof and a produce table
Each sits at the origin with the shop front at -Y. Ground is Z=0.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402

kit.reset()
M = kit.M
TILE = kit.fibre("genting", (0.16, 0.06, 0.035), (0.36, 0.15, 0.08), scale=(2, 40, 2), bump=0.9, rough=0.8)
OLD = kit.wood("kayu_tua", (0.05, 0.035, 0.022), (0.16, 0.11, 0.07), scale=5, rough=0.9)
CLOTHS = [M["indigo"], M["red"], M["gold_cloth"], kit.flat("kain_hijau", (0.08, 0.25, 0.12), 0.9), kit.flat("kain_putih", (0.75, 0.70, 0.60), 0.9)]
LANTERN = kit.glow("tanglung", (0.9, 0.12, 0.06), 1.5)


def posts(c, pts, z0, z1, r=0.12, mat=None):
    for x, y in pts:
        kit.cyl(r, z1 - z0, (x, y, (z0 + z1) / 2), mat=mat or OLD, coll=c, name="tiang")


def bolts(c, rnd, x, y, z, n):
    """Rolled cloth bolts lying side by side, stacked two high."""
    for i in range(n):
        kit.cyl(0.11, 1.0, (x + (i % 4) * 0.23, y, z + 0.11 + (i // 4) * 0.21), rot=(math.pi / 2, 0, 0),
                mat=rnd.choice(CLOTHS), coll=c, verts=10, name="kain")


def pepper(c, x, y, z, k=1.0):
    kit.cyl(0.3 * k, 0.38 * k, (x, y, z + 0.19 * k), mat=M["rattan"], coll=c, r2=0.34 * k, name="bakul")
    kit.blob((x, y, z + 0.38 * k), (0.31 * k, 0.31 * k, 0.07 * k), M["dark"], c, wobble=0.15, subdiv=2, name="lada")


def shutter(c, x, y, z, w, h, state, rnd):
    """Board shutters for an opening centred at x on the front wall line y.
    state: 'shut', 'propped' (top-hinged flap held out on two poles) or 'down' (boards stacked aside)."""
    if state == "shut":
        k = -w / 2 + 0.15
        while k < w / 2:
            kit.box((0.29, 0.05, h), (x + k, y, z + h / 2), mat=OLD, coll=c, name="papan_pintu")
            k += 0.3
        kit.box((w, 0.06, 0.1), (x, y - 0.06, z + h * 0.6), mat=M["iron"], coll=c, name="palang")
    elif state == "propped":
        a = math.radians(70)
        kit.box((w, 0.06, h * 0.55), (x, y - math.sin(a) * h * 0.275, z + h - math.cos(a) * h * 0.275), rot=(-a, 0, 0),
                mat=OLD, coll=c, name="papan_tingkap")
        tip_y, tip_z = y - math.sin(a) * h * 0.55, z + h - math.cos(a) * h * 0.55
        for sx in (-1, 1):
            kit.beam((x + sx * (w / 2 - 0.2), tip_y, tip_z), (x + sx * (w / 2 - 0.2), tip_y + 0.3, z - 0.1), 0.03, M["post"], c, verts=6, name="penyangga")
        kit.box((w, 0.05, h * 0.45), (x, y, z + h * 0.225), mat=OLD, coll=c, name="papan_bawah")
    else:
        for i in range(6):
            kit.box((0.29, 0.05, h), (x + w / 2 + 0.25 + 0.06 * i, y - 0.25 - 0.04 * i, z + h / 2), rot=(-0.12, 0, 0),
                    mat=OLD, coll=c, name="papan_pintu")


def front_platform(c, W, D, F, depth, rise, eave_h):
    """A display platform under a deep front eave on posts."""
    y0 = -D / 2
    kit.box((W, depth, 0.1), (0, y0 - depth / 2, F - 0.05), mat=M["floor"], coll=c, name="pelantar")
    xs = [-W / 2 + i * W / max(1, round(W / 3.0)) for i in range(int(max(1, round(W / 3.0))) + 1)]
    posts(c, [(x, y0 - depth + 0.1) for x in xs], -0.2, eave_h)
    posts(c, [(x, y0 - depth + 0.1) for x in xs], -0.2, F, r=0.1)
    return y0 - depth


def kedai_deret(name, rnd):
    c = kit.new_group(name)
    BAY, n, D, F, H = 5.0, 3, 8.0, 0.8, 2.8
    W = BAY * n
    posts(c, [(-W / 2 + i * 2.5, -D / 2 + j * 2.0) for i in range(7) for j in range(5)], -0.2, F)
    kit.box((W + 0.2, D + 0.2, 0.12), (0, 0, F + 0.06), mat=M["floor"], coll=c, name="lantai")
    z0 = F + 0.12
    fronts = [(-W / 2 + BAY * (i + 0.5)) for i in range(n)]
    states = ["propped", "down", "shut"]
    kit.wall(c, (-W / 2, -D / 2), (W / 2, -D / 2), z0, H, 0.08, M["plank"], [(BAY * (i + 0.5), 4.0, 0, 2.2) for i in range(n)])
    kit.wall(c, (W / 2, -D / 2), (W / 2, D / 2), z0, H, 0.08, M["plank"], [(D / 2, 0.8, 1.3, 2.0)], battens=OLD)
    kit.wall(c, (W / 2, D / 2), (-W / 2, D / 2), z0, H, 0.08, M["plank"], [(BAY * (i + 0.5), 0.9, 0, 2.0) for i in range(n)], battens=OLD)
    kit.wall(c, (-W / 2, D / 2), (-W / 2, -D / 2), z0, H, 0.08, M["plank"], [(D / 2, 0.8, 1.3, 2.0)], battens=OLD)
    for i in range(1, n):  # party walls
        kit.box((0.08, D, H), (-W / 2 + BAY * i, 0, z0 + H / 2), mat=M["plank"], coll=c, name="sekat")
    for x, s in zip(fronts, states):
        shutter(c, x, -D / 2 - 0.06, z0, 4.0, 2.2, s, rnd)
    yf = front_platform(c, W, D, F, 2.0, 0, z0 + H)
    ze = z0 + H
    kit.hip(0, -0.8, W / 2 + 0.6, D / 2 + 2.4, W / 2 + 0.6, 0.05, ze - 0.4, ze + 2.4, mat=M["thatch"], coll=c, name="atap")
    for sx in (-1, 1):
        kit.prism([(-D / 2 - 0.1, ze), (D / 2 + 0.1, ze), (-0.8, ze + 1.95)], 0.08, sx * (W / 2 + 0.05), mat=M["plank"], coll=c, name="tebar_layar")
    # goods: cloth seller, pepper seller, closed bay
    bolts(c, rnd, fronts[0] - 1.4, -D / 2 - 1.2, F, 8)
    bolts(c, rnd, fronts[0] + 0.4, -D / 2 - 1.3, F, 6)
    for k, (dx, dy) in enumerate(((-1.4, -1.3), (-0.6, -1.1), (0.3, -1.4), (1.2, -1.0))):
        pepper(c, fronts[1] + dx, -D / 2 + dy, F, k=0.85 + 0.1 * (k % 2))
    kit.tempayan(fronts[1] + 1.8, -D / 2 - 1.5, F, k=1.1, coll=c)
    for _ in range(5):
        kit.sack(fronts[2] + rnd.uniform(-1.5, 1.5), -D / 2 - rnd.uniform(0.6, 1.6), F, seed=rnd.random() * 9, yaw=rnd.uniform(0, 3), coll=c)
    _ = yf
    return c


def kedai_kecil(name, rnd):
    c = kit.new_group(name)
    W, D, F, H = 5.5, 6.0, 0.7, 2.6
    posts(c, [(x, y) for x in (-W / 2, 0, W / 2) for y in (-D / 2, 0, D / 2)], -0.2, F)
    kit.box((W + 0.2, D + 0.2, 0.12), (0, 0, F + 0.06), mat=M["floor"], coll=c, name="lantai")
    z0 = F + 0.12
    kit.wall(c, (-W / 2, -D / 2), (W / 2, -D / 2), z0, H, 0.08, M["plank"], [(W / 2, 3.4, 0, 2.0)])
    kit.wall(c, (W / 2, -D / 2), (W / 2, D / 2), z0, H, 0.08, M["plank"], [(D / 2, 0.8, 1.2, 1.9)], battens=OLD)
    kit.wall(c, (W / 2, D / 2), (-W / 2, D / 2), z0, H, 0.08, M["plank"], [(W / 2, 0.9, 0, 2.0)], battens=OLD)
    kit.wall(c, (-W / 2, D / 2), (-W / 2, -D / 2), z0, H, 0.08, M["plank"], battens=OLD)
    shutter(c, 0, -D / 2 - 0.06, z0, 3.4, 2.0, "propped", rnd)
    kit.gable_roof(c, W, D, z0 + H, 2.8, 0.6, M["thatch"], M["trim"])
    # lean-to awning on two posts over a low bench
    ya = -D / 2 - 2.4
    posts(c, [(-W / 2 + 0.3, ya), (W / 2 - 0.3, ya)], 0.0, 2.3)
    kit.box((W + 0.6, 2.7, 0.12), (0, -D / 2 - 1.25, 2.6), rot=(-0.22, 0, 0), mat=M["thatch"], coll=c, name="atap_sengkuap")
    kit.box((W - 0.8, 0.9, 0.08), (0, ya + 0.9, 0.55), mat=M["plank"], coll=c, name="para")
    posts(c, [(-W / 2 + 0.6, ya + 0.6), (W / 2 - 0.6, ya + 0.6), (-W / 2 + 0.6, ya + 1.2), (W / 2 - 0.6, ya + 1.2)], 0.0, 0.5, r=0.05)
    for k, x in enumerate((-1.6, -0.6, 0.5, 1.5)):
        pepper(c, x, ya + 0.9, 0.59, k=0.7)
    # strings of dried fish and a bunch of bananas from the awning beam
    kit.beam((-W / 2 + 0.3, ya + 0.1, 2.2), (W / 2 - 0.3, ya + 0.1, 2.2), 0.05, M["post"], c, verts=6, name="alang")
    for x in (-2.0, -1.7, -1.4, 1.2, 1.5):
        kit.beam((x, ya + 0.1, 2.2), (x, ya + 0.1, 1.3), 0.008, M["rope"], c, verts=4, name="tali")
        for k in range(4):
            kit.blob((x, ya + 0.1, 2.05 - 0.22 * k), (0.03, 0.06, 0.1), M["weathered"], c, wobble=0.1, subdiv=1, name="ikan_kering")
    kit.blob((0.0, ya + 0.1, 1.75), (0.18, 0.18, 0.35), M["fruit_yel"], c, wobble=0.25, subdiv=2, name="pisang")
    for _ in range(3):
        kit.sack(rnd.uniform(-1.8, 1.8), -D / 2 + 1.4, z0, seed=rnd.random() * 9, coll=c)
    return c


def kedai_cina(name, rnd):
    c = kit.new_group(name)
    W, D, P, H = 7.0, 11.0, 0.45, 3.4
    kit.box((W + 0.4, D + 0.4, P), (0, 0, P / 2), mat=kit.fibre("lantai_bata", (0.22, 0.12, 0.08), (0.40, 0.24, 0.16), scale=(10, 10, 10), bump=0.5), coll=c, name="tapak")
    kit.wall(c, (-W / 2, -D / 2), (W / 2, -D / 2), P, H, 0.1, OLD, [(W / 2, 5.0, 0, 2.6)])
    kit.wall(c, (W / 2, -D / 2), (W / 2, D / 2), P, H, 0.1, OLD)
    kit.wall(c, (W / 2, D / 2), (-W / 2, D / 2), P, H, 0.1, OLD, [(W / 2, 1.0, 0, 2.1)])
    kit.wall(c, (-W / 2, D / 2), (-W / 2, -D / 2), P, H, 0.1, OLD)
    for i in range(4):  # shutter boards stacked against the front pier
        kit.box((0.3, 0.05, 2.6), (W / 2 - 0.5 + 0.05 * i, -D / 2 - 0.2 - 0.05 * i, P + 1.3), rot=(-0.1, 0, 0), mat=OLD, coll=c, name="papan_pintu")
    # counter across the front and shelves behind
    kit.box((4.2, 0.7, 1.0), (0, -D / 2 + 1.5, P + 0.5), mat=M["trim"], coll=c, name="kaunter")
    for z in (0.6, 1.3, 2.0):
        kit.box((5.0, 0.5, 0.05), (0, -D / 2 + 3.4, P + z), mat=M["plank"], coll=c, name="rak")
        for k in range(9):
            x = -2.2 + k * 0.55
            if rnd.random() < 0.6:
                kit.cyl(0.16, 0.09, (x, -D / 2 + 3.4, P + z + 0.07), mat=rnd.choice((M["porcelain"], M["blue"])), coll=c, r2=0.1, verts=14, name="mangkuk")
            else:
                kit.tempayan(x, -D / 2 + 3.4, P + z + 0.03, k=0.45, mat=rnd.choice((M["glaze"], M["porcelain"], M["blue"])), coll=c)
    kit.box((5.0, 0.08, 2.2), (0, -D / 2 + 3.7, P + 1.2), mat=M["plank"], coll=c, name="belakang_rak")
    for k in range(5):
        kit.tempayan(-1.6 + 0.4 * k, -D / 2 + 1.45, P + 1.0, k=0.35, mat=M["porcelain"], coll=c)
    # front eave on brackets, tile roof with upturned ends
    ze = P + H + 0.1
    kit.box((W + 0.2, D + 0.2, 0.2), (0, 0, ze - 0.05), mat=M["post"], coll=c, name="alang")
    kit.gable_roof(c, W, D, ze, 2.0, 0.8, TILE, M["post"])
    for sx in (-1, 1):
        kit.box((0.9, 0.3, 0.25), (sx * (W / 2 + 0.9), 0, ze + 2.12), rot=(0, -sx * 0.35, 0), mat=TILE, coll=c, name="hujung_perabung")
    kit.box((W + 1.8, 0.35, 0.25), (0, 0, ze + 2.05), mat=TILE, coll=c, name="perabung")
    for x in (-2.0, 2.0):  # red lanterns under the eave
        kit.beam((x, -D / 2 - 0.5, ze - 0.2), (x, -D / 2 - 0.5, ze - 0.6), 0.01, M["rope"], c, verts=4, name="tali")
        kit.blob((x, -D / 2 - 0.5, ze - 0.85), (0.22, 0.22, 0.28), LANTERN, c, wobble=0.0, subdiv=2, smooth=True, name="tanglung")
        kit.cyl(0.12, 0.05, (x, -D / 2 - 0.5, ze - 0.58), mat=M["gold_cloth"], coll=c, name="tudung")
    for _ in range(4):
        kit.sack(rnd.uniform(-2.8, 2.8), rnd.uniform(0, D / 2 - 1), P, seed=rnd.random() * 9, coll=c)
    return c


def gerai(name, rnd):
    c = kit.new_group(name)
    W, D = 3.2, 2.4
    posts(c, [(sx * W / 2, sy * D / 2) for sx in (-1, 1) for sy in (-1, 1)], 0.0, 2.3, r=0.08)
    kit.hip(0, 0, W / 2 + 0.5, D / 2 + 0.5, 0.4, 0.05, 2.25, 3.4, mat=M["thatch"], coll=c, name="atap")
    kit.box((W - 0.3, 1.1, 0.06), (0, -0.4, 0.8), mat=M["rattan"], coll=c, name="meja")
    posts(c, [(sx * (W / 2 - 0.3), -0.4 + sy * 0.45) for sx in (-1, 1) for sy in (-1, 1)], 0.0, 0.78, r=0.04, mat=M["post"])
    fruits = (M["fruit_red"], M["fruit_yel"], M["fruit_grn"])
    for k in range(5):  # trays of fruit
        x = -1.2 + 0.6 * k
        kit.cyl(0.24, 0.05, (x, -0.4, 0.86), mat=M["rattan"], coll=c, name="dulang")
        m = rnd.choice(fruits)
        for j in range(6):
            a = j * 1.05
            kit.blob((x + 0.11 * math.cos(a), -0.4 + 0.11 * math.sin(a), 0.94), (0.06, 0.06, 0.06), m, c, wobble=0.05, subdiv=1, name="buah")
    kit.box((1.8, 1.2, 0.02), (0.3, 0.7, 0.01), mat=M["rattan"], coll=c, name="tikar")
    kit.tempayan(-1.0, 0.8, 0.0, k=0.8, mat=M["clay"], coll=c)
    kit.sack(0.6, 0.75, 0.0, seed=3.0, coll=c)
    return c


rnd = random.Random(1511)
groups = [kedai_deret("kedai_deret", rnd), kedai_kecil("kedai_kecil", rnd), kedai_cina("kedai_cina", rnd), gerai("gerai", rnd)]
SPOTS = [((-11.0, 0.0), 0), ((4.5, -0.5), 0), ((13.0, 1.0), 0), ((-21.0, -10.0), 160)]
for g, ((x, y), yaw) in zip(groups, SPOTS):
    kit.place(g, (x, y, 0), math.radians(yaw))

kit.ground(0.0, kit.fibre("jalan", (0.25, 0.18, 0.11), (0.45, 0.35, 0.23), scale=(3, 3, 3), bump=0.4))
kit.hills()
kit.environment(cam=(-7.0, -27.0, 7.0), target=(-4.0, -2.0, 1.2), lens=18, sun_elev=24, sun_rot=-130, sky=0.08, sun=8.0, haze=0.002, exposure=0.2)
kit.render_and_export("kedai", groups)
