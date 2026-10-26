# Tallboy – New Proportion (model 3D dari DWG)

Model Blender ini dibangun langsung dari geometri solid 3D (ACIS) di dalam
`source/tallboy_new_porportion_1.dwg`. Model tidak digambar ulang secara manual:
semua ukuran, alur fluted, ceruk handle, dan sudut radius diambil dari B-rep di DWG.

- `tallboy_new_proportion.blend`: scene lengkap (model, material, lampu studio, 4 kamera)
- `renders/`: hasil render (Cycles)
- `scripts/`: pipeline DWG → Blender (bisa dijalankan ulang)
- `textures/`: taruh file Poly Haven *Silver Oak Veneer 01* di sini (lihat bawah)

## Ukuran (mm, dari DWG)

Ukuran keseluruhan: **494 (L) × 450 (D) × 1059 (T)**

| Part | Ukuran L × D × T | Catatan |
|---|---|---|
| Top | 494 × 450 × 20 | 2 sudut depan radius R50, menyatu dengan tiang |
| Tiang depan kiri/kanan (2) | 50 × 50 × 1000 | profil quarter-round R50 |
| Panel samping kiri/kanan (2) | 25 × 400 × 1000 | di belakang tiang (Y 50 → 450) |
| Panel bawah | 444 × 441 × 20 | 9 mm lebih pendek dari kedalaman total di belakang |
| Plinth | 460 × 430 × 40 | mundur 20 mm dari depan & samping, rata belakang, 2 sudut depan R50 |
| Front laci (5) | 394 × 22 × 196 | 33 alur fluted R5, jarak 12 mm (alur 10 mm + flat 2 mm), ceruk handle di tengah atas |
| Handle (5) | 182.5 × 10 × 10 | bar 172.5 mm lurus + ujung setengah lingkaran R5, duduk di ceruk |

Posisi vertikal: plinth 0–40 · panel bawah / samping / tiang mulai 38.9 · panel bawah 38.9–58.9 ·
laci 58.9–1038.9 (5 × 196, tanpa celah) · top 1038.9–1058.9.

## Catatan dari pembacaan DWG

- Persegi 500 × 1000 (polyline) dan 6 garis array (block `*U8`) di DWG adalah garis bantu, tidak dirender.
- **Tidak ada panel belakang** dan **tidak ada badan laci** (hanya front) di DWG. Panel bawah berhenti
  9 mm sebelum belakang, jadi kemungkinan disiapkan untuk back panel 9 mm.
- **Handle menabrak part di atasnya ~2 mm**: puncak handle 2 mm di atas tepi atas front laci
  (Z 1040.9 vs 1038.9), jadi masuk ke top / laci di atasnya pada kedalaman Y 11.9–21.9.
- **Plinth overlap ±1.1 mm** dengan panel bawah, samping, dan tiang (plinth tingginya 40 tapi badan mulai di Z 38.9),
  sehingga tinggi total 1058.9 mm, bukan 1060 mm.
- Unit DWG tercatat "inches" (INSUNITS=1), tapi semua angka jelas dalam mm; model diperlakukan sebagai mm.

## Material

Material `Silver_Oak_Veneer_01` otomatis memakai tekstur asli Poly Haven bila file berikut ada
di `textures/` (resolusi 2k):

```
silver_oak_veneer_01_diff_2k.jpg
silver_oak_veneer_01_rough_2k.jpg
silver_oak_veneer_01_nor_gl_2k.jpg
```

Bila tidak ada, dipakai shader prosedural yang meniru veneer oak terang keperakan.
Render saat ini **masih memakai versi prosedural**, karena polyhaven.com diblokir di environment build.
UV sudah diproyeksikan dalam meter dengan arah serat: vertikal untuk tiang, samping, dan front laci;
horizontal (sepanjang lebar) untuk top, panel bawah, plinth, dan handle.

## Build ulang

```bash
python3 scripts/dwgsections.py source/tallboy_new_porportion_1.dwg /tmp/sections
DENOISE=1 blender -b --python scripts/build_tallboy.py -- /tmp/sections . 256 100
```

`dwgsections.py` mendekompresi section DWG R2004+ (termasuk `AcDsPrototype_1b` yang menyimpan data
SAB/ACIS). `sab.py` mem-parsing SAB, lalu `brep.py` men-tessellate face plane, silinder, dan kurva
(garis, busur, spline NURBS) menjadi mesh yang watertight.
