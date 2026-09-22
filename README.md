# Alman Otomotiv Stüdyosu

Alman otomotiv markaları için sade, sinematik bir 3B sunum platformu. Ortada araba döner,
sağdaki kategori çipleri (Konu / Tasarım / Far / Jant / Motor / İç Mekân) soldaki bilgi
kartlarını ve kamera odağını değiştirir, alttaki şeritten markalar arasında geçilir.

- **three.js r160 yerel** (`vendor/`) — internet gerekmez, CDN yok, WebGL1'e düşebilir.
- **Build adımı yok**: düz ES modülleri + iki CSS dosyası.
- **Eski akıllı tahta için tasarlandı**: gölge haritası yok, `backdrop-filter` yok,
  pixelRatio sınırlı, FPS düşerse kalite kademesi otomatik iner.
- **Her markanın gerçek modeli vardır**: C 300 (W206), M5 Competition (F90),
  TT RS iconic edition, 911 GT3 R (992), Golf R Black Edition (Mk8.5),
  Maybach S 680 (Z223). En ağırı `models/mercedes.glb` (1,03M üçgen). Kalite
  kademesi önce çözünürlüğü/aynayı kısar; cihaz yine zorlanıp en hafif kademeye
  düşerse aynı markanın hafif sürümü (ör. 198k üçgen) kendiliğinden yüklenir.

## Çalıştırma

```bash
python3 -m http.server 8000      # veya: npm run serve
# tarayıcıda: http://localhost:8000/
```

`file://` ile açmayın: tarayıcı `.glb` dosyasını CORS yüzünden yükleyemez.

## Kontroller

| Tuş / hareket | İşlev |
|---|---|
| `←` `→`, `Boşluk`, `PageUp/Down` | Marka değiştir |
| Dokunmatikte sağa/sola kaydırma | Marka değiştir |
| `1`…`6` | Doğrudan markaya git |
| `L` | Farlar (kısa/uzun sırayla) |
| `S` | Stop lambaları |
| `B` | Sinyal (sol → sağ → dörtlü → kapalı) |
| `R` | Otomatik dönüşü duraklat/sürdür |
| `F` | Tam ekran |
| `D` | Hata ayıklama katmanı (FPS + kalite kademesi) |
| Fare/dokunma sürükleme | Arabayı döndür; 2,4 sn sonra dönüş kendi kendine sürer |

Adres parametreleri: `?debug=1`, `?perf=0|1|2`, `?norefl=1`, `?light=1`, `?brand=bmw`.

Sahnenin ölçüsü tek dosyadan ayarlanır: `src/config.js` (kamera mesafesi
`camera.frameMargin`, podyum ölçüleri, kalite kademeleri, ağır model eşiği).

## Mimari

```
index.html            iskelet
styles/base.css       tokenlar, tipografi, bileşenler
styles/layout.css     yerleşim + akıllı tahta ölçekleri
src/config.js         tüm sabitler (kamera, sahne, kalite kademeleri)
src/data/brands.js    %100 içerik: marka, istatistik, kategoriler, kartlar
src/scene/environment.js  ACES tonlama + prosedürel stüdyo ortamı (PMREM)
src/scene/stage.js        podyum, zemin, duvar, isim şeridi, filigran, ışıklar
src/scene/reflection.js   podyum üstü ayna (küçük RT, kapatılabilir)
src/scene/car.js          GLB yükleme, ölçek/merkez, parça ve materyal sınıfları
src/scene/concept.js      model yoksa marka renginde konsept maket
src/scene/focus.js        kategori → kamera odakları + yumuşak geçiş
src/scene/wheels.js       jant dönüşü (geometri merkezine kurulan pivot) + turntable
src/scene/effects.js      far / stop / sinyal kontrolcüsü
src/perf/monitor.js       FPS ölçümü, otomatik kalite kademesi
src/ui/brandPanel.js      marka künyesi: arma, nesil/gövde/merkez çipleri, 4 teknik satır
src/ui/featureCards.js    kategori rafı + kategori kartları
src/ui/*                  kabuk, yükleme ekranı, sözlük, armalar, kılavuz çizgileri
vendor/three/**           three.js r160 + GLTFLoader, OrbitControls, Reflector, meshopt
models/*.glb              marka başına bir model (bkz. models/README.md)
legacy/                   eski tek dosyalık sürüm (referans)
```

İçerik eklemek için kod değil, **veri** düzenlenir: `src/data/brands.js`.

### Künye alanları (bilgi paneli)

Sol üstteki plaka tamamen bu alanlardan beslenir; kodda markaya özel tek satır yoktur:

| Alan | Panelde | Örnek |
|---|---|---|
| `name` / `short` | marka adı | MERCEDES-BENZ |
| `model` | araç adı (duvar künyesinde de) | C-Serisi C 300 |
| `generation` | nesil/kasa + çıkış yılı çipi | W206 · 2021 |
| `segment` | gövde sınıfı çipi | Sedan |
| `hq` | merkez şehir çipi | Stuttgart |
| `country` + `iso` | kimlik çipi | Almanya · DE · 1926 |
| `founded` | kuruluş yılı (kimlik çipinde) | 1926 |
| `stats` | 2×2 teknik satır (değer + etiket) | 258 PS / 2.0 TURBO + 48 V |
| `cards` | kategori başına 3 kart | bkz. dosya |
| `emblem` | arma çizimi | `src/ui/emblems.js` |

Her markanın 6 kategoride **en az 3** kartı olmalıdır; `npm run check` ve
`node tools/test-core.mjs` bunu denetler.

## Doğrulama

```bash
npm run check                 # modül sözdizimi + import yolları + içerik kapsaması
node tools/test-core.mjs      # 70 birim testi: ölçek/yön/jant/kamera/kalite
```

Model optimizasyonu ve doğrulaması: `tools/optimize-models.md`.

## Bilinen sınırlar

- Gövde tek parça olduğu için kapı/kaput açma animasyonu yok; "Tasarım" kategorisi
  kamera odağı + bilgi kartı olarak çalışır.
- Jant dönüşü, düğüm değil geometri merkezine kurulan bir **pivot** üzerinden yapılır
  (`src/scene/wheels.js`). Düğümün kendi orijini etrafında döndürmek jantı savurur:
  Porsche 992 GT3 R ve Golf R modellerinde tekerlek düğümlerinin orijini arabanın
  ortasındadır. `node tools/test-core.mjs` bu davranışı korur.
- Audi TT RS modelinde bütün lambalar **tek bir lens materyalinde** toplanmış ve bu
  materyal gövde boyunca uzandığı için far/stop grubuna yazılmaz; "Far" düğmesi bu
  modelde lens yerine huzme/hale ve ön kamera ile anlatılır.
- Modeller `.gitignore`'da: depoyu klonlayan başka bir makinede model dosyalarını elle
  kopyalamak gerekir (`models/README.md`).
