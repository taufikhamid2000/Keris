"""Jeti: landing stages on the Melaka river. Three variants built from shared parts; the scene
borrows the sampan and perahu from boats.py to show them in use.

Run headless:
  blender -b -P scripts/blender/jeti.py -- <out_dir>

Writes <out_dir>/jeti.png and one GLB per variant:
  pangkalan        a kampung landing: narrow plank walk on piles, a ladder to the water,
                   mooring posts and a washing step
  jeti_dagang      a merchants' cargo jetty: wide walk to a T-head with heavy bollards, rope
                   fenders and cargo waiting for the lighters
  jeti_syahbandar  the harbourmaster's landing: decks stepped down for the tide, a roofed
                   balai with a desk, ledger and steelyard, a white umbrella of office and a pennant
Each sits at the origin with the bank edge at Y=0 and the jetty running out over the water to -Y.
Bank ground is Z=0, the water Z=-1.2 and the riverbed Z=-3.6, as in the terrain's lower river.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
import boats  # noqa: E402  (resets the scene and defines the boat builders)

M = kit.M
OLD = kit.wood("kayu_tua", (0.05, 0.035, 0.022), (0.16, 0.11, 0.07), scale=5, rough=0.9)
WHITE = kit.flat("kain_putih", (0.78, 0.74, 0.64), 0.9)
BED, WATER = -3.6, -1.2


def pile(c, x, y, top, r=0.13):
    b = BED if y < 0 else -0.4
    kit.cyl(r, top - b, (x, y, (top + b) / 2), mat=OLD, coll=c, name="cerucuk")


def walk(c, rnd, x0, x1, y0, y1, z, step=2.0, across=True):
    """Plank deck over [x0,x1] x [y0,y1] at height z on piles every `step` m, joists below."""
    nx, ny = max(1, round((x1 - x0) / step)), max(1, round((y1 - y0) / step))
    for i in range(nx + 1):
        for j in range(ny + 1):
            pile(c, x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, z - 0.1)
    for i in range(nx + 1):
        kit.box((0.14, y1 - y0 + 0.2, 0.16), (x0 + (x1 - x0) * i / nx, (y0 + y1) / 2, z - 0.13), mat=M["post"], coll=c, name="gelegar")
    s = y0
    while s < y1 - 0.05:
        w = min(rnd.uniform(0.26, 0.36), y1 - s)
        kit.box((x1 - x0 + rnd.uniform(0.0, 0.2), w - 0.03, 0.06), (rnd.uniform(-0.05, 0.05) + (x0 + x1) / 2, s + w / 2, z - 0.02),
                rot=(0, 0, rnd.uniform(-0.01, 0.01)), mat=rnd.choice((M["plank"], M["weathered"])), coll=c, name="papan")
        s += w


def ladder(c, x, y, z_top, z_bot):
    for sx in (-0.25, 0.25):
        kit.beam((x + sx, y, z_bot - 0.6), (x + sx, y + 0.1, z_top + 0.6), 0.04, OLD, c, verts=6, name="tangga")
    z = z_bot - 0.3
    while z < z_top:
        kit.beam((x - 0.25, y + 0.02, z), (x + 0.25, y + 0.02, z), 0.025, M["post"], c, verts=6, name="anak_tangga")
        z += 0.35


def fender(c, x, y, z):
    kit.beam((x, y, z), (x, y, z - 0.6), 0.01, M["rope"], c, verts=4, name="tali")
    kit.blob((x, y, z - 0.85), (0.16, 0.16, 0.3), M["rope"], c, wobble=0.1, subdiv=2, name="lapik")


def pangkalan(name, rnd):
    c = kit.new_group(name)
    z = 0.4
    walk(c, rnd, -0.9, 0.9, -8.0, 0.5, z)
    ladder(c, 0.0, -8.15, z, WATER)
    for x in (-1.2, 1.2):  # mooring posts standing proud
        pile(c, x, -7.6, z + 0.9, r=0.11)
    kit.box((1.6, 0.7, 0.08), (1.5, -6.0, WATER + 0.25), mat=M["weathered"], coll=c, name="batu_basuh")
    pile(c, 1.1, -5.8, WATER + 0.2, r=0.07)
    pile(c, 1.9, -5.8, WATER + 0.2, r=0.07)
    kit.beam((1.2, -7.6, z + 0.6), (2.4, -9.5, WATER + 0.4), 0.012, M["rope"], c, verts=4, name="tali_tambat")
    kit.tempayan(-0.4, -1.0, z, k=0.7, mat=M["clay"], coll=c)
    return c


def jeti_dagang(name, rnd):
    c = kit.new_group(name)
    z = 0.6
    walk(c, rnd, -2.0, 2.0, -20.0, 0.5, z, step=2.5)
    walk(c, rnd, -7.0, 7.0, -25.0, -20.0, z, step=2.5)
    for x in (-6.6, -2.2, 2.2, 6.6):  # bollards along the face
        kit.cyl(0.24, 1.0, (x, -24.8, z + 0.45), mat=OLD, coll=c, name="tiang_tambat")
        kit.cyl(0.28, 0.08, (x, -24.8, z + 0.97), mat=OLD, coll=c, name="kepala")
    for x in (-5.0, -1.0, 3.0, 6.0):
        fender(c, x, -25.15, z - 0.05)
    for y in (-22.0, -24.0):
        fender(c, -7.15, y, z - 0.05)
        fender(c, 7.15, y, z - 0.05)
    ladder(c, -4.0, -25.2, z, WATER)
    # cargo staged on the T-head and along the walk
    for _ in range(10):
        kit.sack(rnd.uniform(-6, 6), rnd.uniform(-23.5, -21), z, seed=rnd.random() * 9, yaw=rnd.uniform(0, 3), coll=c)
    for k in range(5):
        kit.tempayan(4.5 + 0.6 * (k % 3), -21.0 - 0.6 * (k // 3), z, k=1.0, mat=rnd.choice((M["glaze"], M["clay"])), coll=c)
    for k in range(3):
        kit.box((0.9, 0.6, 0.55), (-5.5 + k * 1.0, -20.8, z + 0.28), mat=rnd.choice((M["indigo"], M["red"], M["sack"])), coll=c, name="bandela")
    kit.box((0.8, 0.8, 0.7), (1.2, -10.0, z + 0.35), rot=(0, 0, 0.2), mat=M["plank"], coll=c, name="peti")
    kit.beam((6.6, -24.8, z + 0.8), (7.6, -27.0, WATER + 0.9), 0.015, M["rope"], c, verts=4, name="tali_tambat")
    return c


def jeti_syahbandar(name, rnd):
    c = kit.new_group(name)
    # three decks stepping down so a boat can land at any tide
    decks = [(0.6, -0.0, -7.0, 8.0), (-0.2, -7.0, -10.0, 8.0), (-0.85, -10.0, -12.5, 8.0)]
    for z, y_top, y_bot, w in decks:
        walk(c, rnd, -w / 2, w / 2, y_bot, y_top + 0.3, z)
    for (z0, _, y, _), (z1, _, _, _) in zip(decks, decks[1:]):
        for k in range(3):  # steps between decks
            kit.box((3.0, 0.35, 0.1), (0, y - 0.18 - 0.35 * k, z0 - (z0 - z1) * (k + 1) / 4), mat=M["plank"], coll=c, name="anak_tangga")
    # balai on the top deck
    zf = 0.6
    for x in (-2.6, 2.6):
        for y in (-1.2, -5.6):
            kit.cyl(0.12, 2.6, (x, y, zf + 1.3), mat=M["post"], coll=c, name="tiang")
    kit.hip(0, -3.4, 3.4, 2.9, 1.2, 0.6, zf + 2.55, zf + 4.3, mat=M["thatch"], coll=c, name="atap")
    kit.box((5.2, 0.05, 0.6), (0, -1.2, zf + 0.3), mat=M["trim"], coll=c, name="dinding_rendah")
    kit.box((1.6, 0.8, 0.08), (-0.8, -2.4, zf + 0.42), mat=M["trim"], coll=c, name="meja_rendah")
    for x in (-1.5, -0.1):
        kit.box((0.08, 0.7, 0.36), (x, -2.4, zf + 0.2), mat=M["trim"], coll=c, name="kaki_meja")
    kit.box((0.4, 0.3, 0.06), (-1.0, -2.4, zf + 0.49), mat=M["red"], coll=c, name="buku")
    kit.box((1.6, 1.2, 0.02), (-0.8, -3.4, zf + 0.01), mat=M["rattan"], coll=c, name="tikar")
    # steelyard hung from the front beam
    kit.beam((1.6, -5.6, zf + 2.55), (1.6, -5.6, zf + 1.7), 0.01, M["rope"], c, verts=4, name="tali")
    kit.beam((1.1, -5.6, zf + 1.7), (2.0, -5.6, zf + 1.7), 0.02, M["trim"], c, verts=6, name="dacing")
    kit.blob((1.95, -5.6, zf + 1.58), (0.05, 0.05, 0.07), M["iron"], c, subdiv=1, name="batu_dacing")
    kit.sack(1.15, -5.6, zf, k=0.8, seed=5.0, coll=c)
    # white umbrella of office and a pennant
    kit.cyl(0.04, 2.6, (3.4, -6.6, zf + 1.3), mat=M["trim"], coll=c, name="batang_payung")
    kit.cyl(0.9, 0.35, (3.4, -6.6, zf + 2.6), mat=WHITE, coll=c, r2=0.05, verts=16, name="payung")
    kit.cyl(0.92, 0.18, (3.4, -6.6, zf + 2.4), mat=WHITE, coll=c, verts=16, name="jumbai")
    kit.cyl(0.05, 6.5, (-3.7, -6.7, zf + 3.25), mat=M["post"], coll=c, name="tiang_panji")
    kit.sheet(1.8, 0.5, (-2.8, -6.7, zf + 6.1), mat=M["red"], coll=c, bulge=0.1, name="panji")
    for x in (-3.9, 3.9):
        pile(c, x, -12.3, -0.85 + 0.9, r=0.12)
    for _ in range(4):
        kit.sack(rnd.uniform(-3, 3), rnd.uniform(-9.5, -7.5), -0.2, seed=rnd.random() * 9, coll=c)
    return c


rnd = random.Random(1511)
groups = [pangkalan("pangkalan", rnd), jeti_dagang("jeti_dagang", rnd), jeti_syahbandar("jeti_syahbandar", rnd)]
SPOTS = [(-14.0, 0.0), (0.0, 0.0), (17.0, 0.0)]
for g, (x, y) in zip(groups, SPOTS):
    kit.place(g, (x, y, 0))

# boats in use: a sampan at the kampung landing, a perahu alongside the cargo jetty, a laden sampan at the steps
for fn, args, loc, yaw in ((boats.sampan, ("sampan_jeti", False), (-11.8, -9.6, WATER + 0.16), 70),
                           (boats.perahu, ("perahu_jeti", True), (0.0, -28.4, WATER + 0.55), 0),
                           (boats.sampan, ("sampan_muat", True), (17.5, -14.0, WATER + 0.16), -5)):
    kit.place(fn(*args), loc, math.radians(yaw))

bank = kit.fibre("tebing", (0.30, 0.24, 0.13), (0.52, 0.44, 0.26), scale=(3, 3, 3), bump=0.3)
kit.box((240, 120, 4.0), (0, 60, -2.0), mat=bank, coll=kit.SCENERY, name="tebing")
kit.box((400, 400, 0.02), (0, 0, WATER), mat=M["water"], coll=kit.SCENERY, name="sungai")
kit.box((400, 400, 0.2), (0, 0, BED - 0.1), mat=M["sand"], coll=kit.SCENERY, name="dasar")
kit.hills()
kit.environment(cam=(-4.0, -42.0, 7.5), target=(2.0, -9.0, 0.0), lens=22, sun_elev=22, sun_rot=-130, sky=0.08, sun=8.0, haze=0.002, exposure=0.2)
kit.render_and_export("jeti", groups)
