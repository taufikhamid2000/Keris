"""Rumah Bendahara: the chief minister's residence on Bukit Melaka, beside the Istana. A noble house
compound, smaller and plainer than the palace. Two dressings of the same compound.

Run headless:
  blender -b -P scripts/blender/bendahara.py -- <out_dir>

Writes <out_dir>/bendahara.png and one GLB per variant:
  rumah_bendahara       lived in (Tun Mutahir's day, before 1510): seven-bay rumah ibu with a front serambi,
                        a rumah tengah and kitchen behind joined by a selang, a two-tier balai where
                        petitioners wait, a palisade with a roofed gate, spears at the gate, white umbrellas,
                        mats, a betel set, lamps
  rumah_bendahara_1511  the same compound after the household's fall: shutters shut or hanging, the gate
                        leaf down, mats and an umbrella thrown about, weeds through the yard
Each compound sits at the origin, gate at -Y. Ground is Z=0. About 44 x 46 m.
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
import kampung as kp  # noqa: E402  (resets the scene; house parts)

M = kit.M
GOLD = kit.flat("emas", (0.95, 0.66, 0.2), 0.3, **{"Metallic": 1.0})
WHITE = kit.flat("kain_putih", (0.80, 0.76, 0.66), 0.9)
WEED = kit.flat("rumput", (0.12, 0.24, 0.06), 0.9)
SIRAP = kit.wood("sirap", (0.025, 0.015, 0.01), (0.11, 0.06, 0.03), scale=14, rough=0.85)
OLD = kit.wood("kayu_tua", (0.05, 0.035, 0.022), (0.16, 0.11, 0.07), scale=5, rough=0.9)


def umbrella(c, x, y, z, h=2.6, fallen=False):
    if fallen:
        kit.beam((x, y, z + 0.05), (x + h * 0.9, y + 0.4, z + 0.05), 0.035, M["trim"], c, verts=6, name="batang_payung")
        kit.cyl(0.85, 0.3, (x + h * 0.9, y + 0.4, z + 0.5), rot=(0, 1.3, 0.2), mat=WHITE, coll=c, r2=0.05, verts=16, name="payung")
        return
    kit.cyl(0.035, h, (x, y, z + h / 2), mat=M["trim"], coll=c, name="batang_payung")
    kit.cyl(0.85, 0.3, (x, y, z + h), mat=WHITE, coll=c, r2=0.05, verts=16, name="payung")
    kit.cyl(0.87, 0.16, (x, y, z + h - 0.2), mat=WHITE, coll=c, verts=16, name="jumbai")
    kit.blob((x, y, z + h + 0.2), (0.06, 0.06, 0.1), GOLD, c, subdiv=1, name="kemuncak")


def palisade(c, W, D, gate_w, rnd, fallen_gate):
    """Paling fence around the compound with a roofed gate at -Y."""
    for (ax, ay), (bx, by) in (((-W / 2, -D / 2), (W / 2, -D / 2)), ((W / 2, -D / 2), (W / 2, D / 2)),
                               ((W / 2, D / 2), (-W / 2, D / 2)), ((-W / 2, D / 2), (-W / 2, -D / 2))):
        n = int(math.hypot(bx - ax, by - ay) / 0.45)
        for i in range(n + 1):
            x, y = ax + (bx - ax) * i / n, ay + (by - ay) * i / n
            if ay == by == -D / 2 and abs(x) < gate_w / 2 + 0.3:
                continue
            h = 2.1 + rnd.uniform(-0.05, 0.05)
            kit.box((0.14, 0.14, h), (x, y, h / 2), mat=OLD, coll=c, name="pagar")
        for z in (0.6, 1.7):
            if ay == by == -D / 2:
                for s in (-1, 1):
                    kit.box((W / 2 - gate_w / 2, 0.06, 0.08), (s * (W / 4 + gate_w / 4), ay + 0.1, z), mat=M["post"], coll=c, name="rasuk_pagar")
            else:
                kit.box((abs(bx - ax) + 0.06, abs(by - ay) + 0.06, 0.08), ((ax + bx) / 2, (ay + by) / 2, z), mat=M["post"], coll=c, name="rasuk_pagar")
    # gate house
    for sx in (-1, 1):
        for y in (-D / 2 - 0.8, -D / 2 + 0.8):
            kit.box((0.24, 0.24, 3.0), (sx * (gate_w / 2 + 0.2), y, 1.5), mat=M["post"], coll=c, name="tiang_gerbang")
    kit.hip(0, -D / 2, gate_w / 2 + 1.2, 1.6, gate_w / 2 + 0.2, 0.05, 3.0, 4.4, mat=SIRAP, coll=c, trim=GOLD, name="atap_gerbang")
    if fallen_gate:
        kit.box((gate_w / 2, 0.1, 2.4), (-gate_w / 4 - 0.4, -D / 2 - 1.8, 0.08), rot=(math.pi / 2 - 0.05, 0, 0.3), mat=OLD, coll=c, name="pintu_rebah")
        kit.box((gate_w / 2, 0.1, 2.4), (gate_w / 4 + 0.6, -D / 2 + 0.4, 1.2), rot=(0, 0, 1.2), mat=OLD, coll=c, name="pintu")
    else:
        for sx in (-1, 1):
            kit.box((gate_w / 2, 0.1, 2.4), (sx * (gate_w / 2 + 0.1), -D / 2 + gate_w / 4 + 0.1, 1.2), rot=(0, 0, sx * 1.45), mat=OLD, coll=c, name="pintu")


def balai(c, x0, y0, rnd, lived):
    """Two-tier open pavilion where people wait to be heard."""
    W, D, F = 10.0, 7.0, 1.0
    kp.stilts(c, x0 - W / 2, x0 + W / 2, y0 - D / 2, y0 + D / 2, F, step=2.5)
    kp.floor(c, x0 - W / 2, x0 + W / 2, y0 - D / 2, y0 + D / 2, F)
    for i in range(5):
        for j in range(4):
            if 0 < i < 4 and 0 < j < 3:
                continue
            kit.cyl(0.12, 2.6, (x0 - W / 2 + i * 2.5, y0 - D / 2 + j * D / 3, F + 1.3), mat=M["red"] if lived else OLD, coll=c, name="tiang")
    kit.hip(x0, y0, W / 2 + 1.0, D / 2 + 1.0, W / 2 - 1.6, 1.4, F + 2.6, F + 3.8, mat=SIRAP, coll=c, trim=GOLD, name="atap_bawah")
    kit.hip(x0, y0, W / 2 - 1.4, 1.9, W / 2 - 2.6, 0.05, F + 4.1, F + 5.4, mat=SIRAP, coll=c, trim=GOLD, name="atap_atas")
    kit.box((W - 3.2, 1.0, 1.4), (x0, y0, F + 3.6), mat=M["plank"], coll=c, name="dinding_tumpang")
    kp.stair(c, x0, y0 - D / 2, F, w=1.6)
    if lived:
        kit.box((W - 1.0, D - 1.0, 0.03), (x0, y0, F + 0.02), mat=M["rattan"], coll=c, name="tikar")
        kit.box((3.0, 2.0, 0.35), (x0, y0 + D / 2 - 1.4, F + 0.18), mat=M["trim"], coll=c, name="pentas")
        kit.box((2.4, 1.6, 0.04), (x0, y0 + D / 2 - 1.4, F + 0.37), mat=M["red"], coll=c, name="permaidani")
        kit.box((0.35, 0.25, 0.18), (x0 + 0.8, y0 + D / 2 - 1.8, F + 0.46), mat=M["brass"], coll=c, name="tepak_sirih")
        for x in (x0 - 3.5, x0 + 3.5):
            kit.lamp((x, y0 - D / 2 + 0.6, F + 2.2), coll=c, energy=20)
    else:
        for _ in range(3):
            kit.box((rnd.uniform(1.0, 2.0), rnd.uniform(0.8, 1.4), 0.03), (x0 + rnd.uniform(-3, 3), y0 + rnd.uniform(-2, 2), F + 0.02),
                    rot=(0, 0, rnd.uniform(0, 3)), mat=M["rattan"], coll=c, name="tikar")


def house(c, rnd, lived):
    W, D, F, H = 17.5, 9.0, 2.2, 2.8
    y0 = 6.0
    FS, SD = F - 0.4, 3.0
    kp.stilts(c, -W / 2, W / 2, y0 - D / 2, y0 + D / 2, F, step=2.5, r=0.15)
    kp.stilts(c, -W / 2, W / 2, y0 - D / 2 - SD, y0 - D / 2 - 1.5, FS, step=2.5, r=0.13)
    kp.floor(c, -W / 2, W / 2, y0 - D / 2, y0 + D / 2, F)
    kp.floor(c, -W / 2, W / 2, y0 - D / 2 - SD, y0 - D / 2, FS)
    kp.walls(c, -W / 2, W / 2, y0 - D / 2, y0 + D / 2, F, H, M["plank"], door="S", windows=4)
    kp.gable(c, 0, y0, W + 1.8, D / 2, F + H, pitch=46, ov=1.0, mat=SIRAP)
    kit.beam((-W / 2 - 0.9, y0 - D / 2 - 1.0, F + H - 0.05), (W / 2 + 0.9, y0 - D / 2 - 1.0, F + H - 0.05), 0.08, GOLD, c, verts=6, name="papan_cantik")
    # serambi with a turned-baluster railing and its own roof
    for i in range(int(W / 0.5) + 1):
        x = -W / 2 + i * 0.5
        if abs(x) > 1.0:
            kit.cyl(0.04, 0.7, (x, y0 - D / 2 - SD, FS + 0.35), mat=M["trim"], coll=c, verts=8, name="jejari")
    for s in (-1, 1):
        kit.box((W / 2 - 1.0, 0.1, 0.08), (s * (W / 4 + 0.5), y0 - D / 2 - SD, FS + 0.74), mat=M["trim"], coll=c, name="susur")
    for x in (-W / 2, -W / 4, 0, W / 4, W / 2):
        kit.cyl(0.12, 2.1, (x, y0 - D / 2 - SD, FS + 1.05), mat=M["post"], coll=c, name="tiang_serambi")
    kp.gable(c, 0, y0 - D / 2 - SD / 2 + 0.1, W + 1.0, SD / 2, FS + 2.1, pitch=30, ov=0.7, mat=SIRAP, horns=False)
    yb = kp.stair(c, 0, y0 - D / 2 - SD, FS, w=1.6)
    kp.foot_jar(c, 1.4, yb + 0.3)
    # rumah tengah and dapur behind, joined by a selang
    TY0, TY1 = y0 + D / 2 + 1.8, y0 + D / 2 + 8.8
    kit.box((2.0, 1.8, 0.1), (-3.0, y0 + D / 2 + 0.9, F - 0.25), mat=M["floor"], coll=c, name="selang")
    kp.stilts(c, -4.0, -2.0, y0 + D / 2 + 0.3, y0 + D / 2 + 1.5, F - 0.25, step=1.2)
    kit.prism([(y0 + D / 2 - 0.1, F + 1.8), (y0 + D / 2 + 1.9, F + 1.8), (y0 + D / 2 + 0.9, F + 2.6)], 2.4, -3.0, SIRAP, c, name="atap_selang")
    kp.stilts(c, -7.5, 1.5, TY0, TY1, F - 0.25)
    kp.floor(c, -7.5, 1.5, TY0, TY1, F - 0.25)
    kp.walls(c, -7.5, 1.5, TY0, TY1, F - 0.25, 2.5, M["plank"], windows=2)
    kp.gable(c, -3.0, (TY0 + TY1) / 2, 10.2, (TY1 - TY0) / 2, F + 2.25, pitch=42, mat=SIRAP)
    DX0, DX1, DY0, DY1 = 3.5, 9.0, TY0 + 0.5, TY1 - 0.5
    kp.stilts(c, DX0, DX1, DY0, DY1, F - 0.6)
    kp.floor(c, DX0, DX1, DY0, DY1, F - 0.6)
    kp.walls(c, DX0, DX1, DY0, DY1, F - 0.6, 2.2, M["weathered"], door="N")
    kp.gable(c, (DX0 + DX1) / 2, (DY0 + DY1) / 2, DX1 - DX0 + 1.0, (DY1 - DY0) / 2, F + 1.6, pitch=38, horns=False)
    kit.box((DX0 - 1.5, 1.6, 0.1), ((1.5 + DX0) / 2, (DY0 + DY1) / 2, F - 0.55), mat=M["floor"], coll=c, name="selang_dapur")
    kp.firewood(c, DX1 + 0.8, DY1 - 1.0, rnd)
    if lived:
        kit.box((6.0, 2.0, 0.03), (-3.5, y0 - D / 2 - 1.5, FS + 0.02), mat=M["rattan"], coll=c, name="tikar")
        kit.box((0.35, 0.25, 0.18), (-2.0, y0 - D / 2 - 1.2, FS + 0.11), mat=M["brass"], coll=c, name="tepak_sirih")
        for x in (-W / 2 + 1.0, W / 2 - 1.0):
            kit.lamp((x, y0 - D / 2 - SD + 0.4, FS + 1.8), coll=c, energy=20)
        for x in (-2.4, 2.4):
            umbrella(c, x, yb - 1.0, 0.0)
    else:
        for x in (-6.0, -1.5, 4.5):  # shutters pulled to, one hanging off
            kit.box((0.95, 0.06, 1.0), (x, y0 - D / 2 - 0.06, F + 1.25), mat=OLD, coll=c, name="tingkap_tutup")
        kit.box((0.45, 0.05, 1.0), (7.5, y0 - D / 2 - 0.25, F + 0.9), rot=(0.3, 0.6, 0.2), mat=M["trim"], coll=c, name="daun_tingkap_jatuh")
        kit.box((1.6, 1.2, 0.03), (2.0, y0 - D / 2 - 1.8, FS + 0.02), rot=(0, 0, 0.5), mat=M["rattan"], coll=c, name="tikar")
        umbrella(c, -4.0, yb - 2.0, 0.0, fallen=True)
        kit.box((1.2, 0.8, 0.03), (3.0, yb - 1.2, 0.02), rot=(0, 0, 1.1), mat=M["red"], coll=c, name="kain")


def compound(name, lived, seed):
    c = kit.new_group(name)
    rnd = random.Random(seed)
    W, D = 44.0, 46.0
    palisade(c, W, D, 3.2, rnd, fallen_gate=not lived)
    house(c, rnd, lived)
    balai(c, -11.0, -12.0, rnd, lived)
    # well and a frangipani in the yard
    kit.cyl(0.8, 0.8, (13.0, -10.0, 0.4), mat=kit.M["weathered"], coll=c, name="perigi")
    kit.cyl(0.62, 0.05, (13.0, -10.0, 0.81), mat=M["dark"], coll=c, name="air_perigi")
    kit.cyl(0.12, 2.4, (15.0, -16.0, 1.2), mat=M["trunk"], coll=c, name="batang")
    kit.blob((15.0, -16.0, 3.0), (1.6, 1.6, 1.0), M["leaf"], c, wobble=0.25, subdiv=2, name="daun")
    if lived:
        # spear rack and a guard's mat inside the gate
        for k in range(6):
            kit.beam((3.0 + k * 0.25, -D / 2 + 2.0, 0.0), (3.0 + k * 0.25, -D / 2 + 2.2, 2.6), 0.025, M["trim"], c, verts=6, name="tombak")
            kit.cyl(0.035, 0.35, (3.0 + k * 0.25, -D / 2 + 2.22, 2.75), mat=M["iron"], coll=c, r2=0.0, verts=6, name="mata_tombak")
        kit.box((1.8, 0.1, 0.1), (3.6, -D / 2 + 2.1, 1.6), mat=M["post"], coll=c, name="rak_tombak")
        kit.box((1.6, 1.0, 0.03), (-3.0, -D / 2 + 2.0, 0.02), mat=M["rattan"], coll=c, name="tikar_pengawal")
        for x in (-1.8, 1.8):
            umbrella(c, x, -D / 2 - 1.2, 0.0, h=2.2)
    else:
        for _ in range(160):  # weeds through the yard
            x, y = rnd.uniform(-W / 2 + 1, W / 2 - 1), rnd.uniform(-D / 2 + 1, D / 2 - 1)
            s = rnd.uniform(0.4, 1.0)
            kit.blob((x, y, s * 0.4), (s, s, s * 0.7), WEED, c, wobble=0.3, subdiv=1, seed=rnd.random() * 9, name="semak")
    return c


groups = [compound("rumah_bendahara", True, 3), compound("rumah_bendahara_1511", False, 5)]
kit.place(groups[0], (-25.0, 0.0, 0.0))
kit.place(groups[1], (25.0, 0.0, 0.0))
kit.ground(0.0, kit.fibre("halaman", (0.30, 0.25, 0.14), (0.52, 0.46, 0.28), scale=(3, 3, 3), bump=0.3))
kit.hills()
kit.environment(cam=(0.0, -70.0, 34.0), target=(0.0, 0.0, 0.0), lens=22, sun_elev=26, sun_rot=-130, sky=0.08, sun=8.0, haze=0.002, exposure=0.2)
kit.render_and_export("bendahara", groups)
