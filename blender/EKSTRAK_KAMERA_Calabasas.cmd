@echo off
rem EKSTRAK_KAMERA_Calabasas.cmd
rem Mengambil semua angle kamera dari setiap 03_PROYEK\Calabasas*.blend (posisi, rotasi,
rem lens, fokus, azimuth/elevasi terhadap produk, angle terkunci) ke folder KAMERA_Calabasas.
rem File .blend hanya dibaca, tidak diubah. Letakkan file ini di folder Studio_Furniture.
setlocal
set "ROOT=%~dp0"
set "BLENDER=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
set "OUT=%ROOT%KAMERA_Calabasas"
set "SKRIP=%TEMP%\ekstrak_kamera_calabasas.py"

if not exist "%BLENDER%" (echo Blender tidak ditemukan: "%BLENDER%" & pause & exit /b 1)
if not exist "%OUT%" mkdir "%OUT%"
if exist "%OUT%\KAMERA_Calabasas.csv" del "%OUT%\KAMERA_Calabasas.csv"
for /f "delims=:" %%n in ('findstr /n /b /c:"#PYTHON_BEGIN" "%~f0"') do set "SKIP=%%n"
more +%SKIP% "%~f0" > "%SKRIP%"

set "N=0"
for %%f in ("%ROOT%03_PROYEK\Calabasas*.blend") do (
    echo Membaca %%~nxf ...
    "%BLENDER%" -b "%%~ff" --factory-startup --python "%SKRIP%" -- "%OUT%" 2>&1 | findstr /c:"[kamera]" /c:"Error"
    set /a N+=1
)
if "%N%"=="0" (echo Tidak ada file Calabasas*.blend di 03_PROYEK. & pause & exit /b 1)

echo.
echo Selesai. Hasil ada di: "%OUT%"
echo  - KAMERA_Calabasas.csv  : ringkasan semua kamera (buka dengan Excel)
echo  - ^<nama file^>_kamera.json : detail lengkap per file
start "" explorer.exe "%OUT%"
pause
exit /b 0

#PYTHON_BEGIN
# Ekstrak semua kamera dari file .blend yang sedang dibuka (mode -b).
# Argumen setelah "--": <folder_output>
import bpy, sys, os, json, csv, math
from mathutils import Vector

out_dir = sys.argv[sys.argv.index("--") + 1]
os.makedirs(out_dir, exist_ok=True)
blend = bpy.data.filepath
name = os.path.splitext(os.path.basename(blend))[0]
scene = bpy.context.scene


def plain(v):
    """Ubah IDProperty / mathutils ke tipe JSON biasa."""
    if hasattr(v, "to_dict"):
        return {k: plain(x) for k, x in v.to_dict().items()}
    if hasattr(v, "to_list"):
        return [plain(x) for x in v.to_list()]
    if isinstance(v, dict):
        return {k: plain(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [plain(x) for x in v]
    if isinstance(v, (int, float, str, bool)) or v is None:
        return v
    try:
        return [plain(x) for x in v]
    except TypeError:
        return str(v)


def props(idblock):
    return {k: plain(idblock[k]) for k in idblock.keys() if k != "_RNA_UI"}


def r(x, n=4):
    return round(float(x), n)


# Pusat produk aktif (untuk azimuth/elevasi/jarak relatif ke produk)
center = None
prod_name = ""
prod = None
try:
    prod = scene.ns_studio.product
except AttributeError:
    grp = scene.get("ns_studio")
    if grp is not None and "product" in grp.keys():
        prod = grp["product"]
if prod is None:
    for c in bpy.data.collections:
        if c.get("ns_product") and not c.hide_render:
            prod = c
            break
if prod is not None and hasattr(prod, "all_objects"):
    prod_name = prod.name
    pts = [o.matrix_world @ Vector(c) for o in prod.all_objects
           if o.type == "MESH" for c in o.bound_box]
    if pts:
        lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        center = (lo + hi) / 2

rows, cams = [], []
for o in sorted([o for o in bpy.data.objects if o.type == "CAMERA"], key=lambda o: o.name):
    cam = o.data
    mw = o.matrix_world
    loc = mw.to_translation()
    rot = mw.to_euler("XYZ")
    fwd = (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
    target = None
    for con in o.constraints:
        if getattr(con, "target", None) is not None:
            target = con.target.matrix_world.to_translation()
            break
    ref = target if target is not None else center
    az = el = dist = None
    if ref is not None:
        d = loc - ref
        dist = d.length
        az = math.degrees(math.atan2(d.x, -d.y))          # 0 = depan (-Y), + = ke kanan
        el = math.degrees(math.asin(d.z / dist)) if dist > 0 else 0.0
    info = {
        "file": name,
        "kamera": o.name,
        "shot": str(o.get("ns_shot", "")),
        "aktif_di_scene": scene.camera == o,
        "lokasi_m": [r(v) for v in loc],
        "rotasi_deg": [r(math.degrees(v), 3) for v in rot],
        "arah_pandang": [r(v) for v in fwd],
        "lens_mm": r(cam.lens, 3),
        "tipe": cam.type,
        "ortho_scale": r(cam.ortho_scale),
        "sensor_mm": r(cam.sensor_width, 3),
        "sensor_fit": cam.sensor_fit,
        "shift_xy": [r(cam.shift_x), r(cam.shift_y)],
        "clip_m": [r(cam.clip_start), r(cam.clip_end, 2)],
        "dof": cam.dof.use_dof,
        "fokus_m": r(cam.dof.focus_distance),
        "f_stop": r(cam.dof.aperture_fstop, 3),
        "target_constraint": [r(v) for v in target] if target is not None else None,
        "azimuth_deg": r(az, 2) if az is not None else None,
        "elevasi_deg": r(el, 2) if el is not None else None,
        "jarak_m": r(dist) if dist is not None else None,
        "parent": o.parent.name if o.parent else None,
        "custom_props_objek": props(o),
        "custom_props_kamera": props(cam),
    }
    cams.append(info)
    rows.append([name, o.name, info["shot"], int(info["aktif_di_scene"]),
                 *info["lokasi_m"], *info["rotasi_deg"], info["lens_mm"],
                 info["sensor_mm"], *info["shift_xy"], info["fokus_m"], info["f_stop"],
                 info["azimuth_deg"], info["elevasi_deg"], info["jarak_m"]])

data = {
    "file": blend,
    "scene": scene.name,
    "produk_aktif": prod_name,
    "pusat_produk_m": [r(v) for v in center] if center is not None else None,
    "resolusi": [scene.render.resolution_x, scene.render.resolution_y,
                 scene.render.resolution_percentage],
    "kamera_aktif": scene.camera.name if scene.camera else None,
    "pengaturan_studio_scene": props(scene),   # termasuk ns_studio (shot, angle terkunci, dsb.)
    "kamera": cams,
}
with open(os.path.join(out_dir, name + "_kamera.json"), "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

csv_path = os.path.join(out_dir, "KAMERA_Calabasas.csv")
new = not os.path.exists(csv_path)
with open(csv_path, "a", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f, delimiter=";")
    if new:
        w.writerow(["file", "kamera", "shot", "aktif", "loc_x", "loc_y", "loc_z",
                    "rot_x", "rot_y", "rot_z", "lens_mm", "sensor_mm", "shift_x", "shift_y",
                    "fokus_m", "f_stop", "azimuth_deg", "elevasi_deg", "jarak_m"])
    w.writerows(rows)
print(f"[kamera] {name}: {len(cams)} kamera, produk '{prod_name}'")
