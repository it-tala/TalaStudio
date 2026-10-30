"""
Calabasas Bed - ganti konstruksi rangka sesuai calabasus_bed_rev_1.dwg (Blender 5.2)

Dipakai pada 03_PROYEK/Calabasas_Bed_Plester.blend. Yang diganti HANYA mesh rangka:
    base (footrail + 2 side rail), headboard, post_left/right, rail, cord_wrap,
    leg_front_left/right
Nama objek, material, modifier, parent, studio, kamera, lampu, NPanel "Nakas Studio",
kasur & bantal tidak diubah. Bedding hanya digeser supaya tetap di tengah rangka baru
(rangka lama tidak simetris, 17,5 mm ke kiri) dan throw diangkat keluar dari rangka.

Jalankan:
  SETUP_Calabasas_Bed.cmd                (otomatis, backup dulu lalu simpan)
  atau di Blender: Scripting -> Open file ini -> Run Script, lalu Ctrl+S

Ukuran (mm) diukur langsung dari solid ACIS di DWG.
"""
import math
import sys

import bpy
import bmesh
from mathutils import Vector

PROD = "PROD | Calabasas_Bed"
ROOT = "PRODUCT_ROOT | Calabasas_Bed"
SOURCE = "calabasus_bed_rev_1.dwg"

# ---- ukuran dari DWG rev 1 (mm). x = 0 di tengah ranjang, z = 0 di lantai,
#      y = 0 di as tiang belakang (digeser ke posisi tiang di file saat dijalankan)
D = dict(
    frame_half=777.5,      # rangka upholstery: lebar luar 1555
    frame_front=-2053.29,  # muka footrail (dari as tiang belakang)
    rail_t=53.0,           # tebal rail
    rail_z=191.21,         # bawah rail dari lantai
    rail_h=174.55,         # tinggi rail
    hb_half=777.5,         # headboard 1555 x 811 x 61,2
    hb_z0=165.83,
    hb_z1=976.82,
    hb_t=61.22,
    post_x=805.06,         # as tiang kiri/kanan
    post_r=27.5,           # tiang O55
    post_h=1004.26,        # lantai s/d as top rail
    toprail_half=922.56,   # top rail O55 x 1845,1
    toprail_r=27.5,
    toprail_end_r=3.0,     # ujung top rail dibulatkan R3
    cord_R=27.5,           # lilitan tali: torus R27,5 / r2,5 (260 lilitan)
    cord_r=2.5,
    leg_x=721.03,          # as kaki depan
    leg_y=-1996.69,        # as kaki depan (dari as tiang belakang)
    leg_r=32.5,            # kaki O65
    leg_h=279.26,
    leg_fillet=3.0,
)
# posisi x tiap lilitan tali (mm, dari tengah) - langsung dari 260 solid di DWG
RING_X0, RING_X1, RING_N = -644.89, 638.54, 260

SEG = 64
MM = 0.001


# --------------------------------------------------------------------------------------
def replace_mesh(obj, bm, uv_name=None, uv=None):
    """ganti mesh objek, material & modifier tetap."""
    old = obj.data
    me = bpy.data.meshes.new(old.name)
    bm.to_mesh(me)
    bm.free()
    for m in old.materials:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    if uv_name and uv is not None:
        layer = me.uv_layers.new(name=uv_name)
        for i, val in enumerate(uv):
            layer.data[i].uv = val
    obj.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)
    me.name = obj.name
    return me


def lathe(prof, axis, seg=SEG, u0=0.0, v0=0.0):
    """profil [(t, r)] sepanjang sumbu ('X' atau 'Z'). UV meter: u = keliling, v = panjang."""
    bm = bmesh.new()
    rings = []
    for t, r in prof:
        if r < 1e-9:
            rings.append(None)
            continue
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            c, s = r * math.cos(a), r * math.sin(a)
            co = (t, c, s) if axis == "X" else (c, s, t)
            ring.append(bm.verts.new(tuple(x * MM for x in co)))
        rings.append(ring)
    uv = []
    for k in range(len(prof) - 1):
        a, b = rings[k], rings[k + 1]
        ta, ra = prof[k]
        tb, rb = prof[k + 1]
        if a is None or b is None:
            continue
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
            for (ii, rr, tt) in ((i, ra, ta), (i + 1, ra, ta), (i + 1, rb, tb), (i, rb, tb)):
                uv.append((u0 + 2 * math.pi * rr * ii / seg * MM, v0 + tt * MM))
    # tutup ujung (ngon)
    for k, ring in ((0, rings[1]), (len(prof) - 1, rings[-2])):
        if rings[k] is None and ring is not None:
            f = bm.faces.new(ring if k else list(reversed(ring)))
            t, r = prof[1] if k == 0 else prof[-2]
            for i in (range(seg) if k else reversed(range(seg))):
                a = 2 * math.pi * i / seg
                uv.append((u0 + r * math.cos(a) * MM, v0 + r * math.sin(a) * MM))
    bm.faces.ensure_lookup_table()
    bm.normal_update()
    return bm, uv


def quarter(cz, cr, rad, a0, a1, n):
    return [(cz + rad * math.cos(a0 + (a1 - a0) * k / n),
             cr + rad * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]


# --------------------------------------------------------------------------------------
def rail_profile():
    """penampang rail upholstery (DWG): (d dari muka luar ke dalam, z dari bawah rail)."""
    t, h = D["rail_t"], D["rail_h"]
    pts = []
    # (x dari muka dalam, z) lalu dikonversi ke d = t - x
    pts += quarter(4, 4, 4, math.pi, 1.5 * math.pi, 6)                       # R4 bawah dalam
    pts += quarter(34.3, 15.0, 15.0, -math.pi / 2, math.radians(-9.15), 8)   # R15 bawah luar
    # muka luar cembung (DWG R~1020 / R510): lingkaran lewat 3 titik
    p1, p2, p3 = (49.2, 12.6), (53.0, h / 2), (49.5, h - 13.5)
    cx, cz, R = circle3(p1, p2, p3)
    a1 = math.atan2(p1[1] - cz, p1[0] - cx)
    a3 = math.atan2(p3[1] - cz, p3[0] - cx)
    pts += [(cx + R * math.cos(a1 + (a3 - a1) * k / 14), cz + R * math.sin(a1 + (a3 - a1) * k / 14))
            for k in range(1, 14)]
    pts += quarter(34.6, h - 15.0, 15.0, math.radians(5.75), math.pi / 2, 8)  # R15 atas luar
    pts += quarter(4, h - 4, 4, math.pi / 2, math.pi, 6)                      # R4 atas dalam
    out = []
    for x, z in pts:
        if not out or (abs(out[-1][0] - (t - x)) > 1e-6 or abs(out[-1][1] - z) > 1e-6):
            out.append((t - x, z))
    return out


def circle3(a, b, c):
    ax, ay = a
    bx, by = b
    cx, cy = c
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
    uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
    return ux, uy, math.hypot(ax - ux, ay - uy)


def build_base(y_post):
    """footrail + 2 side rail: profil DWG disapu sepanjang jalur U, sudut depan mitre 45."""
    W, z0 = D["frame_half"], D["rail_z"]
    yb, yf = y_post, y_post + D["frame_front"]
    prof = rail_profile()
    bm = bmesh.new()
    stations = [  # (titik sudut luar, arah ke dalam untuk offset d)
        (lambda d: (-W + d, yb)),
        (lambda d: (-W + d, yf + d)),
        (lambda d: (W - d, yf + d)),
        (lambda d: (W - d, yb)),
    ]
    rings = []
    for st in stations:
        rings.append([bm.verts.new((st(d)[0] * MM, st(d)[1] * MM, (z0 + z) * MM)) for d, z in prof])
    n = len(prof)
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def build_headboard(y_post):
    """panel empuk: belakang rata di as tiang, tepi tebal 25 naik ke 49 (lebar 45),
    tengah cembung sampai 61,2 (DWG)."""
    W, z0, z1, T = D["hb_half"], D["hb_z0"], D["hb_z1"], D["hb_t"]
    yb = y_post

    def axis(lo, hi):
        edge = [0, 1, 2, 3.5, 5, 7, 9, 12, 15, 19, 23, 28, 33, 39, 45, 53, 63, 76]
        span = hi - lo
        mid = [edge[-1] + k * 24.0 for k in range(1, 400)
               if edge[-1] + k * 24.0 < span / 2 - 12]
        half = edge + mid
        return [lo + e for e in half] + [(lo + hi) / 2] + [hi - e for e in reversed(half)]

    xs, zs = axis(-W, W), axis(z0, z1)

    def thick(x, z):
        dx, dz = min(x + W, W - x), min(z - z0, z1 - z)
        k = 5.0
        d = max(0.0, -k * math.log(math.exp(-dx / k) + math.exp(-dz / k)))   # sudut membulat
        if d <= 3:
            th = 25.0
        elif d < 45:
            t = (d - 3) / 42
            g = 1 - (1 - t) ** 2.2
            g *= min(1.0, t / 0.12) ** 0.5 if t < 0.12 else 1.0
            th = 25.0 + 24.2 * g
        else:
            th = 49.2
        cx = min(1.0, max(0.0, (dx - 45) / (W - 45)))
        cz = min(1.0, max(0.0, (dz - 45) / ((z1 - z0) / 2 - 45)))
        th += (T - 49.2) * math.sqrt(cx * cz) ** 0.9
        return th

    bm = bmesh.new()
    nx, nz = len(xs), len(zs)
    front = [[bm.verts.new((x * MM, (yb - thick(x, z)) * MM, z * MM)) for x in xs] for z in zs]
    back = [[bm.verts.new((x * MM, yb * MM, z * MM)) for x in xs] for z in zs]
    for j in range(nz - 1):
        for i in range(nx - 1):
            bm.faces.new((front[j][i], front[j][i + 1], front[j + 1][i + 1], front[j + 1][i]))
            bm.faces.new((back[j][i], back[j + 1][i], back[j + 1][i + 1], back[j][i + 1]))
    for j in range(nz - 1):
        bm.faces.new((front[j][0], front[j + 1][0], back[j + 1][0], back[j][0]))
        bm.faces.new((front[j][-1], back[j][-1], back[j + 1][-1], front[j + 1][-1]))
    for i in range(nx - 1):
        bm.faces.new((front[0][i], back[0][i], back[0][i + 1], front[0][i + 1]))
        bm.faces.new((front[-1][i], front[-1][i + 1], back[-1][i + 1], back[-1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def build_cord(y_post):
    """260 lilitan tali (torus R27,5 r2,5) persis posisi DWG. UV cord: u sepanjang lilitan,
    v keliling tali (sama dengan cord_wrap lama)."""
    R, r = D["cord_R"], D["cord_r"]
    nu, nv = 96, 16
    bm = bmesh.new()
    uv = []
    zc = D["post_h"]
    for k in range(RING_N):
        x0 = RING_X0 + (RING_X1 - RING_X0) * k / (RING_N - 1)
        grid = []
        for i in range(nu):
            a = 2 * math.pi * i / nu
            row = []
            for j in range(nv):
                b = 2 * math.pi * j / nv
                rr = R + r * math.cos(b)
                row.append(bm.verts.new(((x0 + r * math.sin(b)) * MM,
                                         (y_post + rr * math.cos(a)) * MM,
                                         (zc + rr * math.sin(a)) * MM)))
            grid.append(row)
        for i in range(nu):
            for j in range(nv):
                i2, j2 = (i + 1) % nu, (j + 1) % nv
                bm.faces.new((grid[i][j], grid[i2][j], grid[i2][j2], grid[i][j2]))
                uv += [(i / nu, j / nv), ((i + 1) / nu, j / nv),
                       ((i + 1) / nu, (j + 1) / nv), (i / nu, (j + 1) / nv)]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm, uv


def build_wood(name, y_post):
    if name == "rail":
        h, R, e = D["toprail_half"], D["toprail_r"], D["toprail_end_r"]
        prof = ([(-h, 0)] + quarter(-h + e, R - e, e, math.pi, math.pi / 2, 6)
                + quarter(h - e, R - e, e, math.pi / 2, 0, 6) + [(h, 0)])
        bm, uv = lathe(prof, "X", u0=2.61, v0=0.7)
        bmesh.ops.translate(bm, vec=(0, y_post * MM, D["post_h"] * MM), verts=bm.verts)
        return bm, uv
    if name.startswith("post"):
        R, H = D["post_r"], D["post_h"]
        prof = [(0, 0)] + quarter(1, R - 1, 1, math.pi, math.pi / 2, 3) + [(H, R), (H, 0)]
        sx = -1 if name.endswith("left") else 1
        bm, uv = lathe(prof, "Z", u0=4.24 if sx < 0 else 3.1, v0=-0.47)
        bmesh.ops.translate(bm, vec=(sx * D["post_x"] * MM, y_post * MM, 0), verts=bm.verts)
        return bm, uv
    if name.startswith("leg"):
        R, H, f = D["leg_r"], D["leg_h"], D["leg_fillet"]
        prof = [(0, 0)] + quarter(f, R - f, f, math.pi, math.pi / 2, 5) + [(H, R), (H, 0)]
        sx = -1 if name.endswith("left") else 1
        bm, uv = lathe(prof, "Z", u0=-0.36 if sx < 0 else 0.8, v0=1.88)
        bmesh.ops.translate(bm, vec=(sx * D["leg_x"] * MM, (y_post + D["leg_y"]) * MM, 0),
                            verts=bm.verts)
        return bm, uv
    raise KeyError(name)


# --------------------------------------------------------------------------------------
def mesh_center(obj):
    vs = [v.co for v in obj.data.vertices]
    lo = Vector([min(v[a] for v in vs) for a in range(3)])
    hi = Vector([max(v[a] for v in vs) for a in range(3)])
    return (lo + hi) / 2, lo, hi


def fix_bedding(objs, root, x_shift_mm):
    """geser bedding ke tengah rangka baru; throw yang menggantung diangkat keluar rangka."""
    if root.get("cb_rev1_bedding"):
        return
    for o in objs:
        if o.name.startswith("fabric_"):
            o.location.x += x_shift_mm * MM
    throw = bpy.data.objects.get("fabric_throw")
    if throw:
        clear = D["frame_half"] + 8.0                       # 8 mm dari muka luar rangka
        top = D["rail_z"] + D["rail_h"]
        z_hi = top + 150.0                                  # di atas ini throw tidak diubah
        dx = throw.location.x / MM
        step = 20.0
        for side in (-1, 1):
            # geseran yang dibutuhkan per ketinggian (bin 20 mm), dari lapisan terdalam
            bins = {}
            for v in throw.data.vertices:
                x, z = side * (v.co.x / MM + dx), v.co.z / MM
                if x > 650 and z < z_hi:
                    k = int(z // step)
                    bins[k] = min(bins.get(k, 1e9), x)
            if not bins:
                continue
            ks = sorted(bins)
            need = {k: max(0.0, clear - bins[k]) for k in ks}
            # di atas rangka: ruang hanya perlu di luar tepi atas -> turun mulus ke 0 di z_hi
            ktop = int(top // step)
            n_top = max([need[k] for k in ks if k <= ktop] or [0.0])
            for k in ks:
                z = (k + 0.5) * step
                if z > top:
                    w = max(0.0, 1 - (z - top) / (z_hi - top))
                    need[k] = n_top * w * w * (3 - 2 * w)
            zc = [(k + 0.5) * step for k in ks]
            nv = [need[k] for k in ks]

            def interp(z):
                if z <= zc[0]:
                    return nv[0]
                for i in range(len(zc) - 1):
                    if z <= zc[i + 1]:
                        t = (z - zc[i]) / (zc[i + 1] - zc[i])
                        return nv[i] * (1 - t) + nv[i + 1] * t
                return 0.0
            for v in throw.data.vertices:
                x, z = side * (v.co.x / MM + dx), v.co.z / MM
                if x < 600 or z >= z_hi:
                    continue
                v.co.x += side * interp(z) * min(1.0, (x - 600) / 50) * MM
        throw.data.update()
    root["cb_rev1_bedding"] = True


def main():
    coll = bpy.data.collections.get(PROD)
    if coll is None:
        raise RuntimeError("Koleksi '%s' tidak ada - buka Calabasas_Bed_Plester.blend" % PROD)
    objs = list(coll.all_objects)
    post = bpy.data.objects["post_left"]
    c, _, _ = mesh_center(post)
    y_post = c.y / MM                                       # as tiang di file (mm, lokal)
    base = bpy.data.objects["base"]
    old_base_cx = mesh_center(base)[0].x / MM

    bm = build_base(y_post)
    replace_mesh(base, bm)
    bm = build_headboard(y_post)
    replace_mesh(bpy.data.objects["headboard"], bm)
    for n in ("rail", "post_left", "post_right", "leg_front_left", "leg_front_right"):
        bm, uv = build_wood(n, y_post)
        replace_mesh(bpy.data.objects[n], bm, "UV meter", uv)
    bm, uv = build_cord(y_post)
    replace_mesh(bpy.data.objects["cord_wrap"], bm, "UV cord", uv)

    root = bpy.data.objects.get(ROOT)
    if root is not None:
        fix_bedding(objs, root, -old_base_cx if abs(old_base_cx) > 0.5 else 0.0)
        w = 2 * D["toprail_half"]
        l = -D["frame_front"] + D["post_r"]
        h = D["post_h"] + D["toprail_r"]
        root["dimensions_cm"] = [round(w / 10, 1), round(l / 10, 1), round(h / 10, 1)]
        root["source_dwg"] = SOURCE
    print("CALABASAS BED: rangka diganti sesuai %s (%.1f x %.1f x %.1f mm)"
          % (SOURCE, 2 * D["toprail_half"], -D["frame_front"] + D["post_r"],
             D["post_h"] + D["toprail_r"]))

    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if "--save" in argv:
        bpy.ops.wm.save_mainfile()
        print("CALABASAS BED: tersimpan ->", bpy.data.filepath)


main()
