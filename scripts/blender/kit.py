"""Shared Blender helpers for Keris asset scripts: materials, shapes, the golden-hour
scene (sky, sun, water, haze), rendering and GLB export.

An asset script does:
  import kit
  kit.reset()
  ... build into kit.ASSET (exported) and kit.SCENERY (render only) ...
  kit.water(); kit.environment(cam=(...), target=(...))
  kit.finish("name")   # writes <out>/name.png and <out>/name.glb

Units are metres, Z is up. Environment overrides: SAMPLES, SUN_ELEV, SUN_ROT, SKY,
SUN, HAZE, W, H.
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

ASSET = None
SCENERY = None
M = {}


def env(name, default):
    return type(default)(os.environ.get(name, default))


# ---------------------------------------------------------------- materials


def _principled(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes.get("Principled BSDF")


def wood(name, dark, light, scale=6.0, rough=0.75):
    """Grain along the object's local Z plus noise."""
    m, nt, bsdf = _principled(name)
    n, l = nt.nodes, nt.links
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
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    l.new(mp.outputs["Vector"], wave.inputs["Vector"])
    l.new(mp.outputs["Vector"], noise.inputs["Vector"])
    l.new(wave.outputs["Fac"], mix.inputs["A"])
    l.new(noise.outputs["Fac"], mix.inputs["B"])
    l.new(mix.outputs["Result"], ramp.inputs["Fac"])
    l.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    m.diffuse_color = (*light, 1)
    return m


def fibre(name, dark, light, scale=(40.0, 1.5, 40.0), bump=0.6, rough=0.95):
    """Strand texture for thatch, sacking, rope, rattan and rock."""
    m, nt, bsdf = _principled(name)
    n, l = nt.nodes, nt.links
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = scale
    noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6.0
    noise.inputs["Detail"].default_value = 8.0
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (*light, 1)
    b = n.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = bump
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    l.new(mp.outputs["Vector"], noise.inputs["Vector"])
    l.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    l.new(noise.outputs["Fac"], b.inputs["Height"])
    l.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    l.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = rough
    m.diffuse_color = (*[(a + c) / 2 for a, c in zip(dark, light)], 1)
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


def glow(name, color, strength):
    m, nt, bsdf = _principled(name)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Strength"].default_value = strength
    m.diffuse_color = (*color, 1)
    return m


def _materials():
    M.clear()
    M["post"] = wood("tiang", (0.10, 0.06, 0.035), (0.28, 0.17, 0.09), scale=4)
    M["plank"] = wood("papan", (0.20, 0.11, 0.05), (0.50, 0.31, 0.15))
    M["floor"] = wood("lantai", (0.17, 0.10, 0.05), (0.42, 0.27, 0.13), scale=5)
    M["trim"] = wood("ukiran", (0.30, 0.18, 0.08), (0.66, 0.46, 0.24), scale=8)
    M["weathered"] = wood("lusuh", (0.22, 0.19, 0.15), (0.48, 0.43, 0.36), scale=5)
    M["thatch"] = fibre("atap", (0.16, 0.10, 0.05), (0.55, 0.40, 0.20))
    M["sack"] = fibre("guni", (0.33, 0.26, 0.16), (0.62, 0.52, 0.34), scale=(60, 60, 60), bump=0.3)
    M["rope"] = fibre("tali", (0.30, 0.22, 0.12), (0.60, 0.48, 0.28), scale=(80, 80, 8), bump=0.5)
    M["rattan"] = fibre("rotan", (0.38, 0.25, 0.10), (0.75, 0.58, 0.30), scale=(30, 30, 90), bump=0.5)
    M["dark"] = flat("gelap", (0.02, 0.015, 0.01), 1.0)
    M["red"] = flat("kain", (0.55, 0.05, 0.04), 0.9)
    M["indigo"] = flat("nila", (0.06, 0.08, 0.25), 0.9)
    M["gold_cloth"] = flat("kuning", (0.70, 0.45, 0.06), 0.85)
    M["clay"] = flat("tanah_liat", (0.45, 0.20, 0.09), 0.85)
    M["glaze"] = flat("sayu", (0.12, 0.20, 0.14), 0.25)
    M["porcelain"] = flat("tembikar", (0.80, 0.82, 0.80), 0.2)
    M["blue"] = flat("biru", (0.05, 0.10, 0.40), 0.2)
    M["iron"] = flat("besi", (0.08, 0.07, 0.06), 0.5, **{"Metallic": 0.8})
    M["brass"] = flat("tembaga", (0.70, 0.45, 0.15), 0.35, **{"Metallic": 1.0})
    M["flame"] = glow("api", (1.0, 0.45, 0.10), 30.0)
    M["water"] = flat("air", (0.02, 0.32, 0.30), 0.04, **{"Transmission Weight": 0.85, "IOR": 1.33})
    M["sand"] = flat("pasir", (0.62, 0.52, 0.34), 1.0)
    M["hill"] = flat("bukit", (0.06, 0.16, 0.05), 1.0)
    M["leaf"] = flat("daun", (0.10, 0.25, 0.06), 0.7)
    M["leaf_lit"] = flat("daun_muda", (0.25, 0.40, 0.08), 0.6)
    M["trunk"] = flat("batang", (0.25, 0.20, 0.14), 0.9)
    M["rock"] = fibre("batu", (0.15, 0.14, 0.12), (0.42, 0.40, 0.36), scale=(4, 4, 4), bump=1.0, rough=0.9)
    M["fruit_red"] = flat("buah_merah", (0.60, 0.08, 0.05), 0.5)
    M["fruit_yel"] = flat("buah_kuning", (0.80, 0.60, 0.05), 0.5)
    M["fruit_grn"] = flat("buah_hijau", (0.20, 0.40, 0.05), 0.5)


def reset():
    global ASSET, SCENERY
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ASSET = bpy.data.collections.new("Asset")
    SCENERY = bpy.data.collections.new("Scenery")
    bpy.context.scene.collection.children.link(ASSET)
    bpy.context.scene.collection.children.link(SCENERY)
    _materials()


# ---------------------------------------------------------------- shapes


def _obj(me, mat, loc, rot, coll, name, scale=None):
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.rotation_euler = rot if isinstance(rot, Euler) else Euler(rot)
    if scale:
        ob.scale = scale
    (coll or ASSET).objects.link(ob)
    return ob


def box(size, loc, rot=(0, 0, 0), mat=None, coll=None, name="box"):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    bm.to_mesh(me)
    bm.free()
    return _obj(me, mat or M["plank"], loc, rot, coll, name)


def cyl(r, h, loc, rot=(0, 0, 0), mat=None, coll=None, verts=10, r2=None, name="cyl"):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bm.to_mesh(me)
    bm.free()
    return _obj(me, mat or M["post"], loc, rot, coll, name)


def beam(a, b, r, mat=None, coll=None, verts=8, name="beam"):
    """A cylinder from point a to point b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    return cyl(r, d.length, (a + b) / 2, rot, mat, coll, verts, name=name)


def lathe(profile, loc, mat=None, coll=None, segs=16, rot=(0, 0, 0), name="lathe", smooth=True):
    """Spin a (radius, z) profile around Z; both ends are capped."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        r = max(r, 0.001)
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / segs), r * math.sin(2 * math.pi * i / segs), z)) for i in range(segs)])
    for a, b in zip(rings, rings[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return _obj(me, mat or M["clay"], loc, rot, coll, name)


def prism(points2d, depth, axis_x, mat=None, coll=None, name="prism"):
    """Extrude a polygon in the YZ plane along X, centred on axis_x."""
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
    return _obj(me, mat or M["plank"], (0, 0, 0), (0, 0, 0), coll, name)


def blob(loc, scale, mat=None, coll=None, wobble=0.12, seed=0.0, subdiv=3, name="blob", smooth=False, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    for v in bm.verts:
        n = math.sin(v.co.x * 3.1 + seed) * math.cos(v.co.y * 2.3 + seed * 1.7) * math.sin(v.co.z * 2.7 + seed * 0.6)
        v.co *= 1 + n * wobble
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return _obj(me, mat or M["hill"], loc, rot, coll, name, scale=scale)


def torus(R, r, loc, rot=(0, 0, 0), mat=None, coll=None, name="torus", segs=20):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    ring = 8
    grid = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        row = []
        for k in range(ring):
            b = 2 * math.pi * k / ring
            row.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        grid.append(row)
    for i in range(segs):
        for k in range(ring):
            i2, k2 = (i + 1) % segs, (k + 1) % ring
            bm.faces.new((grid[i][k], grid[i2][k], grid[i2][k2], grid[i][k2]))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return _obj(me, mat or M["rope"], loc, rot, coll, name)


def sheet(w, h, loc, rot=(0, 0, 0), mat=None, coll=None, sag=0.0, bulge=0.0, nx=8, ny=6, name="sheet"):
    """A cloth or sail panel in local XZ, with optional sag (Z dip mid-span) and bulge (Y)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            u, v = i / nx, j / ny
            s = math.sin(math.pi * u)
            row.append(bm.verts.new(((u - 0.5) * w, bulge * s * math.sin(math.pi * v), (v - 0.5) * h - sag * s)))
        vs.append(row)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.02)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return _obj(me, mat or M["red"], loc, rot, coll, name)


def lamp(loc, coll=None, energy=60.0):
    """A small flame (pelita) with a warm point light."""
    ob = blob(loc, (0.05, 0.05, 0.09), M["flame"], coll, wobble=0.05, subdiv=2, name="api")
    ld = bpy.data.lights.new("pelita", "POINT")
    ld.energy = energy
    ld.color = (1.0, 0.55, 0.22)
    ld.shadow_soft_size = 0.05
    lo = bpy.data.objects.new("pelita", ld)
    lo.location = Vector(loc) + Vector((0, 0, 0.05))
    bpy.context.scene.collection.objects.link(lo)
    return ob


# ---------------------------------------------------------------- scenery


def water(sea=-1.6):
    me = bpy.data.meshes.new("air")
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=400)
    bm.to_mesh(me)
    bm.free()
    _obj(me, M["water"], (0, 0, 0), (0, 0, 0), SCENERY, "air")
    box((800, 800, 0.2), (0, 0, sea - 0.1), mat=M["sand"], coll=SCENERY, name="dasar")


def ground(z=0.0, mat=None, size=800):
    box((size, size, 0.2), (0, 0, z - 0.1), mat=mat or M["sand"], coll=SCENERY, name="tanah")


def hills():
    blob((30, 170, -10), (110, 40, 42), M["hill"], SCENERY)
    blob((-110, 150, -10), (80, 30, 30), M["hill"], SCENERY)


def environment(cam, target, lens=30, sun_elev=11, sun_rot=-140, sky=0.07, sun=7.0, haze=0.0025, exposure=0.3):
    scene = bpy.context.scene
    world = bpy.data.worlds.new("sky")
    scene.world = world
    world.use_nodes = True
    wn = world.node_tree.nodes
    bg = wn.get("Background")
    sk = wn.new("ShaderNodeTexSky")
    se = math.radians(env("SUN_ELEV", float(sun_elev)))
    sr = math.radians(env("SUN_ROT", float(sun_rot)))
    try:
        sk.sky_type = "MULTIPLE_SCATTERING"
    except TypeError:
        pass
    for attr, val in (("sun_elevation", se), ("sun_rotation", sr), ("sun_disc", False), ("altitude", 0.0), ("air_density", 1.6), ("aerosol_density", 3.0)):
        if hasattr(sk, attr):
            try:
                setattr(sk, attr, val)
            except Exception:
                pass
    # warm the sky so it reads as tropical haze rather than flat grey
    tint = wn.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MULTIPLY"
    tint.inputs["Factor"].default_value = 1.0
    tint.inputs[7].default_value = (1.0, 0.86, 0.68, 1)
    world.node_tree.links.new(sk.outputs["Color"], tint.inputs[6])
    world.node_tree.links.new(tint.outputs[2], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = env("SKY", float(sky))

    sd = bpy.data.lights.new("matahari", "SUN")
    sd.energy = env("SUN", float(sun))
    sd.color = (1.0, 0.72, 0.45)
    sd.angle = math.radians(1.5)
    so = bpy.data.objects.new("matahari", sd)
    so.rotation_euler = Euler((math.radians(90) - se, 0, sr + math.radians(90)))
    scene.collection.objects.link(so)

    cd = bpy.data.cameras.new("kamera")
    cd.lens = lens
    co = bpy.data.objects.new("kamera", cd)
    co.location = cam
    co.rotation_euler = (Vector(target) - co.location).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(co)
    scene.camera = co

    r = scene.render
    r.engine = "CYCLES"
    r.resolution_x, r.resolution_y = env("W", 1600), env("H", 900)
    scene.cycles.device = "CPU"
    scene.cycles.samples = env("SAMPLES", 64)
    scene.cycles.use_denoising = True
    try:
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Punchy"
    except TypeError:
        pass
    scene.view_settings.exposure = exposure

    # bounded haze box (an infinite world volume swallows the sun)
    hz = bpy.data.materials.new("kabus")
    hz.use_nodes = True
    hn = hz.node_tree.nodes
    hn.remove(hn.get("Principled BSDF"))
    vol = hn.new("ShaderNodeVolumeScatter")
    vol.inputs["Density"].default_value = env("HAZE", float(haze))
    vol.inputs["Color"].default_value = (1.0, 0.82, 0.66, 1)
    hz.node_tree.links.new(vol.outputs["Volume"], hn.get("Material Output").inputs["Volume"])
    box((600, 600, 90), (0, 60, 43), mat=hz, coll=SCENERY, name="kabus")


def finish(name):
    scene = bpy.context.scene
    scene.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    for ob in scene.objects:
        ob.select_set(ob.name in ASSET.all_objects)
    bpy.context.view_layer.objects.active = next(iter(ASSET.all_objects))
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + ".glb"), export_format="GLB", use_selection=True)
    print("wrote", OUT, name)


# ---------------------------------------------------------------- variants: one collection per model


def new_group(name):
    """A sub-collection of ASSET; build one model into it at the origin."""
    c = bpy.data.collections.new(name)
    ASSET.children.link(c)
    return c


def place(coll, loc, yaw=0.0):
    """Parent the group to an empty and move it into the shot. Export resets it."""
    e = bpy.data.objects.new(coll.name, None)
    coll.objects.link(e)
    for ob in coll.objects:
        if ob is not e and ob.parent is None:
            ob.parent = e
    e.location = loc
    e.rotation_euler = (0, 0, yaw)
    return e


def render_and_export(name, groups):
    """Render one shot of every variant to <name>.png, then export each group at the origin."""
    scene = bpy.context.scene
    scene.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    for c in groups:
        e = bpy.data.objects[c.name]
        loc, rot = e.location.copy(), e.rotation_euler.copy()
        e.location, e.rotation_euler = (0, 0, 0), (0, 0, 0)
        bpy.context.view_layer.update()
        for ob in scene.objects:
            ob.select_set(ob.name in c.all_objects)
        bpy.context.view_layer.objects.active = e
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, c.name + ".glb"), export_format="GLB", use_selection=True)
        e.location, e.rotation_euler = loc, rot
    print("wrote", OUT, name, [c.name for c in groups])


def hip(cx, cy, ax, ay, bx, by, ze, zt, mat=None, coll=None, trim=None, t=0.2, name="atap"):
    """A hipped roof tier: eave rectangle (half sizes ax, ay) at ze rising to (bx, by) at zt,
    open on top (bx = by = 0.05 makes a pyramid). Hips and eaves get trim beams."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    sq = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    ob = [bm.verts.new((cx + sx * ax, cy + sy * ay, ze)) for sx, sy in sq]
    ot = [bm.verts.new((cx + sx * bx, cy + sy * by, zt)) for sx, sy in sq]
    ib = [bm.verts.new((cx + sx * ax, cy + sy * ay, ze - t)) for sx, sy in sq]
    it = [bm.verts.new((cx + sx * bx, cy + sy * by, zt - t)) for sx, sy in sq]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((ob[i], ob[j], ot[j], ot[i]))
        bm.faces.new((ib[j], ib[i], it[i], it[j]))
        bm.faces.new((ib[i], ib[j], ob[j], ob[i]))
        bm.faces.new((ot[i], ot[j], it[j], it[i]))
    bm.to_mesh(me)
    bm.free()
    roof = _obj(me, mat or M["thatch"], (0, 0, 0), (0, 0, 0), coll, name)
    tm = trim or M["trim"]
    for i, (sx, sy) in enumerate(sq):
        beam((cx + sx * ax, cy + sy * ay, ze), (cx + sx * bx, cy + sy * by, zt), 0.08, tm, coll, verts=6, name="perabung")
        nx, ny = sq[(i + 1) % 4]
        beam((cx + sx * ax, cy + sy * ay, ze - 0.05), (cx + nx * ax, cy + ny * ay, ze - 0.05), 0.07, tm, coll, verts=6, name="papan_cantik")
    if bx > 0.1:  # a ridge along X when the top is a line, not a point
        beam((cx - bx, cy, zt), (cx + bx, cy, zt), 0.1, tm, coll, verts=6, name="perabung")
    return roof


# ---------------------------------------------------------------- common props


def sack(x, y, z, k=1.0, seed=0.0, yaw=0.0, coll=None):
    return blob((x, y, z + 0.22 * k), (0.36 * k, 0.26 * k, 0.24 * k), M["sack"], coll, wobble=0.18, seed=seed, smooth=True, rot=(0, 0, yaw), name="guni")


def tempayan(x, y, z, k=1.0, mat=None, coll=None):
    p = [(0.0, 0.0), (0.17, 0.0), (0.27, 0.12), (0.33, 0.32), (0.32, 0.5), (0.24, 0.66), (0.14, 0.74), (0.12, 0.79), (0.15, 0.82), (0.15, 0.84), (0.0, 0.84)]
    return lathe([(r * k, h * k) for r, h in p], (x, y, z), mat=mat or M["glaze"], coll=coll, segs=20, name="tempayan")


# ---------------------------------------------------------------- walls and roofs


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
        box(size, (ax + ux * s, ay + uy * s, z0 + (zb + zt) / 2), mat=mat, coll=c, name="dinding")

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
                box((0.07, 0.07, h), (ax + ux * k + nx * (t / 2 + 0.03), ay + uy * k + ny * (t / 2 + 0.03), z0 + h / 2),
                        mat=battens, coll=c, name="bilah")
            k += 0.55


def gable_roof(c, W, D, ze, rise, over, mat, trim):
    hip(0, 0, W / 2 + over, D / 2 + over + 0.4, W / 2 + over, 0.05, ze, ze + rise, mat=mat, coll=c, trim=trim, name="atap")
    for sx in (-1, 1):  # gable panels
        prism([(-D / 2 - 0.1, ze), (D / 2 + 0.1, ze), (0, ze + rise * (D / 2 + 0.1) / (D / 2 + over + 0.4) - 0.05)], 0.08,
                  sx * (W / 2 + 0.05), mat=M["plank"], coll=c, name="tebar_layar")

