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

## Yayın (internet üzerinden, kurulum gerektirmedir)

Sunum okul tahtasında yalnızca bir adresle açılabilir: **GitHub Pages**
statik site olarak yayınlanır (yayın dallı `main`, kök dizin).

- Adres: `https://kurfacode.github.io/alman-otomotiv-studyosu/`
- Yayınlanan içerik: `index.html` + `src/`, `styles/`, `vendor/`, `models/`,
  `media/intro.mp4`, `tools/` ve `.nojekyll`.
- Modeller (35 MB) ve sıkıştırılmış tanıtım filmi (28 MB) BİLİNÇLİ olarak
  repodadır; aksi hâlde yayında yalnızca konsept maketler görünürdü.
- Güncelleme: değişikliği `main` dalına push etmek yeterlidir, Pages
  birkaç dakika içinde kendini yeniler. (`git push`)
- 144 MB'lık ham video kaydı repoda durmaz (GitHub tek dosya sınırı 100 MB);
  `media/intro.mp4` sıkıştırılmış sürümdür.

Tanıtım filmini yeniden sıkıştırmak için:

```bash
npm i --no-save ffmpeg-static
node_modules/ffmpeg-static/ffmpeg -i ham-kayit.mp4 \
  -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 128k media/intro.mp4
```

## Çalıştırma (yerel)

```bash
npm run serve                    # önbelleksiz sunucu → http://localhost:8000/
npm run serve -- 8123            # port değiştirmek için
```

`file://` ile açmayın: tarayıcı `.glb` dosyasını CORS yüzünden yükleyemez.

**`python3 -m http.server` kullanmayın.** Önbellek başlığı göndermediği için tarayıcı
eski `.js` modüllerini ve `.glb` modellerini göstermeye devam eder: kodu ya da modeli
değiştirdiğiniz hâlde sahnede hiçbir şey değişmez ("Audi değişmedi" görüntüsünün
asıl nedeni buydu). `npm run serve` her yanıta `Cache-Control: no-store` koyar;
kaydet + yenile yeterlidir.

## Kontroller

| Tuş / hareket | İşlev |
|---|---|
| `←` `→`, `Boşluk`, `PageUp/Down` | Marka değiştir |
| Dokunmatikte sağa/sola kaydırma | Marka değiştir |
| `1`…`6` | Doğrudan markaya git |
| `L` | Farlar (kısa/uzun sırayla) |
| `S` | Stop lambaları |
| `B` | Sinyal (sol → sağ → dörtlü → kapalı) |
| `↑` `↓` | Konu okuyucusunda önceki/sonraki bölüm |
| Kart / bölüm satırı tıklaması | Sonraki bölüme geç / o bölüme atla |
| `R` | Otomatik dönüşü duraklat/sürdür |
| `F` | Tam ekran |
| `D` | Hata ayıklama katmanı (FPS + kalite kademesi) |
| Fare/dokunma sürükleme | Arabayı döndür; 2,4 sn sonra dönüş kendi kendine sürer |

### Giriş kapısı (intro)

İlk ekranda iki yol vardır:

| Düğme | Ne yapar |
|---|---|
| **İntro İzle** | `media/intro.mp4` oynar (30 sn); bitince sunum kaldığı yerden sürer. `I` tuşu da filmi açar. |
| **Sunumla Devam Et** | Filmi atlar, doğrudan sahneye geçer (`Enter` / `Boşluk` / `ESC`). |

**Garanti kuralı:** video dosyası yoksa, bozuksa ya da cihaz oynatamıyorsa kapı
kendiliğinden kapanır ve sahne **kendi sinematik turunu** oynatır (markalar ve
odaklar arasında geçen ~26 sn, `config.js` → `intro.tour`). Yani internet
olmayan tahtada da sunum introsuz kalmaz. Tur herhangi bir dokunuş/klavye
hareketiyle hemen durur.

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
src/ui/featureCards.js    kategori rafı + konu okuyucusu (tek kart + bölüm listesi)
tools/serve.mjs           önbelleksiz geliştirme sunucusu (npm run serve)
src/ui/*                  kabuk, yükleme ekranı, sözlük, armalar, kılavuz çizgileri
vendor/three/**           three.js r160 + GLTFLoader, OrbitControls, Reflector, meshopt
models/*.glb              marka başına bir model (bkz. models/README.md)
legacy/                   eski tek dosyalık sürüm (referans)
```

İçerik eklemek için kod değil, **veri** düzenlenir: `src/data/brands.js`.

### Konu okuyucusu (sol sütunun alt yarısı)

Üç bilgi kartının üçü birden yazılmaz — sütun boğulmasın diye tek kart gösterilir:

```
● KONU                            01 / 03      ← kategori + adım sayacı
▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░          ← ilerleme çizgisi
┌ 25 YILIN VEDASI                          › ┐
│ 1998'de çıkan TT, üç nesil boyunca …       │   ← aktif bölüm, tam genişlik
└───────────────────────────────────────┘
  01 25 YILIN VEDASI                        ← bölüm listesi: tıkla, atla
  02 DÖRT HALKANIN DOĞUŞU
  03 AUGUST HORCH
```

Kartın kendisi de bir sonraki bölüme geçirir (`↑`/`↓` klavyede çalışır). Bölüm
başlıklarının kırpılmadan okunabilmesi için liste dikeydir; yatay şeritte uzun
başlıklar "25 YILIN VED…" diye kesiliyordu. Kılavuz çizgisi artık tek karta
bağlandığı için ekranda da tek çizgi dolaşır.

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
| `cards` | kategori başına 3 bölüm (başlık + metin) | bkz. dosya |
| `emblem` | arma çizimi | `src/ui/emblems.js` |
| `files` | model adayları — **sırayla denenir, ilki kazanır** | `models/c300.glb` |

Her markanın 6 kategoride **en az 3** bölümü olmalıdır; `npm run check` ve
`node tools/test-core.mjs` bunu denetler.

`files` listesinin İLK satırı her zaman `models/<id>.glb` olmalıdır. Adaylar sırayla
denenir ve ilk başarılı dosya sahneye çıkar; kök dizindeki ham bir model öne geçerse
panel doğru modeli yazarken sahneye başka bir araç çıkar (Audi'de tam bu olmuştu).
Test bunu her marka için zorunlu tutar.

## Doğrulama

```bash
npm run check                 # modül sözdizimi + import yolları + içerik kapsaması
node tools/test-core.mjs      # 202 birim testi: ölçek/yön/jant/kamera/kalite/içerik
node tools/diagnose.mjs       # GERÇEK GLB'lerde sınıflandırma + jant dönüş ölçümü
```

`tools/diagnose.mjs` her model için "hangi parça hangi gruba düştü, jantlar yerinde
dönüyor mu" sorusunu ölçerek yanıtlar (kayma 0,000 m + tüm parçalar dönüyor olmalı).
Model optimizasyonu ve doğrulaması: `tools/optimize-models.md`.

## Bilinen sınırlar

- Gövde tek parça olduğu için kapı/kaput açma animasyonu yok; "Tasarım" kategorisi
  kamera odağı + bilgi kartı olarak çalışır.
- Jant dönüşü, düğüm değil geometri merkezine kurulan bir **pivot** üzerinden yapılır
  (`src/scene/wheels.js`). Düğümün kendi orijini etrafında döndürmek jantı savurur:
  Porsche 992 GT3 R ve Golf R modellerinde tekerlek düğümlerinin orijini arabanın
  ortasındadır. `node tools/test-core.mjs` bu davranışı korur.
- Audi TT RS modelinde bütün lambalar **tek bir lens materyalinde** toplanmıştır ve o
  materyal gövde boyunca uzanır. `src/scene/car.js` bu yüzeyi ön/arka diye geometriden
  ikiye böler (`splitFrontLens`), böylece "Far" ve "Stop" düğmeleri bu modelde de
  gerçekten çalışır.
- Materyal ve parça tanıma **isimden sözcük ayıklayarak** yapılır (`nameTokens`):
  "…23Paint_Material1" → boya, "RRim_FL_C7M19" → jant, "windows" → cam. Aynı
  materyal hem önde hem arkada kullanılıyorsa iki uç için kopyalanır, yoksa
  "Far"a basınca arka lamba da yanardı (`classifyLightsByGeometry`).
- Arabanın içinde kalan parçalar (jant içindeki göbek, konsol ekranı) lamba
  sayılmaz: konum eşiği gövde yarısının %55'idir.
- Modeller artık repoda (35 MB): yayınlanan sürümde de gerçek arabalar vardır.
  Yalnızca kökteki ham `.glb` dosyaları ve 144 MB'lık ham video kaydı dışarıda kalır.
