"""Sacred and storied places: the invented hermit's cave on the Gunung Ledang foothills, two keramat
shrines and the royal well at the foot of Bukit China.

Run headless:
  blender -b -P scripts/blender/keramat.py -- <out_dir>

Writes <out_dir>/keramat.png (exterior), keramat_gua.png (inside the cave) and one GLB per variant:
  gua            a rock outcrop with a cave: a low tunnel opening into a domed chamber lit by a shaft
                 from the roof; dripstones, a pool, a hermit's ledge with a mat, jars, a lamp and an
                 incense burner; moss and hanging roots at the mouth (tunnel mouth at -Y)
  keramat_pokok  a sacred tree: yellow cloth bound round the trunk, cloth-wrapped stones at the roots,
                 white and yellow pennants, an offering tray and incense burner
  keramat_makam  an old grave under a small shingled shelter (cungkup): laterite plinth, batu Aceh
                 headstones wrapped in yellow cloth, a low paling fence, pennants, a frangipani
  perigi_raja    the royal well at Bukit China: laterite-lined shaft in a raised ring, a pulley frame
                 with rope and bucket under a clay-tile canopy, a drain channel and water jars
Each sits at the origin; ground is Z=0.
"""

import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
import hutan  # noqa: E402  (resets the scene; crown, nature.tube)

nature = hutan.nature
M = kit.M
V = Vector
LATERITE = kit.fibre("laterit", (0.22, 0.11, 0.07), (0.46, 0.28, 0.18), scale=(6, 6, 6), bump=0.8)
STONE = kit.fibre("batu_aceh", (0.30, 0.29, 0.26), (0.58, 0.56, 0.50), scale=(5, 5, 5), bump=0.5)
CAVE_ROCK = kit.fibre("batu_gua", (0.12, 0.11, 0.10), (0.36, 0.34, 0.30), scale=(1.5, 1.5, 1.5), bump=1.0, rough=0.9)
MOSS = kit.flat("lumut", (0.10, 0.22, 0.05), 0.9)
YELLOW = kit.flat("kain_kuning", (0.85, 0.62, 0.05), 0.85)
WHITE = kit.flat("kain_putih", (0.80, 0.76, 0.66), 0.9)
TILE = kit.fibre("genting", (0.16, 0.06, 0.035), (0.36, 0.15, 0.08), scale=(2, 40, 2), bump=0.9, rough=0.8)
SIRAP = kit.wood("sirap", (0.025, 0.015, 0.01), (0.11, 0.06, 0.03), scale=14, rough=0.85)
POOL = kit.flat("air_gua", (0.01, 0.02, 0.02), 0.02)
NISAN = [(-0.22, 0.0), (0.22, 0.0), (0.22, 0.3), (0.34, 0.42), (0.2, 0.55), (0.14, 0.78), (0.0, 0.95), (-0.14, 0.78), (-0.2, 0.55), (-0.34, 0.42), (-0.22, 0.3)]


def carve(target, cutters):
    """Boolean-difference each cutter from target, bake the result into its mesh, delete cutters."""
    for k, ct in enumerate(cutters):
        mod = target.modifiers.new("potong%d" % k, "BOOLEAN")
        mod.operation = "DIFFERENCE"
        mod.solver = "EXACT"
        mod.object = ct
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(target.evaluated_get(dg))
    target.modifiers.clear()
    target.data = me
    for ct in cutters:
        bpy.data.objects.remove(ct)


def pennant(c, x, y, h, mat):
    kit.cyl(0.03, h, (x, y, h / 2), mat=M["post"], coll=c, name="tiang_panji")
    kit.sheet(0.7, 0.35, (x, y, h - 0.25), mat=mat, coll=c, nx=4, ny=2, bulge=0.05, name="panji")


def incense(c, x, y, z):
    kit.lathe([(0.0, 0.0), (0.08, 0.0), (0.1, 0.06), (0.14, 0.12), (0.0, 0.12)], (x, y, z), M["brass"], c, segs=12, name="perasapan")
    kit.blob((x, y, z + 0.14), (0.05, 0.05, 0.02), M["dark"], c, subdiv=1, name="kemenyan")


def gua(name, rnd):
    c = kit.new_group(name)
    rock = kit.blob((0, 5, 1.5), (14, 12, 9), CAVE_ROCK, c, wobble=0.18, seed=2.0, subdiv=4, smooth=True, name="bukit_batu")
    cut = []
    cut.append(kit.cyl(2.1, 16, (0, -6, 1.5), rot=(math.pi / 2, 0, 0), mat=CAVE_ROCK, coll=c, verts=20, name="terowong"))
    cut.append(kit.blob((0.5, 6, 2.6), (6.5, 6.0, 5.0), CAVE_ROCK, c, wobble=0.12, seed=5.0, subdiv=3, name="ruang"))
    cut.append(kit.cyl(0.9, 12, (0.5, 6.0, 9), mat=CAVE_ROCK, coll=c, verts=14, name="lubang_cahaya"))
    carve(rock, cut)
    kit.box((12, 22, 0.6), (0.5, 1.5, -0.25), mat=kit.fibre("lantai_gua", (0.10, 0.09, 0.07), (0.28, 0.25, 0.20), scale=(3, 3, 3), bump=0.6), coll=c, name="lantai_gua")  # top 5 cm above ground: coplanar faces shadow each other
    # dripstones hanging from the dome and rising from the floor
    for _ in range(26):
        a, r = rnd.uniform(0, 2 * math.pi), rnd.uniform(0.5, 4.5)
        x, y = 0.5 + math.cos(a) * r, 6 + math.sin(a) * r
        ceil = 2.6 + 5.0 * math.sqrt(max(0.0, 1 - (r / 6.3) ** 2))
        L = rnd.uniform(0.3, 1.4)
        kit.cyl(rnd.uniform(0.08, 0.2), L, (x, y, ceil - L / 2 + 0.1), mat=CAVE_ROCK, coll=c, r2=0.0, verts=7, rot=(math.pi, 0, 0), name="stalaktit")
    for _ in range(8):
        a, r = rnd.uniform(0, 2 * math.pi), rnd.uniform(2.5, 4.8)
        L = rnd.uniform(0.3, 0.9)
        kit.cyl(rnd.uniform(0.12, 0.25), L, (0.5 + math.cos(a) * r, 6 + math.sin(a) * r, L / 2), mat=CAVE_ROCK, coll=c, r2=0.02, verts=7, name="stalagmit")
    kit.cyl(1.6, 0.04, (-2.0, 8.0, 0.07), mat=POOL, coll=c, verts=24, name="kolam")
    # hermit's ledge under the light shaft
    kit.box((2.4, 1.4, 0.5), (3.2, 8.5, 0.25), mat=CAVE_ROCK, coll=c, name="pelantar_batu")
    kit.box((1.6, 1.0, 0.03), (3.2, 8.5, 0.52), mat=M["rattan"], coll=c, name="tikar")
    incense(c, 2.1, 7.8, 0.52)
    for k, (x, y) in enumerate(((4.6, 9.3), (4.2, 9.6), (-3.8, 3.5))):
        kit.tempayan(x, y, 0.0, k=0.6 + 0.15 * k, mat=M["clay"] if k else M["glaze"], coll=c)
    kit.lamp((4.3, 8.0, 0.6), coll=c, energy=90)
    sb = bpy.data.lights.new("cahaya_lubang", "SPOT")  # sunbeam down the roof shaft (exports as a glTF light)
    sb.energy, sb.spot_size, sb.color = 9000.0, math.radians(30), (1.0, 0.85, 0.65)
    so = bpy.data.objects.new("cahaya_lubang", sb)
    so.location = (0.5, 6.0, 11.5)
    fl = bpy.data.lights.new("cahaya_pantul", "POINT")  # daylight bouncing round the dome
    fl.energy, fl.color, fl.shadow_soft_size = 900.0, (0.9, 0.85, 0.75), 3.0
    fo = bpy.data.objects.new("cahaya_pantul", fl)
    fo.location = (0.5, 6.0, 4.5)
    c.objects.link(fo)
    c.objects.link(so)
    # moss and hanging roots at the mouth
    for _ in range(18):
        x = rnd.uniform(-5, 5)
        kit.blob((x, rnd.uniform(-8.5, -6.0), rnd.uniform(0.0, 5.0)), (rnd.uniform(0.6, 1.3), 0.4, rnd.uniform(0.4, 0.9)), MOSS, c, wobble=0.3,
                 seed=rnd.random() * 9, subdiv=2, name="lumut")
    for k in range(10):
        x = -2.4 + k * 0.55
        top = V((x, -7.0 + rnd.uniform(-0.3, 0.3), 4.2 + rnd.uniform(0, 0.6)))
        nature.tube(c, [top, top + V((0.1, -0.1, -1.2)), top + V((0.05, -0.15, -rnd.uniform(2.0, 3.0)))], [0.03, 0.025, 0.015], M["trunk"], "akar", verts=4)
    for _ in range(6):
        hutan.crown(c, rnd, (rnd.uniform(-9, 9), rnd.uniform(0, 10), rnd.uniform(10, 11.5)), 2.6, 2.6, 1.6, 3)
    return c


def keramat_pokok(name, rnd):
    c = kit.new_group(name)
    pts = [V((0.2 * math.sin(i), 0.1 * math.cos(i), 6.0 * i / 5)) for i in range(6)]
    nature.tube(c, pts, [0.9, 0.75, 0.6, 0.5, 0.45, 0.4], hutan.BARK, "batang", verts=12)
    hutan.buttresses(c, rnd, 0.9, 1.8, 2.2, hutan.BARK, n=6)
    for k in range(5):
        az = k * 2 * math.pi / 5 + 0.3
        end = pts[-1] + V((math.cos(az) * 5.0, math.sin(az) * 5.0, 3.5))
        hutan.limb(c, pts[-2], end, 0.3, 0.1, hutan.BARK, bend=0.6)
        hutan.crown(c, rnd, end, 3.6, 3.6, 2.4, 5)
        for j in range(4):  # aerial roots dropping from the limbs
            p = pts[-2].lerp(end, 0.4 + 0.15 * j)
            nature.tube(c, [p, V((p.x, p.y, p.z * 0.5)), V((p.x + 0.1, p.y, 0.0))], [0.03, 0.035, 0.05], hutan.BARK, "akar_gantung", verts=5)
    hutan.crown(c, rnd, pts[-1] + V((0, 0, 5)), 4.0, 4.0, 2.4, 6)
    for z in (1.2, 1.6):
        kit.cyl(0.93 if z < 1.4 else 0.86, 0.3, (0.2 * math.sin(z), 0.0, z), mat=YELLOW, coll=c, verts=20, name="kain_balut")
    for k in range(5):  # cloth-wrapped stones at the roots
        a = k * 1.3 + 0.4
        x, y = math.cos(a) * 1.6, math.sin(a) * 1.6 - 0.4
        kit.blob((x, y, 0.25), (0.3, 0.25, 0.35), STONE, c, wobble=0.2, subdiv=2, name="batu")
        kit.cyl(0.29, 0.14, (x, y, 0.3), mat=YELLOW if k % 2 else WHITE, coll=c, verts=12, name="kain_batu")
    kit.cyl(0.35, 0.05, (0.0, -1.4, 0.03), mat=M["rattan"], coll=c, name="dulang")
    for k in range(6):
        kit.blob((0.15 * math.cos(k), -1.4 + 0.15 * math.sin(k), 0.09), (0.05, 0.05, 0.04), M["fruit_red"] if k % 2 else M["porcelain"], c, subdiv=1, name="bunga")
    incense(c, 0.6, -1.3, 0.0)
    for x, y, m in ((-2.4, -1.8, YELLOW), (2.2, -2.0, WHITE), (-1.0, 2.4, YELLOW)):
        pennant(c, x, y, 2.6, m)
    return c


def keramat_makam(name, rnd):
    c = kit.new_group(name)
    kit.box((3.2, 1.8, 0.4), (0, 0, 0.2), mat=LATERITE, coll=c, name="tapak_makam")
    kit.box((2.2, 0.9, 0.2), (0, 0, 0.5), mat=LATERITE, coll=c, name="kubur")
    for s in (-1, 1):
        k = 1.0 if s < 0 else 0.8
        ob = kit.prism([(y * k, z * k + 0.6) for y, z in NISAN], 0.14, 0.0, STONE, c, name="batu_aceh")
        ob.location = (s * 0.85, 0, 0)
        kit.box((0.2, 0.5 * k, 0.28 * k), (s * 0.85, 0, 0.6 + 0.4 * k), mat=YELLOW, coll=c, name="kain_nisan")
    kit.box((1.6, 0.7, 0.02), (0, 0, 0.61), mat=WHITE, coll=c, name="kain_kubur")
    for sx in (-1, 1):
        for sy in (-1, 1):
            kit.cyl(0.09, 2.4, (sx * 1.9, sy * 1.3, 1.2), mat=M["post"], coll=c, name="tiang")
    kit.hip(0, 0, 2.5, 1.9, 0.6, 0.05, 2.35, 3.6, mat=SIRAP, coll=c, name="cungkup")
    for (ax, ay), (bx, by) in (((-2.6, -2.0), (2.6, -2.0)), ((2.6, -2.0), (2.6, 2.0)), ((2.6, 2.0), (-2.6, 2.0)), ((-2.6, 2.0), (-2.6, -2.0))):
        n = int(math.hypot(bx - ax, by - ay) / 0.3)
        for i in range(n + 1):
            x, y = ax + (bx - ax) * i / n, ay + (by - ay) * i / n
            if ay == by == -2.0 and abs(x) < 0.5:
                continue
            kit.box((0.06, 0.06, 0.8), (x, y, 0.4), mat=M["weathered"], coll=c, name="pagar")
    incense(c, 0.0, -1.2, 0.4)
    kit.cyl(0.3, 0.04, (0.6, -1.2, 0.42), mat=M["rattan"], coll=c, name="dulang")
    for x, m in ((-2.9, YELLOW), (2.9, WHITE)):
        pennant(c, x, -2.3, 2.8, m)
    # frangipani behind
    tx, ty = 1.5, 3.6
    for a in range(3):
        ang = a * 2.1
        tip = (tx + math.cos(ang) * 1.2, ty + math.sin(ang) * 1.2, 2.8)
        kit.beam((tx, ty, 0), (tx, ty, 1.6), 0.12, M["trunk"], c, name="kemboja")
        kit.beam((tx, ty, 1.6), tip, 0.08, M["trunk"], c, name="kemboja")
        kit.blob(tip, (0.7, 0.7, 0.45), M["leaf"], c, wobble=0.35, seed=a + tx, subdiv=2, smooth=True, name="daun_kemboja")
        for f in range(4):
            kit.blob((tip[0] + math.cos(f * 1.7) * 0.5, tip[1] + math.sin(f * 1.7) * 0.5, tip[2] + 0.3), (0.06, 0.06, 0.04), M["porcelain"], c, wobble=0.0, subdiv=1, name="bunga_kemboja")
    return c


def perigi_raja(name, rnd):
    c = kit.new_group(name)
    kit.box((6.0, 6.0, 0.25), (0, 0, 0.125), mat=LATERITE, coll=c, name="lantai")
    R, n = 1.25, 16
    for k in range(n):  # ring of dressed laterite blocks, down the shaft and up as a parapet
        a = k * 2 * math.pi / n
        kit.box((0.5, 0.42, 3.6), (math.cos(a) * R, math.sin(a) * R, 0.75 - 1.4), rot=(0, 0, a), mat=LATERITE, coll=c, name="dinding_perigi")
        kit.box((0.56, 0.46, 0.12), (math.cos(a) * R, math.sin(a) * R, 0.9), rot=(0, 0, a), mat=STONE, coll=c, name="bibir")
    kit.cyl(R - 0.15, 0.02, (0, 0, -2.4), mat=POOL, coll=c, verts=24, name="air")
    kit.cyl(R - 0.2, 0.05, (0, 0, -3.2), mat=M["dark"], coll=c, verts=24, name="dasar")
    # pulley frame
    for sx in (-1, 1):
        kit.box((0.2, 0.2, 2.8), (sx * 1.7, 0, 1.6), mat=M["post"], coll=c, name="tiang_kerek")
    kit.beam((-1.85, 0, 2.95), (1.85, 0, 2.95), 0.09, M["post"], c, verts=8, name="palang")
    kit.torus(0.22, 0.05, (0.0, 0.0, 2.75), rot=(math.pi / 2, 0, 0), mat=M["trim"], coll=c, name="kerek")
    kit.beam((-0.22, 0, 2.75), (-0.22, 0, 0.3), 0.012, M["rope"], c, verts=4, name="tali")
    kit.beam((0.22, 0, 2.75), (0.9, -1.6, 0.25), 0.012, M["rope"], c, verts=4, name="tali")
    kit.cyl(0.18, 0.3, (-0.22, 0, 0.15), mat=M["plank"], coll=c, r2=0.22, name="timba")
    kit.torus(0.2, 0.015, (-0.22, 0, 0.3), mat=M["iron"], coll=c, name="gegelang")
    # clay-tile canopy on four posts
    for sx in (-1, 1):
        for sy in (-1, 1):
            kit.box((0.18, 0.18, 3.0), (sx * 2.6, sy * 2.6, 1.6), mat=M["red"], coll=c, name="tiang")
    kit.hip(0, 0, 3.3, 3.3, 0.9, 0.05, 3.1, 4.6, mat=TILE, coll=c, trim=M["post"], name="atap")
    for sx in (-1, 1):
        for sy in (-1, 1):
            kit.box((0.5, 0.18, 0.18), (sx * 3.4, sy * 3.4, 3.2), rot=(0, -sx * 0.4, sx * sy * math.pi / 4), mat=TILE, coll=c, name="hujung")
    # drain channel and jars
    kit.box((0.4, 4.0, 0.12), (2.2, -4.5, 0.06), mat=LATERITE, coll=c, name="parit")
    kit.box((0.25, 4.0, 0.02), (2.2, -4.5, 0.12), mat=POOL, coll=c, name="air_parit")
    for k in range(4):
        kit.tempayan(-2.4 + 0.7 * k, -2.5, 0.25, k=0.9, mat=M["glaze"] if k % 2 else M["clay"], coll=c)
    kit.lathe([(0.0, 0.0), (0.18, 0.0), (0.22, 0.2), (0.3, 0.32), (0.0, 0.32)], (2.4, 2.4, 0.25), STONE, c, segs=16, name="tempat_colok")
    return c


rnd = random.Random(1511)
groups = [gua("gua", rnd), keramat_pokok("keramat_pokok", rnd), keramat_makam("keramat_makam", rnd), perigi_raja("perigi_raja", rnd)]
GUA = (-16.0, 20.0)
SPOTS = [(GUA, 0), ((12.0, 14.0), 0), ((14.0, -1.0), -15), ((-3.0, -4.0), 10)]
for g, ((x, y), yaw) in zip(groups, SPOTS):
    kit.place(g, (x, y, 0), math.radians(yaw))

kit.ground(0.0, kit.fibre("tanah_hutan", (0.12, 0.10, 0.05), (0.30, 0.27, 0.14), scale=(3, 3, 3), bump=0.4))
kit.hills()
kit.environment(cam=(2.0, -27.0, 6.5), target=(-1.0, 7.0, 4.0), lens=20, sun_elev=40, sun_rot=-150, sky=0.08, sun=8.0, haze=0.002, exposure=0.25)
kit.render_and_export("keramat", groups)

# second shot: inside the cave, looking from the tunnel into the lit chamber
scene = bpy.context.scene
cd = bpy.data.cameras.new("kamera_gua")
cd.lens = 16
co = bpy.data.objects.new("kamera_gua", cd)
co.location = (GUA[0] - 0.3, GUA[1] - 4.5, 1.7)
co.rotation_euler = (V((GUA[0] + 1.0, GUA[1] + 8.0, 1.8)) - co.location).to_track_quat("-Z", "Y").to_euler()
scene.collection.objects.link(co)
scene.camera = co
scene.view_settings.exposure = 2.4
bpy.data.objects["kabus"].hide_render = True  # haze volume makes the enclosed interior very slow to render
scene.render.filepath = os.path.join(kit.OUT, "keramat_gua.png")
bpy.ops.render.render(write_still=True)
print("wrote", kit.OUT, "keramat_gua")
