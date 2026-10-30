@echo off
rem BUKA_Calabasas_Armchair.cmd  (satu file, tidak butuh file lain)
rem Membuka sesi Calabasas Armchair (single sofa 850 mm) di Blender 5.2 dengan panel N Nakas Studio.
rem Klik pertama: file armchair dibuat otomatis dari 03_PROYEK\Calabasas_Sofa_Plester.blend (~1 menit).
rem Klik berikutnya: langsung buka. Letakkan file ini di folder Studio_Furniture.
setlocal
set "ROOT=%~dp0"
set "BLENDER=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
set "SOFA=%ROOT%03_PROYEK\Calabasas_Sofa_Plester.blend"
set "SESI=%ROOT%03_PROYEK\Calabasas_Armchair_Plester.blend"
set "PANEL=%ROOT%99_SISTEM\lanjutkan_sesi.py"
set "SKRIP=%TEMP%\calabasas_armchair.py"

if exist "%SESI%" goto buka

echo File armchair belum ada. Membuat dari sesi sofa, tunggu sekitar 1 menit...
if not exist "%SOFA%" (echo File sofa tidak ditemukan: "%SOFA%" & pause & exit /b 1)
rem Tulis skrip Python yang ada di bagian bawah file ini ke folder TEMP
for /f "delims=:" %%n in ('findstr /n /b /c:"#PYTHON_BEGIN" "%~f0"') do set "SKIP=%%n"
more +%SKIP% "%~f0" > "%SKRIP%"
"%BLENDER%" -b "%SOFA%" --python "%SKRIP%"
if not exist "%SESI%" (echo. & echo File armchair tidak terbentuk. Baca pesan [armchair] di atas. & pause & exit /b 1)
echo Selesai: "%SESI%"

:buka
start "" "%BLENDER%" "%SESI%" --window-maximized --python "%PANEL%"
exit /b 0

#PYTHON_BEGIN
# calabasas_armchair.py
# Membuat sesi Calabasas ARMCHAIR (single sofa, panjang 850 mm) dari sesi
# Calabasas_Sofa_Plester.blend yang sudah ada, lalu menyimpannya sebagai file baru
# di 03_PROYEK. File sofa asli tidak diubah.
#
# Dijalankan oleh SETUP_Calabasas_Armchair.cmd (pilihan 1), atau manual:
#   "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b ^
#     "C:\PROJECT\tala-render-studio\Studio_Furniture\03_PROYEK\Calabasas_Sofa_Plester.blend" ^
#     --python calabasas_armchair.py
# Bisa juga di-paste ke tab Scripting saat sesi sofa sedang terbuka (Alt+P).
#
# Cara kerja: bagian tengah sofa dikompres ke arah pusat, sedangkan MARGIN_END meter
# di tiap ujung (lengan + radius sudut) dipertahankan apa adanya. Lengan tidak gepeng
# seperti kalau sekadar di-scale. Setelah itu produk diletakkan ulang di tengah lantai
# dan semua kamera di-framing ulang lewat addon Nakas Studio.

import bpy
import os
import sys
import importlib.util
from pathlib import Path
from mathutils import Vector

# ---------------------------------------------------------------- PENGATURAN
TARGET_LENGTH_MM = 850                           # panjang total armchair
MARGIN_END_M     = 0.25                          # ujung per sisi yang TIDAK diubah (meter)
NEW_FILE_NAME    = "Calabasas_Armchair_Plester.blend"
NEW_LABEL        = "Calabasas_Armchair"          # nama produk di panel Nakas Studio
PRODUCT_HINTS    = {"body", "seat_deck", "seat_cushion", "plinth_top", "plinth_bottom"}
# ---------------------------------------------------------------------------

target = TARGET_LENGTH_MM / 1000.0
GEO = {"MESH", "CURVE", "SURFACE", "FONT", "META"}


def log(msg):
    print("[armchair] " + msg)


def load_addon():
    """Muat 99_SISTEM/nakas_studio_tools.py (dipakai untuk center + framing kamera)."""
    ns = sys.modules.get("nakas_studio_tools")
    if ns is not None and hasattr(bpy.types.Scene, "ns_studio"):
        return ns
    blend = Path(bpy.data.filepath)
    for base in [blend.parents[1], blend.parent, *blend.parents]:
        cand = base / "99_SISTEM" / "nakas_studio_tools.py"
        if cand.exists():
            spec = importlib.util.spec_from_file_location("nakas_studio_tools", cand)
            ns = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = ns
            spec.loader.exec_module(ns)
            if not hasattr(bpy.types.Scene, "ns_studio"):
                ns.register()
            log(f"addon dimuat dari {cand}")
            return ns
    log("PERHATIAN: nakas_studio_tools.py tidak ditemukan; center/framing dilewati.")
    return None


def find_product_collection(scene):
    try:
        col = scene.ns_studio.product
        if col:
            return col
    except AttributeError:
        pass
    for col in bpy.data.collections:
        if col.get("ns_product") and "sofa" in col.name.lower():
            return col
    best, best_hits = None, 0
    for col in bpy.data.collections:
        names = {o.name.lower() for o in col.objects}
        hits = len([h for h in PRODUCT_HINTS if any(n.startswith(h) for n in names)])
        if hits > best_hits:
            best, best_hits = col, hits
    return best


def world_bbox(objs):
    pts = []
    for o in objs:
        pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def shrink_object(o, axis, center, half_band, scale_band, shift):
    me = o.data
    mw, inv = o.matrix_world.copy(), o.matrix_world.inverted()

    def remap(co_local):
        w = mw @ co_local
        d = w[axis] - center
        if d > half_band:
            w[axis] -= shift
        elif d < -half_band:
            w[axis] += shift
        else:
            w[axis] = center + d * scale_band
        return inv @ w

    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            for p in kb.data:
                p.co = remap(p.co)
    else:
        for v in me.vertices:
            v.co = remap(v.co)
    me.update()


def main():
    scene = bpy.context.scene
    ns = load_addon()
    col = find_product_collection(scene)
    if col is None:
        raise RuntimeError("Koleksi produk sofa tidak ditemukan.")
    meshes = [o for o in col.all_objects if o.type == "MESH"]
    others = [o for o in col.all_objects if o.type in GEO - {"MESH"}]
    if not meshes:
        raise RuntimeError(f"Koleksi {col.name} tidak berisi mesh.")
    log(f"koleksi produk : {col.name} ({len(meshes)} mesh)")
    if others:
        log("PERHATIAN: objek non-mesh tidak diubah: " + ", ".join(o.name for o in others))

    lo, hi = world_bbox(meshes)
    ext = hi - lo
    axis = 0 if ext.x >= ext.y else 1
    if axis != 0:
        log("PERHATIAN: sisi terpanjang ada di sumbu Y, bukan X seperti standar studio.")
    length = ext[axis]
    center = (lo[axis] + hi[axis]) / 2.0
    log(f"ukuran sekarang: {ext.x*1000:.0f} x {ext.y*1000:.0f} x {ext.z*1000:.0f} mm (P x L x T)")

    if length <= target + 0.001:
        raise RuntimeError("Produk sudah <= 850 mm, tidak perlu dipendekkan.")
    if 2 * MARGIN_END_M >= target:
        raise RuntimeError("MARGIN_END_M terlalu besar untuk target 850 mm.")

    delta = length - target
    shift = delta / 2.0
    half_band = length / 2.0 - MARGIN_END_M
    scale_band = (target - 2 * MARGIN_END_M) / (length - 2 * MARGIN_END_M)
    log(f"dipendekkan    : -{delta*1000:.0f} mm "
        f"(tengah x{scale_band:.3f}, ujung {MARGIN_END_M*1000:.0f} mm tetap)")

    seen = set()
    for o in meshes:
        if o.library or o.data.library:
            log(f"lewati (linked): {o.name}")
            continue
        for m in o.modifiers:
            if m.type == "ARRAY" and m.count > 1:
                log(f"PERHATIAN: {o.name} punya Array x{m.count}; di-set ke 1 (single cushion).")
                m.count = 1
        if o.data.name in seen:
            continue
        seen.add(o.data.name)
        shrink_object(o, axis, center, half_band, scale_band, shift)
    bpy.context.view_layer.update()

    lo2, hi2 = world_bbox(meshes)
    e2 = hi2 - lo2
    log(f"ukuran baru    : {e2.x*1000:.0f} x {e2.y*1000:.0f} x {e2.z*1000:.0f} mm")

    # Ganti nama koleksi, root, dan metadata produk
    old_label = col.name.replace("PROD | ", "")
    col.name = "PROD | " + NEW_LABEL if col.name.startswith("PROD | ") else NEW_LABEL
    for o in col.all_objects:
        if o.get("ns_product_root") or o.name.startswith("PRODUCT_ROOT | "):
            o.name = "PRODUCT_ROOT | " + NEW_LABEL
            if "dimensions_cm" in o.keys():
                try:
                    o["dimensions_cm"] = [round(e2.x * 100, 1), round(e2.y * 100, 1), round(e2.z * 100, 1)]
                except (TypeError, ValueError):
                    pass
    log(f"produk         : {old_label} -> {NEW_LABEL}")

    # Letakkan di tengah lantai dan framing ulang kamera lewat addon
    if ns is not None:
        try:
            scene.ns_studio.product = col
            ns.center_product(scene)
            ns.fit_cameras(scene)
            log("produk dipusatkan, framing semua kamera diperbarui")
        except Exception as exc:  # noqa: BLE001
            log(f"PERHATIAN: center/framing gagal: {exc}")

    src = bpy.data.filepath
    if not src:
        raise RuntimeError("File belum pernah disimpan; tidak tahu folder tujuan.")
    dst = os.path.join(os.path.dirname(src), NEW_FILE_NAME)
    bpy.ops.wm.save_as_mainfile(filepath=dst, copy=False)
    log(f"tersimpan      : {dst}")
    print("ARMCHAIR_OK")


main()
