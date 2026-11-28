"""Hutan, bakau and sawah: rainforest, foothill, mangrove and rice-field assets for the region,
built on the tube and frond helpers from nature.py.

Run headless:
  blender -b -P scripts/blender/hutan.py -- <out_dir>

Writes <out_dir>/hutan.png and one GLB per variant:
  pokok_tualang  emergent rainforest giant, ~45 m: straight pale trunk, plank buttresses, flat broken crown
  pokok_hutan    canopy tree, ~24 m: dark trunk forking into limbs, clumped crown, hanging lianas
  pokok_bukit    foothill tree, ~14 m: crooked trunk, dense rounded crown
  buluh          bamboo clump: arching culms with leaf sprays
  paku_pakis     tree fern, ~4 m: slim trunk with a crown of fronds
  bakau          mangrove (Rhizophora), ~9 m: trunk on arching stilt roots, glossy crown
  nipah          nipah palm clump: stemless fronds rising from the mud
  sawah          a 20 x 20 m padi plot: earth bunds, flooded mud, rows of rice tufts (one mesh)
  dangau         a field hut on stilts with a palm-leaf roof, for the padi
Each sits at the origin on the ground (Z=0); the mangrove and nipah expect mud at Z=0 with
water at about Z=0.3 at high tide. Leaves are single-sided: render them double-sided in the engine.
"""

import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
import nature  # noqa: E402  (resets the scene; tube and frond)

M = kit.M
V = Vector
BARK_PALE = kit.fibre("kulit_tualang", (0.42, 0.40, 0.34), (0.70, 0.67, 0.58), scale=(3, 3, 12), bump=0.6)
BARK = kit.fibre("kulit_kayu", (0.10, 0.08, 0.06), (0.30, 0.25, 0.18), scale=(4, 4, 14), bump=0.8)
CANOPY = kit.flat("daun_hutan", (0.05, 0.14, 0.04), 0.75)
CANOPY_LIT = kit.flat("daun_hutan_muda", (0.14, 0.26, 0.06), 0.7)
MANGROVE = kit.flat("daun_bakau", (0.06, 0.18, 0.06), 0.35)
BAMBOO = kit.flat("buluh_hijau", (0.30, 0.36, 0.10), 0.5)
FERN = kit.flat("daun_paku", (0.12, 0.30, 0.06), 0.7)
NIPAH = kit.flat("daun_nipah", (0.10, 0.24, 0.07), 0.6)
PADI = kit.flat("padi", (0.30, 0.42, 0.10), 0.7)
MUD = kit.fibre("lumpur", (0.08, 0.06, 0.04), (0.20, 0.15, 0.10), scale=(4, 4, 4), bump=0.4)
SAWAH_WATER = kit.flat("air_sawah", (0.10, 0.12, 0.08), 0.05, **{"Transmission Weight": 0.6, "IOR": 1.33})


def crown(c, rnd, centre, rx, ry, rz, n, mats=(CANOPY, CANOPY_LIT), flat=1.0):
    """A clumped crown: n wobbly lobes scattered in an ellipsoid."""
    for _ in range(n):
        a, r = rnd.uniform(0, 2 * math.pi), rnd.uniform(0.0, 1.0) ** 0.8
        p = V(centre) + V((math.cos(a) * r * rx, math.sin(a) * r * ry, rnd.uniform(-0.5, 0.5) * rz * flat))
        s = rnd.uniform(0.5, 0.8)
        kit.blob(tuple(p), (s * rx, s * ry, s * rz * 0.8), rnd.choice(mats), c, wobble=0.3, seed=rnd.random() * 9, subdiv=2, name="daun")


def limb(c, a, b, r0, r1, mat, bend=0.0, n=6):
    a, b = V(a), V(b)
    pts = [a.lerp(b, i / n) + V((0, 0, bend * math.sin(math.pi * i / n))) for i in range(n + 1)]
    nature.tube(c, pts, [r0 + (r1 - r0) * i / n for i in range(n + 1)], mat, "dahan", verts=8)


def buttresses(c, rnd, r, h, reach, mat, n=5):
    for k in range(n):
        az = k * 2 * math.pi / n + rnd.uniform(-0.3, 0.3)
        ob = kit.prism([(0.0, 0.0), (reach * rnd.uniform(0.8, 1.2), 0.0), (r * 0.6, 0.4), (0.0, h * rnd.uniform(0.8, 1.1))], 0.22, 0.0, mat, c, name="banir")
        ob.rotation_euler = (0, 0, az - math.pi / 2)


def pokok_tualang(name, rnd):
    c = kit.new_group(name)
    H = 45.0
    pts = [V((0.15 * math.sin(i), 0.1 * math.cos(i * 0.7), H * 0.85 * i / 8)) for i in range(9)]
    nature.tube(c, pts, [1.1 - 0.6 * i / 8 for i in range(9)], BARK_PALE, "batang", verts=12)
    buttresses(c, rnd, 1.1, 5.5, 4.2, BARK_PALE, n=6)
    top = pts[-1]
    for k in range(5):  # limbs spreading into an umbrella crown
        az = k * 2 * math.pi / 5 + rnd.uniform(-0.3, 0.3)
        end = top + V((math.cos(az) * 8.0, math.sin(az) * 8.0, rnd.uniform(3.0, 5.5)))
        limb(c, top - V((0, 0, 2)), end, 0.45, 0.15, BARK_PALE, bend=1.0)
        crown(c, rnd, end + V((0, 0, 1.0)), 5.5, 5.5, 3.2, 8)
    crown(c, rnd, top + V((0, 0, 5.0)), 6.5, 6.5, 3.2, 10)
    return c


def pokok_hutan(name, rnd):
    c = kit.new_group(name)
    H = 24.0
    pts = [V((0.3 * math.sin(i * 0.8), 0.0, H * 0.55 * i / 6)) for i in range(7)]
    nature.tube(c, pts, [0.6 - 0.25 * i / 6 for i in range(7)], BARK, "batang", verts=10)
    buttresses(c, rnd, 0.6, 2.2, 1.6, BARK, n=4)
    fork = pts[-1]
    for k in range(4):
        az = k * math.pi / 2 + rnd.uniform(-0.4, 0.4)
        end = fork + V((math.cos(az) * 5.0, math.sin(az) * 5.0, rnd.uniform(6.0, 9.0)))
        limb(c, fork, end, 0.32, 0.1, BARK, bend=0.8)
        crown(c, rnd, end, 4.2, 4.2, 3.0, 7)
        # a liana hanging from the limb
        if k % 2 == 0:
            mid = fork.lerp(end, 0.7)
            nature.tube(c, [mid, mid + V((0.3, 0.2, -6.0)), mid + V((0.5, 0.6, -12.0)), V((mid.x + 0.6, mid.y + 0.8, 0.0))],
                        [0.05, 0.05, 0.05, 0.06], M["trunk"], "akar_gantung", verts=5)
    crown(c, rnd, fork + V((0, 0, 9.0)), 4.5, 4.5, 3.0, 8)
    return c


def pokok_bukit(name, rnd):
    c = kit.new_group(name)
    pts = [V((0.6 * math.sin(i * 0.9), 0.4 * math.sin(i * 0.5), 7.5 * i / 5)) for i in range(6)]
    nature.tube(c, pts, [0.32 - 0.14 * i / 5 for i in range(6)], BARK, "batang", verts=8)
    for k in range(3):
        az = k * 2.1 + 0.4
        end = pts[-1] + V((math.cos(az) * 2.5, math.sin(az) * 2.5, 2.5))
        limb(c, pts[-2], end, 0.16, 0.07, BARK, bend=0.4)
    crown(c, rnd, pts[-1] + V((0, 0, 3.2)), 4.2, 4.2, 3.4, 14, flat=0.6)
    return c


def buluh(name, rnd):
    c = kit.new_group(name)
    for k in range(16):
        az = rnd.uniform(0, 2 * math.pi)
        base = V((math.cos(az) * rnd.uniform(0, 0.8), math.sin(az) * rnd.uniform(0, 0.8), 0))
        lean = rnd.uniform(0.15, 0.5)
        L = rnd.uniform(9, 14)
        pts = [base + V((math.cos(az) * L * lean * (i / 8) ** 2, math.sin(az) * L * lean * (i / 8) ** 2, L * (i / 8) * (1 - 0.3 * lean * (i / 8) ** 2))) for i in range(9)]
        nature.tube(c, pts, [0.06 - 0.035 * i / 8 for i in range(9)], BAMBOO, "buluh", verts=6)
        for i in (4, 5, 6, 7, 8):
            kit.blob(tuple(pts[i] + V((math.cos(az) * 0.4, math.sin(az) * 0.4, -0.3))), (rnd.uniform(0.5, 0.8), rnd.uniform(0.5, 0.8), rnd.uniform(0.4, 0.7)), rnd.choice((CANOPY_LIT, M["leaf_lit"])), c,
                     wobble=0.5, seed=rnd.random() * 9, subdiv=2, name="daun_buluh")
    return c


def paku_pakis(name, rnd):
    c = kit.new_group(name)
    pts = [V((0.1 * math.sin(i), 0, 3.6 * i / 5)) for i in range(6)]
    nature.tube(c, pts, [0.14, 0.12, 0.11, 0.1, 0.1, 0.12], M["trunk"], "batang", verts=7)
    for k in range(12):
        nature.frond(c, rnd, pts[-1], k * 2 * math.pi / 12 + rnd.uniform(-0.1, 0.1), math.radians(rnd.uniform(25, 45)), 2.4, 0.35, FERN, n=10)
    return c


def bakau(name, rnd):
    c = kit.new_group(name)
    trunk = [V((0, 0, 1.8 + 1.0 * i)) for i in range(5)]
    nature.tube(c, trunk, [0.2, 0.18, 0.16, 0.13, 0.1], BARK, "batang", verts=8)
    for k in range(11):  # arching stilt roots
        az = k * 2 * math.pi / 11 + rnd.uniform(-0.2, 0.2)
        h0 = rnd.uniform(1.4, 2.6)
        R = rnd.uniform(1.6, 2.8)
        d = V((math.cos(az), math.sin(az), 0))
        pts = [V((0, 0, h0)) + d * (R * s) + V((0, 0, 0.9 * math.sin(math.pi * s * 0.6) - h0 * s ** 1.6)) for s in (0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        pts[-1].z = -0.2
        nature.tube(c, pts, [0.07, 0.065, 0.06, 0.055, 0.05, 0.05], BARK, "akar_jangkang", verts=5)
    for k in range(4):
        az = k * 1.6
        limb(c, trunk[-2], trunk[-2] + V((math.cos(az) * 2.0, math.sin(az) * 2.0, 1.6)), 0.08, 0.04, BARK)
    crown(c, rnd, trunk[-1] + V((0, 0, 1.0)), 3.4, 3.4, 2.0, 12, mats=(MANGROVE,), flat=0.6)
    return c


def nipah(name, rnd):
    c = kit.new_group(name)
    for k in range(14):
        az = k * 2 * math.pi / 14 + rnd.uniform(-0.15, 0.15)
        base = V((math.cos(az) * 0.3, math.sin(az) * 0.3, 0.0))
        nature.frond(c, rnd, base, az, math.radians(rnd.uniform(55, 72)), rnd.uniform(5.0, 7.0), 0.18, NIPAH, n=16)
    kit.blob((0, 0, 0.25), (0.5, 0.5, 0.35), M["trunk"], c, wobble=0.2, subdiv=2, name="tandan")
    return c


def sawah(name, rnd):
    c = kit.new_group(name)
    S, BW, BH = 20.0, 0.6, 0.3
    kit.box((S, S, 0.1), (0, 0, -0.05), mat=MUD, coll=c, name="lumpur")
    kit.box((S - BW, S - BW, 0.02), (0, 0, 0.1), mat=SAWAH_WATER, coll=c, name="air")
    for sx, sy, w, d in ((0, -1, S, BW), (0, 1, S, BW), (-1, 0, BW, S), (1, 0, BW, S)):
        kit.box((w, d, BH), (sx * (S - BW) / 2, sy * (S - BW) / 2, BH / 2), mat=kit.fibre("batas", (0.20, 0.16, 0.09), (0.40, 0.33, 0.20), scale=(3, 3, 3), bump=0.5),
                coll=c, name="batas")
    # rice tufts: one mesh, a fan of blades per tuft, planted in rows
    verts, faces = [], []
    step = 0.3
    n = int((S - 2 * BW) / step)
    for i in range(n):
        for j in range(n):
            x = -S / 2 + BW + step * (i + 0.5) + rnd.uniform(-0.04, 0.04)
            y = -S / 2 + BW + step * (j + 0.5) + rnd.uniform(-0.04, 0.04)
            h = rnd.uniform(0.7, 0.95)
            for b in range(5):
                a = b * 2 * math.pi / 5 + rnd.uniform(-0.3, 0.3)
                lean = rnd.uniform(0.12, 0.3)
                k = len(verts)
                verts += [(x - 0.012 * math.sin(a), y + 0.012 * math.cos(a), 0.05), (x + 0.012 * math.sin(a), y - 0.012 * math.cos(a), 0.05),
                          (x + math.cos(a) * lean, y + math.sin(a) * lean, h)]
                faces.append((k, k + 1, k + 2))
    me = bpy.data.meshes.new("padi")
    me.from_pydata(verts, [], faces)
    kit._obj(me, PADI, (0, 0, 0), (0, 0, 0), c, "padi")
    return c


def dangau(name, rnd):
    c = kit.new_group(name)
    for x in (-1.2, 1.2):
        for y in (-1.0, 1.0):
            kit.cyl(0.07, 1.4, (x, y, 0.7), mat=M["post"], coll=c, name="tiang")
            kit.cyl(0.06, 1.6, (x, y, 2.2), mat=M["post"], coll=c, name="tiang_atas")
    kit.box((2.6, 2.2, 0.08), (0, 0, 1.4), mat=M["plank"], coll=c, name="lantai")
    kit.hip(0, 0, 1.9, 1.6, 0.9, 0.05, 2.9, 3.9, mat=M["thatch"], coll=c, name="atap")
    kit.beam((0.4, -1.1, 0.0), (0.4, -1.6, 1.4), 0.04, M["post"], c, verts=6, name="tangga")
    kit.box((1.2, 0.9, 0.03), (-0.4, 0.2, 1.45), mat=M["rattan"], coll=c, name="tikar")
    kit.tempayan(0.7, 0.5, 1.44, k=0.5, mat=M["clay"], coll=c)
    # scarecrow line: a rattle on a string to scare birds off the padi
    kit.beam((1.2, -1.0, 2.6), (6.0, -6.0, 1.2), 0.008, M["rope"], c, verts=4, name="tali_orang")
    kit.box((0.3, 0.05, 0.4), (6.0, -6.0, 1.0), mat=M["weathered"], coll=c, name="ketuk")
    kit.cyl(0.04, 1.2, (6.0, -6.0, 0.6), mat=M["post"], coll=c, name="cagak")
    return c


if __name__ == "__main__":
    rnd = random.Random(1511)
    BUILD = [(pokok_tualang, (-34.0, 34.0)), (pokok_hutan, (-14.0, 26.0)), (pokok_bukit, (0.0, 18.0)), (buluh, (9.0, 12.0)),
             (paku_pakis, (5.0, 4.0)), (bakau, (-20.0, 2.0)), (nipah, (-11.0, -2.0)), (sawah, (16.0, -8.0)), (dangau, (21.0, 4.0))]
    groups = []
    for fn, (x, y) in BUILD:
        g = fn(fn.__name__, rnd)
        kit.place(g, (x, y, 0.0), rnd.uniform(0, 6.28) if fn not in (sawah, dangau) else 0.2)
        groups.append(g)

    kit.ground(0.0, kit.fibre("tanah_hutan", (0.12, 0.10, 0.05), (0.30, 0.27, 0.14), scale=(3, 3, 3), bump=0.4))
    kit.box((24, 14, 0.04), (-16, 0, 0.02), mat=MUD, coll=kit.SCENERY, name="lumpur_bakau")
    kit.box((24, 14, 0.02), (-16, 0, 0.3), mat=M["water"], coll=kit.SCENERY, name="air_bakau")
    kit.hills()
    kit.environment(cam=(-2.0, -44.0, 9.0), target=(-4.0, 12.0, 11.0), lens=22, sun_elev=26, sun_rot=-130, sky=0.08, sun=8.0, haze=0.002, exposure=0.25)
    kit.render_and_export("hutan", groups)
