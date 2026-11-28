"""Masjid besar of Melaka, c. 1511: a square timber prayer hall under a three-tier
pyramid roof (atap tumpang) on a laterite plinth, after Masjid Agung Demak and Masjid
Kampung Laut. No dome or minaret: those came centuries later.

Run headless:
  blender -b -P scripts/blender/masjid.py -- <out_dir>

Writes <out_dir>/masjid.png (exterior), masjid_dalam.png (interior) and masjid.glb.
The mihrab wall faces +Y: rotate the model in the engine so +Y points to the qibla
(about 292 degrees, west-north-west, from Melaka). Entrance and serambi face -Y.

Compound: hall with four great pillars (soko guru), mihrab niche and mimbar inside;
front verandah (serambi); beduk drum pavilion; ablution pool and well; a walled yard
with a gate and graves marked by batu Aceh headstones under frangipani trees.
"""

import math
import os
import sys

import bmesh
import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
from kit import M, beam, blob, box, cyl, lathe  # noqa: E402

kit.reset()
SIRAP = kit.wood("sirap", (0.025, 0.015, 0.01), (0.11, 0.06, 0.03), scale=14, rough=0.85)
LATERITE = kit.fibre("laterit", (0.22, 0.11, 0.07), (0.46, 0.28, 0.18), scale=(6, 6, 6), bump=0.8)
STONE = kit.fibre("batu_aceh", (0.30, 0.29, 0.26), (0.58, 0.56, 0.50), scale=(5, 5, 5), bump=0.5)
GOLD = kit.flat("emas", (0.95, 0.66, 0.2), 0.3, **{"Metallic": 1.0})

FZ = 1.0            # top of the plinth, the prayer floor
H = 9.0             # half size of the square hall
WT = FZ + 3.8       # wall top
c = kit.new_group("masjid")

# ---------------------------------------------------------------- roof pieces


def hip(cx, cy, ax, ay, bx, by, ze, zt, mat=SIRAP, t=0.22, name="atap"):
    """A hipped roof tier: eave rectangle (ax, ay) at ze rising to (bx, by) at zt, open on top."""
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
    kit._obj(me, mat, (0, 0, 0), (0, 0, 0), c, name)
    for sx, sy in sq:
        beam((cx + sx * ax, cy + sy * ay, ze), (cx + sx * bx, cy + sy * by, zt), 0.1, M["trim"], c, verts=6, name="perabung")
    for i in range(4):
        j = (i + 1) % 4
        beam((cx + sq[i][0] * ax, cy + sq[i][1] * ay, ze - 0.05), (cx + sq[j][0] * ax, cy + sq[j][1] * ay, ze - 0.05), 0.08, M["trim"], c, verts=6, name="papan_cantik")


def tumpang(cx, cy, tiers, ze, gap=1.2):
    """Stacked square pyramid tiers [(eave half, top half, pitch)]. Each upper eave is
    lifted `gap` clear of the tier below, with a lattice clerestory between. Returns top z."""
    prev = None
    for a, b, pitch in tiers:
        tn = math.tan(math.radians(pitch))
        if prev:
            pa, pb, pz, ptn = prev
            ze = pz + (pa - a) * ptn + gap
            lo = pz + (pa - pb) * ptn - 0.4
            hi = ze + (a - pb) * tn
            for s in (-1, 1):
                box((2 * pb, 0.12, hi - lo), (cx, cy + s * pb, (lo + hi) / 2), mat=M["trim"], coll=c, name="kerawang")
                box((0.12, 2 * pb, hi - lo), (cx + s * pb, cy, (lo + hi) / 2), mat=M["trim"], coll=c, name="kerawang")
        zt = ze + (a - b) * tn
        hip(cx, cy, a, a, b, b, ze, zt)
        prev = (a, b, ze, tn)
    return zt


# ---------------------------------------------------------------- walls


def wall(a0, a1, fixed, kinds, along_y=False, z0=FZ, z1=WT):
    """Plank wall in equal bays; kinds: 'solid', 'window', 'door' or 'mihrab' per bay."""
    bw = (a1 - a0) / len(kinds)

    def put(m, w, lo, hi, mat=M["plank"], d=0.14, off=0.0, name="dinding"):
        if w <= 0 or hi <= lo:
            return
        if along_y:
            box((d, w, hi - lo), (fixed + off, m, (lo + hi) / 2), mat=mat, coll=c, name=name)
        else:
            box((w, d, hi - lo), (m, fixed + off, (lo + hi) / 2), mat=mat, coll=c, name=name)

    for i, k in enumerate(kinds):
        m = a0 + bw * (i + 0.5)
        if k == "solid":
            put(m, bw, z0, z1)
            continue
        ow = {"window": 1.4, "door": 1.8, "mihrab": 2.4}[k]
        lo = z0 + (0.6 if k == "window" else 0.0)
        hi = z0 + {"window": 2.2, "door": 2.6, "mihrab": 3.2}[k]
        put(m - (bw + ow) / 4, (bw - ow) / 2, z0, z1)
        put(m + (bw + ow) / 4, (bw - ow) / 2, z0, z1)
        put(m, ow, z0, lo)
        put(m, ow, hi + 0.5, z1)
        put(m, ow, hi, hi + 0.5, M["trim"], 0.1, name="kerawang")
        if k == "window":
            for q in range(5):  # vertical bars (jeriji)
                put(m - ow / 2 + ow * (q + 0.5) / 5, 0.05, lo, hi, M["trim"], 0.06, name="jeriji")


wall(-H, H, -H, ["window", "door", "door", "door", "window"])
wall(-H, H, H, ["window", "window", "mihrab", "window", "window"])
for s in (-1, 1):
    wall(-H, H, s * H, ["window", "window", "door", "window", "window"], along_y=True)

# ---------------------------------------------------------------- plinth, serambi, steps

box((2 * H + 4.0, 2 * H + 10.5, FZ), (0, -2.75, FZ / 2), mat=LATERITE, coll=c, name="tapak")
box((2 * H + 4.2, 2 * H + 10.7, 0.12), (0, -2.75, FZ - 0.06), mat=STONE, coll=c, name="bibir_tapak")
box((2 * H - 0.2, 2 * H - 0.2, 0.1), (0, 0, FZ + 0.05), mat=M["floor"], coll=c, name="lantai")
for k in range(4):
    zt = FZ - k * 0.25
    box((5.0, 0.4, zt), (0, -15.2 - 0.4 * k, zt / 2), mat=LATERITE, coll=c, name="anak_tangga")

SY = -15.0
for i in range(6):
    x = -H + 3.6 * i
    cyl(0.16, 2.3, (x, SY + 0.3, FZ + 1.15), mat=M["post"], coll=c, verts=8, name="tiang_serambi")
run = (-H + 0.3) - (SY - 1.0)
ang = math.atan2(1.4, run)
box((2 * H + 1.6, math.hypot(run, 1.4), 0.2), (0, (-H + 0.3 + SY - 1.0) / 2, FZ + 2.75), rot=(ang, 0, 0), mat=SIRAP, coll=c, name="atap_serambi")
beam((-H - 0.8, SY - 1.0, FZ + 2.0), (H + 0.8, SY - 1.0, FZ + 2.0), 0.08, M["trim"], c, verts=6, name="papan_cantik")
box((2 * H, 6.0, 0.1), (0, -12.0, FZ + 0.05), mat=M["floor"], coll=c, name="lantai_serambi")
for x0, x1 in ((-H, -2.5), (2.5, H)):
    box((x1 - x0, 0.06, 0.6), ((x0 + x1) / 2, SY + 0.3, FZ + 0.4), mat=M["trim"], coll=c, name="kekisi")

# ---------------------------------------------------------------- roof and structure

top = tumpang(0, 0, [(10.6, 5.0, 30), (6.6, 2.8, 38), (4.0, 0.06, 50)], ze=4.0)
lathe([(0.0, 0.0), (0.35, 0.0), (0.45, 0.25), (0.25, 0.5), (0.3, 0.8), (0.12, 1.3), (0.15, 1.5), (0.0, 1.9)], (0, 0, top - 0.25), M["clay"], c, segs=14, name="mustaka")

# four great pillars (soko guru) carry the top tiers; a ring of posts carries the middle one
for sx in (-1, 1):
    for sy in (-1, 1):
        cyl(0.32, 10.6 - FZ, (sx * 2.6, sy * 2.6, (FZ + 10.6) / 2), mat=M["post"], coll=c, verts=12, name="soko_guru")
for k in range(4):
    for v in (-5.0, -1.7, 1.7, 5.0):
        x, y = ((v, -5.0), (v, 5.0), (-5.0, v), (5.0, v))[k]
        if abs(x) == 5.0 and abs(y) == 5.0 and k > 1:
            continue
        cyl(0.2, 7.2 - FZ, (x, y, (FZ + 7.2) / 2), mat=M["post"], coll=c, verts=10, name="tiang")
for s in (-1, 1):
    beam((-5.0, s * 5.0, 7.0), (5.0, s * 5.0, 7.0), 0.16, M["post"], c, name="alang")
    beam((s * 5.0, -5.0, 7.0), (s * 5.0, 5.0, 7.0), 0.16, M["post"], c, name="alang")
    beam((-2.6, s * 2.6, 10.4), (2.6, s * 2.6, 10.4), 0.18, M["post"], c, name="alang")
    beam((s * 2.6, -2.6, 10.4), (s * 2.6, 2.6, 10.4), 0.18, M["post"], c, name="alang")
    beam((-H, s * H, WT), (H, s * H, WT), 0.14, M["post"], c, name="alang_dinding")
    beam((s * H, -H, WT), (s * H, H, WT), 0.14, M["post"], c, name="alang_dinding")
    for t in (-2.6, 2.6):
        beam((t, s * 2.6, 7.0), (t, s * 5.0, 7.0), 0.12, M["post"], c, name="rasuk")
        beam((s * 2.6, t, 7.0), (s * 5.0, t, 7.0), 0.12, M["post"], c, name="rasuk")

# ---------------------------------------------------------------- inside

# mihrab: a niche projecting from the qibla wall, with its own little roof
MY = H + 1.8
box((3.2, 0.14, 3.8), (0, MY, FZ + 1.9), mat=M["plank"], coll=c, name="mihrab")
for s in (-1, 1):
    box((0.14, 1.8, 3.8), (s * 1.55, H + 0.9, FZ + 1.9), mat=M["plank"], coll=c, name="mihrab")
    cyl(0.1, 3.2, (s * 1.3, H - 0.15, FZ + 1.6), mat=GOLD, coll=c, verts=10, name="tiang_mihrab")
box((3.2, 1.8, 0.14), (0, H + 0.9, FZ + 3.8), mat=M["plank"], coll=c, name="mihrab")
box((2.6, 0.08, 0.5), (0, H - 0.12, FZ + 3.45), mat=M["trim"], coll=c, name="ukiran_mihrab")
box((2.0, 0.06, 1.2), (0, MY - 0.1, FZ + 1.8), mat=M["glaze"], coll=c, name="panel_mihrab")
hip(0, H + 1.0, 2.1, 1.3, 1.0, 0.05, FZ + 3.6, FZ + 5.0, name="atap_mihrab")
box((2.4, 1.6, FZ), (0, H + 0.9, FZ / 2), mat=LATERITE, coll=c, name="tapak_mihrab")

# mimbar: carved stair to a seat under a small roof, right of the mihrab
for k in range(5):
    box((0.9, 0.34, 0.24 * (k + 1)), (3.0, 6.6 + 0.34 * k, FZ + 0.12 * (k + 1)), mat=M["trim"], coll=c, name="anak_tangga_mimbar")
box((1.1, 1.0, 1.4), (3.0, 8.6, FZ + 0.7), mat=M["trim"], coll=c, name="mimbar")
for s in (-1, 1):
    beam((3.0 + s * 0.5, 6.4, FZ + 0.9), (3.0 + s * 0.5, 8.1, FZ + 2.1), 0.05, GOLD, c, verts=6, name="susur_mimbar")
    for y in (8.15, 9.05):
        cyl(0.05, 2.0, (3.0 + s * 0.5, y, FZ + 2.4), mat=M["trim"], coll=c, verts=8, name="tiang_mimbar")
hip(3.0, 8.6, 0.8, 0.7, 0.05, 0.05, FZ + 3.4, FZ + 4.2, mat=M["trim"], name="atap_mimbar")

# prayer mats in rows parallel to the qibla wall, and hanging lamps
for k in range(10):
    box((2 * H - 1.2, 1.1, 0.02), (0, -7.4 + k * 1.45, FZ + 0.11), mat=M["rattan"] if k % 2 else M["sack"], coll=c, name="tikar")
for x in (-3.8, 3.8):
    for y in (-3.8, 3.8):
        beam((x, y, 7.0), (x, y, FZ + 3.4), 0.01, GOLD, c, verts=4, name="rantai")
        lathe([(0.0, 0.0), (0.22, 0.05), (0.28, 0.16), (0.0, 0.16)], (x, y, FZ + 3.2), GOLD, c, segs=12, name="pelita")
        kit.lamp((x, y, FZ + 3.42), c, energy=90.0)

# ---------------------------------------------------------------- the yard

# beduk pavilion: the big drum that calls to prayer, and a slit gong (kentung)
BX, BY = 14.5, -12.0
box((4.2, 4.2, 0.5), (BX, BY, 0.25), mat=LATERITE, coll=c, name="tapak_beduk")
for sx in (-1, 1):
    for sy in (-1, 1):
        cyl(0.12, 3.0, (BX + sx * 1.6, BY + sy * 1.6, 2.0), mat=M["post"], coll=c, verts=8, name="tiang_beduk")
hip(BX, BY, 2.6, 2.6, 0.05, 0.05, 3.3, 5.4, name="atap_beduk")
cyl(0.6, 1.6, (BX, BY, 1.6), rot=(0, math.pi / 2, 0), mat=M["trim"], coll=c, verts=20, name="beduk")
for s in (-1, 1):
    cyl(0.58, 0.04, (BX + s * 0.81, BY, 1.6), rot=(0, math.pi / 2, 0), mat=M["sack"], coll=c, verts=20, name="kulit_beduk")
    box((0.15, 1.0, 0.9), (BX + s * 0.55, BY, 0.95), mat=M["post"], coll=c, name="kaki_beduk")
beam((BX - 1.6, BY + 1.6, 3.2), (BX - 1.6, BY + 1.6, 2.0), 0.01, M["rope"], c, verts=4, name="tali")
cyl(0.18, 1.4, (BX - 1.6, BY + 1.6, 1.3), mat=M["post"], coll=c, verts=10, name="kentung")

# ablution pool (kolah) and the well
KX, KY = -14.5, -12.0
box((4.4, 3.2, 0.9), (KX, KY, 0.45), mat=LATERITE, coll=c, name="kolah")
box((3.8, 2.6, 0.1), (KX, KY, 0.82), mat=M["water"], coll=c, name="air_kolah")
for s in (-1, 1):
    box((0.8, 0.5, 0.25), (KX + s * 1.0, KY - 2.0, 0.12), mat=STONE, coll=c, name="batu_pijak")
lathe([(0.0, 0.0), (0.9, 0.0), (0.9, 0.8), (0.7, 0.8), (0.7, 0.2), (0.0, 0.2)], (KX, -6.0, 0.0), LATERITE, c, segs=20, smooth=False, name="perigi")
cyl(0.68, 0.05, (KX, -6.0, 0.6), mat=M["water"], coll=c, verts=20, name="air_perigi")
for s in (-1, 1):
    beam((KX + s * 0.8, -6.0, 0.8), (KX + s * 0.8, -6.0, 2.2), 0.06, M["post"], c, name="tiang_timba")
beam((KX - 0.9, -6.0, 2.2), (KX + 0.9, -6.0, 2.2), 0.05, M["post"], c, name="palang")
beam((KX, -6.0, 2.2), (KX, -6.0, 1.2), 0.01, M["rope"], c, verts=4, name="tali")
lathe([(0.0, 0.0), (0.13, 0.0), (0.16, 0.25), (0.0, 0.25)], (KX, -6.0, 0.95), M["post"], c, segs=10, name="timba")

# compound wall with a roofed gate
WX, WF, WB = 21.0, -25.0, 17.0
for x0, x1 in ((-WX, -2.6), (2.6, WX)):
    box((x1 - x0, 0.5, 1.4), ((x0 + x1) / 2, WF, 0.7), mat=LATERITE, coll=c, name="pagar")
box((2 * WX, 0.5, 1.4), (0, WB, 0.7), mat=LATERITE, coll=c, name="pagar")
for s in (-1, 1):
    box((0.5, WB - WF, 1.4), (s * WX, (WF + WB) / 2, 0.7), mat=LATERITE, coll=c, name="pagar")
    box((0.8, 0.8, 2.6), (s * 2.4, WF, 1.3), mat=LATERITE, coll=c, name="tiang_gerbang")
hip(0, WF, 3.4, 1.2, 1.8, 0.05, 2.6, 3.7, name="atap_gerbang")

# graves with batu Aceh headstones, under frangipani (kemboja)
NISAN = [(-0.22, 0.0), (0.22, 0.0), (0.22, 0.3), (0.34, 0.42), (0.2, 0.55), (0.14, 0.78), (0.0, 0.95), (-0.14, 0.78), (-0.2, 0.55), (-0.34, 0.42), (-0.22, 0.3)]
for i in range(6):
    gx, gy = -17.0 + (i % 2) * 2.4, 4.0 + (i // 2) * 3.4
    box((2.0, 0.9, 0.3), (gx, gy, 0.15), mat=LATERITE, coll=c, name="kubur")
    for s in (-1, 1):
        k = 1.0 if s < 0 else 0.8
        ob = kit.prism([(y * k, z * k + 0.3) for y, z in NISAN], 0.14, 0.0, STONE, c, name="batu_aceh")
        ob.location = (gx + s * 0.8, gy, 0)
for tx, ty in ((-13.0, 7.0), (-18.5, 13.0)):
    for a in range(3):
        ang = a * 2.1
        tip = (tx + math.cos(ang) * 1.2, ty + math.sin(ang) * 1.2, 2.8)
        beam((tx, ty, 0), (tx, ty, 1.6), 0.12, M["trunk"], c, name="kemboja")
        beam((tx, ty, 1.6), tip, 0.08, M["trunk"], c, name="kemboja")
        blob(tip, (0.7, 0.7, 0.45), M["leaf"], c, wobble=0.35, seed=a + tx, subdiv=2, smooth=True, name="daun_kemboja")
        for f in range(4):
            blob((tip[0] + math.cos(f * 1.7) * 0.5, tip[1] + math.sin(f * 1.7) * 0.5, tip[2] + 0.3), (0.06, 0.06, 0.04), M["porcelain"], c, wobble=0.0, subdiv=1, name="bunga_kemboja")

# ---------------------------------------------------------------- render outside, then inside
kit.place(c, (0, 0, 0))
kit.ground(0.0, kit.fibre("halaman", (0.36, 0.28, 0.17), (0.60, 0.50, 0.34), scale=(3, 3, 3), bump=0.3))
kit.hills()
kit.environment(cam=(-30.0, -48.0, 7.0), target=(0.0, -3.0, 6.5), lens=32, sun_elev=16, sun_rot=-140, sky=0.08, sun=8.0, haze=0.002, exposure=0.3)
kit.render_and_export("masjid", [c])

scene = bpy.context.scene
cd = bpy.data.cameras.new("kamera_dalam")
cd.lens = 18
co = bpy.data.objects.new("kamera_dalam", cd)
co.location = (0.0, -8.3, FZ + 1.6)
co.rotation_euler = (kit.Vector((0.0, 9.0, FZ + 2.6)) - co.location).to_track_quat("-Z", "Y").to_euler()
scene.collection.objects.link(co)
scene.camera = co
scene.view_settings.exposure = 2.3
scene.render.filepath = os.path.join(kit.OUT, "masjid_dalam.png")
bpy.ops.render.render(write_still=True)
print("wrote", kit.OUT, "masjid_dalam")
