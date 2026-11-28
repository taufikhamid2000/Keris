"""Melaka harbour set at dusk: a plank jetty with a T-head, mooring poles, a thatched
goods shelter, crates, sacks, tempayan jars, rope coils and oil lamps.

Run headless:
  blender -b -P scripts/blender/harbour.py -- <out_dir>

Writes <out_dir>/harbour.png and <out_dir>/harbour.glb (jetty and props only).
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, beam, blob, box, cyl, lamp, lathe, torus  # noqa: E402

random.seed(7)
kit.reset()

SEA = -1.8
DECK = 0.8  # top of the deck above the water

# ---------------------------------------------------------------- jetty
# the walk runs along X from the shore, the T-head sits at the far end
WALK_X0, WALK_X1, WALK_W = -16.0, 6.0, 2.4
HEAD_X0, HEAD_X1, HEAD_W = 6.0, 12.0, 8.0


def deck(x0, x1, y0, y1):
    """Planks laid across X, slightly uneven, on two stringers per post line."""
    x = x0
    while x < x1:
        w = random.uniform(0.2, 0.28)
        tilt = math.radians(random.uniform(-0.8, 0.8))
        z = DECK - 0.03 + random.uniform(-0.012, 0.012)
        mat = M["floor"] if random.random() > 0.2 else M["weathered"]
        box((w - 0.015, (y1 - y0) + random.uniform(-0.05, 0.12), 0.06), (x + w / 2, (y0 + y1) / 2 + random.uniform(-0.03, 0.03), z), rot=(tilt, 0, 0), mat=mat, name="papan_jeti")
        x += w


def posts(x0, x1, ys, spacing):
    n = int((x1 - x0) / spacing)
    for i in range(n + 1):
        x = x0 + i * (x1 - x0) / n
        for y in ys:
            h = DECK - SEA - 0.06
            lean = (math.radians(random.uniform(-2, 2)), math.radians(random.uniform(-2, 2)), 0)
            cyl(0.12 + random.uniform(-0.02, 0.02), h, (x + random.uniform(-0.05, 0.05), y, SEA + h / 2), rot=lean, mat=M["post"], verts=9, name="tiang_jeti")
        # cross beam under the planks
        box((0.16, max(ys) - min(ys) + 0.4, 0.16), (x, (max(ys) + min(ys)) / 2, DECK - 0.14), mat=M["post"], name="rasuk")
    for y in ys:
        box((x1 - x0 + 0.3, 0.12, 0.12), ((x0 + x1) / 2, y, DECK - 0.28), mat=M["post"], name="kekuda")


posts(WALK_X0, WALK_X1, (-WALK_W / 2 + 0.1, WALK_W / 2 - 0.1), 2.2)
posts(HEAD_X0, HEAD_X1, (-HEAD_W / 2 + 0.1, 0.0, HEAD_W / 2 - 0.1), 2.0)
deck(WALK_X0, HEAD_X0, -WALK_W / 2, WALK_W / 2)
deck(HEAD_X0, HEAD_X1, -HEAD_W / 2, HEAD_W / 2)
# a kerb along the T-head edge where boats tie up
for y in (-HEAD_W / 2, HEAD_W / 2):
    box((HEAD_X1 - HEAD_X0 + 0.2, 0.18, 0.14), ((HEAD_X0 + HEAD_X1) / 2, y, DECK + 0.07), mat=M["post"], name="bendul")
box((0.18, HEAD_W, 0.14), (HEAD_X1, 0, DECK + 0.07), mat=M["post"], name="bendul")
# bollards: short thick posts poking through the deck
for x, y in ((7.0, -HEAD_W / 2 + 0.3), (11.0, -HEAD_W / 2 + 0.3), (11.6, 2.0), (7.0, HEAD_W / 2 - 0.3), (2.0, -WALK_W / 2 + 0.2)):
    cyl(0.16, 0.7, (x, y, DECK + 0.3), mat=M["post"], verts=10, name="tambatan")
    torus(0.2, 0.04, (x, y, DECK + 0.25), name="tali_tambat")

# mooring poles out in the water, some leaning
for x, y in ((9.0, -7.5), (12.5, -6.5), (15.0, -2.0), (15.5, 3.0), (3.0, -5.0), (-4.0, -4.5), (-9.0, 4.0)):
    h = random.uniform(3.0, 4.5) - SEA
    rot = (math.radians(random.uniform(-6, 6)), math.radians(random.uniform(-6, 6)), 0)
    cyl(0.1, h, (x, y, SEA + h / 2), rot=rot, mat=M["post"], verts=7, coll=kit.SCENERY, name="pancang")

# ---------------------------------------------------------------- goods shelter (thatched, open sides)
SX0, SX1, SY0, SY1 = 7.2, 11.2, 0.4, 3.6
EAVE = DECK + 2.3
RIDGE = EAVE + 1.3
for x in (SX0, SX1):
    for y in (SY0, SY1):
        cyl(0.1, EAVE - DECK, (x, y, DECK + (EAVE - DECK) / 2), mat=M["post"], verts=8, name="tiang_bangsal")
for y in (SY0, SY1):
    box((SX1 - SX0 + 0.3, 0.12, 0.12), ((SX0 + SX1) / 2, y, EAVE), mat=M["post"], name="alang")
cy = (SY0 + SY1) / 2
half = (SY1 - SY0) / 2 + 0.6
ang = math.atan2(RIDGE - EAVE, half)
s = math.hypot(half, RIDGE - EAVE) + 0.2
for side in (-1, 1):
    box((SX1 - SX0 + 1.0, s, 0.22), ((SX0 + SX1) / 2, cy + side * (s / 2) * math.cos(ang), RIDGE - (s / 2) * math.sin(ang) + 0.1), rot=(side * -ang, 0, 0), mat=M["thatch"], name="atap_bangsal")
box((SX1 - SX0 + 1.1, 0.3, 0.2), ((SX0 + SX1) / 2, cy, RIDGE + 0.18), mat=M["thatch"], name="perabung")

# ---------------------------------------------------------------- cargo


def crate(x, y, z, s=0.7, yaw=0.0):
    box((s, s, s), (x, y, z + s / 2), rot=(0, 0, yaw), mat=M["plank"], name="peti")
    # darker slats on the edges and a band round the middle
    for dz in (0.04, s / 2, s - 0.04):
        box((s + 0.03, s + 0.03, 0.06), (x, y, z + dz), rot=(0, 0, yaw), mat=M["post"], name="peti_jalur")


def sack(x, y, z, yaw=0.0, k=1.0):
    blob((x, y, z + 0.22 * k), (0.36 * k, 0.26 * k, 0.24 * k), M["sack"], wobble=0.18, seed=random.uniform(0, 9), subdiv=3, smooth=True, rot=(0, 0, yaw), name="guni")


def tempayan(x, y, z, k=1.0, mat=None):
    p = [(0.0, 0.0), (0.17, 0.0), (0.27, 0.12), (0.33, 0.32), (0.32, 0.5), (0.24, 0.66), (0.14, 0.74), (0.12, 0.79), (0.15, 0.82), (0.15, 0.84), (0.0, 0.84)]
    lathe([(r * k, h * k) for r, h in p], (x, y, z), mat=mat or M["glaze"], segs=20, name="tempayan")
    # four small lugs at the shoulder, typical of Martaban jars
    for i in range(4):
        a = i * math.pi / 2 + 0.4
        blob((x + math.cos(a) * 0.27 * k, y + math.sin(a) * 0.27 * k, z + 0.62 * k), (0.04 * k, 0.04 * k, 0.03 * k), mat or M["glaze"], wobble=0, subdiv=1, name="telinga")


# under the shelter: a stack of crates, sacks and jars
crate(7.8, 1.2, DECK, 0.75, 0.05)
crate(8.65, 1.15, DECK, 0.75, -0.04)
crate(8.2, 1.2, DECK + 0.75, 0.7, 0.12)
crate(7.8, 2.1, DECK, 0.7, 0.0)
for i, (x, y) in enumerate(((9.8, 1.0), (10.5, 1.1), (10.1, 1.75), (10.8, 1.8), (10.4, 2.5))):
    sack(x, y, DECK, yaw=random.uniform(-0.6, 0.6))
sack(10.15, 1.4, DECK + 0.36, yaw=0.3, k=0.95)
sack(10.6, 2.1, DECK + 0.36, yaw=-0.2, k=0.9)
for x, y, k, mat in ((8.0, 3.1, 1.0, M["glaze"]), (8.75, 3.15, 0.9, M["clay"]), (9.4, 3.05, 1.05, M["glaze"]), (8.4, 2.75, 0.7, M["clay"])):
    tempayan(x, y, DECK, k, mat)

# out on the open deck: cargo waiting to be loaded
crate(6.6, -2.6, DECK, 0.65, 0.3)
crate(7.35, -2.9, DECK, 0.6, -0.2)
crate(6.95, -2.75, DECK + 0.65, 0.55, 0.5)
for x, y in ((9.0, -2.5), (9.6, -2.9), (9.3, -3.3)):
    sack(x, y, DECK, yaw=random.uniform(-1, 1))
tempayan(10.5, -2.6, DECK, 0.95)
tempayan(11.1, -3.0, DECK, 0.8, M["clay"])
# a porcelain bowl stack on a crate lid (Chinese trade ware)
for i in range(5):
    lathe([(0.0, 0.0), (0.06, 0.0), (0.13, 0.05), (0.15, 0.07), (0.0, 0.07)], (7.35, -2.9, DECK + 0.6 + i * 0.045), mat=M["porcelain"] if i % 2 else M["blue"], segs=16, name="mangkuk")
# rope coils
for x, y in ((11.2, -0.5), (5.0, 0.6)):
    for i in range(4):
        torus(0.32 - i * 0.05, 0.035, (x, y, DECK + 0.035 + i * 0.05), name="gulung_tali")
# a hand cart (kereta sorong) on the walk
box((1.1, 0.7, 0.08), (2.5, 0.4, DECK + 0.45), mat=M["plank"], name="kereta")
for y in (0.05, 0.75):
    box((1.1, 0.05, 0.25), (2.5, y, DECK + 0.6), mat=M["plank"], name="kereta_sisi")
for y in (-0.02, 0.82):
    torus(0.3, 0.05, (2.8, y, DECK + 0.32), rot=(math.pi / 2, 0, 0), mat=M["post"], name="roda")
beam((1.95, 0.15, DECK + 0.47), (1.1, 0.15, DECK + 0.15), 0.03, M["post"], name="pemegang")
beam((1.95, 0.65, DECK + 0.47), (1.1, 0.65, DECK + 0.15), 0.03, M["post"], name="pemegang")
sack(2.4, 0.4, DECK + 0.49, yaw=0.2, k=0.85)

# ---------------------------------------------------------------- lamps (pelita on posts)


def lamp_post(x, y, h=2.2):
    cyl(0.07, h, (x, y, DECK + h / 2), mat=M["post"], verts=8, name="tiang_pelita")
    arm = (x + 0.45, y, DECK + h - 0.05)
    beam((x, y, DECK + h - 0.05), arm, 0.025, M["post"], name="lengan")
    # hanging lantern: a brass cap, base and four thin rods with the flame inside
    lx, ly, lz = x + 0.42, y, DECK + h - 0.5
    cyl(0.11, 0.05, (lx, ly, lz + 0.2), mat=M["brass"], verts=8, r2=0.03, name="tudung")
    cyl(0.09, 0.03, (lx, ly, lz - 0.12), mat=M["brass"], verts=8, name="tapak")
    for i in range(4):
        a = i * math.pi / 2 + math.pi / 4
        cyl(0.008, 0.32, (lx + math.cos(a) * 0.08, ly + math.sin(a) * 0.08, lz + 0.04), mat=M["brass"], verts=4, name="jeriji")
    beam((lx, ly, lz + 0.22), (lx, ly, DECK + h - 0.05), 0.006, M["iron"], verts=4, name="rantai")
    lamp((lx, ly, lz - 0.02), energy=float(os.environ.get("LAMP", "40")))


lamp_post(6.3, -HEAD_W / 2 + 0.35)
lamp_post(11.7, -HEAD_W / 2 + 0.35)
lamp_post(-3.0, -WALK_W / 2 + 0.1)
lamp_post(-11.0, -WALK_W / 2 + 0.1)
lamp_post(11.7, HEAD_W / 2 - 0.35)

# ---------------------------------------------------------------- scenery
kit.water(SEA)
kit.hills()
# a far shore with silhouetted stilt houses so the jetty reads as a port
box((160, 24, 0.6), (-10, 128, 0.2), mat=M["sand"], coll=kit.SCENERY, name="pantai_jauh")
for i in range(10):
    x = -55 + i * 11 + random.uniform(-3, 3)
    y = 122 + random.uniform(-3, 3)
    w = random.uniform(4.5, 6.5)
    box((w, 4, 2.4), (x, y, 2.6), mat=M["post"], coll=kit.SCENERY, name="rumah_jauh")
    for px in (-w / 2 + 0.3, w / 2 - 0.3):
        box((0.25, 4, 1.5), (x + px, y, 0.9), mat=M["post"], coll=kit.SCENERY, name="tiang_jauh")
    kit.prism([(y - 3.0, 3.6), (y + 3.0, 3.6), (y, 6.3)], w + 1.0, x, M["thatch"], coll=kit.SCENERY, name="atap_jauh")

kit.environment(cam=(-0.5, -13.0, 3.3), target=(7.0, 0.5, 1.0), lens=30, sun_elev=8, sun_rot=-140, sky=0.07, sun=9.0, haze=0.002, exposure=0.35)
kit.finish("harbour")
