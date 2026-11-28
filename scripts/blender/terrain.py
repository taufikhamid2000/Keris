"""Terrain for the 8 x 8 km Melaka 1511 region, built from the map plan (north up, sea SW).

Run headless:
  blender -b -P scripts/blender/terrain.py -- <out_dir>

Writes to <out_dir>:
  terrain_height.png   16-bit grey heightmap, RES x RES, row 0 = north edge
  terrain_splat0.png   RGBA weights: sand, mud, grass, jungle
  terrain_splat1.png   RGBA weights: path, padi, rock, town (beaten earth)
                       (all eight weights sum to 1 per pixel)
  terrain_map.png      shaded top view for checking against the plan
  terrain.json         scale, height range, water levels, landmark positions
  terrain.png          Cycles blockout render (landmarks as boxes)

World: X east, Y north, metres, map centre at the origin, sea level Z=0.
Height in the PNG maps 0..65535 to H_MIN..H_MAX (see terrain.json).
Env: RES (default 2049 = 3.9 m/px; 8193 = ~1 m/px), BLOCK (blockout grid, 1025), RENDER=0 to skip.
Plan coordinates (u, v) are the plan SVG's units: 1200 x 1200, 150 per km, v pointing south.
"""

import json
import math
import os
import re
import struct
import sys
import zlib

import numpy as np

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402

SIZE = 8000.0
H_MIN, H_MAX = -25.0, 1300.0
N = kit.env("RES", 2049)
UPM = 1200.0 / SIZE  # plan units per metre
U = np.linspace(0, 1200, N, dtype=np.float32)  # column -> u (west..east)
V = np.linspace(0, 1200, N, dtype=np.float32)  # row -> v (north..south)
PX = (N - 1) / 1200.0  # pixels per plan unit
MPX = SIZE / (N - 1)  # metres per pixel
rng = np.random.default_rng(1511)

# ---------------------------------------------------------------- plan shapes (copied from the plan SVG)

COAST = "M0 290 C130 330 250 380 360 450 C440 500 500 545 545 585 C610 640 700 700 800 770 C900 840 980 920 1040 1000 C1090 1060 1140 1120 1200 1160"
SEA = COAST + " L1200 1200 L0 1200 Z"
BEACH_N = "M0 290 C130 330 250 380 360 450 C420 488 470 525 500 548 L492 532 C460 505 410 470 350 432 C240 362 125 312 0 272 Z"
JUNGLE = "M0 0 H1200 V1120 C1150 1000 1110 820 1090 700 C1075 600 1075 540 1060 470 C1040 380 980 300 880 260 C760 210 600 200 470 170 C330 140 160 120 0 140 Z"
PADI = "M760 330 C860 320 960 370 1000 450 C1020 520 990 600 930 640 C860 600 800 560 770 500 C740 440 730 370 760 330 Z"
MANGROVE = "M470 520 C500 535 525 555 545 585 C560 605 585 615 605 630 L585 650 C560 630 530 610 510 590 C490 570 470 550 455 535 Z"
TOWN_UPEH = "M470 440 C520 430 580 440 615 470 C640 495 640 535 615 560 C580 560 545 560 520 545 C495 520 470 480 470 440 Z"
TOWN_ROYAL = "M600 600 C640 590 700 600 735 630 C760 660 760 700 735 725 C700 735 650 725 620 705 C600 680 590 640 600 600 Z"
TOWN_EAST = "M720 520 C760 505 840 520 860 555 C870 590 850 620 820 630 C780 620 740 600 725 570 Z"
RIVER = "M545 585 C575 560 590 530 620 515 C660 495 690 470 700 430 C710 390 750 370 800 360 C860 348 880 300 910 260"  # headwaters stop in the jungle foothills, below the massif
TRIB = "M800 360 C780 300 790 250 760 200 C740 165 700 130 690 60"
ROADS = [
    "M40 300 C150 340 280 400 380 455 C440 485 500 505 560 515",
    "M640 545 C650 580 655 610 660 640",
    "M700 690 C760 720 840 760 920 830 C980 880 1030 930 1080 990 C1110 1030 1130 1070 1150 1110",
    "M640 520 C700 540 760 560 800 580 C860 600 900 620 940 640",
    "M560 515 C600 470 640 420 680 380 C720 330 760 290 820 260 C900 220 980 210 1040 190",
    "M1040 190 C1080 140 1120 90 1165 55",
]
# (name, u, v) landmark anchors from the plan
MARKS = {
    "istana": (661, 655),
    "masjid": (620, 586),
    "bendahara": (697, 615),
    "bridge": (607, 523),
    "bukit_china_well": (905, 520),
    "keramat_north": (200, 372),
    "keramat_east": (880, 700),
    "keramat_south": (1010, 1010),
    "cave": (1040, 190),
    "pulau_upeh": (300, 640),
}
SHIPS = [(387, 693), (428, 738), (357, 763), (466, 702), (448, 793), (505, 762)]


def path_pts(d, steps=16):
    """Sample an absolute M/C/L/H/V/Z SVG path into an (K, 2) array of plan units."""
    toks = re.findall(r"[MCLHVZ]|-?\d*\.?\d+", d)
    pts, i, cmd, cur = [], 0, None, (0.0, 0.0)
    while i < len(toks):
        if toks[i] in "MCLHVZ":
            cmd = toks[i]
            i += 1
            if cmd == "Z":
                continue
        f = lambda k: float(toks[i + k])  # noqa: E731
        if cmd == "M" or cmd == "L":
            cur = (f(0), f(1))
            pts.append(cur)
            i += 2
        elif cmd == "H":
            cur = (f(0), cur[1])
            pts.append(cur)
            i += 1
        elif cmd == "V":
            cur = (cur[0], f(0))
            pts.append(cur)
            i += 1
        elif cmd == "C":
            p0, p1, p2, p3 = np.array(cur), np.array((f(0), f(1))), np.array((f(2), f(3))), np.array((f(4), f(5)))
            for t in np.linspace(0, 1, steps + 1)[1:]:
                pts.append(tuple((1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3))
            cur = (f(4), f(5))
            i += 6
    return np.array(pts, dtype=np.float64)


# ---------------------------------------------------------------- field helpers


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def fill(d):
    """Even-odd scanline fill of a closed path -> bool mask."""
    p = path_pts(d)
    x0, y0 = p[:, 0], p[:, 1]
    x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
    m = np.zeros((N, N), bool)
    for r, v in enumerate(V):
        c = (y0 <= v) != (y1 <= v)
        if not c.any():
            continue
        xs = np.sort(x0[c] + (v - y0[c]) * (x1[c] - x0[c]) / (y1[c] - y0[c]))
        for a, b in zip(xs[0::2], xs[1::2]):
            m[r, int(math.ceil(a * PX)) : int(math.floor(b * PX)) + 1] = True
    return m


def blur(a, r):
    """Two passes of a separable box blur (r in pixels) - close enough to a gaussian."""
    r = max(1, int(r))
    a = a.astype(np.float64)
    for _ in range(2):
        for ax in (0, 1):
            pad = [(0, 0), (0, 0)]
            pad[ax] = (r + 1, r)
            c = np.cumsum(np.pad(a, pad, mode="edge"), axis=ax)
            a = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return a.astype(np.float32)


def soft(d, r_m):
    return blur(fill(d), r_m / MPX)


def dist(p, reach):
    """Distance (metres) from every pixel to polyline p, within `reach` plan units, and arc length (m) of the nearest point."""
    best = np.full((N, N), np.inf, np.float32)
    along = np.zeros((N, N), np.float32)
    seg = np.hypot(*np.diff(p, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    for k in range(len(p) - 1):
        a, b = p[k], p[k + 1]
        j0, j1 = [int(np.clip(x * PX, 0, N)) for x in (min(a[0], b[0]) - reach, max(a[0], b[0]) + reach + 1)]
        i0, i1 = [int(np.clip(x * PX, 0, N)) for x in (min(a[1], b[1]) - reach, max(a[1], b[1]) + reach + 1)]
        if j1 <= j0 or i1 <= i0:
            continue
        uu, vv = U[None, j0:j1], V[i0:i1, None]
        ab = b - a
        t = np.clip(((uu - a[0]) * ab[0] + (vv - a[1]) * ab[1]) / max(ab @ ab, 1e-9), 0, 1)
        d = np.hypot(uu - a[0] - t * ab[0], vv - a[1] - t * ab[1])
        win = best[i0:i1, j0:j1]
        closer = d < win
        win[closer] = d[closer]
        along[i0:i1, j0:j1][closer] = (cum[k] + t * seg[k])[closer]
    return best / UPM, along / UPM


def noise(cells, seed):
    """Value noise in -1..1 with `cells` lattice cells across the map."""
    g = np.random.default_rng(seed).uniform(-1, 1, (cells + 2, cells + 2)).astype(np.float32)
    x = np.linspace(0, cells, N, dtype=np.float32)
    i = np.minimum(x.astype(int), cells - 1)
    f = x - i
    f = f * f * (3 - 2 * f)
    a = g[i][:, i] * (1 - f)[None, :] + g[i][:, i + 1] * f[None, :]
    b = g[i + 1][:, i] * (1 - f)[None, :] + g[i + 1][:, i + 1] * f[None, :]
    return a * (1 - f)[:, None] + b * f[:, None]


def fbm(cells, octaves, seed):
    out, amp, tot = np.zeros((N, N), np.float32), 1.0, 0.0
    for o in range(octaves):
        out += amp * noise(cells * 2 ** o, seed + o)
        tot += amp
        amp *= 0.5
    return out / tot


def ellipse(cx, cy, rx, ry):
    return np.sqrt(((U[None, :] - cx) / rx) ** 2 + ((V[:, None] - cy) / ry) ** 2)


def sample(a, u, v):
    return float(a[int(round(np.clip(v * PX, 0, N - 1))), int(round(np.clip(u * PX, 0, N - 1)))])


def world(u, v):
    return ((u / UPM) - SIZE / 2, SIZE / 2 - (v / UPM))


# ---------------------------------------------------------------- height


def build():
    print("terrain: masks")
    sea = fill(SEA)
    coast_d, _ = dist(path_pts(COAST), 160)
    coast_d = np.minimum(coast_d, 1100)
    s = np.where(sea, -coast_d, coast_d)  # signed metres from the shore, land positive
    jungle = smooth(0.35, 0.65, soft(JUNGLE, 120) + 0.28 * fbm(26, 4, 41))  # ragged edge, clearings inside
    padi = soft(PADI, 40)
    mangrove = soft(MANGROVE, 30)
    town = np.clip(soft(TOWN_UPEH, 40) + soft(TOWN_ROYAL, 40) + soft(TOWN_EAST, 40), 0, 1)
    beach_n = soft(BEACH_N, 20)

    print("terrain: height")
    uu, vv = U[None, :] / 1200, V[:, None] / 1200
    inland = smooth(0, 900, s)
    h = 7.0 * (1 - np.exp(-np.maximum(s, 0) / 350))
    h += 28.0 * smooth(0.0, 1.0, (uu + 1 - vv) - 0.8) * inland
    rough = 2.0 + 22.0 * jungle
    rough *= 1 - 0.85 * np.maximum(town, padi)
    rough *= 1 - 0.9 * mangrove
    h += rough * (0.7 * fbm(14, 6, 7) + 0.3 * (1 - 2 * np.abs(fbm(28, 4, 9)))) * smooth(0, 300, s)
    h = np.where(mangrove > 0.5, np.minimum(h, 1.0), h)
    h = np.where(beach_n > 0.3, np.minimum(h, 0.4 + 0.012 * np.maximum(s, 0)), h)
    # seabed: shelving out to ~14 m in the anchorage
    h = np.where(sea, -(1.0 + 13.0 * (1 - np.exp(-coast_d / 900))) + 0.8 * fbm(20, 3, 3), h)

    # hills (smooth tops so the Istana and Bukit China sit on a level)
    shore = smooth(0, 60, s)  # Bukit Melaka ends in a bluff at the shore
    h += 32 * smooth(1.0, 0.35, ellipse(660, 660, 70, 50)) * shore
    h += 26 * smooth(1.0, 0.25, ellipse(800, 580, 48, 34))
    h += (90 + 25 * fbm(30, 3, 11)) * smooth(1.0, 0.1, ellipse(1040, 190, 90, 62))
    h = np.where(sea, np.minimum(h, -0.6), h)  # nothing but the island breaks the waterline
    isl = smooth(1.0, 0.3, ellipse(300, 640, 34, 22))
    h = np.where(isl > 0, h * (1 - isl) + (9 + 3 * fbm(40, 2, 5)) * isl, h)
    # Gunung Ledang in the NE corner: an irregular massif along a ridge with two summits, warped so it
    # is no cone; walkable foothills, steep backdrop top
    rp = np.array([(1095.0, 10.0), (1150.0, 45.0), (1200.0, 110.0)])
    warp = 70 * fbm(7, 3, 31)
    dc = np.full((N, N), np.inf, np.float32)
    for a, b in zip(rp, rp[1:]):
        ab = b - a
        tt = np.clip(((U[None, :] - a[0]) * ab[0] + (V[:, None] - a[1]) * ab[1]) / (ab @ ab), 0, 1)
        dc = np.minimum(dc, np.hypot(U[None, :] - a[0] - tt * ab[0], V[:, None] - a[1] - tt * ab[1]))
    dc = dc + warp
    ang = np.arctan2(V[:, None] + 0 * U[None, :], 1200 - U[None, :])
    spurs = smooth(-0.6, 1.0, np.cos(ang * 7 + 2.5 * fbm(6, 3, 23)))  # ridges running off the massif
    ridge = 1 - np.abs(fbm(10, 4, 21))
    peaks = np.maximum(smooth(90, 0, np.hypot(U[None, :] - 1150, V[:, None] - 45)), 0.75 * smooth(80, 0, np.hypot(U[None, :] - 1195, V[:, None] - 105)))
    h += (300 + 140 * ridge * spurs) * smooth(400, 90, dc)
    h += (520 * smooth(200, 0, dc) ** 1.4 + 300 * peaks) * (0.7 + 0.3 * ridge)

    print("terrain: rivers")
    water_z = np.full((N, N), np.nan, np.float32)
    wet = np.zeros((N, N), bool)
    rivers = {}
    for key, d, w0, w1, depth, base in (("sungai_melaka", RIVER, 42.0, 12.0, 3.5, None), ("anak_sungai", TRIB, 14.0, 6.0, 1.5, "sungai_melaka")):
        p = path_pts(d)
        dr, al = dist(p, 120)
        L = float(np.hypot(*np.diff(p, axis=0).T).sum() / UPM)
        # water level follows the smoothed ground along the course (never falling upstream), flat and
        # tidal near the mouth; the river now stops in the foothills, so it never climbs the massif
        start = 0.0 if base is None else rivers[base]["wl_at"](p[0])
        arc = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))]) / UPM
        prof = np.array([sample(h, *q) for q in p])
        prof = np.convolve(np.pad(prof, 6, mode="edge"), np.ones(13) / 13, mode="valid")
        wl_pts = np.maximum.accumulate(np.maximum(prof - 2.5, start))
        if base is None:
            wl_pts = np.maximum.accumulate(np.where(arc < 2500, np.minimum(wl_pts, 0.6 * arc / 2500), wl_pts))
        # above the tidal reach the river climbs in pools and rapids, not as one sloping sheet
        wl_pts = np.where(wl_pts > 3.0, np.floor(wl_pts / 3.0) * 3.0, wl_pts)
        wl = np.interp(al, arc, wl_pts).astype(np.float32)
        w = w0 + (w1 - w0) * smooth(0, L, al)
        valley = wl + 1.0 + np.maximum(dr - w, 0) * 0.3
        carve = smooth(500, 150, dr)  # fade the valley out well inside the search window: no cliffs
        h = np.where(~sea, h + (np.minimum(h, valley) - h) * carve, h)
        near = dr < w + 30
        h = np.where(near & ~sea, np.maximum(h, wl + 0.6), h)
        inside = dr < w
        bed = wl - depth * np.maximum(w / w0, 0.4) * (1 - (dr / w) ** 2)
        h = np.where(inside, np.minimum(h, bed), h)
        water_z = np.where(dr < w + 2, np.where(np.isnan(water_z), wl, np.minimum(water_z, wl)), water_z)
        wet |= inside
        rivers[key] = {
            "length_m": round(L),
            "dist": dr,
            "w": w,
            "along": al,
            "wl_at": (lambda p_, wl_: lambda q: float(wl_[np.hypot(*(p_ - q).T).argmin()]))(p, wl_pts),
            "mouth_wl": float(wl_pts[0]),
            "head_wl": float(wl_pts[-1]),
        }

    print("terrain: roads")
    road = np.full((N, N), np.inf, np.float32)
    for d in ROADS:
        road = np.minimum(road, dist(path_pts(d), 12)[0])
    path = smooth(6.0, 3.5, road) * ~wet * ~sea  # ~4-5 m tracks, wide enough to read at 3.9 m/px
    h = h - 0.12 * path

    h = np.clip(h, H_MIN, H_MAX).astype(np.float32)
    return dict(h=h, s=s, sea=sea, wet=wet, water_z=water_z, jungle=jungle, padi=padi, mangrove=mangrove,
                town=town, beach_n=beach_n, path=path, rivers=rivers)


# ---------------------------------------------------------------- layers


def layers(t):
    h, s = t["h"], t["s"]
    gy, gx = np.gradient(h, MPX)
    slope = np.hypot(gx, gy)
    riv = t["rivers"]["sungai_melaka"]
    lower_bank = smooth(riv["w"] + 35, riv["w"], riv["dist"]) * (riv["along"] < 3000)
    wanted = [  # priority order: earlier layers win
        ("path", t["path"]),
        ("rock", np.maximum(smooth(0.9, 1.4, slope), smooth(1150, 1250, h))),
        ("mud", np.maximum.reduce([t["mangrove"], lower_bank, t["wet"].astype(np.float32)])),
        ("sand", np.maximum.reduce([smooth(70, 25, s), t["beach_n"], (h < 1.6) * smooth(400, 300, np.abs(s))]) * smooth(3.0, 1.8, h)),
        ("town", t["town"] * 0.55),
        ("padi", t["padi"]),
        ("jungle", t["jungle"] * smooth(0.05, 0.3, h / 30 + 0.1)),
    ]
    rem = np.ones_like(h)
    w = {}
    for name, m in wanted:
        w[name] = np.clip(m, 0, 1) * rem
        rem = rem - w[name]
    w["grass"] = rem
    return w


COLOURS = {
    "sand": (0.78, 0.68, 0.47), "mud": (0.27, 0.21, 0.14), "grass": (0.38, 0.50, 0.21), "jungle": (0.08, 0.21, 0.07),
    "path": (0.58, 0.44, 0.29), "padi": (0.58, 0.66, 0.26), "rock": (0.30, 0.29, 0.26), "town": (0.50, 0.38, 0.25),
}


def albedo(w):
    return sum(w[k][..., None] * np.array(c, np.float32) for k, c in COLOURS.items())


# ---------------------------------------------------------------- png writer (no colour management in the way)


def png(name, a):
    a = np.ascontiguousarray(a)
    hgt, wid = a.shape[:2]
    ch = 1 if a.ndim == 2 else a.shape[2]
    depth = 16 if a.dtype == np.uint16 else 8
    ctype = {1: 0, 3: 2, 4: 6}[ch]
    rows = a.astype(">u2" if depth == 16 else np.uint8).reshape(hgt, -1).view(np.uint8)
    raw = np.hstack([np.zeros((hgt, 1), np.uint8), rows]).tobytes()

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    with open(os.path.join(kit.OUT, name), "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", wid, hgt, depth, ctype, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))
    print("wrote", name)


def u8(*chans):
    return (np.clip(np.stack(chans, -1), 0, 1) * 255 + 0.5).astype(np.uint8)


def export(t, w):
    h = t["h"]
    png("terrain_height.png", ((h - H_MIN) / (H_MAX - H_MIN) * 65535 + 0.5).astype(np.uint16))
    png("terrain_splat0.png", u8(w["sand"], w["mud"], w["grass"], w["jungle"]))
    png("terrain_splat1.png", u8(w["path"], w["padi"], w["rock"], w["town"]))
    # shaded top view
    st = max(1, (N - 1) // 1024)
    hs = h[::st, ::st]
    gy, gx = np.gradient(hs, MPX * st)
    nrm = np.stack([-gx, gy, np.ones_like(hs)], -1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    shade = np.clip(nrm @ np.array([-0.5, 0.5, 0.7]) / np.linalg.norm([-0.5, 0.5, 0.7]), 0, 1) * 0.75 + 0.35
    col = albedo({k: v[::st, ::st] for k, v in w.items()}) * shade[..., None]
    water = (t["sea"][::st, ::st] & (hs < 0)) | ~np.isnan(t["water_z"][::st, ::st]) & (hs < np.nan_to_num(t["water_z"][::st, ::st], nan=-99))
    depthc = np.clip(-hs / 14, 0, 1)[..., None]
    sea_col = np.array([0.20, 0.42, 0.40]) * (1 - depthc) + np.array([0.05, 0.16, 0.22]) * depthc
    col = np.where(water[..., None], sea_col, col)
    png("terrain_map.png", u8(col[..., 0] ** (1 / 2.2), col[..., 1] ** (1 / 2.2), col[..., 2] ** (1 / 2.2)))

    meta = {
        "size_m": SIZE, "res": N, "metres_per_pixel": MPX, "h_min": H_MIN, "h_max": H_MAX,
        "orientation": "row 0 = north, column 0 = west; world X east, Y north, origin at map centre",
        "splat0": ["sand", "mud", "grass", "jungle"], "splat1": ["path", "padi", "rock", "town"],
        "sea_level": 0.0,
        "rivers": {k: {"length_m": r["length_m"], "mouth_water_z": round(r["mouth_wl"], 2), "head_water_z": round(r["head_wl"], 2)} for k, r in t["rivers"].items()},
        "landmarks": {k: {"x": round(world(u, v)[0], 1), "y": round(world(u, v)[1], 1), "z": round(sample(h, u, v), 2)} for k, (u, v) in MARKS.items()},
    }
    with open(os.path.join(kit.OUT, "terrain.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("wrote terrain.json", json.dumps(meta["landmarks"]["istana"]), json.dumps(meta["rivers"]))


# ---------------------------------------------------------------- blockout render


def grid_mesh(name, z, keep=None, colour=None, mat=None):
    """Mesh from a height grid covering the whole map; `keep` masks which quads survive."""
    n = z.shape[0]
    xs = np.linspace(-SIZE / 2, SIZE / 2, n, dtype=np.float32)
    co = np.stack(np.broadcast_arrays(xs[None, :], -xs[:, None], np.nan_to_num(z)), -1).reshape(-1, 3)
    idx = np.arange(n * n).reshape(n, n)
    quads = np.stack([idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:], idx[:-1, :-1]], -1).reshape(-1, 4)
    if keep is not None:
        k = keep[1:, :-1] & keep[1:, 1:] & keep[:-1, 1:] & keep[:-1, :-1]
        quads = quads[k.ravel()]
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(co))
    me.vertices.foreach_set("co", co.ravel())
    me.loops.add(quads.size)
    me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32))
    me.polygons.add(len(quads))
    me.polygons.foreach_set("loop_start", np.arange(0, quads.size, 4, dtype=np.int32))
    me.update(calc_edges=True)
    me.polygons.foreach_set("use_smooth", np.ones(len(quads), bool))
    if colour is not None:
        at = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        at.data.foreach_set("color", np.concatenate([colour.reshape(-1, 3), np.ones((n * n, 1), np.float32)], 1).ravel())
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    kit.SCENERY.objects.link(ob)
    return ob


class Boxes:
    """Many boxes merged into one mesh (fast for hundreds of blockout houses)."""

    def __init__(self):
        self.v, self.f = [], []

    def add(self, x, y, z, sx, sy, sz, yaw=0.0):
        c, s_ = math.cos(yaw), math.sin(yaw)
        b = len(self.v)
        for dz in (0, sz):
            for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                px, py = dx * sx / 2, dy * sy / 2
                self.v.append((x + c * px - s_ * py, y + s_ * px + c * py, z + dz))
        self.f += [(b, b + 3, b + 2, b + 1), (b + 4, b + 5, b + 6, b + 7)] + [(b + i, b + (i + 1) % 4, b + 4 + (i + 1) % 4, b + 4 + i) for i in range(4)]

    def build(self, name, mat):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        ob = bpy.data.objects.new(name, me)
        ob.data.materials.append(mat)
        kit.SCENERY.objects.link(ob)


def blockout(t, w):
    kit.reset()
    st = max(1, (N - 1) // (kit.env("BLOCK", 1025) - 1))
    h = t["h"][::st, ::st]
    col = albedo({k: v[::st, ::st] for k, v in w.items()})
    m, nt, bsdf = kit._principled("tanah")
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "Col"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.95
    grid_mesh("tanah", h, colour=col, mat=m)

    wat = kit.flat("air", (0.03, 0.10, 0.11), rough=0.08)
    sea = bpy.data.meshes.new("laut")
    sea.from_pydata([(-2000000, -2000000, -0.03), (2000000, -2000000, -0.03), (2000000, 2000000, -0.03), (-2000000, 2000000, -0.03)], [], [(0, 1, 2, 3)])
    so = bpy.data.objects.new("laut", sea)
    so.data.materials.append(wat)
    kit.SCENERY.objects.link(so)
    wz = t["water_z"][::st, ::st]
    grid_mesh("sungai", wz + 0.02, keep=~np.isnan(wz) & (wz > 0.0), mat=wat)

    hz = lambda u, v: sample(t["h"], u, v)  # noqa: E731
    houses, royal, ships = Boxes(), Boxes(), Boxes()
    town = t["town"]
    riv = t["rivers"]["sungai_melaka"]
    gy, gx = np.gradient(t["h"], MPX)
    slope = np.hypot(gx, gy)
    placed = 0
    for _ in range(6000):
        u, v = rng.uniform(440, 880), rng.uniform(420, 740)
        if rng.random() > sample(town, u, v) or sample(slope, u, v) > 0.2 or sample(riv["dist"], u, v) < sample(riv["w"], u, v) + 12:
            continue
        if t["sea"][int(v * PX), int(u * PX)]:
            continue
        if math.hypot(u - 661, v - 655) < 22 or math.hypot(u - 620, v - 586) < 8 or sample(t["path"], u, v) > 0.3:
            continue
        x, y = world(u, v)
        houses.add(x, y, hz(u, v) - 0.5, rng.uniform(7, 12), rng.uniform(5, 8), rng.uniform(4, 6.5), rng.choice((0.4, 0.5, 1.95, 2.05)))
        placed += 1
        if placed >= 650:
            break
    # fishing kampung on the north beach, southern kampung on the coast road
    for u0, u1, n_ in ((60, 340, 50), (900, 1120, 40)):
        k = 0
        while k < n_:
            u = rng.uniform(u0, u1)
            v = rng.uniform(250, 1150)
            if not (12 < sample(t["s"], u, v) < (90 if u0 < 500 else 260)) or sample(slope, u, v) > 0.2:
                continue
            x, y = world(u, v)
            houses.add(x, y, hz(u, v) - 0.5, rng.uniform(6, 9), rng.uniform(5, 7), rng.uniform(4, 5.5), rng.uniform(0, 3.14))
            k += 1
    for name, (sx, sy, sz) in (("istana", (55, 22, 16)), ("masjid", (24, 24, 13)), ("bendahara", (30, 16, 10)), ("cave", (14, 8, 10))):
        u, v = MARKS[name]
        x, y = world(u, v)
        royal.add(x, y, hz(u, v) - 1, sx, sy, sz, 0.2 if name != "cave" else 0.9)
    # bridge deck across the river, square to the flow
    bu, bv = MARKS["bridge"]
    rp = path_pts(RIVER)
    k = np.hypot(*(rp - (bu, bv)).T).argmin()
    tang = rp[min(k + 1, len(rp) - 1)] - rp[max(k - 1, 0)]
    yaw = math.atan2(-tang[1], tang[0]) + math.pi / 2  # plan v points south; deck long axis across the flow
    x, y = world(bu, bv)
    royal.add(x, y, 3.0, 130, 7, 1.2, yaw)
    for u, v in SHIPS:
        x, y = world(u, v)
        a = rng.uniform(0, 3.14)
        ships.add(x, y, -1, 34, 9, 5, a)
        ships.add(x, y, 3, 2, 2, 28, a)
    houses.build("rumah", kit.flat("atap_blok", (0.30, 0.20, 0.11)))
    royal.build("mercu", kit.flat("emas_blok", (0.85, 0.62, 0.25)))
    ships.build("kapal", kit.flat("kapal_blok", (0.10, 0.07, 0.05)))
    print("terrain: houses", placed)

    kit.environment(cam=(-2300, -2300, 520), target=(700, 1500, 60), lens=30, sun_elev=34, sun_rot=-130, haze=0.0)
    bpy.data.objects.remove(bpy.data.objects["kabus"])
    bpy.context.scene.camera.data.clip_end = 3000000
    bpy.context.scene.render.filepath = os.path.join(kit.OUT, "terrain.png")
    bpy.ops.render.render(write_still=True)
    print("wrote terrain.png")


if __name__ == "__main__":
    terrain = build()
    weights = layers(terrain)
    export(terrain, weights)
    if kit.env("RENDER", 1):
        blockout(terrain, weights)
