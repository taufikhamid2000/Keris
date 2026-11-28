"""Nature kit: coconut palms, banana plants, bushes and rocks, in shape variants.

Run headless:
  blender -b -P scripts/blender/nature.py -- <out_dir>

Writes <out_dir>/nature.png (every variant in one clearing) and one GLB per variant,
each at the origin. Colour tint, rotation and +-10% scale are done in the game, so the
variants here differ in shape. To add one, add a line to the table for its kind.

Fronds and banana leaves are single-sided: turn on double-sided materials in the engine.
"""

import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, blob  # noqa: E402

kit.reset()
Z = Vector((0, 0, 1))
DEAD = kit.fibre("pelepah_kering", (0.32, 0.22, 0.12), (0.55, 0.42, 0.25), bump=0.3)

#          name          height lean fronds length coconuts young
PALMS = [
    ("palm_tall",   9.0, 1.8, 16, 4.2, 7, False),
    ("palm_lean",   7.0, 3.6, 14, 3.8, 5, False),
    ("palm_young",  0.8, 0.1, 10, 2.6, 0, True),
]
#          name          stems (height, x, y)                      bunch
BANANAS = [
    ("banana_single", [(2.4, 0.0, 0.0)], True),
    ("banana_clump",  [(2.6, 0.0, 0.0), (1.8, 0.6, 0.3), (1.2, -0.5, 0.4)], False),
]
#          name           blobs spread height flowers
BUSHES = [
    ("bush_small",    6, 0.6, 0.7, False),
    ("bush_wide",    11, 1.4, 0.9, False),
    ("bush_flower",   8, 0.9, 1.1, True),
]
#          name           pieces: (x, y, sx, sy, sz)
ROCKS = [
    ("rock_boulder", [(0.0, 0.0, 1.1, 0.9, 0.8)]),
    ("rock_flat",    [(0.0, 0.0, 1.3, 1.0, 0.35)]),
    ("rock_cluster", [(0.0, 0.0, 0.6, 0.5, 0.45), (0.7, 0.2, 0.4, 0.35, 0.3), (-0.4, 0.5, 0.3, 0.3, 0.22)]),
]

# ---------------------------------------------------------------- mesh helpers


def tube(c, pts, radii, mat, name, verts=8):
    """A lofted tube through pts with a radius per point, capped at the top."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    n = len(pts)
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        a = t.cross(Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))).normalized()
        b = t.cross(a)
        rings.append([bm.verts.new(p + (a * math.cos(k * 2 * math.pi / verts) + b * math.sin(k * 2 * math.pi / verts)) * radii[i]) for k in range(verts)])
    for i in range(n - 1):
        for k in range(verts):
            k2 = (k + 1) % verts
            bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
    bm.faces.new(rings[-1])
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return kit._obj(me, mat, (0, 0, 0), (0, 0, 0), c, name)


def arc(base, az, elev, length, droop, n):
    """Points of a frond or leaf rib: leaves base at elev, then droops."""
    h = Vector((math.cos(az), math.sin(az), 0))
    out = []
    for i in range(n + 1):
        s = i / n
        d = s * length
        out.append(base + h * (d * math.cos(elev)) + Z * (d * math.sin(elev) - droop * length * s * s))
    return out, Vector((-math.sin(az), math.cos(az), 0))


def frond(c, r, base, az, elev, length, droop, mat, n=18):
    pts, side = arc(base, az, elev, length, droop, n)
    tube(c, pts, [0.035 * (1 - i / (n + 1)) + 0.008 for i in range(n + 1)], M["trunk"], "pelepah", verts=4)
    me = bpy.data.meshes.new("daun_kelapa")
    bm = bmesh.new()
    step = length / n
    for i in range(2, n):
        s = i / n
        p = pts[i]
        t = (pts[i + 1] - p).normalized()
        ll = 0.95 * math.sin(math.pi * min(1.0, s * 1.05)) ** 0.5 + 0.12
        for sg in (-1, 1):
            tip = p + side * (sg * ll * 0.85) + t * (ll * 0.35) + Z * (-ll * r.uniform(0.3, 0.6))
            w = t * step * 0.75
            bm.faces.new([bm.verts.new(v) for v in (p, p + w, tip + w * 0.25, tip)])
    bm.to_mesh(me)
    bm.free()
    return kit._obj(me, mat, (0, 0, 0), (0, 0, 0), c, "daun_kelapa")


def banana_leaf(c, r, base, az, elev, length, width, droop, mat, n=12, m=4):
    pts, side = arc(base, az, elev, length, droop, n)
    tube(c, pts, [0.035 * (1 - i / (n + 1)) + 0.01 for i in range(n + 1)], M["leaf_lit"], "pelepah_pisang", verts=5)
    me = bpy.data.meshes.new("daun_pisang")
    bm = bmesh.new()
    s0 = 0.2
    grid = []
    for i in range(n + 1):
        s = s0 + (1 - s0) * i / n
        p = _at(pts, s)
        ws = width * max(0.02, math.sin(math.pi * (i / n)) ** 0.6)
        row = []
        for j in range(-m, m + 1):
            u = j / m
            row.append(bm.verts.new(p + side * (u * ws) + Z * (-0.3 * ws * u * u)))
        grid.append(row)
    for i in range(n):
        for j in range(2 * m):
            # tears: drop some outer faces so the leaf reads as wind-torn
            if abs(j - m + 0.5) > 1.5 and r.random() < 0.14:
                continue
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return kit._obj(me, mat, (0, 0, 0), (0, 0, 0), c, "daun_pisang")


def _at(pts, s):
    f = s * (len(pts) - 1)
    i = min(int(f), len(pts) - 2)
    return pts[i].lerp(pts[i + 1], f - i)


# ---------------------------------------------------------------- builders


def palm(name, H, lean, nf, flen, nuts, young, seed):
    c = kit.new_group(name)
    r = random.Random(seed)
    if young:
        top = Vector((0, 0, H))
        tube(c, [Vector((0, 0, 0)), top], [0.2, 0.14], M["trunk"], "batang", verts=8)
    else:
        n = 18
        pts = [Vector((lean * (i / n) ** 1.8, 0, H * i / n)) for i in range(n + 1)]
        radii = [(0.32 if i == 0 else 0.22 - 0.07 * i / n) * (1.06 if i % 2 else 1.0) for i in range(n + 1)]
        tube(c, pts, radii, M["trunk"], "batang", verts=9)
        top = pts[-1]
        blob(top + Z * 0.15, (0.24, 0.24, 0.3), M["trunk"], c, wobble=0.1, seed=seed, subdiv=2, smooth=True, name="umbut")
    for k in range(nf):
        az = k * 2 * math.pi / nf + r.uniform(-0.2, 0.2)
        if young:
            elev, droop = math.radians(r.uniform(45, 70)), r.uniform(0.25, 0.4)
        else:
            elev, droop = math.radians(r.uniform(5, 45)), r.uniform(0.35, 0.6)
        frond(c, r, top + Z * 0.2, az, elev, flen * r.uniform(0.85, 1.1), droop, M["leaf"] if k % 3 else M["leaf_lit"])
    if not young:
        for k in range(2):
            frond(c, r, top, r.uniform(0, 6.28), math.radians(-60), flen * 0.7, 0.1, DEAD)
    for k in range(nuts):
        a = k * 2 * math.pi / max(1, nuts) + r.uniform(-0.3, 0.3)
        blob(top + Vector((math.cos(a) * 0.25, math.sin(a) * 0.25, -0.15 - r.uniform(0, 0.2))), (0.13, 0.13, 0.15), M["fruit_grn"] if k % 2 else M["trunk"], c, wobble=0.08, seed=k, subdiv=2, smooth=True, name="kelapa")
    return c


def banana(name, stems, bunch, seed):
    c = kit.new_group(name)
    r = random.Random(seed)
    for h, x, y in stems:
        b = Vector((x, y, 0))
        tube(c, [b, b + Z * h], [0.09 * h / 2.4 + 0.03, 0.06 * h / 2.4 + 0.02], M["leaf_lit"], "batang_pisang", verts=10)
        nl = 5 + int(h * 1.2)
        for k in range(nl):
            az = k * 2.4 + r.uniform(-0.3, 0.3)
            up = k < 2
            banana_leaf(c, r, b + Z * (h - 0.1), az, math.radians(r.uniform(70, 80) if up else r.uniform(30, 55)), h * r.uniform(1.0, 1.2), h * 0.22, 0.15 if up else r.uniform(0.3, 0.5), M["leaf_lit"] if k % 2 else M["leaf"])
    if bunch:
        h, x, y = stems[0]
        top = Vector((x, y, h))
        stalk = [top + Vector((0.2 * s, 0, -0.9 * s * s)) for s in (0.0, 0.3, 0.6, 1.0)]
        tube(c, stalk, [0.03] * 4, M["leaf_lit"], "tandan", verts=5)
        for k in range(5):
            cz = stalk[2].z - 0.1 * k
            for j in range(7):
                a = j * 0.9 + k * 0.4
                blob(Vector((stalk[2].x + math.cos(a) * 0.1, stalk[2].y + math.sin(a) * 0.1, cz)), (0.03, 0.03, 0.1), M["fruit_grn"], c, wobble=0.05, subdiv=1, smooth=True, rot=(math.sin(a) * 0.6, -math.cos(a) * 0.6, 0), name="pisang")
        blob(stalk[-1], (0.08, 0.08, 0.16), M["red"], c, wobble=0.05, subdiv=2, smooth=True, name="jantung")
    return c


def bush(name, n, spread, h, flowers, seed):
    c = kit.new_group(name)
    r = random.Random(seed)
    heads = []
    for k in range(n * 3):
        a, d = r.uniform(0, 6.28), r.uniform(0, spread)
        s = r.uniform(0.22, 0.38) * (1.2 - 0.4 * d / max(spread, 0.01))
        loc = Vector((math.cos(a) * d, math.sin(a) * d * 0.7, s * 0.7 + r.uniform(0, h - s)))
        blob(loc, (s, s, s * 0.85), M["leaf"] if k % 4 else M["leaf_lit"], c, wobble=0.45, seed=seed + k, subdiv=3, smooth=True, name="rimbun")
        heads.append((loc, s))
    if flowers:
        for k in range(26):
            loc, s = heads[k % len(heads)]
            v = Vector((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(0.1, 1))).normalized()
            blob(loc + v * s * 0.95, (0.05, 0.05, 0.05), M["fruit_red"] if k % 3 else M["gold_cloth"], c, wobble=0.1, subdiv=1, smooth=True, name="bunga")
    return c


def rocks(name, pieces, seed):
    c = kit.new_group(name)
    for k, (x, y, sx, sy, sz) in enumerate(pieces):
        blob((x, y, sz * 0.55), (sx, sy, sz), M["rock"], c, wobble=0.3, seed=seed + k * 3, subdiv=3, smooth=False, name="batu")
    return c


# ---------------------------------------------------------------- the clearing

if __name__ == "__main__":
    groups, spots = [], []
    for i, v in enumerate(PALMS):
        groups.append(palm(*v, seed=i * 7 + 2))
    spots += [((-6.5, 7.0), -20), ((1.0, 9.0), 160), ((6.5, 4.5), 0)]
    for i, v in enumerate(BANANAS):
        groups.append(banana(*v, seed=i * 5 + 3))
    spots += [((-3.0, 3.5), 0), ((3.2, 2.5), 40)]
    for i, v in enumerate(BUSHES):
        groups.append(bush(*v, seed=i * 13 + 4))
    spots += [((-5.0, 0.5), 0), ((-0.5, 1.0), 0), ((4.8, -0.3), 0)]
    for i, v in enumerate(ROCKS):
        groups.append(rocks(*v, seed=i * 17 + 5))
    spots += [((-2.5, -1.2), 20), ((1.6, -1.6), 0), ((0.0, -3.0), 70)]

    for c, ((x, y), yaw) in zip(groups, spots):
        kit.place(c, (x, y, 0), math.radians(yaw))

    kit.ground(0.0, kit.fibre("rumput", (0.16, 0.20, 0.08), (0.42, 0.40, 0.20), scale=(3, 3, 3), bump=0.3))
    kit.hills()
    kit.environment(cam=(0.0, -15.0, 2.4), target=(0.0, 3.0, 4.2), lens=24, sun_elev=16, sun_rot=-140, sky=0.08, sun=8.0, haze=0.002, exposure=0.3)
    kit.render_and_export("nature", groups)
