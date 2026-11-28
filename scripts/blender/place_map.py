"""Put the built assets onto the terrain: landmarks from the plan, the river front, the town, the
anchorage and the vegetation. Writes a placement list for the game engine and renders views.

Run headless (after the asset scripts have exported their GLBs into <out_dir>):
  blender -b -P scripts/blender/place_map.py -- <out_dir>

Writes to <out_dir>:
  placements.json   [{"asset", "x", "y", "z", "yaw_deg"}], world metres (X east, Y north, origin at the
                    map centre, Z up, sea level 0); each asset's own origin and facing as exported
  map_wide.png, map_town.png, map_istana.png   Cycles views of the placed map
Env: RES (terrain resolution, default 2049), VIEWS (comma list, default all), SAMPLES, W, H.
Vegetation here is a sample for the renders and for hand-placed set dressing near the town; mass
forest should come from the engine's foliage tools painted with the splat masks.
"""

import json
import math
import os
import random
import sys

import numpy as np

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402
import terrain as T  # noqa: E402

rnd = random.Random(1511)
LIGHT = bool(kit.env("SAVE", ""))  # the saved .blend is for live fly-through, so keep it light
TOWN_C = (-250.0, 0.0)
TREES = {"pokok_hutan", "pokok_bukit", "pokok_tualang", "buluh", "paku_pakis", "bakau", "nipah", "palm_tall", "palm_lean", "palm_young",
         "banana_clump", "banana_single", "bush_wide", "bush_small", "bush_flower", "rock_cluster"}
PLACED = []          # (asset, x, y, z, yaw)
OCC = {}             # 10 m occupancy grid for buildings
QIBLA_YAW = math.radians(68.0)  # local +Y turned to bearing 292 (WNW), the qibla from Melaka


# ---------------------------------------------------------------- terrain helpers

def to_plan(x, y):
    return (x + T.SIZE / 2) * T.UPM, (T.SIZE / 2 - y) * T.UPM


def at(a, x, y):
    return T.sample(a, *to_plan(x, y))


def put(asset, x, y, z, yaw):
    PLACED.append((asset, float(x), float(y), float(z), float(yaw)))


def free(x, y, r):
    """Claim a disc of radius r (m) on the occupancy grid; False if any of it is taken."""
    cells = [(int(math.floor((x + dx) / 10)), int(math.floor((y + dy) / 10)))
             for dx in np.arange(-r, r + 0.1, 10) for dy in np.arange(-r, r + 0.1, 10)]
    if any(c in OCC for c in cells):
        return False
    for c in cells:
        OCC[c] = True
    return True


def yaw_facing(dx, dy):
    """Yaw that turns an asset's front (-Y) toward direction (dx, dy)."""
    return math.atan2(dx, -dy)


# ---------------------------------------------------------------- placement


def landmarks(t):
    h = t["h"]
    mk = {k: T.world(*v) for k, v in T.MARKS.items()}
    # Istana on the hilltop, front toward the river mouth; the throne hall shares its origin
    ix, iy = mk["istana"]
    bx, by = mk["bridge"]
    iy_aw = yaw_facing(bx - ix, by - iy)
    put("istana", ix, iy, at(h, ix, iy), iy_aw)
    put("balairung", ix, iy, at(h, ix, iy), iy_aw)
    free(ix, iy, 110)  # the royal enclosure on the hilltop stays clear of commoners' houses
    x, y = mk["bendahara"]
    put("rumah_bendahara", x, y, at(h, x, y), iy_aw)
    free(x, y, 30)
    x, y = mk["masjid"]
    put("masjid", x, y, at(h, x, y), QIBLA_YAW)
    free(x, y, 35)
    x, y = mk["bukit_china_well"]
    put("perigi_raja", x, y, at(h, x, y), rnd.uniform(0, 6.28))
    free(x, y, 8)
    for k in ("keramat_north", "keramat_east"):
        x, y = mk[k]
        put("keramat_pokok", x, y, at(h, x, y), rnd.uniform(0, 6.28))
    x, y = mk["keramat_south"]
    put("keramat_makam", x, y, at(h, x, y), rnd.uniform(0, 6.28))
    # cave mouth facing down the slope
    x, y = mk["cave"]
    gy, gx = np.gradient(h)
    u, v = T.MARKS["cave"]
    i, j = int(v * T.PX), int(u * T.PX)
    put("gua", x, y, at(h, x, y) - 2.0, yaw_facing(-gx[i, j], gy[i, j]))


def river_front(t):
    """Bridge, jetties and warehouses along the lower Sungai Melaka, both banks."""
    riv = t["rivers"]["sungai_melaka"]
    p = T.path_pts(T.RIVER)
    arc = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))]) / T.UPM
    w0, w1, L = 42.0, 12.0, riv["length_m"]

    def frame(s):
        k = int(np.searchsorted(arc, s))
        k = min(max(k, 1), len(p) - 2)
        a, b = Vector(T.world(*p[k - 1])), Vector(T.world(*p[k + 1]))
        c = Vector(T.world(*p[k]))
        tan = (b - a).normalized()
        nrm = Vector((-tan.y, tan.x))
        w = w0 + (w1 - w0) * float(T.smooth(0, L, s))
        return c, tan, nrm, w, riv["wl_at"](p[k])

    # bridge, square to the flow; its local span runs along X
    bu, bv = T.MARKS["bridge"]
    s_b = arc[int(np.hypot(*(p - (bu, bv)).T).argmin())]
    c, tan, nrm, w, wl = frame(s_b)
    put("jambatan_1511", c.x, c.y, wl + 1.2, math.atan2(nrm.y, nrm.x))
    for side in (-1, 1):
        free(c.x + nrm.x * side * (w + 10), c.y + nrm.y * side * (w + 10), 12)
    # jetties and riverside godowns on both banks below and above the bridge
    kinds = ["jeti_dagang", "gudang_sungai", "pangkalan", "jeti_dagang", "gudang_sungai", "jeti_syahbandar", "gudang_sungai", "pangkalan"]
    k = 0
    for s in np.arange(250.0, 1700.0, 85.0):
        if abs(s - s_b) < 90:
            continue
        for side in (-1, 1):
            c, tan, nrm, w, wl = frame(s)
            n = nrm * side
            kind = kinds[k % len(kinds)]
            k += 1
            off = w if kind != "gudang_sungai" else w + 4.0
            x, y = c.x + n.x * off, c.y + n.y * off
            if not free(x + n.x * 8, y + n.y * 8, 10):
                continue
            put(kind, x, y, wl + 1.2, yaw_facing(-n.x, -n.y))
            # a timber or laterite godown set back behind
            gx, gy = c.x + n.x * (w + 26), c.y + n.y * (w + 26)
            if rnd.random() < 0.7 and free(gx, gy, 10) and at(t["h"], gx, gy) > wl:
                put(rnd.choice(("gudang_kayu", "gudang_kayu", "gudang_batu")), gx, gy, at(t["h"], gx, gy), yaw_facing(-n.x, -n.y))
    # boats tied up along the lower river
    for s in np.arange(150.0, 1500.0, 60.0):
        c, tan, nrm, w, wl = frame(s)
        side = rnd.choice((-1, 1))
        o = w - rnd.uniform(4, 9)
        put(rnd.choice(("sampan", "sampan_cargo", "perahu_furled")), c.x + nrm.x * side * o, c.y + nrm.y * side * o, wl + 0.16,
            math.atan2(tan.y, tan.x) + rnd.uniform(-0.2, 0.2))
    # a riverside surau upstream
    c, tan, nrm, w, wl = frame(2200.0)
    x, y = c.x + nrm.x * (w + 6), c.y + nrm.y * (w + 6)
    if free(x, y, 10):
        put("surau_sungai", x, y, wl + 2.2, QIBLA_YAW)


def town(t):
    """Shops along the tracks and houses filling the town areas."""
    h, town_m, path = t["h"], t["town"], t["path"]
    riv = t["rivers"]["sungai_melaka"]
    road = np.full((T.N, T.N), np.inf, np.float32)
    for d in T.ROADS:
        road = np.minimum(road, T.dist(T.path_pts(d), 40)[0])
    gy, gx = np.gradient(np.minimum(road, 300))
    gy, gx = -gy, gx  # rows run south, so flip to world +Y
    slope = np.hypot(*np.gradient(h, T.MPX))
    east = T.soft(T.TOWN_EAST, 40)

    def ok(x, y, r):
        u, v = to_plan(x, y)
        if not (0 < u < 1200 and 0 < v < 1200):
            return False
        if t["sea"][int(v * T.PX), int(u * T.PX)] or at(riv["dist"], x, y) < at(riv["w"], x, y) + 15:
            return False
        if at(slope, x, y) > 0.18 or at(path, x, y) > 0.2:
            return False
        return free(x, y, r)

    counts = {}

    def place(asset, x, y, yaw, r):
        if ok(x, y, r):
            put(asset, x, y, at(h, x, y), yaw)
            counts[asset] = counts.get(asset, 0) + 1
            return True
        return False

    # shops fronting the tracks inside the town
    for _ in range(9000):
        x, y = rnd.uniform(-1400, 2000), rnd.uniform(-1200, 1300)
        if rnd.random() > at(town_m, x, y):
            continue
        d = at(road, x, y)
        if not 9 < d < 22:
            continue
        u, v = to_plan(x, y)
        i, j = int(v * T.PX), int(u * T.PX)
        yaw = yaw_facing(-gx[i, j], -gy[i, j])
        if at(east, x, y) > 0.5:
            place("kedai_cina", x, y, yaw, 8)
        else:
            place(rnd.choice(("kedai_deret", "kedai_kecil", "kedai_kecil", "gerai")), x, y, yaw, 9)
    # houses behind, through the town and its edges
    for _ in range(20000):
        x, y = rnd.uniform(-1400, 2000), rnd.uniform(-1200, 1300)
        m = at(town_m, x, y)
        if rnd.random() > m * 0.9 + 0.004:
            continue
        kind = rnd.choices(("rumah_bujang", "rumah_serambi", "teratak"), weights=(5, 3, 1 + 4 * (m < 0.4)))[0]
        place(kind, x, y, rnd.choice((0, math.pi / 2, math.pi, -math.pi / 2)) + rnd.uniform(-0.25, 0.25), 9)
    # the scholar's house and a few surau among the houses
    for asset, n in (("rumah_ulama", 2), ("surau_serambi", 2), ("surau_kecil", 3)):
        tries = 0
        while n and tries < 4000:
            tries += 1
            x, y = rnd.uniform(-1200, 1800), rnd.uniform(-1000, 1100)
            if at(town_m, x, y) > 0.6 and place(asset, x, y, QIBLA_YAW if "surau" in asset else rnd.uniform(0, 6.28), 14):
                n -= 1
    # fishing kampung on the north beach and the southern coast kampung
    for (u0, u1), n in (((60, 340), 45), ((900, 1130), 35)):
        k = 0
        while k < n:
            u, v = rnd.uniform(u0, u1), rnd.uniform(240, 1160)
            s = T.sample(t["s"], u, v)
            if not 25 < s < 130:
                continue
            x, y = T.world(u, v)
            kind = "rumah_nelayan" if s < 70 else rnd.choice(("rumah_bujang", "teratak"))
            if place(kind, x, y, rnd.uniform(0, 6.28), 9):
                k += 1
    print("town", counts)


def anchorage(t):
    for (u, v), kind in zip(T.SHIPS, ("jong_berlabuh", "kapal_gujerat_berlabuh", "junk_furled", "jong_berlabuh", "kapal_gujerat_berlabuh", "junk_furled")):
        x, y = T.world(u, v)
        z = {"jong_berlabuh": 3.2, "kapal_gujerat_berlabuh": 1.8, "junk_furled": 1.2}[kind]
        put(kind, x, y, z, rnd.uniform(0, 6.28))
    for kind, z, n in (("jong", 3.2, 1), ("kapal_gujerat", 1.8, 1), ("junk_small", 0.8, 2), ("perahu", 0.55, 8), ("perahu_furled", 0.55, 6), ("sampan", 0.16, 10)):
        for _ in range(n):
            while True:
                u, v = rnd.uniform(300, 640), rnd.uniform(600, 880)
                if T.sample(t["s"], u, v) < -60:
                    break
            x, y = T.world(u, v)
            put(kind, x, y, z, rnd.uniform(0, 6.28))


def vegetation(t):
    """A sample of trees for the renders and near-town dressing; engine foliage does the rest."""
    h, s = t["h"], t["s"]
    jungle, mangrove, padi = t["jungle"], t["mangrove"], t["padi"]
    counts = {}

    def plant(asset, x, y, dz=0.0):
        put(asset, x, y, at(h, x, y) + dz, rnd.uniform(0, 6.28))
        counts[asset] = counts.get(asset, 0) + 1

    for _ in range(60000):
        x, y = rnd.uniform(-4000, 4000), rnd.uniform(-4000, 4000)
        u, v = to_plan(x, y)
        if t["sea"][int(v * T.PX), int(u * T.PX)] or t["wet"][int(v * T.PX), int(u * T.PX)]:
            continue
        if (int(math.floor(x / 10)), int(math.floor(y / 10))) in OCC:
            continue
        sd, hh = at(s, x, y), at(h, x, y)
        if at(mangrove, x, y) > 0.5:
            if rnd.random() < 0.5:
                plant(rnd.choice(("bakau", "bakau", "nipah")), x, y, -0.3)
        elif sd < 120 and at(t["town"], x, y) < 0.3:
            if rnd.random() < 0.25:
                plant(rnd.choice(("palm_tall", "palm_lean", "palm_young")), x, y)
        elif at(jungle, x, y) > 0.5:
            # denser toward the town-facing edge, which the renders see
            if rnd.random() < 0.35:
                plant(rnd.choices(("pokok_hutan", "pokok_bukit", "pokok_tualang", "buluh", "paku_pakis"),
                                  weights=(5, 3 + 4 * (hh > 150), 1, 1, 1))[0], x, y)
        elif at(t["town"], x, y) > 0.3:
            if rnd.random() < 0.06:
                plant(rnd.choice(("palm_tall", "palm_lean", "banana_clump", "banana_single", "bush_wide", "bush_flower")), x, y)
        elif rnd.random() < 0.03:
            plant(rnd.choice(("pokok_bukit", "bush_wide", "bush_small", "palm_lean", "rock_cluster")), x, y)
    # padi plots on a 20 m grid with a few field huts
    for x in np.arange(-4000, 4000, 20.0):
        for y in np.arange(-4000, 4000, 20.0):
            if at(padi, x, y) > 0.6 and at(t["path"], x, y) < 0.2 and not t["wet"][int(to_plan(x, y)[1] * T.PX), int(to_plan(x, y)[0] * T.PX)]:
                put("sawah", x, y, at(h, x, y), 0.0)
                counts["sawah"] = counts.get("sawah", 0) + 1
                if rnd.random() < 0.02:
                    put("dangau", x + 9.5, y + 9.5, at(h, x, y) + 0.3, rnd.uniform(0, 6.28))
    print("vegetation", counts)


# ---------------------------------------------------------------- scene


def library():
    """Import each needed GLB once into an unlinked collection, for instancing."""
    libs = {}
    for name in sorted({p[0] for p in PLACED}):
        path = os.path.join(kit.OUT, name + ".glb")
        if not os.path.exists(path):
            print("missing", path)
            continue
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=path)
        new = [o for o in bpy.data.objects if o not in before]
        col = bpy.data.collections.new("lib_" + name)
        for o in new:
            for uc in list(o.users_collection):
                uc.objects.unlink(o)
            col.objects.link(o)
        libs[name] = col
    return libs


def build_scene(t, w, libs):
    st = max(1, (T.N - 1) // 1024)
    m, nt, bsdf = kit._principled("tanah")
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.95
    T.grid_mesh("tanah", t["h"][::st, ::st], colour=T.albedo({k: v[::st, ::st] for k, v in w.items()}), mat=m)
    wat = kit.flat("air_laut", (0.03, 0.10, 0.11), rough=0.08)
    sea = bpy.data.meshes.new("laut")
    sea.from_pydata([(-2e6, -2e6, -0.03), (2e6, -2e6, -0.03), (2e6, 2e6, -0.03), (-2e6, 2e6, -0.03)], [], [(0, 1, 2, 3)])
    so = bpy.data.objects.new("laut", sea)
    so.data.materials.append(wat)
    kit.SCENERY.objects.link(so)
    wz = t["water_z"][::st, ::st]
    T.grid_mesh("sungai", wz + 0.02, keep=~np.isnan(wz) & (wz > 0.0), mat=wat)
    holder = bpy.data.collections.new("Placed")
    bpy.context.scene.collection.children.link(holder)
    for asset, x, y, z, yaw in PLACED:
        if asset not in libs or asset == "balairung":
            continue
        if LIGHT and (asset in ("sawah", "dangau") or (asset in TREES and math.hypot(x - TOWN_C[0], y - TOWN_C[1]) > 1500)):
            continue  # light file for live viewing: no rice tiles, trees only round the town
        e = bpy.data.objects.new(asset, None)
        e.instance_type = "COLLECTION"
        e.instance_collection = libs[asset]
        e.location = (x, y, z)
        e.rotation_euler = (0, 0, yaw)
        holder.objects.link(e)


def shoot(name, cam, target, lens):
    scene = bpy.context.scene
    co = scene.camera
    co.location = cam
    co.rotation_euler = (Vector(target) - Vector(cam)).to_track_quat("-Z", "Y").to_euler()
    co.data.lens = lens
    scene.render.filepath = os.path.join(kit.OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("wrote", name)


if __name__ == "__main__":
    terrain = T.build()
    weights = T.layers(terrain)
    landmarks(terrain)
    river_front(terrain)
    town(terrain)
    anchorage(terrain)
    vegetation(terrain)
    with open(os.path.join(kit.OUT, "placements.json"), "w") as f:
        json.dump([{"asset": a, "x": round(x, 2), "y": round(y, 2), "z": round(z, 2), "yaw_deg": round(math.degrees(r), 1)}
                   for a, x, y, z, r in PLACED], f, indent=0)
    print("placed", len(PLACED))

    kit.reset()
    libs = library()
    build_scene(terrain, weights, libs)
    kit.environment(cam=(-3300, -6400, 2300), target=(500, 600, 0), lens=26, sun_elev=34, sun_rot=-130, haze=0.0)
    bpy.data.objects.remove(bpy.data.objects["kabus"])
    bpy.context.scene.camera.data.clip_end = 3e6
    ix, iy = T.world(*T.MARKS["istana"])
    mx, my = T.world(545, 585)
    views = {
        "map_wide": ((-2300, -2300, 520), (700, 1500, 60), 30),
        "map_town": ((mx - 380, my - 520, 85), (mx + 160, my + 40, 4), 28),
        "map_istana": ((ix - 230, iy + 260, 75), (ix + 20, iy - 10, 30), 32),
    }
    # a camera per view, plus one at street level in the town, so the saved .blend can switch between them
    for k, (cam, target, lens) in list(views.items()) + [("map_jalan", ((mx + 120, my + 140, 3.5), (mx + 300, my + 260, 3.0), 24))]:
        cd = bpy.data.cameras.new(k)
        cd.lens, cd.clip_end = lens, 3e6
        co = bpy.data.objects.new(k, cd)
        co.location = cam
        co.rotation_euler = (Vector(target) - Vector(cam)).to_track_quat("-Z", "Y").to_euler()
        bpy.context.scene.collection.objects.link(co)
    want = [v for v in kit.env("VIEWS", "map_wide,map_town,map_istana").split(",") if v]
    for k in want:
        shoot(k, *views[k])
    save = kit.env("SAVE", "")
    if save:
        bpy.context.scene.camera = bpy.data.objects["map_town"]
        for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):  # fast real-time "Rendered" view in the viewport
            try:
                bpy.context.scene.render.engine = eng
                break
            except TypeError:
                pass
        os.makedirs(os.path.dirname(save), exist_ok=True)
        for scr in bpy.data.screens:  # open in Solid view that can see the whole 8 km map
            for area in scr.areas:
                for sp in area.spaces:
                    if sp.type == "VIEW_3D":
                        sp.shading.type = "SOLID"
                        sp.shading.color_type = "MATERIAL"
                        sp.clip_end = 20000.0
        bpy.ops.wm.save_as_mainfile(filepath=save, compress=True)
        print("saved", save)
