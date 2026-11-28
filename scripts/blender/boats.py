"""Boats for the Melaka harbour: a sampan, a perahu with a canted tanja sail and a
kajang cabin, and a Chinese junk with battened sails and a stern castle.

Run headless:
  blender -b -P scripts/blender/boats.py -- <out_dir>

Writes <out_dir>/boats.png plus one GLB per variant (see VARIANTS at the bottom): junk,
junk_furled, junk_small, perahu, perahu_furled, sampan, sampan_cargo. Each boat sits at
the origin, bow toward +X.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, beam, blob, box, lathe  # noqa: E402

kit.reset()
SAIL = kit.fibre("layar", (0.42, 0.30, 0.17), (0.74, 0.60, 0.40), scale=(25, 25, 25), bump=0.2)
JUNK_SAIL = kit.fibre("layar_wangkang", (0.30, 0.10, 0.05), (0.62, 0.26, 0.12), scale=(25, 25, 25), bump=0.2)
HULL_DARK = kit.wood("lambung", (0.035, 0.022, 0.014), (0.13, 0.075, 0.04), scale=3, rough=0.85)

# ---------------------------------------------------------------- shared builders


def hull(coll, L, B, D, sheer, stern_end, bow_end, mat, n=28, K=10, thick=0.06, deck_z=None):
    """Lofted open hull. t runs -1 (stern, -X) to +1 (bow, +X). The top edge rises
    toward both ends (sheer) and the keel rises a little too. *_end is the end width
    as a fraction of the beam: near 0 for pointed ends, larger for a transom."""
    me = bpy.data.meshes.new("lambung")
    bm = bmesh.new()
    rings, decks = [], []
    for i in range(n + 1):
        t = -1 + 2 * i / n
        end = bow_end if t > 0 else stern_end
        w = B / 2 * (end + (1 - end) * (1 - abs(t) ** 2.2))
        s = sheer * t * t
        f = 1 - 0.35 * t * t
        ring = []
        for k in range(K + 1):
            a = math.pi * k / K
            ring.append(bm.verts.new((t * L / 2, -w * math.cos(a), s - (s + D * f) * math.sin(a) ** 0.55)))
        rings.append(ring)
        if deck_z is not None:
            sa = min(1.0, max(0.0, (s - deck_z) / (s + D * f)) ** (1 / 0.55))
            decks.append((t * L / 2, w * math.sqrt(1 - sa * sa) * 0.98))
    for a, b in zip(rings, rings[1:]):
        for k in range(K):
            bm.faces.new((a[k], b[k], b[k + 1], a[k + 1]))
    bm.faces.new(rings[0])
    bm.faces.new(rings[-1][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=thick)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    kit._obj(me, mat, (0, 0, 0), (0, 0, 0), coll, "lambung")
    if deck_z is not None:
        me = bpy.data.meshes.new("geladak")
        bm = bmesh.new()
        pts = [bm.verts.new((x, -y, deck_z)) for x, y in decks] + [bm.verts.new((x, y, deck_z)) for x, y in reversed(decks)]
        bm.faces.new(pts)
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.08)
        bm.to_mesh(me)
        bm.free()
        kit._obj(me, M["floor"], (0, 0, 0), (0, 0, 0), coll, "geladak")
    return decks


def sail(coll, bl, br, tr, tl, mat, belly=0.3, battens=0, spar=0.06, nx=10, ny=10):
    """A quadrilateral sail with a belly, a yard along the top, a boom along the
    bottom, and optional battens (junk style)."""
    bl, br, tr, tl = map(Vector, (bl, br, tr, tl))
    nrm = (br - bl).cross(tl - bl).normalized()

    def P(u, v):
        return bl.lerp(br, u).lerp(tl.lerp(tr, u), v) + nrm * belly * math.sin(math.pi * u) * math.sin(math.pi * v)

    me = bpy.data.meshes.new("layar")
    bm = bmesh.new()
    g = [[bm.verts.new(P(i / nx, j / ny)) for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.02)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    kit._obj(me, mat, (0, 0, 0), (0, 0, 0), coll, "layar")
    beam(P(0, 0), P(1, 0), spar, M["post"], coll, name="boom")
    beam(P(0, 1), P(1, 1), spar, M["post"], coll, name="andang")
    for j in range(1, battens + 1):
        v = j / (battens + 1)
        beam(P(-0.02, v) + nrm * 0.04, P(1.02, v) + nrm * 0.04, spar * 0.6, M["dark"], coll, verts=6, name="bilah")


def sack(coll, x, y, z, k=1.0, seed=0.0):
    blob((x, y, z + 0.2 * k), (0.34 * k, 0.24 * k, 0.22 * k), M["sack"], coll, wobble=0.18, seed=seed, smooth=True, name="guni")


def jar(coll, x, y, z, k=1.0, mat=None):
    lathe([(0.0, 0.0), (0.16 * k, 0.0), (0.26 * k, 0.15 * k), (0.29 * k, 0.35 * k), (0.2 * k, 0.55 * k), (0.12 * k, 0.62 * k), (0.14 * k, 0.66 * k), (0.0, 0.66 * k)], (x, y, z), mat or M["clay"], coll, segs=18, name="tempayan")


# ---------------------------------------------------------------- sampan (small rowing boat)


def sampan(name, cargo):
    c = kit.new_group(name)
    hull(c, 5.0, 1.15, 0.45, 0.32, 0.03, 0.03, M["plank"], thick=0.04)
    for x in (-1.3, 0.1, 1.3):
        t = x / 2.5
        w = 0.575 * (0.03 + 0.97 * (1 - abs(t) ** 2.2))
        box((0.22, 2 * w - 0.02, 0.05), (x, 0, -0.02), mat=M["trim"], coll=c, name="papan_duduk")
    box((3.2, 0.5, 0.03), (0, 0, -0.36), mat=M["floor"], coll=c, name="lantai")
    beam((-0.6, -0.15, 0.0), (1.4, 0.2, 0.08), 0.022, M["trim"], c, name="dayung")
    box((0.5, 0.16, 0.025), (1.65, 0.25, 0.09), rot=(0, 0, 0.17), mat=M["trim"], coll=c, name="bilah_dayung")
    if cargo:
        # market run: sacks, jars and a basket of fruit amidships
        for i, (x, y) in enumerate(((-0.6, -0.15), (-0.6, 0.2), (-0.9, 0.0))):
            sack(c, x, y, -0.34 + (0.2 if i == 2 else 0), 0.8, seed=i * 1.7)
        jar(c, 0.65, -0.1, -0.34, 0.7, M["glaze"])
        jar(c, 0.75, 0.22, -0.34, 0.55)
        lathe([(0.0, 0.0), (0.14, 0.0), (0.2, 0.1), (0.22, 0.24), (0.0, 0.24)], (-1.7, 0.0, -0.33), M["rattan"], c, name="bakul")
        for k in range(6):
            blob((-1.7 + 0.08 * math.cos(k), 0.08 * math.sin(k), -0.05 + 0.02 * (k % 2)), (0.06, 0.06, 0.06), M["fruit_yel"] if k % 2 else M["fruit_red"], c, wobble=0.05, subdiv=2, smooth=True, name="buah")
    else:
        # fishing: net and an empty basket
        blob((-1.0, 0.05, -0.22), (0.45, 0.3, 0.12), M["rope"], c, wobble=0.25, seed=2.0, name="jala")
        lathe([(0.0, 0.0), (0.14, 0.0), (0.2, 0.1), (0.22, 0.24), (0.0, 0.24)], (0.7, -0.05, -0.33), M["rattan"], c, name="bakul")
    return c


# ---------------------------------------------------------------- perahu with a tanja sail


def perahu(name, furled):
    c = kit.new_group(name)
    deck = -0.15
    hull(c, 10.0, 2.4, 1.1, 0.75, 0.04, 0.04, HULL_DARK, thick=0.07, deck_z=deck)
    mast_x = 1.0
    if furled:
        # yard lowered: sail rolled along it, lashed and resting fore-and-aft on deck crutches
        beam((mast_x, 0, deck), (mast_x, 0, 5.0), 0.09, M["post"], c, name="tiang_layar")
        a, b = Vector((4.2, 0.2, 1.4)), Vector((-3.4, -0.1, 2.0))
        beam(a, b, 0.07, M["post"], c, name="andang")
        beam(a + Vector((-0.3, 0, -0.12)), b + Vector((0.3, 0, -0.12)), 0.2, SAIL, c, verts=10, name="layar_gulung")
        for k in range(6):
            p = a.lerp(b, 0.1 + 0.16 * k) + Vector((0, 0, -0.12))
            kit.torus(0.21, 0.018, tuple(p), rot=(0, math.pi / 2 - math.atan2(b.z - a.z, b.x - a.x), 0), mat=M["rope"], coll=c, name="ikatan")
        for x in (-3.0, 3.6):
            p = a.lerp(b, (a.x - x) / (a.x - b.x))
            beam((x, 0.0, deck), (x, 0.0, p.z - 0.15), 0.05, M["post"], c, name="cagak")
        beam((mast_x, 0, 4.9), (4.4, 0.1, 0.9), 0.012, M["rope"], c, verts=4, name="tali")
    else:
        beam((mast_x, 0, deck), (mast_x, 0, 7.2), 0.09, M["post"], c, name="tiang_layar")
        # the canted tanja sail: tack low near the bow, yard rising aft
        sail(c, (3.8, 0.25, 0.9), (-2.0, 0.25, 1.5), (-2.8, 0.25, 6.4), (1.9, 0.25, 7.3), SAIL, belly=0.45)
        beam((mast_x, 0, 7.0), (3.8, 0.2, 0.9), 0.012, M["rope"], c, verts=4, name="tali")
        beam((mast_x, 0, 7.0), (-4.6, 0.0, 0.8), 0.012, M["rope"], c, verts=4, name="tali")
    # kajang cabin: an arched roof of palm-leaf mats over the stern
    R, inner = 1.0, 0.92
    arc = [(R * math.cos(math.pi * k / 12), deck + 0.15 + 0.95 * R * math.sin(math.pi * k / 12)) for k in range(13)]
    arc += [(inner * math.cos(math.pi * k / 12), deck + 0.15 + 0.95 * inner * math.sin(math.pi * k / 12)) for k in range(12, -1, -1)]
    kit.prism(arc, 2.6, -2.6, M["thatch"], c, name="kajang")
    # steering oar (kemudi) on the quarter
    beam((-3.8, 1.05, 1.1), (-5.6, 1.35, -0.9), 0.06, M["post"], c, name="kemudi")
    box((0.9, 0.06, 0.35), (-5.4, 1.33, -0.75), rot=(0, 0.83, 0.15), mat=M["post"], coll=c, name="bilah_kemudi")
    for i, (x, y) in enumerate(((-0.3, -0.4), (-0.3, 0.35), (-0.9, 0.0))):
        sack(c, x, y, deck + 0.04, 1.0, seed=i * 1.3)
    jar(c, 2.2, 0.0, deck + 0.04)
    box((0.12, 1.5, 0.5), (4.3, 0, 0.75), mat=M["trim"], coll=c, name="haluan")
    return c


# ---------------------------------------------------------------- Chinese junk

#   mast x, top, sail luff x, leech x, foot z, head z, battens  (for the 20 m hull)
RIG3 = ((6.5, 10.5, 8.0, 3.2, 1.4, 9.8, 5), (0.5, 14.5, 2.6, -4.6, 1.6, 13.6, 7), (-6.2, 8.5, -5.2, -9.4, 3.6, 8.0, 4))
RIG2 = ((6.0, 10.5, 7.6, 2.6, 1.4, 9.8, 5), (-1.5, 13.0, 0.6, -6.4, 1.6, 12.2, 6))


def junk(name, s, rig, furled, upper_cabin):
    """s scales the hull plan; rig gives masts in 20 m-hull coordinates (scaled by s)."""
    c = kit.new_group(name)
    deck = -0.2 * s
    L, B, sh = 20.0 * s, 6.0 * s, 1.4 * s
    hull(c, L, B, 2.6 * s, sh, 0.55, 0.35, HULL_DARK, n=32, thick=0.1, deck_z=deck)
    # a painted band along the top of the hull
    for side in (-1, 1):
        for i in range(16):
            t0, t1 = -0.95 + i * 0.12, -0.95 + (i + 1) * 0.12
            if t1 > 0.95:
                break

            def edge(t):
                end = 0.35 if t > 0 else 0.55
                w = B / 2 * (end + (1 - end) * (1 - abs(t) ** 2.2))
                return Vector((t * L / 2, side * (w + 0.06), sh * t * t - 0.25 * s))
            beam(edge(t0), edge(t1), 0.13 * s, M["red"], c, verts=6, name="jalur")
    # stern castle with windows
    box((3.8 * s, 3.0 * s, 1.9), (-8.0 * s, 0, deck + 0.95), mat=M["plank"], coll=c, name="kota_buritan")
    box((4.4 * s, 3.6 * s, 0.18), (-8.0 * s, 0, deck + 1.98), mat=M["post"], coll=c, name="bumbung_buritan")
    if upper_cabin:
        box((2.2, 2.2, 1.0), (-8.6 * s, 0, deck + 2.55), mat=M["plank"], coll=c, name="bilik_atas")
        box((2.6, 2.6, 0.14), (-8.6 * s, 0, deck + 3.1), mat=M["post"], coll=c, name="bumbung_atas")
    for side in (-1, 1):
        for x in (-9.0, -7.0):
            box((0.6, 0.05, 0.5), (x * s, side * 1.52 * s, deck + 1.1), mat=M["dark"], coll=c, name="tingkap")
    # deckhouse and hatch covers
    box((2.0, 2.4 * s, 1.0), (-3.2 * s, 0, deck + 0.5), mat=M["plank"], coll=c, name="bilik")
    box((2.4, 2.8 * s, 0.12), (-3.2 * s, 0, deck + 1.05), mat=M["thatch"], coll=c, name="bumbung_bilik")
    for x in (2.0, 4.5):
        box((1.6 * s, 2.0 * s, 0.3), (x * s, 0, deck + 0.15), mat=M["trim"], coll=c, name="penutup_palka")
    # rudder hanging off the transom
    box((1.6 * s, 0.18, 3.2 * s), (-10.6 * s, 0, -1.0 * s), mat=M["post"], coll=c, name="kemudi")
    beam((-10.1 * s, 0, 1.6 * s), (-10.1 * s, 0, -0.5 * s), 0.12, M["post"], c, name="batang_kemudi")
    for mx, top, luff, leech, z0, z1, bat in rig:
        mx, luff, leech = mx * s, luff * s, leech * s
        top, z0, z1 = top * s, z0 * s, z1 * s
        beam((mx, 0, deck), (mx, 0, top), 0.2 if top > 12 else 0.15, M["post"], c, name="tiang")
        if furled:
            # lowered battened sail: the panels fold down into a stack between the battens
            nb = bat + 2
            for j in range(nb):
                z = z0 + 0.13 * j
                beam((luff + 0.1, 0.35, z), (leech - 0.2, 0.35, z + 0.05), 0.07, M["dark"], c, verts=6, name="bilah")
            box((luff - leech - 0.3, 0.5, 0.13 * nb), ((luff + leech) / 2, 0.35, z0 + 0.065 * nb - 0.05), mat=JUNK_SAIL, coll=c, name="layar_lipat")
            for x in (luff - 0.3, leech + 0.3):
                beam((x, 0.35, z0 + 0.13 * nb + 0.05), (mx, 0, top - 0.3), 0.012, M["rope"], c, verts=4, name="tali_angkat")
        else:
            sail(c, (luff, 0.35, z0), (leech, 0.35, z0 + 0.4), (leech - 2.0 * s, 0.35, z1 + 1.0 * s), (luff - 0.3 * s, 0.35, z1), JUNK_SAIL, belly=0.4, battens=bat, spar=0.08)
        kit.sheet(0.9, 0.5, (mx - 0.45, 0, top - 0.25), mat=M["red"], coll=c, nx=4, ny=2, bulge=0.06, name="panji")
    # anchor and its cable at the bow
    beam((9.6 * s, 0.8, 0.9 * s), (11.5 * s, 1.2, -1.8), 0.035, M["rope"], c, verts=5, name="tali_sauh")
    box((0.15, 0.15, 1.2), (11.5 * s, 1.2, -2.0), rot=(0.2, 0, 0), mat=M["weathered"], coll=c, name="sauh")
    for i, (x, y) in enumerate(((3.0, -1.8), (3.6, -1.6), (3.3, -2.2), (-1.5, 1.9))):
        sack(c, x * s, y * s, deck + 0.04, 1.0, seed=i * 2.1)
    return c


# ---------------------------------------------------------------- variants, placed in one anchorage
#   builder, args, (x, y, z), yaw degrees.  z lifts each hull to its waterline.
VARIANTS = [
    (junk, ("junk", 1.0, RIG3, False, True), (0.0, 44.0, 1.2), 195),
    (junk, ("junk_furled", 1.0, RIG3, True, True), (-26.0, 36.0, 1.2), 150),
    (junk, ("junk_small", 0.65, RIG2, False, False), (24.0, 32.0, 0.8), 210),
    (perahu, ("perahu", False), (-10.0, 14.0, 0.55), -25),
    (perahu, ("perahu_furled", True), (10.0, 15.0, 0.55), 25),
    (sampan, ("sampan", False), (-3.5, 1.0, 0.16), 15),
    (sampan, ("sampan_cargo", True), (3.5, 2.0, 0.16), -20),
]

groups = []
for fn, args, loc, yaw in VARIANTS:
    g = fn(*args)
    kit.place(g, loc, math.radians(yaw))
    groups.append(g)

kit.water(-4.0)
kit.hills()
kit.environment(cam=(0.0, -16.0, 6.0), target=(0.0, 20.0, 3.0), lens=24, sun_elev=8, sun_rot=-140, sky=0.07, sun=9.0, haze=0.002, exposure=0.35)
kit.render_and_export("boats", groups)
