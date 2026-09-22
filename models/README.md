# Modeller

Platform marka başına tek bir GLB dosyası bekler. Dosya adı **marka kimliğiyle** aynı olmalıdır
(`models/<marka-id>.glb`). Sahnedeki araçlar, `src/data/brands.js` içindeki künyeyle
**aynı gerçek otomobillerdir**; panel bilgileri buna göre yazılır.

| Marka | Dosya | Araç | Ham kaynak | Durum |
|---|---|---|---|---|
| Mercedes-Benz | `models/mercedes.glb` | C 300 — W206 (2021) | `mercedes.glb` | ✅ hazır |
| BMW | `models/bmw.glb` | M5 Competition — F90 (2018) | `bmw_m5__the_carbon_storm.glb` | ✅ hazır |
| Audi | `models/audi.glb` | TT RS iconic edition (2023) | `2023_audi_tt_rs_iconic_edition.glb` | ✅ hazır |
| Porsche | `models/porsche.glb` | 911 GT3 R — 992 (2023) | `2024_porsche_992_gt3_r.glb` | ✅ hazır |
| Volkswagen | `models/vw.glb` | Golf R Black Edition — Mk8.5 (2025) | `2025_volkswagen_golf_r_black_edition.glb` | ✅ hazır |
| Maybach | `models/maybach.glb` | Maybach S 680 — Z223 (2021) | `2021_mercedes-benz_s-class_maybach.glb` | ✅ hazır |
| Mercedes-Benz | `models/mercedes-light.glb` | aynı araç, hafif sürüm | — | ✅ hazır |

Her markanın `<marka>-light.glb` sürümü düşük donanımlı cihazlar için ayrıca durur.

Dosya yoksa sahne boş kalmaz: marka renginde **konsept maket** gösterilir ve künyede
"○ KONSEPT MAKET" yazar. Alternatif yollar `src/data/brands.js` içindeki `files` dizisinde
tanımlıdır (ilk kaynak her zaman `models/` altındaki optimize sürümdür, sonrasında kökteki
ham dosya adı denenir).

## Yeni model eklerken

1. GLB'yi `models/` klasörüne kopyala, adını yukarıdaki tabloya göre ver.
2. `tools/optimize-models.md` içindeki komutla küçült (ör. 17 MB → ~1,8 MB).
3. Ön yön otomatik bulunur: farların (lowbeam/highbeam/drl) konumuna bakılır. Modelde far
   materyali yoksa ışık düğümü adlarına, sonra kırmızı stop lambalarının konumuna bakılır.
4. Kaput/kapı açılması desteklenmez (gövde tek parça). Jant dönüşü için tekerlekler
   **ayrı düğüm** olmalı ve adında `wheel` geçmelidir.
5. Jant düğümünün orijini tekerleğin merkezinde değilse (`Sketchfab/FBX` ihracı) platform
   kendi pivotunu kurar — `src/scene/wheels.js`. Bu yüzden `--flatten`/`--join` bayraklarını
   **kullanmayın**, yoksa tekerlek düğümleri kaybolur.
6. İçerik (`src/data/brands.js`) yeni modelle güncellenmeli: `model`, `generation`
   (nesil/kasa + yıl), `segment`, `hq`, `founded`, `stats` ve kategori kartları.

## Yerel çalıştırma

`file://` ile açılırsa tarayıcı GLB yükleyemez (CORS). Klasörde küçük bir sunucu açın:

```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000/
```

Kullanışlı adres parametreleri:

- `?debug=1` → FPS ve kalite kademesi göstergesi
- `?perf=2` → kalite kademesini sabitle (0 tam, 1 dengeli, 2 hafif)
- `?norefl=1` → zemin yansımasını kapat
- `?brand=audi` → doğrudan bir markayla başla

## Dosya boyutu notu

`models/*.glb` ve kökteki ham GLB'ler **repoya girmez** (`.gitignore`). Projeyi başka bir
bilgisayara taşırken modelleri elle kopyalamanız gerekir. `models/<marka>-light.glb` çok zayıf
cihazlar için daha agresif sadeleştirilmiş yedek sürümlerdir.

## Teşhis araçları

```bash
node tools/analyze-wheels.mjs models/vw.glb     # tekerlek adayları ve ölçüleri
node tools/tmp/spin-report.mjs                  # her jant yerinde mi dönüyor?
node tools/tmp/wheel-report.mjs                 # marka başına bulunan jant ve ışık grupları
node tools/tmp/mat-report.mjs models/audi.glb   # materyal sınıfları ve lamba tespiti
```
