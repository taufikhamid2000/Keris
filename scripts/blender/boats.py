"""Boats for the Melaka harbour: a sampan, a perahu with a canted tanja sail and a
kajang cabin, and a Chinese junk with battened sails and a stern castle.

Run headless:
  blender -b -P scripts/blender/boats.py -- <out_dir>

Writes <out_dir>/boats.png plus sampan.glb, perahu.glb and junk.glb (each boat at the
origin, bow toward +X, waterline at Z=0).
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
HULL_DARK = kit.wood("lambung", (0.07, 0.045, 0.03), (0.24, 0.15, 0.08), scale=3)

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


def group(coll, loc, yaw):
    """Parent the boat to an empty so it can be placed and still export at the origin."""
    e = bpy.data.objects.new(coll.name, None)
    coll.objects.link(e)
    for ob in coll.objects:
        if ob is not e:
            ob.parent = e
    e.location = loc
    e.rotation_euler = (0, 0, yaw)
    return e


def new_boat(name):
    c = bpy.data.collections.new(name)
    kit.ASSET.children.link(c)
    return c


# ---------------------------------------------------------------- sampan (small rowing boat)
sp = new_boat("sampan")
hull(sp, 5.0, 1.15, 0.45, 0.32, 0.03, 0.03, M["plank"], thick=0.04)
for x in (-1.3, 0.1, 1.3):
    t = x / 2.5
    w = 0.575 * (0.03 + 0.97 * (1 - abs(t) ** 2.2))
    box((0.22, 2 * w - 0.02, 0.05), (x, 0, -0.02), mat=M["trim"], coll=sp, name="papan_duduk")
box((3.2, 0.5, 0.03), (0, 0, -0.36), mat=M["floor"], coll=sp, name="lantai")
beam((-0.6, -0.15, 0.0), (1.4, 0.2, 0.08), 0.022, M["trim"], sp, name="dayung")
box((0.5, 0.16, 0.025), (1.65, 0.25, 0.09), rot=(0, 0, 0.17), mat=M["trim"], coll=sp, name="bilah_dayung")
blob((-1.0, 0.05, -0.22), (0.45, 0.3, 0.12), M["rope"], sp, wobble=0.25, seed=2.0, name="jala")
lathe([(0.0, 0.0), (0.14, 0.0), (0.2, 0.1), (0.22, 0.24), (0.0, 0.24)], (0.7, -0.05, -0.33), M["rattan"], sp, name="bakul")

# ---------------------------------------------------------------- perahu with a tanja sail
pr = new_boat("perahu")
DECK_P = -0.15
hull(pr, 10.0, 2.4, 1.1, 0.75, 0.04, 0.04, HULL_DARK, thick=0.07, deck_z=DECK_P)
mast_x = 1.0
beam((mast_x, 0, DECK_P), (mast_x, 0, 7.2), 0.09, M["post"], pr, name="tiang_layar")
# the canted tanja sail: tack low near the bow, yard rising aft
sail(pr, (3.8, 0.25, 0.9), (-2.0, 0.25, 1.5), (-2.8, 0.25, 6.4), (1.9, 0.25, 7.3), SAIL, belly=0.45)
beam((mast_x, 0, 7.0), (3.8, 0.2, 0.9), 0.012, M["rope"], pr, verts=4, name="tali")
beam((mast_x, 0, 7.0), (-4.6, 0.0, 0.8), 0.012, M["rope"], pr, verts=4, name="tali")
# kajang cabin: an arched roof of palm-leaf mats over the stern
R, inner = 1.0, 0.92
arc = [(R * math.cos(math.pi * k / 12), DECK_P + 0.15 + 0.95 * R * math.sin(math.pi * k / 12)) for k in range(13)]
arc += [(inner * math.cos(math.pi * k / 12), DECK_P + 0.15 + 0.95 * inner * math.sin(math.pi * k / 12)) for k in range(12, -1, -1)]
kit.prism(arc, 2.6, -2.6, M["thatch"], pr, name="kajang")
# steering oar (kemudi) on the quarter
beam((-3.8, 1.05, 1.1), (-5.6, 1.35, -0.9), 0.06, M["post"], pr, name="kemudi")
box((0.9, 0.06, 0.35), (-5.4, 1.33, -0.75), rot=(0, 0.83, 0.15), mat=M["post"], coll=pr, name="bilah_kemudi")
for i, (x, y) in enumerate(((-0.3, -0.4), (-0.3, 0.35), (-0.9, 0.0))):
    sack(pr, x, y, DECK_P + 0.04, 1.0, seed=i * 1.3)
lathe([(0.0, 0.0), (0.16, 0.0), (0.26, 0.15), (0.29, 0.35), (0.2, 0.55), (0.12, 0.62), (0.14, 0.66), (0.0, 0.66)], (2.2, 0.0, DECK_P + 0.04), M["clay"], pr, segs=18, name="tempayan")
box((0.12, 1.5, 0.5), (4.3, 0, 0.75), mat=M["trim"], coll=pr, name="haluan")

# ---------------------------------------------------------------- Chinese junk
jk = new_boat("junk")
DECK_J = -0.2
L_J, B_J = 20.0, 6.0
hull(jk, L_J, B_J, 2.6, 1.4, 0.55, 0.35, HULL_DARK, n=32, thick=0.1, deck_z=DECK_J)
# a painted band along the top of the hull
for side in (-1, 1):
    for i in range(16):
        t0, t1 = -0.95 + i * 0.12, -0.95 + (i + 1) * 0.12
        if t1 > 0.95:
            break
        def edge(t):
            end = 0.35 if t > 0 else 0.55
            w = B_J / 2 * (end + (1 - end) * (1 - abs(t) ** 2.2))
            return Vector((t * L_J / 2, side * (w + 0.06), 1.4 * t * t - 0.25))
        beam(edge(t0), edge(t1), 0.13, M["red"], jk, verts=6, name="jalur")
# stern castle with windows, and a roof
box((3.8, 3.0, 1.9), (-8.0, 0, DECK_J + 0.95), mat=M["plank"], coll=jk, name="kota_buritan")
box((4.4, 3.6, 0.18), (-8.0, 0, DECK_J + 1.98), mat=M["post"], coll=jk, name="bumbung_buritan")
box((2.2, 2.2, 1.0), (-8.6, 0, DECK_J + 2.55), mat=M["plank"], coll=jk, name="bilik_atas")
box((2.6, 2.6, 0.14), (-8.6, 0, DECK_J + 3.1), mat=M["post"], coll=jk, name="bumbung_atas")
for side in (-1, 1):
    for x in (-9.0, -7.0):
        box((0.6, 0.05, 0.5), (x, side * 1.52, DECK_J + 1.1), mat=M["dark"], coll=jk, name="tingkap")
# deckhouse amidships and hatch covers
box((2.0, 2.4, 1.0), (-3.2, 0, DECK_J + 0.5), mat=M["plank"], coll=jk, name="bilik")
box((2.4, 2.8, 0.12), (-3.2, 0, DECK_J + 1.05), mat=M["thatch"], coll=jk, name="bumbung_bilik")
for x in (2.0, 4.5):
    box((1.6, 2.0, 0.3), (x, 0, DECK_J + 0.15), mat=M["trim"], coll=jk, name="penutup_palka")
# rudder hanging off the transom
box((1.6, 0.18, 3.2), (-10.6, 0, -1.0), mat=M["post"], coll=jk, name="kemudi")
beam((-10.1, 0, 1.6), (-10.1, 0, -0.5), 0.12, M["post"], jk, name="batang_kemudi")
# masts and battened sails: fore, main, mizzen
for mx, top, luff, leech, z0, z1, bat in ((6.5, 10.5, 8.0, 3.2, 1.4, 9.8, 5), (0.5, 14.5, 2.6, -4.6, 1.6, 13.6, 7), (-6.2, 8.5, -5.2, -9.4, 3.6, 8.0, 4)):
    beam((mx, 0, DECK_J), (mx, 0, top), 0.2 if top > 12 else 0.15, M["post"], jk, name="tiang")
    sail(jk, (luff, 0.35, z0), (leech, 0.35, z0 + 0.4), (leech - 2.0, 0.35, z1 + 1.0), (luff - 0.3, 0.35, z1), JUNK_SAIL, belly=0.4, battens=bat, spar=0.08)
    kit.sheet(0.9, 0.5, (mx - 0.45, 0, top - 0.25), mat=M["red"], coll=jk, nx=4, ny=2, bulge=0.06, name="panji")
# anchor and its cable at the bow
beam((9.6, 0.8, 0.9), (11.5, 1.2, -1.8), 0.035, M["rope"], jk, verts=5, name="tali_sauh")
box((0.15, 0.15, 1.2), (11.5, 1.2, -2.0), rot=(0.2, 0, 0), mat=M["weathered"], coll=jk, name="sauh")
# a few sacks and jars on deck
for i, (x, y) in enumerate(((3.0, -1.8), (3.6, -1.6), (3.3, -2.2), (-1.5, 1.9))):
    sack(jk, x, y, DECK_J + 0.04, 1.0, seed=i * 2.1)

# ---------------------------------------------------------------- place, light and render
group(jk, (8.0, 21.0, 1.2), math.radians(200))
group(pr, (-5.0, 9.0, 0.55), math.radians(-25))
group(sp, (-0.5, -4.5, 0.16), math.radians(15))

kit.water(-4.0)
kit.hills()
kit.environment(cam=(-6.0, -13.0, 2.2), target=(3.0, 10.0, 3.6), lens=28, sun_elev=8, sun_rot=-140, sky=0.07, sun=9.0, haze=0.002, exposure=0.35)

scene = bpy.context.scene
scene.render.filepath = os.path.join(kit.OUT, "boats.png")
bpy.ops.render.render(write_still=True)

# export each boat at the origin
for c in (sp, pr, jk):
    e = bpy.data.objects[c.name]
    loc, rot = e.location.copy(), e.rotation_euler.copy()
    e.location, e.rotation_euler = (0, 0, 0), (0, 0, 0)
    bpy.context.view_layer.update()
    for ob in scene.objects:
        ob.select_set(ob.name in c.all_objects)
    bpy.context.view_layer.objects.active = e
    bpy.ops.export_scene.gltf(filepath=os.path.join(kit.OUT, c.name + ".glb"), export_format="GLB", use_selection=True)
    e.location, e.rotation_euler = loc, rot
print("wrote", kit.OUT, "boats")
