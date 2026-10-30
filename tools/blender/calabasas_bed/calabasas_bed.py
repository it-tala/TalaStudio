"""
Calabasas Bed - model 3D + NPanel (Blender 5.2)

Sumber ukuran : calabasus_bed_rev_1.dwg (solid ACIS, satuan mm)
Referensi look: foto katalog Calabasas (kayu walnut gelap, tali kertas di top rail,
                upholstery boucle putih)

Cara pakai
  1. Otomatis : SETUP_Calabasas_Bed.cmd  (membuka 03_PROYEK/Calabasas_Bed_Plester.blend,
                membangun ranjang, menyimpan file)
  2. Manual   : buka Calabasas_Bed_Plester.blend -> tab Scripting -> buka file ini -> Run Script
  NPanel      : Viewport 3D -> tekan N -> tab "TALA" -> panel "Calabasas Bed"

Semua ukuran di NPanel dalam milimeter. Nilai default = ukuran di DWG.
"""
import math
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

COLL = "Calabasas_Bed"
TEXT_NAME = "calabasas_bed.py"

# --------------------------------------------------------------------------------------
# Ukuran dari DWG (mm). Origin: tengah lebar ranjang, tengah panjang total, lantai = 0.
# --------------------------------------------------------------------------------------
DWG = dict(
    frame_w=1555.0,      # lebar rangka upholstery (luar)
    frame_l=2053.3,      # muka footrail s/d garis tengah tiang belakang
    rail_t=53.0,         # tebal side rail / footrail
    rail_h=174.6,        # tinggi rail
    rail_z=191.2,        # bawah rail dari lantai
    leg_d=65.0,          # diameter kaki depan
    leg_h=279.3,         # tinggi kaki depan (sebagian masuk ke dalam rail)
    leg_inset=56.5,      # jarak as kaki ke sisi luar rangka
    post_d=55.0,         # diameter tiang belakang
    post_h=1004.3,       # lantai s/d as top rail
    toprail_d=55.0,      # diameter top rail
    toprail_l=1845.1,    # panjang top rail
    wrap_l=1288.4,       # panjang lilitan tali
    cord_d=5.0,          # diameter tali (260 lilitan di DWG)
    hb_h=811.0,          # tinggi panel headboard
    hb_z=165.8,          # bawah panel headboard dari lantai
    hb_t=61.2,           # tebal panel headboard (di tengah)
)

WOODS = {
    "WALNUT": ((0.105, 0.052, 0.030), (0.200, 0.105, 0.058)),
    "OAK": ((0.520, 0.330, 0.150), (0.780, 0.550, 0.300)),
    "TEAK": ((0.300, 0.150, 0.060), (0.480, 0.270, 0.120)),
    "EBONY": ((0.030, 0.022, 0.018), (0.070, 0.050, 0.040)),
}


# --------------------------------------------------------------------------------------
# Properti NPanel
# --------------------------------------------------------------------------------------
def _rebuild(self, context):
    if getattr(self, "lock", False):
        return
    build(context.scene)


def _remat(self, context):
    if getattr(self, "lock", False):
        return
    update_materials(context.scene)


def _mm(name, key, mn, mx, desc=""):
    return bpy.props.FloatProperty(name=name, default=DWG[key], min=mn, max=mx,
                                   precision=1, step=100, description=desc,
                                   update=_rebuild)


class CB_Props(bpy.types.PropertyGroup):
    lock: bpy.props.BoolProperty(default=False, options={"HIDDEN", "SKIP_SAVE"})
    frame_w: _mm("Lebar rangka", "frame_w", 900, 2400, "Lebar luar rangka upholstery")
    frame_l: _mm("Panjang rangka", "frame_l", 1500, 2600, "Muka footrail s/d as tiang belakang")
    rail_t: _mm("Tebal rail", "rail_t", 20, 150)
    rail_h: _mm("Tinggi rail", "rail_h", 60, 400)
    rail_z: _mm("Jarak rail-lantai", "rail_z", 50, 400)
    leg_d: _mm("Diameter kaki", "leg_d", 20, 150)
    leg_h: _mm("Tinggi kaki", "leg_h", 50, 500)
    leg_inset: _mm("Inset kaki", "leg_inset", 20, 200)
    post_d: _mm("Diameter tiang", "post_d", 20, 150)
    post_h: _mm("Tinggi tiang (as rail)", "post_h", 400, 1800)
    toprail_d: _mm("Diameter top rail", "toprail_d", 20, 150)
    toprail_l: _mm("Panjang top rail", "toprail_l", 900, 2800)
    wrap_l: _mm("Panjang lilitan tali", "wrap_l", 0, 2600)
    cord_d: _mm("Diameter tali", "cord_d", 2, 15)
    hb_h: _mm("Tinggi headboard", "hb_h", 200, 1600)
    hb_z: _mm("Headboard dari lantai", "hb_z", 50, 600)
    hb_t: _mm("Tebal headboard", "hb_t", 20, 200)

    bedding: bpy.props.BoolProperty(name="Kasur & bedding", default=True, update=_rebuild,
                                    description="Kasur, bed cover, bantal, throw (seperti foto referensi)")
    smooth: bpy.props.IntProperty(name="Kehalusan", default=64, min=24, max=128,
                                  update=_rebuild, description="Jumlah segmen silinder")

    wood: bpy.props.EnumProperty(
        name="Kayu", default="WALNUT", update=_remat,
        items=[(k, k.title(), "") for k in WOODS] + [("CUSTOM", "Custom", "")])
    wood_color: bpy.props.FloatVectorProperty(name="Warna kayu", subtype="COLOR", size=3,
                                              min=0, max=1, default=(0.16, 0.08, 0.045),
                                              update=_remat)
    fabric_color: bpy.props.FloatVectorProperty(name="Upholstery", subtype="COLOR", size=3,
                                                min=0, max=1, default=(0.80, 0.78, 0.74),
                                                update=_remat)
    rope_color: bpy.props.FloatVectorProperty(name="Tali", subtype="COLOR", size=3,
                                              min=0, max=1, default=(0.40, 0.28, 0.16),
                                              update=_remat)
    bedding_color: bpy.props.FloatVectorProperty(name="Bed cover", subtype="COLOR", size=3,
                                                 min=0, max=1, default=(0.33, 0.32, 0.31),
                                                 update=_remat)


# --------------------------------------------------------------------------------------
# Geometri
# --------------------------------------------------------------------------------------
def unit_mm(scene):
    """meter Blender per mm, menghormati Unit Scale scene."""
    s = scene.unit_settings.scale_length or 1.0
    return 0.001 / s


def get_coll(scene):
    c = bpy.data.collections.get(COLL)
    if c is None:
        c = bpy.data.collections.new(COLL)
    if c.name not in scene.collection.children:
        scene.collection.children.link(c)
    return c


def clear_coll(c):
    for o in list(c.objects):
        me = o.data if o.type == "MESH" else None
        bpy.data.objects.remove(o, do_unlink=True)
        if me is not None and me.users == 0:
            bpy.data.meshes.remove(me)


def new_obj(c, name, bm, mat, smooth_angle=35):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    c.objects.link(o)
    if mat:
        me.materials.append(mat)
    if smooth_angle:
        try:
            with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o],
                                           selected_editable_objects=[o]):
                bpy.ops.object.shade_auto_smooth(angle=math.radians(smooth_angle))
        except Exception:
            pass
    return o


def lathe(prof, seg):
    """prof: [(z, r)] dari bawah ke atas, sumbu Z. r=0 di ujung = tutup."""
    bm = bmesh.new()
    rings = []
    for z, r in prof:
        if r <= 1e-9:
            rings.append([bm.verts.new((0, 0, z))])
            continue
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg),
                                    r * math.sin(2 * math.pi * i / seg), z))
                      for i in range(seg)])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(seg):
                bm.faces.new((a[0], b[i], b[(i + 1) % seg]))
        elif len(b) == 1:
            for i in range(seg):
                bm.faces.new((a[(i + 1) % seg], a[i], b[0]))
        else:
            for i in range(seg):
                bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def arc(z0, r0, zc, rc, a0, a1, n=6):
    """titik-titik busur (z, r) di sekitar pusat (zc, rc), sudut a0..a1 (rad)."""
    rad = math.hypot(z0 - zc, r0 - rc)
    return [(zc + rad * math.cos(a0 + (a1 - a0) * k / n),
             rc + rad * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]


def round_box(sx, sy, sz, r_edges):
    """box (0..sx, 0..sy, 0..sz) dengan bevel weight per sisi; dikerjakan modifier."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(((v.co.x + 0.5) * sx, (v.co.y + 0.5) * sy, (v.co.z + 0.5) * sz))
    return bm


def add_bevel(o, width, seg, weight=False, limit_angle=None, profile=0.5):
    m = o.modifiers.new("Bevel", "BEVEL")
    m.width = width
    m.segments = seg
    m.profile = profile
    m.limit_method = "WEIGHT" if weight else ("ANGLE" if limit_angle else "NONE")
    if limit_angle:
        m.angle_limit = math.radians(limit_angle)
    m.harden_normals = False
    m.use_clamp_overlap = True
    return m


def set_edge_weights(me, fn):
    attr = me.attributes.get("bevel_weight_edge") or \
        me.attributes.new("bevel_weight_edge", "FLOAT", "EDGE")
    for e in me.edges:
        a = me.vertices[e.vertices[0]].co
        b = me.vertices[e.vertices[1]].co
        attr.data[e.index].value = fn(a, b)


def build_frame(c, P, u, mats):
    """rangka upholstery bentuk U (footrail + 2 side rail), sudut luar membulat."""
    W, L, t, H, Z = P.frame_w, P.frame_l, P.rail_t, P.rail_h, P.rail_z
    y0 = -L / 2
    y1 = L / 2
    x0, x1 = -W / 2, W / 2
    outline = [(x0, y0), (x1, y0), (x1, y1), (x1 - t, y1), (x1 - t, y0 + t),
               (x0 + t, y0 + t), (x0 + t, y1), (x0, y1)]
    bm = bmesh.new()
    vs = [bm.verts.new((x * u, y * u, Z * u)) for x, y in outline]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    top = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMVert)]
    for v in top:
        v.co.z = (Z + H) * u
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj(c, "CB_Rangka_Upholstery", bm, mats["fabric"], smooth_angle=0)
    eps = 1e-6
    W2, tt = W / 2 * u, t * u

    def wfn(a, b):
        horiz = abs(a.z - b.z) < eps
        if not horiz:
            # sudut vertikal luar (depan) membulat seperti foto; ujung belakang tajam
            if abs(a.y - y1 * u) < eps:
                return 0.0
            outer = abs(abs(a.x) - W2) < eps and abs(a.y - y0 * u) < eps
            return 1.0 if outer else 0.15
        if abs(a.y - y1 * u) < eps and abs(b.y - y1 * u) < eps:
            return 0.0                       # ujung belakang (tersembunyi di headboard)
        outer = (abs(abs(a.x) - W2) < eps and abs(abs(b.x) - W2) < eps) or \
                (abs(a.y - y0 * u) < eps and abs(b.y - y0 * u) < eps)
        return 1.0 if outer else 0.27
    set_edge_weights(o.data, wfn)
    add_bevel(o, 15 * u, 6, weight=True)
    o.modifiers.new("Halus", "WEIGHTED_NORMAL").keep_sharp = True
    return o


def build_headboard(c, P, u, mats):
    """panel headboard empuk: belakang rata (di as tiang), muka cembung."""
    W, H, T, Z = P.frame_w, P.hb_h, P.hb_t, P.hb_z
    yb = P.frame_l / 2
    nx, nz = 48, 28
    edge = min(40.0, T * 0.65)            # radius tepi empuk (DWG: R43-R51)
    bm = bmesh.new()
    grid = []
    for j in range(nz + 1):
        row = []
        for i in range(nx + 1):
            s, tz = i / nx, j / nz
            x = -W / 2 + W * s
            z = Z + H * tz
            dx = min(x + W / 2, W / 2 - x)
            dz = min(z - Z, Z + H - z)
            d = min(dx, dz)
            k = min(1.0, d / edge)
            th = (T - edge) + edge * math.sqrt(max(0.0, 1 - (1 - k) ** 2))
            row.append(bm.verts.new((x * u, (yb - th) * u, z * u)))
        grid.append(row)
    back = []
    for j in range(nz + 1):
        back.append([bm.verts.new((v.co.x, yb * u, v.co.z)) for v in grid[j]])
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            bm.faces.new((back[j][i], back[j + 1][i], back[j + 1][i + 1], back[j][i + 1]))
    for j in range(nz):
        bm.faces.new((grid[j][0], grid[j + 1][0], back[j + 1][0], back[j][0]))
        bm.faces.new((grid[j][nx], back[j][nx], back[j + 1][nx], grid[j + 1][nx]))
    for i in range(nx):
        bm.faces.new((grid[0][i], back[0][i], back[0][i + 1], grid[0][i + 1]))
        bm.faces.new((grid[nz][i], grid[nz][i + 1], back[nz][i + 1], back[nz][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # kerapatan grid di tepi supaya lengkung empuk mulus
    o = new_obj(c, "CB_Headboard", bm, mats["fabric"], smooth_angle=0)
    s = o.modifiers.new("Halus", "SUBSURF")
    s.levels = 1
    s.render_levels = 2
    return o


def build_wood(c, P, u, mats, seg):
    objs = []
    W, L = P.frame_w, P.frame_l
    # kaki depan (2): silinder, bawah dibulatkan R3
    r = P.leg_d / 2
    prof = [(0, 0)] + arc(0, r - 3, 3, r - 3, math.pi, math.pi / 2, 5) + [(P.leg_h, r), (P.leg_h, 0)]
    for sx, nm in ((-1, "Kiri"), (1, "Kanan")):
        bm = lathe(prof, seg)
        bmesh.ops.scale(bm, vec=(u, u, u), verts=bm.verts)
        o = new_obj(c, "CB_Kaki_Depan_" + nm, bm, mats["wood"])
        x = sx * (W / 2 - P.leg_inset)
        y = -L / 2 + P.leg_inset
        o.location = (x * u, y * u, 0)
        objs.append(o)
    # tiang belakang (2): lantai s/d as top rail
    r = P.post_d / 2
    prof = [(0, 0)] + arc(0, r - 2, 2, r - 2, math.pi, math.pi / 2, 3) + [(P.post_h, r), (P.post_h, 0)]
    for sx, nm in ((-1, "Kiri"), (1, "Kanan")):
        bm = lathe(prof, seg)
        bmesh.ops.scale(bm, vec=(u, u, u), verts=bm.verts)
        o = new_obj(c, "CB_Tiang_" + nm, bm, mats["wood"])
        o.location = (sx * (W / 2 + r) * u, L / 2 * u, 0)
        objs.append(o)
    # top rail: silinder sumbu X, ujung R3, bagian lilitan dikecilkan untuk tali
    R = P.toprail_d / 2
    hl = P.toprail_l / 2
    wl = min(P.wrap_l, P.toprail_l - 20) / 2
    cr = P.cord_d / 2
    core = max(1.0, R - P.cord_d)
    prof = [(-hl, 0)] + arc(-hl, R - 3, -hl + 3, R - 3, math.pi, math.pi / 2, 5)
    if wl > 0:
        prof += [(-wl, R), (-wl, core), (wl, core), (wl, R)]
    prof += arc(hl - 3, R, hl - 3, R - 3, math.pi / 2, 0, 5) + [(hl, 0)]
    bm = lathe(prof, seg)
    bmesh.ops.scale(bm, vec=(u, u, u), verts=bm.verts)
    o = new_obj(c, "CB_Top_Rail", bm, mats["wood"])
    o.rotation_euler = (0, math.pi / 2, 0)
    o.location = (0, L / 2 * u, P.post_h * u)
    objs.append(o)
    # lilitan tali: heliks, diameter tali = cord_d, rata dengan permukaan rail
    if wl > 0:
        cu = bpy.data.curves.new("CB_Tali", "CURVE")
        cu.dimensions = "3D"
        cu.bevel_depth = cr * u
        cu.bevel_resolution = 2
        cu.use_fill_caps = True
        sp = cu.splines.new("POLY")
        rr = R - cr
        turns = int(round(2 * wl / P.cord_d))
        per = 16
        n = turns * per + 1
        sp.points.add(n - 1)
        for k in range(n):
            a = 2 * math.pi * k / per
            x = -wl + cr + (2 * wl - 2 * cr) * k / (n - 1)
            sp.points[k].co = (x * u, rr * math.cos(a) * u, rr * math.sin(a) * u, 1)
        to = bpy.data.objects.new("CB_Tali_Lilitan", cu)
        c.objects.link(to)
        cu.materials.append(mats["rope"])
        to.location = (0, L / 2 * u, P.post_h * u)
        objs.append(to)
    return objs


def pillow_bm(sx, sy, sz, n=24, p=3.0):
    """bantal: tebal mengecil ke tepi."""
    bm = bmesh.new()
    top, bot = [], []
    for j in range(n + 1):
        rt, rb = [], []
        for i in range(n + 1):
            a, b = -1 + 2 * i / n, -1 + 2 * j / n
            f = ((1 - abs(a) ** p) * (1 - abs(b) ** p)) ** 0.6
            x, y = a * sx / 2, b * sy / 2
            # tepi sedikit melengkung ke dalam (seperti bantal asli)
            x *= 1 - 0.04 * (1 - abs(b) ** 2)
            y *= 1 - 0.04 * (1 - abs(a) ** 2)
            rt.append(bm.verts.new((x, y, f * sz / 2)))
            rb.append(None if (i in (0, n) or j in (0, n)) else bm.verts.new((x, y, -f * sz / 2)))
        top.append(rt)
        bot.append(rb)
    for j in range(n + 1):
        for i in range(n + 1):
            if bot[j][i] is None:
                bot[j][i] = top[j][i]
    for j in range(n):
        for i in range(n):
            bm.faces.new((top[j][i], top[j][i + 1], top[j + 1][i + 1], top[j + 1][i]))
            bm.faces.new((bot[j][i], bot[j + 1][i], bot[j + 1][i + 1], bot[j][i + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-9)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def drape_bm(w, l, drop, z_top, nx=40, ny=50, side_r=40.0, foot=True):
    """kain menutup kasur: atas rata, jatuh ke samping (& kaki bila foot=True)."""
    bm = bmesh.new()
    rows = []
    total_x = w + 2 * (side_r * math.pi / 2 + drop)
    total_y = l + (side_r * math.pi / 2 + drop if foot else 0)
    for j in range(ny + 1):
        row = []
        sy = total_y * j / ny            # dari ujung kepala (0) ke ujung kaki
        for i in range(nx + 1):
            sx = -total_x / 2 + total_x * i / nx
            x, z = fold(sx, w / 2, side_r, z_top)
            yy, zz = fold(sy, l, side_r, z_top, one_side=True)
            z = min(z, zz) if (abs(sx) > w / 2 or sy > l) else z_top
            row.append((x, l / 2 - yy, z))
        rows.append(row)
    vs = [[bm.verts.new(p) for p in r] for r in rows]
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
    # pojok kaki: x dan y sama-sama jatuh -> tarik ke dalam agar tidak menembus
    for j in range(ny + 1):
        for i in range(nx + 1):
            v = vs[j][i]
            sx = -total_x / 2 + total_x * i / nx
            sy = total_y * j / ny
            if abs(sx) > w / 2 and sy > l:
                ex = abs(sx) - w / 2
                ey = sy - l
                k = min(ex, ey)
                v.co.z = z_top - min(k * 0.9, drop)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def fold(s, half, r, z_top, one_side=False):
    """jarak sepanjang kain -> (posisi horizontal, z) untuk tepi yang melengkung lalu jatuh."""
    a = s if one_side else abs(s)
    sign = 1 if (one_side or s >= 0) else -1
    if a <= half:
        return s, z_top
    e = a - half
    arc_len = r * math.pi / 2
    if e <= arc_len:
        t = e / r
        return sign * (half + r * math.sin(t)), z_top - r * (1 - math.cos(t))
    return sign * (half + r), z_top - r - (e - arc_len)


def build_bedding(c, P, u, mats):
    objs = []
    W, L, t = P.frame_w, P.frame_l, P.rail_t
    in_w = W - 2 * t - 12
    y_head = L / 2 - P.hb_t - 5
    y_foot = -L / 2 + t + 6
    in_l = y_head - y_foot
    top_rail = P.rail_z + P.rail_h
    mz0 = top_rail - 90
    mh = 240
    bm = round_box(in_w * u, in_l * u, mh * u, None)
    o = new_obj(c, "CB_Kasur", bm, mats["sheet"], smooth_angle=0)
    o.location = (-in_w / 2 * u, y_foot * u, mz0 * u)
    add_bevel(o, 35 * u, 6)
    o.modifiers.new("Halus", "WEIGHTED_NORMAL").keep_sharp = True
    objs.append(o)
    ztop = mz0 + mh
    # bed cover: menutup kasur dari 380 mm di bawah bantal sampai jatuh di kaki
    cover_l = in_l - 380
    bm = drape_bm(in_w + 10, cover_l, 150, ztop + 12)
    bmesh.ops.scale(bm, vec=(u, u, u), verts=bm.verts)
    o = new_obj(c, "CB_Bed_Cover", bm, mats["cover"], smooth_angle=0)
    o.location = (0, (y_foot + cover_l / 2) * u, 0)
    sol = o.modifiers.new("Tebal", "SOLIDIFY")
    sol.thickness = 22 * u
    sol.offset = 1
    s = o.modifiers.new("Halus", "SUBSURF")
    s.levels = 1
    s.render_levels = 2
    objs.append(o)
    # throw di sepertiga kaki
    bm = drape_bm(in_w + 60, 520, 260, ztop + 36, nx=40, ny=16, side_r=30, foot=False)
    bmesh.ops.scale(bm, vec=(u, u, u), verts=bm.verts)
    o = new_obj(c, "CB_Throw", bm, mats["throw"], smooth_angle=0)
    o.location = (40 * u, (y_foot + 420) * u, 0)
    o.rotation_euler = (0, 0, math.radians(-4))
    sol = o.modifiers.new("Tebal", "SOLIDIFY")
    sol.thickness = 12 * u
    sol.offset = 1
    s = o.modifiers.new("Halus", "SUBSURF")
    s.levels = 1
    s.render_levels = 2
    objs.append(o)
    # bantal: 2 bantal tidur bersandar ke headboard + 1 bantal kecil (lumbar)
    pw, pl, pt = min(680, in_w / 2 - 20), 460, 170
    for sx, nm in ((-1, "Kiri"), (1, "Kanan")):
        bm = pillow_bm(pw * u, pl * u, pt * u)
        o = new_obj(c, "CB_Bantal_" + nm, bm, mats["pillow"], smooth_angle=0)
        o.rotation_euler = (math.radians(68), 0, math.radians(sx * 2))
        o.location = (sx * (pw / 2 + 8) * u, (y_head - 110) * u, (ztop + pl / 2 * 0.9) * u)
        objs.append(o)
    bm = pillow_bm(520 * u, 300 * u, 130 * u)
    o = new_obj(c, "CB_Bantal_Kecil", bm, mats["cushion"], smooth_angle=0)
    o.rotation_euler = (math.radians(70), 0, 0)
    o.location = (0, (y_head - 270) * u, (ztop + 140) * u)
    objs.append(o)
    return objs


# --------------------------------------------------------------------------------------
# Material
# --------------------------------------------------------------------------------------
def node_mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    return m


def _reset(m):
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (600, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    return nt, bsdf


def mat_wood(m, dark, light):
    nt, b = _reset(m)
    L = nt.links
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (60, 60, 2.5)   # serat searah sumbu panjang
    L.new(tc.outputs["Object"], mp.inputs[0])
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type = "RINGS"
    wave.inputs["Scale"].default_value = 1.2
    wave.inputs["Distortion"].default_value = 6.0
    wave.inputs["Detail"].default_value = 3.0
    L.new(mp.outputs[0], wave.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 3.0
    nz.inputs["Detail"].default_value = 8.0
    L.new(mp.outputs[0], nz.inputs[0])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "FLOAT"
    mix.inputs[0].default_value = 0.35
    L.new(wave.outputs["Fac"], mix.inputs[2])
    L.new(nz.outputs["Fac"], mix.inputs[3])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.name = "WoodRamp"
    ramp.color_ramp.elements[0].position = 0.25
    ramp.color_ramp.elements[1].position = 0.85
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].color = (*light, 1)
    L.new(mix.outputs[0], ramp.inputs[0])
    L.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Coat Weight"].default_value = 0.15
    b.inputs["Coat Roughness"].default_value = 0.3
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.0005
    L.new(mix.outputs[0], bump.inputs["Height"])
    L.new(bump.outputs[0], b.inputs["Normal"])


def mat_fabric(m, col, scale=900.0, sheen=0.6, bump_s=0.35):
    """boucle / linen: bintik-bintik loop kecil lewat voronoi + noise."""
    nt, b = _reset(m)
    L = nt.links
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = 0.95
    b.inputs["Sheen Weight"].default_value = sheen
    b.inputs["Sheen Roughness"].default_value = 0.5
    tc = nt.nodes.new("ShaderNodeTexCoord")
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = scale
    vor.inputs["Randomness"].default_value = 1.0
    L.new(tc.outputs["Object"], vor.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale / 6
    nz.inputs["Detail"].default_value = 6
    L.new(tc.outputs["Object"], nz.inputs[0])
    mx = nt.nodes.new("ShaderNodeMath")
    mx.operation = "MULTIPLY"
    L.new(vor.outputs["Distance"], mx.inputs[0])
    L.new(nz.outputs["Fac"], mx.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = bump_s
    bump.inputs["Distance"].default_value = 0.001
    L.new(mx.outputs[0], bump.inputs["Height"])
    L.new(bump.outputs[0], b.inputs["Normal"])
    hsv = nt.nodes.new("ShaderNodeHueSaturation")
    hsv.inputs["Value"].default_value = 1.0
    hsv.name = "Shade"
    vmix = nt.nodes.new("ShaderNodeMix")
    vmix.data_type = "RGBA"
    vmix.blend_type = "MULTIPLY"
    vmix.inputs[0].default_value = 0.12
    vmix.inputs[6].default_value = (*col, 1)
    L.new(nz.outputs["Color"], vmix.inputs[7])
    L.new(vmix.outputs[2], b.inputs["Base Color"])
    vmix.name = "FabricColor"


def mat_rope(m, col):
    nt, b = _reset(m)
    L = nt.links
    b.inputs["Roughness"].default_value = 0.8
    b.inputs["Sheen Weight"].default_value = 0.3
    tc = nt.nodes.new("ShaderNodeTexCoord")
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.bands_direction = "DIAGONAL"
    wave.inputs["Scale"].default_value = 900.0
    wave.inputs["Distortion"].default_value = 1.5
    L.new(tc.outputs["Object"], wave.inputs[0])
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 300.0
    L.new(tc.outputs["Object"], nz.inputs[0])
    cm = nt.nodes.new("ShaderNodeMix")
    cm.data_type = "RGBA"
    cm.name = "RopeColor"
    cm.inputs[0].default_value = 0.25
    cm.blend_type = "MULTIPLY"
    cm.inputs[6].default_value = (*col, 1)
    L.new(nz.outputs["Color"], cm.inputs[7])
    L.new(cm.outputs[2], b.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.6
    bump.inputs["Distance"].default_value = 0.0008
    L.new(wave.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs[0], b.inputs["Normal"])


def get_mats(scene):
    names = dict(wood="CB_Kayu", fabric="CB_Upholstery_Boucle", rope="CB_Tali_Kertas",
                 sheet="CB_Sprei", cover="CB_Bed_Cover", pillow="CB_Bantal",
                 cushion="CB_Bantal_Kecil", throw="CB_Throw")
    return {k: node_mat(n) for k, n in names.items()}


def update_materials(scene):
    P = scene.calabasas_bed
    mats = get_mats(scene)
    if P.wood == "CUSTOM":
        c = Vector(P.wood_color)
        dark, light = tuple(c * 0.65), tuple(c * 1.25)
    else:
        dark, light = WOODS[P.wood]
    mat_wood(mats["wood"], dark, light)
    mat_fabric(mats["fabric"], tuple(P.fabric_color), 900, 0.6, 0.45)
    mat_rope(mats["rope"], tuple(P.rope_color))
    mat_fabric(mats["sheet"], (0.62, 0.61, 0.59), 1500, 0.3, 0.1)
    bc = tuple(P.bedding_color)
    mat_fabric(mats["cover"], bc, 700, 0.4, 0.25)
    mat_fabric(mats["pillow"], tuple(min(1, x * 1.35) for x in bc), 700, 0.4, 0.2)
    mat_fabric(mats["cushion"], (0.55, 0.50, 0.43), 500, 0.3, 0.6)
    mat_fabric(mats["throw"], (0.10, 0.095, 0.09), 220, 0.5, 0.9)
    for m, col in ((mats["wood"], dark), (mats["fabric"], P.fabric_color),
                   (mats["rope"], P.rope_color)):
        m.diffuse_color = (*col, 1)
    return mats


# --------------------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------------------
def build(scene):
    P = scene.calabasas_bed
    u = unit_mm(scene)
    c = get_coll(scene)
    keep = {o.name: (o.location.copy(), o.rotation_euler.copy())
            for o in c.objects if o.parent is None and o.name == "CB_Calabasas_Bed"}
    clear_coll(c)
    mats = update_materials(scene)
    seg = P.smooth
    objs = [build_frame(c, P, u, mats), build_headboard(c, P, u, mats)]
    objs += build_wood(c, P, u, mats, seg)
    if P.bedding:
        objs += build_bedding(c, P, u, mats)
    root = bpy.data.objects.new("CB_Calabasas_Bed", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.3 * 0.001 / u if u else 0.3
    c.objects.link(root)
    if "CB_Calabasas_Bed" in keep:
        root.location, root.rotation_euler = keep["CB_Calabasas_Bed"]
    else:
        root.location = scene.get("cb_root_loc", (0, 0, 0))
    for o in objs:
        o.parent = root
    return root


def bed_dims(scene):
    P = scene.calabasas_bed
    w = max(P.toprail_l, P.frame_w + 2 * P.post_d)
    l = P.frame_l + P.post_d / 2
    h = P.post_h + P.toprail_d / 2
    return w, l, h


# --------------------------------------------------------------------------------------
# Operator & NPanel
# --------------------------------------------------------------------------------------
class CB_OT_build(bpy.types.Operator):
    bl_idname = "calabasas_bed.build"
    bl_label = "Bangun Ulang Ranjang"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        build(context.scene)
        self.report({"INFO"}, "Calabasas Bed dibangun ulang")
        return {"FINISHED"}


class CB_OT_reset(bpy.types.Operator):
    bl_idname = "calabasas_bed.reset"
    bl_label = "Reset ke Ukuran DWG"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        P = context.scene.calabasas_bed
        P.lock = True
        for k, v in DWG.items():
            setattr(P, k, v)
        P.lock = False
        build(context.scene)
        return {"FINISHED"}


class CB_OT_select(bpy.types.Operator):
    bl_idname = "calabasas_bed.select"
    bl_label = "Pilih Ranjang"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        root = bpy.data.objects.get("CB_Calabasas_Bed")
        if not root:
            return {"CANCELLED"}
        for o in context.selected_objects:
            o.select_set(False)
        root.select_set(True)
        context.view_layer.objects.active = root
        return {"FINISHED"}


class CB_OT_camera(bpy.types.Operator):
    """Arahkan kamera aktif ke ranjang (tampak 3/4 seperti foto katalog)"""
    bl_idname = "calabasas_bed.camera"
    bl_label = "Arahkan Kamera"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        sc = context.scene
        cam = sc.camera
        if cam is None:
            self.report({"WARNING"}, "Scene belum punya kamera")
            return {"CANCELLED"}
        root = bpy.data.objects.get("CB_Calabasas_Bed")
        base = root.matrix_world.translation if root else Vector()
        u = unit_mm(sc)
        w, l, h = bed_dims(sc)
        target = base + Vector((0, 0, h * 0.42 * u))
        az, el = math.radians(-35), math.radians(17)
        d = Vector((math.sin(az), -math.cos(az), 0)) * math.cos(el) + Vector((0, 0, math.sin(el)))
        rad = 0.5 * math.sqrt(w * w + l * l + h * h) * u
        fov = cam.data.angle if cam.data.type == "PERSP" else math.radians(40)
        dist = rad / math.sin(fov / 2) * 0.92
        cam.location = target + d * dist
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        if cam.data.type == "ORTHO":
            cam.data.ortho_scale = rad * 2.1
        return {"FINISHED"}


class CB_PT_panel(bpy.types.Panel):
    bl_label = "Calabasas Bed"
    bl_idname = "CB_PT_calabasas_bed"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "TALA"

    def draw(self, context):
        P = context.scene.calabasas_bed
        lay = self.layout
        w, l, h = bed_dims(context.scene)
        box = lay.box()
        box.label(text="Ukuran total: %d x %d x %d mm" % (round(w), round(l), round(h)),
                  icon="FULLSCREEN_ENTER")
        box.label(text="Sumber: calabasus_bed_rev_1.dwg", icon="FILE_3D")
        row = lay.row(align=True)
        row.operator("calabasas_bed.build", icon="FILE_REFRESH")
        row.operator("calabasas_bed.reset", text="Reset DWG", icon="LOOP_BACK")
        row = lay.row(align=True)
        row.operator("calabasas_bed.select", icon="RESTRICT_SELECT_OFF")
        row.operator("calabasas_bed.camera", icon="CAMERA_DATA")


class CB_PT_dims(bpy.types.Panel):
    bl_label = "Ukuran (mm)"
    bl_parent_id = "CB_PT_calabasas_bed"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "TALA"

    def draw(self, context):
        P = context.scene.calabasas_bed
        lay = self.layout
        lay.use_property_split = True
        lay.use_property_decorate = False
        for title, keys in (
                ("Rangka", ("frame_w", "frame_l", "rail_t", "rail_h", "rail_z")),
                ("Headboard", ("hb_h", "hb_z", "hb_t")),
                ("Tiang & Top Rail", ("post_d", "post_h", "toprail_d", "toprail_l")),
                ("Tali", ("wrap_l", "cord_d")),
                ("Kaki Depan", ("leg_d", "leg_h", "leg_inset"))):
            col = lay.column(align=True)
            col.label(text=title)
            for k in keys:
                col.prop(P, k)


class CB_PT_mats(bpy.types.Panel):
    bl_label = "Material"
    bl_parent_id = "CB_PT_calabasas_bed"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "TALA"

    def draw(self, context):
        P = context.scene.calabasas_bed
        lay = self.layout
        lay.use_property_split = True
        lay.use_property_decorate = False
        lay.prop(P, "wood")
        if P.wood == "CUSTOM":
            lay.prop(P, "wood_color")
        lay.prop(P, "fabric_color")
        lay.prop(P, "rope_color")
        lay.separator()
        lay.prop(P, "bedding")
        if P.bedding:
            lay.prop(P, "bedding_color")
        lay.prop(P, "smooth")


CLASSES = (CB_Props, CB_OT_build, CB_OT_reset, CB_OT_select, CB_OT_camera,
           CB_PT_panel, CB_PT_dims, CB_PT_mats)


def register():
    for c in CLASSES:
        try:
            bpy.utils.unregister_class(getattr(bpy.types, c.__name__))
        except Exception:
            pass
        bpy.utils.register_class(c)
    bpy.types.Scene.calabasas_bed = bpy.props.PointerProperty(type=CB_Props)


def unregister():
    del bpy.types.Scene.calabasas_bed
    for c in reversed(CLASSES):
        bpy.utils.unregister_class(c)


def embed_self():
    """simpan skrip ini di dalam .blend (Text, Register=on) agar NPanel muncul lagi
    setiap file dibuka (perlu 'Auto Run Python Scripts' aktif / Allow Execution)."""
    path = globals().get("__file__")
    try:
        src = open(path, encoding="utf-8").read()
    except Exception:
        return
    t = bpy.data.texts.get(TEXT_NAME) or bpy.data.texts.new(TEXT_NAME)
    t.clear()
    t.write(src)
    t.use_module = True


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    register()
    sc = bpy.context.scene
    if "--build" in argv or "--save" in argv or bpy.data.objects.get("CB_Calabasas_Bed") is None:
        build(sc)
    embed_self()
    if "--camera" in argv:
        with bpy.context.temp_override(scene=sc):
            bpy.ops.calabasas_bed.camera()
    if "--save" in argv:
        bpy.ops.wm.save_mainfile()
        print("CALABASAS BED: tersimpan ->", bpy.data.filepath)


if __name__ == "__main__":
    main()
elif __name__ == TEXT_NAME[:-3] or __name__ == TEXT_NAME:
    # dijalankan sebagai Text module (Register) saat .blend dibuka
    register()
