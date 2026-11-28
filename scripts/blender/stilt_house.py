"""Melaka stilt house (rumah panggung) over water, built from code.

Run headless:
  blender -b -P scripts/blender/stilt_house.py -- <out_dir>

Writes <out_dir>/stilt_house.png (golden-hour render) and <out_dir>/stilt_house.glb
(the house only, no water or scenery). Units are metres, Z is up.

Style follows docs/ART.md: steep thatched bumbung panjang roof, tebar layar gable
boards, crossed silang gunting ridge ends, plank walls, open serambi (verandah).
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Euler, Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else ".")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
house = bpy.data.collections.new("House")
props = bpy.data.collections.new("Scenery")
scene.collection.children.link(house)
scene.collection.children.link(props)

# ---------------------------------------------------------------- materials


def _principled(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    return m, nt, bsdf


def wood(name, dark, light, scale=6.0, rough=0.75):
    """Grain along the object's local Z (planks stand upright) plus noise."""
    m, nt, bsdf = _principled(name)
    n = nt.nodes
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale * 0.08)
    wave = n.new("ShaderNodeTexWave")
    wave.wave_type = "BANDS"
    wave.bands_direction = "X"
    wave.inputs["Scale"].default_value = 3.0
    wave.inputs["Distortion"].default_value = 6.0
    wave.inputs["Detail"].default_value = 3.0
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 14.0
    mix = n.new("ShaderNodeMix")
    mix.data_type = "FLOAT"
    mix.inputs["Factor"].default_value = 0.35
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].color = (*light, 1)
    l = nt.links
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    l.new(mp.outputs["Vector"], wave.inputs["Vector"])
    l.new(mp.outputs["Vector"], noise.inputs["Vector"])
    l.new(wave.outputs["Fac"], mix.inputs["A"])
    l.new(noise.outputs["Fac"], mix.inputs["B"])
    l.new(mix.outputs["Result"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    m.diffuse_color = (*light, 1)  # what glTF and the viewport see
    return m


def thatch(name):
    """Atap (nipah) thatch: strands running down the slope, uneven tone."""
    m, nt, bsdf = _principled(name)
    n = nt.nodes
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (40.0, 1.5, 40.0)
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6.0
    noise.inputs["Detail"].default_value = 8.0
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (0.16, 0.10, 0.05, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (0.55, 0.40, 0.20, 1)
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.6
    l = nt.links
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    l.new(mp.outputs["Vector"], noise.inputs["Vector"])
    l.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    l.new(noise.outputs["Fac"], bump.inputs["Height"])
    l.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    l.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.95
    m.diffuse_color = (0.42, 0.30, 0.15, 1)
    return m


def flat(name, color, rough=0.8, **extra):
    m, nt, bsdf = _principled(name)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    for k, v in extra.items():
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v
    m.diffuse_color = (*color, 1)
    return m


M_POST = wood("tiang", (0.10, 0.06, 0.035), (0.28, 0.17, 0.09), scale=4)
M_PLANK = wood("papan", (0.20, 0.11, 0.05), (0.50, 0.31, 0.15))
M_FLOOR = wood("lantai", (0.17, 0.10, 0.05), (0.42, 0.27, 0.13), scale=5)
M_TRIM = wood("ukiran", (0.30, 0.18, 0.08), (0.66, 0.46, 0.24), scale=8)
M_THATCH = thatch("atap")
M_DARK = flat("gelap", (0.02, 0.015, 0.01), 1.0)
M_RED = flat("kain", (0.55, 0.05, 0.04), 0.9)
M_WATER = flat("air", (0.02, 0.32, 0.30), 0.04, **{"Transmission Weight": 0.85, "IOR": 1.33})
M_SAND = flat("pasir", (0.62, 0.52, 0.34), 1.0)
M_HILL = flat("bukit", (0.06, 0.16, 0.05), 1.0)
M_LEAF = flat("daun", (0.10, 0.25, 0.06), 0.7)
M_TRUNK = flat("batang", (0.25, 0.20, 0.14), 0.9)

# ---------------------------------------------------------------- geometry helpers


def _link(obj, coll):
    coll.objects.link(obj)
    return obj


def box(size, loc, rot=(0, 0, 0), mat=M_PLANK, coll=house, name="box"):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.rotation_euler = Euler(rot)
    return _link(ob, coll)


def prism(points2d, depth, axis_x, mat, coll=house, name="prism"):
    """Extrude a polygon given in the YZ plane along X, centred on axis_x."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    front = [bm.verts.new((axis_x - depth / 2, y, z)) for y, z in points2d]
    back = [bm.verts.new((axis_x + depth / 2, y, z)) for y, z in points2d]
    bm.faces.new(front[::-1])
    bm.faces.new(back)
    n = len(points2d)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    return _link(bpy.data.objects.new(name, me), coll)


def cyl(r, h, loc, rot=(0, 0, 0), mat=M_TRUNK, coll=props, verts=8, r2=None):
    me = bpy.data.meshes.new("cyl")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new("cyl", me)
    ob.location = loc
    ob.rotation_euler = Euler(rot)
    return _link(ob, coll)


# ---------------------------------------------------------------- dimensions
L, D = 8.0, 6.0  # rumah ibu, along X and Y
FLOOR = 2.0  # top of the main floor above the water
WALL = 2.6
TOP = FLOOR + WALL
SEA = -1.6  # seabed
PITCH = math.radians(50)  # steep, as the posters and Malay roofs are
OVER = 0.9  # eave overhang
GABLE_OVER = 0.7

# ---------------------------------------------------------------- stilts and floor
for x in (-4, -4 / 3, 4 / 3, 4):
    for y in (-3, 0, 3):
        h = FLOOR - SEA
        box((0.24, 0.24, h), (x, y, SEA + h / 2), mat=M_POST, name="tiang")
# a few diagonal braces between the front stilts
for x0, x1 in ((-4, -4 / 3), (4 / 3, 4)):
    dx = x1 - x0
    dz = 1.4
    ang = math.atan2(dz, dx)
    box((math.hypot(dx, dz), 0.08, 0.12), ((x0 + x1) / 2, -3.0, 0.4 + dz / 2), rot=(0, -ang, 0), mat=M_POST, name="silang")
# floor beams and floor
for y in (-3, 0, 3):
    box((L + 0.4, 0.2, 0.22), (0, y, FLOOR - 0.26), mat=M_POST, name="rasuk")
box((L + 0.3, D + 0.3, 0.12), (0, 0, FLOOR - 0.06), mat=M_FLOOR, name="lantai")

# ---------------------------------------------------------------- plank walls with openings


def wall(axis, fixed, a0, a1, openings, outward):
    """Vertical planks from a0 to a1 along `axis` ('x' or 'y') at `fixed`.
    openings: list of (u0, u1, z0, z1) in wall-local units (z above FLOOR)."""
    pw, gap, t = 0.22, 0.015, 0.05
    n = int((a1 - a0) / (pw + gap))
    step = (a1 - a0) / n
    for i in range(n):
        u = a0 + step * (i + 0.5)
        spans = [(0.0, WALL)]
        for u0, u1, z0, z1 in openings:
            if u0 <= u <= u1:
                new = []
                for s0, s1 in spans:
                    if z1 <= s0 or z0 >= s1:
                        new.append((s0, s1))
                        continue
                    if z0 > s0:
                        new.append((s0, z0))
                    if z1 < s1:
                        new.append((z1, s1))
                spans = new
        for s0, s1 in spans:
            h = s1 - s0
            # small random-ish height and tone jitter so it doesn't look stamped
            jitter = 0.01 * ((i * 37) % 5)
            loc = (u, fixed, FLOOR + s0 + h / 2) if axis == "x" else (fixed, u, FLOOR + s0 + h / 2)
            size = (step - gap, t, h - jitter) if axis == "x" else (t, step - gap, h - jitter)
            box(size, loc, mat=M_PLANK, name="papan")
    # frames around each opening
    for u0, u1, z0, z1 in openings:
        cu = (u0 + u1) / 2
        w = u1 - u0
        for zz in (z0, z1):
            if zz <= 0.01:
                continue
            loc = (cu, fixed + outward * 0.03, FLOOR + zz) if axis == "x" else (fixed + outward * 0.03, cu, FLOOR + zz)
            size = (w + 0.2, 0.09, 0.1) if axis == "x" else (0.09, w + 0.2, 0.1)
            box(size, loc, mat=M_TRIM, name="bingkai")
        for uu in (u0, u1):
            loc = (uu, fixed + outward * 0.03, FLOOR + (z0 + z1) / 2) if axis == "x" else (fixed + outward * 0.03, uu, FLOOR + (z0 + z1) / 2)
            size = (0.1, 0.09, z1 - z0) if axis == "x" else (0.09, 0.1, z1 - z0)
            box(size, loc, mat=M_TRIM, name="bingkai")
        # dark interior behind the opening
        loc = (cu, fixed - outward * 0.6, FLOOR + (z0 + z1) / 2) if axis == "x" else (fixed - outward * 0.6, cu, FLOOR + (z0 + z1) / 2)
        size = (w, 0.02, z1 - z0) if axis == "x" else (0.02, w, z1 - z0)
        box(size, loc, mat=M_DARK, name="dalam")


WIN = (0.75, 1.9)
wall("x", -3.0, -4.0, 4.0, [(-0.55, 0.55, 0.0, 2.1), (-3.1, -1.9, *WIN), (1.9, 3.1, *WIN)], outward=-1)
wall("x", 3.0, -4.0, 4.0, [(-0.6, 0.6, *WIN)], outward=1)
wall("y", -4.0, -3.0, 3.0, [(-0.6, 0.6, *WIN)], outward=-1)
wall("y", 4.0, -3.0, 3.0, [(-0.6, 0.6, *WIN)], outward=1)
# open window shutters (daun tingkap) on the front
for cx in (-2.5, 2.5):
    for side in (-1, 1):
        hx = cx + side * 0.6
        box((0.6, 0.04, 1.1), (hx + side * 0.21, -3.25, FLOOR + 1.32), rot=(0, 0, side * math.radians(-55)), mat=M_TRIM, name="tingkap")
# corner posts, wall plate and sill
for x in (-4, 4):
    for y in (-3, 3):
        box((0.2, 0.2, WALL + 0.1), (x, y, FLOOR + WALL / 2), mat=M_POST, name="tiang_sudut")
for y in (-3, 3):
    box((L + 0.3, 0.16, 0.16), (0, y, TOP), mat=M_POST, name="alang")
    box((L + 0.3, 0.12, 0.14), (0, y, FLOOR + 0.07), mat=M_POST, name="bendul")
for x in (-4, 4):
    box((0.16, D + 0.3, 0.16), (x, 0, TOP), mat=M_POST, name="alang")

# ---------------------------------------------------------------- main roof (bumbung panjang)
half = D / 2 + OVER
tanp = math.tan(PITCH)
RIDGE = TOP + (D / 2) * tanp
eave_z = TOP - OVER * tanp
slope = half / math.cos(PITCH)
roof_len = L + 2 * GABLE_OVER
for side in (-1, 1):
    # two thatch layers: the lower one slightly longer gives a ragged, layered eave
    for k, (t, extra) in enumerate(((0.32, 0.0), (0.18, 0.25))):
        s = slope + extra
        cy = side * (s / 2) * math.cos(PITCH)
        cz = RIDGE - (s / 2) * math.sin(PITCH) + 0.16 - k * 0.12
        box((roof_len + 0.1 * k, s, t), (0, cy, cz), rot=(side * -PITCH, 0, 0), mat=M_THATCH, name="atap")
box((roof_len + 0.2, 0.36, 0.22), (0, 0, RIDGE + 0.32), mat=M_THATCH, name="perabung")

# gable infill and tebar layar boards
for gx in (-4.0, 4.0):
    prism([(-3.0, TOP), (3.0, TOP), (0.0, RIDGE)], 0.06, gx, M_PLANK, name="dinding_tebar")
for sx in (-1, 1):
    gx = sx * (L / 2 + GABLE_OVER - 0.12)
    # outer triangle panel, with a lighter frame
    prism([(-half + 0.5, eave_z + 0.6), (half - 0.5, eave_z + 0.6), (0.0, RIDGE - 0.05)], 0.05, gx, M_TRIM, name="tebar_layar")
    # sunburst slats (a common tebar layar motif) and a small vent opening
    base = Vector((gx + sx * 0.04, 0.0, eave_z + 0.65))
    for i in range(-6, 7):
        ang = math.radians(i * 11)
        ln = 1.9 - abs(i) * 0.09
        mid = base + Vector((0, math.sin(ang) * ln / 2, math.cos(ang) * ln / 2))
        box((0.03, 0.06, ln), mid, rot=(-ang, 0, 0), mat=M_DARK, name="sinar")
    prism([(-0.5, eave_z + 0.6), (0.5, eave_z + 0.6), (0.0, eave_z + 1.15)], 0.06, gx + sx * 0.03, M_DARK, name="lubang")
    # crossed ridge boards (silang gunting) that extend past the ridge
    for side in (-1, 1):
        d = Vector((0, side * math.cos(PITCH), -math.sin(PITCH)))
        ridge = Vector((sx * (L / 2 + GABLE_OVER + 0.02), 0, RIDGE + 0.2))
        t0, t1 = -0.95, slope + 0.05
        c = ridge + d * ((t0 + t1) / 2)
        box((0.07, t1 - t0, 0.26), c, rot=(side * -PITCH, 0, 0), mat=M_TRIM, name="silang_gunting")

# ---------------------------------------------------------------- serambi (verandah)
SFL = FLOOR - 0.45
SY0, SY1 = -3.0, -5.6
SX0, SX1 = -4.0, 2.2
for x in (SX0, (SX0 + SX1) / 2, SX1):
    h = SFL - SEA
    box((0.22, 0.22, h), (x, SY1, SEA + h / 2), mat=M_POST, name="tiang_serambi")
box((SX1 - SX0 + 0.3, SY0 - SY1 + 0.2, 0.1), ((SX0 + SX1) / 2, (SY0 + SY1) / 2, SFL - 0.05), mat=M_FLOOR, name="lantai_serambi")
box((SX1 - SX0 + 0.3, 0.2, 0.2), ((SX0 + SX1) / 2, SY1, SFL - 0.2), mat=M_POST, name="rasuk")
# railing with balusters (front and left side; stairs leave the right end open)
RH = 0.85
box((SX1 - SX0 - 0.6, 0.08, 0.08), ((SX0 + SX1 - 0.6) / 2, SY1, SFL + RH), mat=M_TRIM, name="pemegang")
box((0.08, SY0 - SY1, 0.08), (SX0, (SY0 + SY1) / 2, SFL + RH), mat=M_TRIM, name="pemegang")
x = SX0 + 0.2
while x < SX1 - 0.7:
    box((0.05, 0.05, RH), (x, SY1, SFL + RH / 2), mat=M_TRIM, name="jejala")
    x += 0.2
y = SY1 + 0.2
while y < SY0:
    box((0.05, 0.05, RH), (SX0, y, SFL + RH / 2), mat=M_TRIM, name="jejala")
    y += 0.2
# lean-to roof over the serambi, tucked under the main eave
S_TOP, S_EAVE = TOP - 0.55, SFL + 2.15
s_len = math.hypot(SY0 - SY1 + 0.9, S_TOP - S_EAVE)
s_ang = math.atan2(S_TOP - S_EAVE, SY0 - SY1 + 0.9)
box((SX1 - SX0 + 0.9, s_len, 0.22), ((SX0 + SX1) / 2, (SY0 + SY1 - 0.9) / 2, (S_TOP + S_EAVE) / 2 + 0.12), rot=(s_ang, 0, 0), mat=M_THATCH, name="atap_serambi")
for x in (SX0, SX1):
    box((0.16, 0.16, S_EAVE - SFL), (x, SY1, SFL + (S_EAVE - SFL) / 2), mat=M_POST, name="tiang_atap")
box((SX1 - SX0 + 0.3, 0.14, 0.14), ((SX0 + SX1) / 2, SY1, S_EAVE), mat=M_POST, name="alang")
# a red cloth hanging on the railing (the accent colour)
box((1.1, 0.03, 0.7), (-1.6, SY1 - 0.06, SFL + RH - 0.33), mat=M_RED, name="kain")

# ---------------------------------------------------------------- stairs and walkway
WALK = 0.45
steps = 4
for i in range(steps):
    z = SFL - (i + 1) * (SFL - WALK) / (steps + 1)
    box((0.32, 1.0, 0.06), (SX1 + 0.35 + i * 0.34, SY1 + 0.55, z), mat=M_FLOOR, name="anak_tangga")
for side in (0.05, 1.05):
    run = steps * 0.34 + 0.3
    rise = SFL - WALK
    ang = math.atan2(rise, run)
    box((math.hypot(run, rise), 0.06, 0.14), (SX1 + 0.3 + run / 2, SY1 + side, WALK + rise / 2), rot=(0, ang, 0), mat=M_POST, name="ibu_tangga")
for xi in range(0, 7):
    x = SX1 + 1.6 + xi * 1.9
    for y in (SY1 + 0.0, SY1 + 1.1):
        h = WALK - SEA
        box((0.14, 0.14, h), (x, y, SEA + h / 2), mat=M_POST, coll=props, name="tiang_titi")
x = SX1 + 1.4
while x < SX1 + 14:
    box((0.2, 1.3, 0.05), (x, SY1 + 0.55, WALK), rot=(0, 0, math.radians(((int(x * 10) % 3) - 1) * 1.2)), mat=M_FLOOR, coll=props, name="titi")
    x += 0.23

# ---------------------------------------------------------------- scenery: water, seabed, hill, palms, sampan
me = bpy.data.meshes.new("air")
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=400)
bm.to_mesh(me)
bm.free()
me.materials.append(M_WATER)
_link(bpy.data.objects.new("air", me), props)
box((800, 800, 0.2), (0, 0, SEA - 0.1), mat=M_SAND, coll=props, name="dasar")


def blob(loc, scale, mat, coll=props):
    me = bpy.data.meshes.new("blob")
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    for v in bm.verts:
        n = math.sin(v.co.x * 3.1) * math.cos(v.co.y * 2.3) * 0.12
        v.co *= 1 + n
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new("blob", me)
    ob.location = loc
    ob.scale = scale
    return _link(ob, coll)


blob((10, 70, -4), (60, 22, 26), M_HILL)
blob((-50, 60, -6), (40, 18, 18), M_HILL)



def palm(x, y, h, lean):
    segs = 6
    pos = Vector((x, y, 0.2))
    for i in range(segs):
        t = (i + 0.5) / segs
        dirv = Vector((math.sin(lean) * (0.25 + t * 0.6), 0.0, 1.0)).normalized()
        seg = h / segs
        c = pos + dirv * seg / 2
        rot = Vector((0, 0, 1)).rotation_difference(dirv).to_euler()
        cyl(0.2 - t * 0.07, seg * 1.05, c, rot=rot)
        pos = pos + dirv * seg
    for k in range(9):
        a = k * (2 * math.pi / 9)
        droop = math.radians(30 + (k % 3) * 12)
        d = Vector((math.cos(a) * math.cos(droop), math.sin(a) * math.cos(droop), -math.sin(droop) + 0.35))
        ln = 3.0
        c = pos + d.normalized() * ln / 2
        rot = Vector((1, 0, 0)).rotation_difference(d.normalized()).to_euler()
        box((ln, 0.55, 0.03), c, rot=rot, mat=M_LEAF, coll=props, name="pelepah")


palm(9.0, 7.5, 9.0, 0.25)
palm(12.5, 10.5, 11.0, -0.18)
palm(-9.5, 6.0, 8.5, -0.3)

# sampan tied at the walkway
me = bpy.data.meshes.new("sampan")
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts:
    v.co.x *= 4.6
    v.co.y *= 0.9
    v.co.z *= 0.45
    if abs(v.co.x) > 1.0:
        v.co.y *= 0.15  # pointed bow and stern
        v.co.z += 0.12
    if v.co.z < 0:
        v.co.y *= 0.55  # narrow keel
bm.to_mesh(me)
bm.free()
me.materials.append(M_POST)
ob = bpy.data.objects.new("sampan", me)
ob.location = (SX1 + 7.0, SY1 - 1.4, 0.15)
ob.rotation_euler = Euler((0, 0, math.radians(8)))
_link(ob, props)

# ---------------------------------------------------------------- light, sky, camera
world = bpy.data.worlds.new("sky")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
bg = wn.get("Background")
sky = wn.new("ShaderNodeTexSky")
sun_elev = math.radians(float(os.environ.get("SUN_ELEV", "11")))
sun_rot = math.radians(float(os.environ.get("SUN_ROT", "-140")))
for t in ("NISHITA", "MULTIPLE_SCATTERING", "SINGLE_SCATTERING"):
    try:
        sky.sky_type = t
        break
    except TypeError:
        continue
for attr, val in (("sun_elevation", sun_elev), ("sun_rotation", sun_rot), ("sun_disc", False), ("altitude", 0.0), ("air_density", 1.6), ("aerosol_density", 3.0)):
    if hasattr(sky, attr):
        try:
            setattr(sky, attr, val)
        except Exception:
            pass
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = float(os.environ.get("SKY", "0.07"))

sun_data = bpy.data.lights.new("matahari", "SUN")
sun_data.energy = float(os.environ.get("SUN", "7"))
sun_data.color = (1.0, 0.72, 0.45)
sun_data.angle = math.radians(1.5)
sun = bpy.data.objects.new("matahari", sun_data)
# point the light along the sky's sun direction
sun.rotation_euler = Euler((math.radians(90) - sun_elev, 0, sun_rot + math.radians(90)))
scene.collection.objects.link(sun)

cam_data = bpy.data.cameras.new("kamera")
cam_data.lens = 30
cam = bpy.data.objects.new("kamera", cam_data)
cam.location = (-12.5, -17.0, 2.6)
target = Vector((1.5, -1.0, 3.6))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.collection.objects.link(cam)
scene.camera = cam

r = scene.render
r.engine = "CYCLES"
r.resolution_x, r.resolution_y = int(os.environ.get("W", "1600")), int(os.environ.get("H", "900"))
r.film_transparent = False
scene.cycles.device = "CPU"
scene.cycles.samples = int(os.environ.get("SAMPLES", "64"))
scene.cycles.use_denoising = True
try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Punchy"
except TypeError:
    pass
scene.view_settings.exposure = 0.3
# a light haze so the hills fade (docs/ART.md: depth layers). A bounded box, not a world
# volume: an infinite world volume also swallows the sun lamp and renders black.
haze = bpy.data.materials.new("kabus")
haze.use_nodes = True
hn = haze.node_tree.nodes
hn.remove(hn.get("Principled BSDF"))
vol = hn.new("ShaderNodeVolumeScatter")
vol.inputs["Density"].default_value = float(os.environ.get("HAZE", "0.0025"))
vol.inputs["Color"].default_value = (1.0, 0.82, 0.66, 1)
haze.node_tree.links.new(vol.outputs["Volume"], hn.get("Material Output").inputs["Volume"])
box((600, 600, 90), (0, 60, 43), mat=haze, coll=props, name="kabus")

r.filepath = os.path.join(OUT, "stilt_house.png")
bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- export the house only
for ob in scene.objects:
    ob.select_set(ob.name in house.all_objects)
bpy.context.view_layer.objects.active = next(iter(house.all_objects))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "stilt_house.glb"), export_format="GLB", use_selection=True)
print("wrote", OUT)
