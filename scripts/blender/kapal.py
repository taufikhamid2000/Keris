"""Kapal: the big foreign ships in the Melaka anchorage, 1511. Built on the hull and sail
builders from boats.py.

Run headless:
  blender -b -P scripts/blender/kapal.py -- <out_dir>

Writes <out_dir>/kapal.png and one GLB per variant:
  jong              Javanese jong, ~60 m: double-ended hull of many strakes, four masts and a bowsprit
                    carrying canted tanja sails of matting, twin quarter rudders, two-tier stern castle
  jong_berlabuh     the same at anchor: yards lowered, sails rolled and lashed, anchor cables out
  kapal_gujerat     Gujarati trader, ~28 m: raked stem, square transom under a high poop with a gallery
                    and awning, two forward-raked masts with lateen sails, a sternpost rudder
  kapal_gujerat_berlabuh  the same at anchor with the lateen yards lowered along the deck
Each sits at the origin, bow toward +X. Z=0 is the top of the sheer amidships; the waterline is
at Z=-3.2 for the jong and Z=-1.8 for the Gujarati ship (raise them by that much onto the sea).
"""

import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
import boats  # noqa: E402  (resets the scene; provides hull, sail, sampan)

M = kit.M
beam, box = kit.beam, kit.box
MAT_SAIL = kit.fibre("layar_tikar", (0.36, 0.27, 0.15), (0.66, 0.55, 0.36), scale=(30, 30, 30), bump=0.3)
COTTON = kit.fibre("layar_kapas", (0.55, 0.50, 0.42), (0.82, 0.78, 0.68), scale=(25, 25, 25), bump=0.15)
TEAK = kit.wood("jati", (0.08, 0.05, 0.03), (0.26, 0.17, 0.09), scale=3, rough=0.8)


def tanja(c, mx, deck, k, y=0.5, furled=False):
    """A canted rectangular tanja sail on a mast at mx, scaled by k (k=1: 7.4 m mast).
    Tack low and forward, yard rising aft. Furled: yard lowered with the sail rolled on it."""
    beam((mx, 0, deck), (mx, 0, deck + 7.6 * k), 0.09 * k ** 0.8, M["post"], c, name="tiang")
    if furled:
        a, b = Vector((mx + 3.0 * k, y, deck + 1.4 * k)), Vector((mx - 3.6 * k, y, deck + 1.9 * k))
        beam(a, b, 0.06 * k, M["post"], c, name="andang")
        beam(a + Vector((-0.3 * k, 0, -0.1 * k)), b + Vector((0.3 * k, 0, -0.1 * k)), 0.16 * k, MAT_SAIL, c, verts=10, name="layar_gulung")
        for j in range(5):
            p = a.lerp(b, 0.12 + 0.19 * j) + Vector((0, 0, -0.1 * k))
            kit.torus(0.17 * k, 0.015 * k, tuple(p), rot=(0, math.pi / 2, 0), mat=M["rope"], coll=c, name="ikatan")
        beam((mx, 0, deck + 7.4 * k), tuple(a.lerp(b, 0.5)), 0.012 * k, M["rope"], c, verts=4, name="tali_angkat")
        return
    boats.sail(c, (mx + 2.8 * k, y, deck + 1.05 * k), (mx - 3.0 * k, y, deck + 1.65 * k), (mx - 3.8 * k, y, deck + 6.55 * k),
               (mx + 0.9 * k, y, deck + 7.45 * k), MAT_SAIL, belly=0.45 * k, spar=0.06 * k)
    beam((mx, 0, deck + 7.3 * k), (mx + 2.8 * k, y, deck + 1.05 * k), 0.012 * k, M["rope"], c, verts=4, name="tali")
    beam((mx, 0, deck + 7.3 * k), (mx - 3.4 * k, 0, deck + 0.2), 0.012 * k, M["rope"], c, verts=4, name="tali")


def strakes(c, L, B, D, sheer, stern_end, bow_end, rows, mat, r):
    """Wales along the hull side to suggest the jong's many layers of planking."""
    for side in (-1, 1):
        for zf in rows:
            pts = []
            for i in range(25):
                t = -0.96 + i * 0.08
                end = bow_end if t > 0 else stern_end
                w = B / 2 * (end + (1 - end) * (1 - abs(t) ** 2.2))
                s = sheer * t * t
                f = 1 - 0.35 * t * t
                a = math.asin(min(1.0, zf / f) ** (1 / 0.55)) if zf < f else math.pi / 2
                pts.append(Vector((t * L / 2, side * (w * math.cos(a) + 0.05), s - (s + D * f) * math.sin(a) ** 0.55 + 0.02)))
            for p, q in zip(pts, pts[1:]):
                beam(p, q, r, mat, c, verts=6, name="papan_lapis")


def jong(name, furled):
    c = kit.new_group(name)
    L, B, D, SH = 60.0, 14.0, 7.0, 4.6
    deck = -0.6
    boats.hull(c, L, B, D, SH, 0.08, 0.06, boats.HULL_DARK, n=40, K=12, thick=0.2, deck_z=deck)
    strakes(c, L, B, D, SH, 0.08, 0.06, (0.08, 0.2, 0.34), TEAK, 0.14)
    # two-tier stern castle and a low forecastle
    box((10, 10.5, 2.6), (-22, 0, deck + 1.3), mat=TEAK, coll=c, name="kota_buritan")
    box((11, 11.4, 0.25), (-22, 0, deck + 2.7), mat=M["post"], coll=c, name="lantai_atas")
    box((5.5, 7.0, 2.2), (-23.5, 0, deck + 3.9), mat=TEAK, coll=c, name="bilik_nakhoda")
    kit.hip(-23.5, 0, 3.4, 4.2, 2.2, 0.05, deck + 5.0, deck + 6.6, mat=M["thatch"], coll=c, name="atap_buritan")
    for side in (-1, 1):
        for x in (-25.5, -22.5, -19.5):
            box((1.0, 0.06, 0.7), (x, side * 5.28, deck + 1.5), mat=M["dark"], coll=c, name="tingkap")
        for x in range(-26, -17, 1):  # railing on the castle top
            beam((x, side * 5.6, deck + 2.8), (x, side * 5.6, deck + 3.6), 0.05, M["post"], c, verts=6, name="jejari")
        beam((-27, side * 5.6, deck + 3.6), (-17, side * 5.6, deck + 3.6), 0.06, M["trim"], c, verts=6, name="susur")
    box((6, 8.5, 1.6), (25, 0, deck + 1.8), mat=TEAK, coll=c, name="kota_haluan")
    # deckhouses and hatches amidships
    for x in (-8.0, 1.0):
        box((5.0, 6.0, 2.0), (x, 0, deck + 1.0), mat=M["plank"], coll=c, name="bilik_dagang")
        kit.hip(x, 0, 3.0, 3.6, 2.6, 0.05, deck + 2.0, deck + 3.4, mat=M["thatch"], coll=c, name="atap_bilik")
    for x in (10.0, 14.5):
        box((3.0, 4.0, 0.5), (x, 0, deck + 0.25), mat=M["trim"], coll=c, name="penutup_palka")
    # twin quarter rudders
    for side in (-1, 1):
        beam((-24.0, side * 6.2, SH + 1.5), (-29.0, side * 6.6, -7.5), 0.28, M["post"], c, name="batang_kemudi")
        box((4.0, 0.3, 3.2), (-28.6, side * 6.6, -6.4), rot=(0, 0.75, 0), mat=M["post"], coll=c, name="kemudi")
    # masts: (x, scale) - mainmast tallest, a bowsprit sail forward
    rig = ((19.0, 3.4), (7.0, 4.4), (-5.5, 4.0), (-15.5, 3.0))
    for i, (mx, k) in enumerate(rig):
        tanja(c, mx, deck, k, y=0.7 if i % 2 else -0.7, furled=furled)
    beam((26.0, 0, SH + 1.0), (40.0, 0, SH + 5.5), 0.3, M["post"], c, name="cucur")
    if furled:
        beam((30.0, 0.5, SH + 2.6), (38.0, 0.5, SH + 5.0), 0.25, MAT_SAIL, c, verts=10, name="layar_gulung")
        for side in (-1, 1):  # anchors down
            beam((28.0, side * 2.6, SH + 0.5), (40.0, side * 5.0, -7.0), 0.07, M["rope"], c, verts=6, name="tali_sauh")
    else:
        boats.sail(c, (31.0, 0.5, SH + 0.8), (35.0, 0.5, SH + 3.5), (39.5, 0.5, SH + 11.5), (34.0, 0.5, SH + 10.0), MAT_SAIL, belly=1.2, spar=0.2)
    for x in (8.0, -2.0):
        kit.sheet(4.0, 1.2, (x - 2.0, 0, deck + 7.6 * 4.4 - 0.6 if x > 0 else deck + 7.6 * 4.0 - 0.6), mat=M["red"], coll=c, nx=6, ny=2, bulge=0.3, name="panji")
    # a sampan carried on deck
    s = boats.sampan(name + "_sampan", False)
    for ob in list(s.objects):
        s.objects.unlink(ob)
        c.objects.link(ob)
        ob.location = (ob.location.x + 12.3, ob.location.y + 4.0, ob.location.z + deck + 0.55)
    bpy.data.collections.remove(s)
    for i in range(8):
        boats.jar(c, 16 + (i % 4) * 0.8, -3.5 - (i // 4) * 0.8, deck + 0.04, 1.4, M["glaze"] if i % 3 else M["clay"])
    return c


def gujerat(name, furled):
    c = kit.new_group(name)
    L, B, D, SH = 28.0, 8.0, 4.0, 1.6
    deck = -0.3
    boats.hull(c, L, B, D, SH, 0.5, 0.04, TEAK, n=32, K=12, thick=0.12, deck_z=deck)
    # long raked stem post and a beak
    beam((13.6, 0, SH - 0.2), (16.8, 0, SH + 2.4), 0.22, TEAK, c, name="linggi")
    beam((16.8, 0, SH + 2.4), (18.6, 0, SH + 2.1), 0.12, TEAK, c, name="paruh")
    # high poop over the transom with a gallery and a cloth awning
    box((7.0, 6.2, 2.4), (-11.0, 0, deck + 1.2), mat=TEAK, coll=c, name="kota_buritan")
    box((7.6, 6.8, 0.2), (-11.0, 0, deck + 2.5), mat=M["post"], coll=c, name="lantai_buritan")
    for side in (-1, 1):
        for x in range(-14, -7):
            beam((x + 0.5, side * 3.3, deck + 2.6), (x + 0.5, side * 3.3, deck + 3.4), 0.05, M["trim"], c, verts=6, name="jejari")
        beam((-14.5, side * 3.3, deck + 3.4), (-7.5, side * 3.3, deck + 3.4), 0.06, M["trim"], c, verts=6, name="susur")
        for x in (-12.5, -9.5):
            beam((x, side * 2.8, deck + 2.6), (x, side * 2.8, deck + 4.8), 0.05, M["post"], c, verts=6, name="tiang_tenda")
    kit.sheet(4.5, 6.0, (-13.3, 0, deck + 4.8), rot=(math.pi / 2, 0, 0), mat=COTTON, coll=c, sag=0.25, name="tenda")
    for y in (-2.0, -0.7, 0.7, 2.0):  # stern windows in the transom
        box((0.06, 0.7, 0.6), (-14.55, y, deck + 1.3), mat=M["dark"], coll=c, name="tingkap")
    box((0.2, 6.4, 0.3), (-14.6, 0, deck + 2.2), mat=M["red"], coll=c, name="jalur")
    # sternpost rudder
    box((2.0, 0.25, 4.6), (-15.4, 0, -2.4), mat=M["post"], coll=c, name="kemudi")
    beam((-14.6, 0, SH + 1.2), (-17.0, 0, SH + 1.6), 0.08, M["post"], c, name="celaga")
    # lateen rig: two masts raked forward
    for mx, h, yard in ((4.0, 17.0, 22.0), (-7.5, 11.0, 13.0)):
        top = Vector((mx + 0.12 * h, 0, deck + h))
        beam((mx, 0, deck), top, 0.22 if h > 12 else 0.16, M["post"], c, name="tiang")
        if furled:
            a = Vector((mx + yard * 0.55, 0.6, deck + 1.4))
            b = Vector((mx - yard * 0.45, 0.6, deck + 2.1))
            beam(a, b, 0.12, M["post"], c, name="andang")
            beam(a + Vector((-0.6, 0, -0.18)), b + Vector((0.6, 0, -0.18)), 0.22, COTTON, c, verts=10, name="layar_gulung")
            beam(top, tuple(a.lerp(b, 0.45)), 0.02, M["rope"], c, verts=4, name="tali_angkat")
        else:
            tack = Vector((mx + yard * 0.42, 0.5, deck + 2.6))
            peak = Vector((mx - yard * 0.58, 0.5, deck + h + yard * 0.28))
            clew = Vector((mx - yard * 0.42, 0.5, deck + 2.2 + 0.15 * h))
            beam(tack + (tack - peak) * 0.05, peak, 0.14 if h > 12 else 0.1, M["post"], c, name="andang")
            boats.sail(c, tack, clew, peak, tack + (peak - tack) * 0.02, COTTON, belly=0.9 if h > 12 else 0.6, spar=0.02)
            beam(clew, (mx - yard * 0.5, 0, deck + 0.3), 0.015, M["rope"], c, verts=4, name="tali")
        beam(top, (mx - 6.0, 3.6, deck + 0.4), 0.02, M["rope"], c, verts=4, name="tali")
        beam(top, (mx - 6.0, -3.6, deck + 0.4), 0.02, M["rope"], c, verts=4, name="tali")
    kit.sheet(1.6, 0.5, (4.0 + 0.12 * 17 - 0.8, 0, deck + 17.3), mat=M["red"], coll=c, nx=4, ny=2, bulge=0.1, name="panji")
    # bales of Gujarati cotton cloth on deck, and a water cask
    for i in range(6):
        box((1.0, 0.7, 0.6), (6.0 + (i % 3) * 1.1, -1.6 - (i // 3) * 0.8, deck + 0.32), mat=COTTON if i % 2 else M["indigo"], coll=c, name="bandela")
    kit.cyl(0.45, 1.0, (-3.0, 1.8, deck + 0.52), mat=M["plank"], coll=c, name="tong")
    if furled:
        beam((12.0, 1.6, SH), (20.0, 3.4, -6.0), 0.05, M["rope"], c, verts=6, name="tali_sauh")
    return c


groups = [jong("jong", False), jong("jong_berlabuh", True), gujerat("kapal_gujerat", False), gujerat("kapal_gujerat_berlabuh", True)]
SPOTS = [((6.0, 78.0, 3.2), 200), ((-75.0, 120.0, 3.2), 155), ((32.0, 38.0, 1.8), 215), ((-30.0, 45.0, 1.8), 160)]
for g, (loc, yaw) in zip(groups, SPOTS):
    kit.place(g, loc, math.radians(yaw))

kit.water(-8.0)
kit.hills()
kit.environment(cam=(-6.0, -30.0, 7.0), target=(-6.0, 60.0, 12.0), lens=26, sun_elev=16, sun_rot=-140, sky=0.07, sun=9.0, haze=0.002, exposure=0.3)
kit.render_and_export("kapal", groups)
