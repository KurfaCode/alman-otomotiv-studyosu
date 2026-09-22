/* ============================================================
   İÇERİK — platformun tamamı bu dosyadan beslenir.
   Kodda hiçbir marka adı sabit değildir: yeni marka eklemek için
   diziye bir nesne eklemek yeterlidir.

   Kategori sırası CATEGORIES ile belirlenir; her markanın
   `cards` alanı kategori id'siyle eşleşen kart dizileri tutar.
   `focus` alanı kameranın hangi bakış açısına kayacağını söyler:
     hero | side | front | wheel | interior
   `emblem` alanı src/ui/emblems.js içindeki arma anahtarıdır.

   KÜNYE ALANLARI (bilgi paneli bunlardan beslenir):
     model      panele ve duvar künyesine yazılan araç adı
     generation nesil/kasa kodu + çıkış yılı  (ör. "W206 · 2021")
     segment    gövde sınıfı                  (ör. "Sedan")
     hq         markanın merkezi
     founded    kuruluş yılı
     country    ülke (panelde "DE" rozeti için ISO kısaltması da var)
     stats      4 satır: değer + etiket (2×2 ızgarada gösterilir)

   MODEL ALANLARI:
     files      sıraya göre denenir; İLK BAŞARILI dosya sahneye çıkar.
                Bu yüzden ilk aday her zaman "models/<id>.glb" (optimize,
                sahnedeki araç) olmalıdır. Aynı aracın başka bir sürümü
                listeye girecekse models/ yolundan SONRA yazılır.
     lightFiles hafif sürüm (kadro "Hafif"e düşerse öne alınır):
                "models/<id>-light.glb" — aynı aracın düşük üçgenli hâli.

   İçerikteki her model, models/ klasöründeki GERÇEK GLB ile
   eşleşir; veriler üretici/yarış serisi kaynaklarından alınmıştır
   (bkz. models/README.md). Yıldız (*) opsiyonel donanım ya da
   üretici/yarış serisi verisidir.
   ============================================================ */

export const CATEGORIES = [
  { id: "konu",    label: "Konu",        glyph: "car",    focus: "hero" },
  { id: "tasarim", label: "Tasarım",     glyph: "design", focus: "side" },
  { id: "far",     label: "Aydınlatma",  glyph: "light",  focus: "front" },
  { id: "jant",    label: "Jant",        glyph: "wheel",  focus: "wheel" },
  { id: "motor",   label: "Motor",       glyph: "engine", focus: "hero" },
  { id: "ic",      label: "İç Mekân",    glyph: "seat",   focus: "interior" },
];

export const BRANDS = [
  {
    id: "mercedes",
    name: "MERCEDES-BENZ",
    short: "Mercedes-Benz",
    mono: "MB",
    emblem: "mercedes",
    presenter: "OZAN",
    taglineDE: "Das Beste oder nichts",
    taglineTR: "En iyisi ya da hiçbiri",
    model: "C-Serisi C 300",
    generation: "W206 · 2021",
    segment: "Sedan",
    hq: "Stuttgart",
    country: "Almanya",
    iso: "DE",
    founded: "1926",
    accent: "#d4af37",
    accentHex: 0xd4af37,
    paintColor: 0x5a6068,
    files: ["models/mercedes.glb", "mercedes.glb"],
    lightFiles: ["models/mercedes-light.glb"],
    stats: [
      { v: "258 PS", l: "2.0 TURBO + 48 V" },
      { v: "6,0 s",  l: "0–100 KM/S" },
      { v: "400 Nm", l: "TORK" },
      { v: "250",    l: "KM/S MAKS*" },
    ],
    cards: {
      konu: [
        { t: "1886 — İki Atölye", d: "<b>Carl Benz</b> 1886'da Mannheim'da Patent-Motorwagen için <b>DRP 37435</b> patentini aldı; aynı yıl <b>Gottlieb Daimler</b> Cannstatt'ta motorlu arabasını yaptı. Otomobilin tarihi bu iki atölyede başladı." },
        { t: "1926 — Yıldız Doğuyor", d: "<b>Daimler</b> ve <b>Benz</b> 1926'da birleşip Daimler-Benz'i kurdu. Amblemdeki <b>üç köşeli yıldız</b>, 1909'dan beri “karada, denizde, havada motor gücü” anlamına gelir." },
        { t: "Adı Nereden Geliyor?", d: "Markanın adı bir müşterinin kızından gelir: <b>Emil Jellinek</b>, Daimler'den aldığı araçlara kızı <b>Mercedes</b>'in adını yazdırdı. 1901 <b>Mercedes 35 PS</b> ilk modern otomobil sayılır." },
      ],
      tasarim: [
        { t: "Sensual Purity", d: "Mercedes'in 2009'dan beri kullandığı tasarım dili: gereksiz çizgi yok. W206'da <b>uzun kaput, kısa bagaj</b> ve geriye kaymış kabin oranı korunur." },
        { t: "Ölçüler Konuşuyor", d: "<b>4.751 mm</b> uzunluk, <b>2.865 mm</b> aks mesafesi: W206, selefi W205'ten 65 mm daha uzun aksla geldi — arka diz mesafesi sınıfının en iyilerinden." },
        { t: "Sürtünme Katsayısı", d: "Gövde <b>Cd 0,24</b>* seviyesine iner; gömme kapı kolları ve kapalı alt gövde bu değeri mümkün kılar. Düşük Cd = hem daha az yakıt hem daha az rüzgâr sesi." },
      ],
      far: [
        { t: "DIGITAL LIGHT", d: "Her farda <b>1,3 milyon mikro aynalı</b> çip: ışığı piksel piksel yönlendirir, karşıdan gelen sürücüyü karanlıkta bırakmadan yolu yıkar." },
        { t: "Adaptif Uzun Far", d: "<b>Adaptive Highbeam Assist Plus</b> uzun farı sürekli açık tutar; öndeki aracı bir “pencere” gibi gölgeleyip yolun geri kalanını aydınlatır." },
        { t: "Standart LED", d: "Temel donanımda <b>LED High Performance</b> farlar ve <b>ULTRA RANGE</b> uzun far vardır; menzil hıza göre kendiliğinden uzar." },
      ],
      jant: [
        { t: "AMG Dövme Jantlar", d: "AMG modellerinde <b>dövme (forged)</b> jant: döküme göre daha hafif ve sert. Dönen kütle azalınca süspansiyon daha çabuk tepki verir." },
        { t: "Aerodinamik Kollar", d: "AMG jantlarının kolları <b>fren diskine hava</b> taşıyacak şekilde açılır; jant sadece görüntü değil, soğutma parçasıdır." },
        { t: "Yıldız Göbek", d: "Jant göbeğindeki <b>üç köşeli yıldız</b> 1909'dan beri markanın imzası: kara, deniz ve havada motor gücü anlamına gelir." },
      ],
      motor: [
        { t: "M254 + 48 V", d: "2,0 litre turbo <b>258 PS / 400 Nm</b>; 48 voltluk <b>ISG</b> (entegre marş jeneratörü) kalkışta ek tork verir, fren enerjisini geri kazanır." },
        { t: "AMG C 63 S E PERFORMANCE", d: "Aynı bloktan <b>680 PS</b> ve <b>1.020 Nm</b>: arkada elektrik motoru, F1'den gelen batarya soğutması. Dünyanın en güçlü seri üretim dört silindiri." },
        { t: "9G-TRONIC", d: "Dokuz ileri otomatik şanzıman ve <b>4MATIC</b> dört çekiş seçeneği; C 300 0–100 km/s'yi <b>6,0 saniyede</b> tamamlar." },
      ],
      ic: [
        { t: "MBUX 11,9 inç", d: "Dikey dokunmatik ekran ve <b>ikinci nesil MBUX</b>: “Hey Mercedes” ile konuşan, öğrenen bir kokpit. Göstergeler sürücünün önünde dijital." },
        { t: "Burmester 3D", d: "15 hoparlörlü <b>Burmester</b> sistemi ve 64 renkli ambiyans aydınlatma; kabin akşam sürüşünde bambaşka bir yere dönüşür." },
        { t: "Konfor Detayları", d: "Isıtmalı-soğutmalı masajlı ön koltuklar, panoramik cam tavan ve <b>ENERGIZING</b> programları: lüks, sınıfın bir altına indi." },
      ],
    },
  },

  {
    id: "bmw",
    name: "BMW",
    short: "BMW",
    mono: "BMW",
    emblem: "bmw",
    presenter: "OSMAN",
    taglineDE: "Freude am Fahren",
    taglineTR: "Sürüş keyfi",
    model: "M5 Competition",
    generation: "F90 · 2018",
    segment: "Süper sedan",
    hq: "München",
    country: "Almanya",
    iso: "DE",
    founded: "1916",
    accent: "#2f9dff",
    accentHex: 0x2f9dff,
    files: ["models/bmw.glb", "bmw_m5__the_carbon_storm.glb"],
    lightFiles: ["models/bmw-light.glb"],
    stats: [
      { v: "625 PS", l: "4.4 L V8 BİTURBO" },
      { v: "3,3 s",  l: "0–100 KM/S" },
      { v: "750 Nm", l: "TORK" },
      { v: "305",    l: "KM/S MAKS*" },
    ],
    cards: {
      konu: [
        { t: "1916 — Uçak Motorları", d: "BMW, 7 Mart 1916'da Münih'te <b>uçak motoru</b> üretmek için kuruldu. Amblemdeki mavi-beyaz Bavyera'nın renkleridir (pervane değil). Motosiklet 1923'te, otomobil 1928'de geldi." },
        { t: "1959 — Kurtaran Nesil", d: "BMW 1959'da neredeyse Mercedes'e satılıyordu; <b>Neue Klasse</b> ailesi (1962 <b>1500</b>) markayı kurtardı. Bugünkü 3 ve 5 Serisi bu sedanların devamı." },
        { t: "M GmbH — 1972", d: "Yarış bölümü <b>1972</b>'de kuruldu; <b>E30 M3</b> ve <b>E28 M5</b> (1984) pist teknolojisini sokağa taşıdı. <b>M</b> harfi Motorsport'un kısaltmasıdır." },
      ],
      tasarim: [
        { t: "Hofmeister Kink", d: "1961'den beri arka cam direğindeki <b>ters kırılma</b>; BMW'nin en kolay tanınan tasarım imzası. F90'da da aynı kırılma var." },
        { t: "Karbon Tavan", d: "F90'da <b>karbon fiber tavan</b> opsiyonel: çelik tavana göre yaklaşık 6 kg hafiflik ve ağırlık merkezini aşağı çekme. Sadece görüntü değil." },
        { t: "M Carbon Paketi", d: "Ön splitter, ayna kapakları, arka difüzör ve bagaj üstü <b>karbon</b> parçalar; yere basma kuvveti artarken ağırlık düşer. Sahnedeki araç bu paketle geliyor." },
      ],
      far: [
        { t: "BMW Laserlight", d: "<b>2019</b>'dan itibaren M5'te opsiyonel lazer far: mavi ışıklı “BMW Laser” imzası, <b>600 metreye</b> kadar menzil." },
        { t: "Selective Beam", d: "Uzun far demeti dijital olarak bölünür; öndeki araç <b>gölgelenir</b>, kalan yol tam aydınlatılır. Şoför uzun farı hiç kapatmaz." },
        { t: "Adaptif LED", d: "Standart farlar <b>Adaptive LED</b>: direksiyon açısına göre virajın içini aydınlatır, şehir içinde huzme kendiliğinden kısalır." },
      ],
      jant: [
        { t: "M Dövme 20 inç", d: "F90 Competition'da <b>20 inç M Double Spoke 789 M</b> dövme jantlar: düşük kütle, yüksek sertlik. Lastikler 275/35 ön, 285/35 arka." },
        { t: "M Compound Fren", d: "Standart <b>M Compound</b> diskler, opsiyonel <b>M Carbon seramik</b>: 100 km/s'den durma mesafesini kısaltır, pist ısınmasına dayanır." },
        { t: "Mavi Kaliper", d: "BMW M'nin <b>mavi fren kaliperi</b> imzası jantın içinde görünür; kırmızı ve siyah seçenekler de mevcut." },
      ],
      motor: [
        { t: "S63 4.4 L V8", d: "İki turbo, çift scroll: <b>625 PS</b> ve <b>750 Nm</b>. Competition'da 0–100 km/s <b>3,3 saniye</b>, M Driver's Package ile 305 km/s." },
        { t: "M xDrive", d: "Dört çekiş normalde arkayı öne çeker; <b>2WD modu</b> seçildiğinde ESP kapanır ve M5 tamamen arkadan itişli bir canavara dönüşür." },
        { t: "8 İleri M Steptronic", d: "Tork konvertörlü otomatik ama M kalibrasyonu: vites geçişleri <b>Drivelogic</b> ile üç kademede sertleştirilir. Sıralı altı gibi çalışır." },
      ],
      ic: [
        { t: "M Mode ve M Drive", d: "Direksiyondaki <b>M1/M2</b> tuşlarına sürücünün kendi ayarları atanır: motor, şanzıman, direksiyon, süspansiyon ve 4WD modu tek tuşla." },
        { t: "Merino Spor Koltuklar", d: "Yan destekleri ayarlanabilen <b>Merino deri</b> koltuklar; M5 Competition'da koltuk başlığında M logosu ve ışıklandırma var." },
        { t: "iDrive 7", d: "12,3 inç dokunmatik + döner düğme: BMW'nin <b>çift kontrollü</b> arayüzü. Dijital gösterge paneli M'e özel grafikler taşır." },
      ],
    },
  },

  {
    id: "audi",
    name: "AUDI",
    short: "Audi",
    mono: "A",
    emblem: "audi",
    presenter: "BİLAL",
    taglineDE: "Vorsprung durch Technik",
    taglineTR: "Teknolojiyle bir adım önde",
    model: "TT RS iconic edition",
    generation: "8S · 2023",
    segment: "Coupé",
    hq: "Ingolstadt",
    country: "Almanya",
    iso: "DE",
    founded: "1909",
    accent: "#e63946",
    accentHex: 0xe63946,
    paintColor: 0x7c828a,
    /* SIRA ÖNEMLİ: sahnede ilk yüklenen dosya gösterilir. Kök dizindeki
       eski `audi.glb` (Audi RS8 Sport konsepti) listede öne geçtiği için
       panel TT RS derken sahneye o araç çıkıyordu; artık hiç aday değil. */
    files: ["models/audi.glb", "2023_audi_tt_rs_iconic_edition.glb"],
    lightFiles: ["models/audi-light.glb"],
    stats: [
      { v: "400 PS", l: "2.5 TFSI BEŞ SİLİNDİR" },
      { v: "3,7 s",  l: "0–100 KM/S" },
      { v: "480 Nm", l: "TORK" },
      { v: "100",    l: "ADET (AVRUPA)" },
    ],
    cards: {
      konu: [
        { t: "Dört Halkanın Doğuşu", d: "<b>1932</b>'de Audi, DKW, Horch ve Wanderer birleşti: <b>Auto Union</b>. Amblemdeki dört halka bu dört markayı temsil eder; 1930'ların en güçlü yarış arabaları bu çatıdan çıktı." },
        { t: "August Horch", d: "1909'da Horch kendi soyadını kullanamayınca Latince <b>“Audi”</b> adını seçti — soyadı Almanca “dinle!” demek. Bugünkü marka bu kelimeden doğdu." },
        { t: "quattro — 1980", d: "<b>1980</b>'de binek araçta dört çekişi standart hâle getiren <b>quattro</b> ralli pistlerini ve markanın karakterini değiştirdi. “Vorsprung durch Technik” sloganı 1971'den beri aynı fikri anlatır." },
      ],
      tasarim: [
        { t: "Kavis (Dachbogen)", d: "TT'nin imzası <b>tek kavisli tavan</b> çizgisidir: heykeltıraş bir fırça darbesi gibi. iconic edition'da bu hat <b>Nardo Grisi</b> ile vurgulanır." },
        { t: "Nardo Grisi", d: "Renk seçeneği yok: bütün <b>iconic edition</b>'lar Audi Sport'un ikonik <b>Nardo Grisi</b>'ne boyanır. Panjur, splitter ve difüzör parlak siyah detaylarla tamamlanır." },
        { t: "Vorsprung durch Technik", d: "<b>1971</b>'den beri kullanılan slogan: “Teknoloji yoluyla öncülük”. Reklam tarihinin en uzun ömürlü marka cümlelerinden biri." },
      ],
      far: [
        { t: "Matrix LED", d: "Sahnedeki araçta <b>Matrix LED</b> farlar standart: her far birden çok diyodu ayrı ayrı yönetir, karşıdaki aracı gölgeleyip yolu aydınlatır." },
        { t: "OLED Arka Lamba", d: "TT RS, <b>OLED arka lambalı</b> ilk seri üretim Audi oldu (2019): ışık yüzeyi değil, <b>segment segment</b> yanan ince bir film. Fren ve sinyal animasyonlu çalışır." },
        { t: "Dört Nokta Gibi", d: "TT RS'in ön lambalarındaki <b>dikey gündüz farı</b> deseni, Audi'nin agresif RS bakışını arka dikiz aynasından bile anlatır." },
      ],
      jant: [
        { t: "20 inç, Siyah", d: "iconic edition, <b>20 inç</b> jantlarla gelir: kaslı RS gövdesini doldurur, fren disklerini içeride büyük gösterir." },
        { t: "Beş Kollu Miras", d: "<b>1980 quattro</b> ile gelen beş kollu jant, markanın simgesi oldu. Bugünkü RS jantları bu deseni aerodinamik kollarla yorumlar." },
        { t: "RS Fren Sistemi", d: "Önde büyük çaplı, içten havalandırmalı <b>sabit kaliperli</b> diskler; çelik yerine <b>karbon-seramik</b> disk opsiyonu da vardı — dönen kütle azalır, pist ömrü uzar." },
      ],
      motor: [
        { t: "2.5 TFSI — Beş Silindir", d: "<b>400 PS</b> ve <b>480 Nm</b>: eşit olmayan <b>1-2-4-5-3</b> ateşleme sırası, beş silindirin o boğuk sesini üretir. Ralli mirası (1980 quattro) bu blokta yaşıyor." },
        { t: "Quattro Devrimi", d: "<b>1980</b>'de binek araçta dört çekişi standart hâle getirdi; WRC pistlerini kısa sürede darmadağın etti. TT RS de <b>quattro</b> ile yolu tutar." },
        { t: "S tronic 7", d: "Çift kavramalı <b>7 ileri S tronic</b> ve kalkış kontrolü: 0–100 km/s <b>3,7 saniye</b>, maksimum hız 280 km/s*. 100 adetlik seri, TT'nin en hızlı vedasıdır." },
      ],
      ic: [
        { t: "Virtual Cockpit", d: "<b>2014 TT</b> ile gösterge tablosu tamamen dijitalleşti: navigasyon ve tur bilgisi sürücünün gözü önündeki ekranda. Bugünkü Audi'ler bu fikri miras aldı." },
        { t: "Iconic Kabin", d: "Siyah-gri <b>Nappa deri ve Alcantara</b>, petek deseni ve <b>sarı kontrast dikişler</b>: iconic edition'ın kabini kapıdan bakınca tanınır." },
        { t: "Haptik Dokunmatik", d: "Dokunmatik ekranlar <b>dokunsal geri bildirim</b> verir; sürücü yola bakarken kullanabilir. TT'de her şey sürücüye dönüktür." },
      ],
    },
  },

  {
    id: "porsche",
    name: "PORSCHE",
    short: "Porsche",
    mono: "P",
    emblem: "porsche",
    presenter: "BİRHAT",
    taglineDE: "Die Legende lebt",
    taglineTR: "Efsane yaşıyor",
    model: "911 GT3 R",
    generation: "992 · 2023",
    segment: "Yarış otomobili",
    hq: "Stuttgart-Zuffenhausen",
    country: "Almanya",
    iso: "DE",
    founded: "1931",
    accent: "#22c55e",
    accentHex: 0x22c55e,
    files: ["models/porsche.glb", "2024_porsche_992_gt3_r.glb"],
    lightFiles: ["models/porsche-light.glb"],
    stats: [
      { v: "565 PS",  l: "4,2 L BOXER" },
      { v: "1.250 kg", l: "BOŞ AĞIRLIK" },
      { v: "9.250",   l: "DEVİR/DK MAKS" },
      { v: "560 Nm",  l: "TORK" },
    ],
    cards: {
      konu: [
        { t: "1931 — Tasarım Ofisi", d: "<b>Ferdinand Porsche</b> 1931'de Stuttgart'ta mühendislik ofisini kurdu; ilk büyük işlerinden biri halk otomobilinin tasarımıydı. Kendi adını taşıyan otomobil için savaşın bitmesi gerekti." },
        { t: "1948 — 356 No.1", d: "Ferry Porsche, Gmünd'de ilk Porsche'yi (356 No.1 Roadster) elle yaptı: 35 PS, 585 kg. “Etrafıma bakındım ama istediğim arabayı bulamadım, o yüzden kendim yaptım.”" },
        { t: "Müşteri Yarışı", d: "Porsche yarış programının kalbi müşteri takımlarıdır; araç pistte <b>BoP</b> (performans dengesi) ile yarışır. Le Mans'ta <b>19</b> genel klasman zaferi markanın rekorudur." },
      ],
      tasarim: [
        { t: "Kuğu Boyun Kanat", d: "Arka kanat gövdeye <b>üstten</b> bağlanır (swan neck): kanadın alt yüzeyi temiz kalır, hava akışı bozulmaz. Yere basma kuvveti artar, sürükleme düşer." },
        { t: "60 Yıllık Silüet", d: "911'in temel formu <b>1964</b>'ten beri korunur: önde uzun kaput, arkada motor, ortada tek kavis. GT3 R'da değişen şey yalnızca aero parçalarıdır." },
        { t: "Hafif Gövde", d: "Alüminyum-çelik karışımı temel gövde + <b>CFRP</b> (karbon) kaput, kapı ve çamurluklar: yarış ağırlığı yaklaşık <b>1.250 kg</b> (BoP'a göre değişir)." },
      ],
      far: [
        { t: "Dört Nokta İmzası", d: "LED gündüz farının <b>dört noktalı</b> deseni, gece dikiz aynasında bile Porsche'yi tanıtan imzadır; GT3 R'da bu desen 911'den geliyor." },
        { t: "Yağmur Işığı", d: "GT3 araçlarında arka panelde <b>FIA yağmur lambası</b> zorunludur: pist ıslandığında sürücü yakıp söndürür, arkadan gelen aracı uyarır." },
        { t: "Yarış Aydınlatması", d: "Gece dayanıklılık yarışları için LED farlar <b>değiştirilebilir modüller</b> hâlindedir: hasar gören far, pit stop'ta saniyeler içinde yenilenir." },
      ],
      jant: [
        { t: "Merkez Kilit", d: "Yarıştan gelen <b>orta somun (Zentralverschluss)</b>: beş bijon yerine tek somun, pit stop'ta lastik değişimini saniyelere indirir. GT3 modellerinde standarttır." },
        { t: "18 inç Yarış Jantı", d: "GT3 kategorisinde <b>18 inç</b> jant zorunlu; büyük fren diskine yer açmak için tercih edilir. Dövme alüminyum, hafif ve sert." },
        { t: "Pist Lastikleri", d: "Kuru pistte <b>slick</b>, yağmurda kanallı lastik. Ölçüler ön <b>300/680-18</b>, arka <b>310/710-18</b>: lastik ısısı, aracın tur zamanının yarısıdır." },
      ],
      motor: [
        { t: "4,2 L Boxer", d: "Yeni GT3 R'ın kalbi: <b>4.194 cc</b>, doğal emişli altı silindir boxer, <b>9.250 devir/dk</b> ve <b>565 PS</b>. Kuru karter (dry sump) yağlama, yüksek viraj yüklerinde yağ basıncını korur." },
        { t: "Boxer Neden?", d: "<b>Yatay yerleşimli</b> silindirler ağırlık merkezini yere indirir, arka aksı daraltır ve 911'in efsanevi direksiyon hissini doğurur." },
        { t: "Sıralı 6 İleri", d: "Porsche <b>6 ileri sıralı dog-type</b> yarış şanzımanı, direksiyondan kumandalı; güç arkadan itişli aksa gider. Elektronik yardımcılar yarış kurallarına göre kısıtlıdır." },
      ],
      ic: [
        { t: "Yarış Kokpiti", d: "Kabin tamamen sökülüp yeniden kurulur: <b>FIA roll cage</b>, karbon koltuk, çok fonksiyonlu yarış direksiyonu ve sürücüye özel dijital gösterge paneli." },
        { t: "Sürücü Merkezi", d: "Kontak solda, devir saati ortada: <b>1964'ten</b> beri değişmeyen mantık — sürücü aracın merkezinde oturur." },
        { t: "Güvenlik Hücresi", d: "Yakıt hücresi (fuel cell), yangın söndürme sistemi ve çok noktalı kemer: yarış kokpiti konfor için değil, <b>hayatta kalmak</b> için tasarlanır." },
      ],
    },
  },

  {
    id: "vw",
    name: "VOLKSWAGEN",
    short: "Volkswagen",
    mono: "VW",
    emblem: "vw",
    presenter: "EGE",
    taglineDE: "Das Auto",
    taglineTR: "Halkın otomobili",
    model: "Golf R Black Edition",
    generation: "Mk8.5 · 2025",
    segment: "Kompakt hatchback",
    hq: "Wolfsburg",
    country: "Almanya",
    iso: "DE",
    founded: "1937",
    accent: "#3b82f6",
    accentHex: 0x3b82f6,
    paintColor: 0x141820,
    files: ["models/vw.glb", "2025_volkswagen_golf_r_black_edition.glb"],
    lightFiles: ["models/vw-light.glb"],
    stats: [
      { v: "333 PS", l: "2.0 TSI" },
      { v: "4,6 s",  l: "0–100 KM/S" },
      { v: "420 Nm", l: "TORK" },
      { v: "270",    l: "KM/S MAKS*" },
    ],
    cards: {
      konu: [
        { t: "Halkın Arabası", d: "<b>1937</b>'de kurulan Volkswagen, adını “halkın arabası” fikrinden alır. Beetle ile otomobili geniş kitlelere ulaştırdı; bugün dünyanın en büyük üreticilerinden biri." },
        { t: "1945 — Yeniden Doğuş", d: "Fabrika savaşta yıkıldı; üretimi <b>İngiliz Ordusu'ndan Binbaşı Ivan Hirst</b> yeniden başlattı. Beetle <b>1972</b>'de 15 milyonu aşan üretimiyle Ford T'yi geçti." },
        { t: "Golf Sınıfı", d: "<b>1974</b>'te çıkan Golf, “kompakt hatchback” sınıfını yarattı; bugüne kadar <b>37 milyondan</b> fazla satıldı. R serisi 2002 <b>R32</b> ile başladı." },
      ],
      tasarim: [
        { t: "Black Edition", d: "Adı gibi: <b>siyah VW arması</b>, siyah R logosu, karartılmış farlar, siyah ayna kapakları ve egzoz uçları. Normalde mavi olan R vurguları bu sürümde siyaha döner." },
        { t: "Tek Platform, Çok Marka", d: "<b>MQB evo</b> platformu sayesinde Golf, A3, Octavia ve Leon aynı mimariyi paylaşır: maliyet düşer, teknoloji yayılır." },
        { t: "Gövde Oranı", d: "Kısa bagaj, uzun tavan: hatchback'in <b>ölçülü</b> formu. Black Edition'da tavan spoilere, difüzöre ve siyah detaylara kadar aynı dile bağlı." },
      ],
      far: [
        { t: "IQ.LIGHT Matrix", d: "<b>Golf 8</b> ile gelen matris LED sistem her farı <b>22 diyottan</b> fazlasıyla yönetir; Black Edition'da far içi karartılmıştır." },
        { t: "Işık Şeridi", d: "Ön panjurdaki <b>ışıklı şerit</b> ve aydınlatmalı VW arması markanın yeni imzası; elektrikli modellerde şarj durumu bile bu şeritten anlatılır." },
        { t: "Karşılama", d: "Araca yaklaşınca farlar ve arka lambalar <b>animasyonlu</b> bir karşılama gösterisi yapar; kilitleyince aynı gösteri tersine döner." },
      ],
      jant: [
        { t: "19 inç Estoril", d: "Black Edition'ın imzası <b>siyah 19 inç Estoril</b> jantlar; Golf R'ın gövdesini doldurur ve R fren sistemini içeride gösterir." },
        { t: "Warmenau Jant", d: "Opsiyonel <b>Warmenau</b> jantlar dövme üretilir: döküm jantlara göre daha hafiftir, yaylanan kütle azalınca yol tutuşu keskinleşir." },
        { t: "Ölçülü Konfor", d: "Standart Golf'te jant ve lastik <b>konfor odaklı</b> seçilir: 17 inç üzeri lastikler yol sesini ve tüketimi artırır. R'da ise denge pist lehine kayar." },
      ],
      motor: [
        { t: "EA888 2.0 TSI", d: "<b>333 PS</b> ve <b>420 Nm</b>: turbo + doğrudan enjeksiyon. Mk8'den bu yana güç 320'den 333 PS'e çıktı; 0–100 km/s <b>4,6 saniye</b>." },
        { t: "4MOTION + Tork Vektörü", d: "Arka aksta <b>iki kavrama</b>: gücü sağa-sola paylaştırır, gerektiğinde dış tekerleği hızlandırıp aracı viraja sokar. <b>Drift</b> modu bu sistemin hediyesi." },
        { t: "7 İleri DSG", d: "Islak çift kavramalı şanzıman ve <b>R-Performance paketi</b>: Special modu Nürburgring için kalibre edildi, maksimum hız 250'den <b>270 km/s</b>'ye çıkar." },
      ],
      ic: [
        { t: "MIB4 12,9 inç", d: "Mk8.5'te ekran büyüdü, altındaki <b>dokunmatik kaydırıcı aydınlatıldı</b> (Golf 8'in en çok eleştirilen detayı düzeltildi). Menü artık daha hızlı." },
        { t: "R Kokpiti", d: "Direksiyonun tam ortasında <b>R logosu</b>, mavi dikişli spor koltuklar ve R'ya özel grafikler; sürüş modu seçimi direksiyondan yapılır." },
        { t: "Tur & G-Metre", d: "R-Performance paketinde <b>GPS tur zamanlayıcı</b> ve <b>G-metre</b>: pistte yaptığın turu araç kendisi ölçer, viraj kuvvetlerini ekranda gösterir." },
      ],
    },
  },

  {
    id: "maybach",
    name: "MAYBACH",
    short: "Maybach",
    mono: "M",
    emblem: "maybach",
    presenter: "MEHMET",
    taglineDE: "Ikonischer Luxus",
    taglineTR: "İkonik lüks ve el işçiliği",
    model: "Maybach S 680",
    generation: "Z223 · 2021",
    segment: "Lüks sedan",
    hq: "Stuttgart",
    country: "Almanya",
    iso: "DE",
    founded: "1909",
    accent: "#d97706",
    accentHex: 0xd97706,
    paintColor: 0x1f1a22,
    files: ["models/maybach.glb", "2021_mercedes-benz_s-class_maybach.glb"],
    lightFiles: ["models/maybach-light.glb"],
    stats: [
      { v: "612 PS", l: "6.0 L V12 BİTURBO" },
      { v: "900 Nm", l: "TORK" },
      { v: "4,4 s",  l: "0–100 KM/S" },
      { v: "250",    l: "KM/S MAKS" },
    ],
    cards: {
      konu: [
        { t: "Wilhelm Maybach", d: "Daimler'in motorunu tasarlayan, <b>1901 Mercedes 35 PS</b>'e imza atan mühendis. 1909'da kendi firmasını kurup <b>Zeppelin</b> motorlarını üretti; adı lüksün simgesi oldu." },
        { t: "İki Doğuş, Tek Ad", d: "Maybach 1941'de motor üretimine, 2002'de <b>57/62</b> limuzinleriyle geri döndü. <b>2021 Z223</b>'ten beri Mercedes-Maybach, S-Serisi'nin zirvesi olarak satılıyor." },
        { t: "Manufaktur İşçiliği", d: "Maybach'ın ayırt edici yeri Sindelfingen'deki <b>Manufaktur</b> atölyesidir: iki renkli boya elle zımparalanır, dikişler tek tek denetlenir. Üretim adedi lüks sınıfın en düşüklerindendir." },
      ],
      tasarim: [
        { t: "İki Renkli Boya", d: "<b>Zweifarblackierung</b>: gövde ustalar tarafından elle zımparalanıp iki renge ayrılır. Renk ayrım çizgisi tek bir milimetre kaymaz." },
        { t: "Krom Detaylar", d: "B-pillar'da krom, ızgarada ince dikey çubuklar ve kapı altı <b>Maybach</b> yazısı: gövde abartısız ama uzaktan tanınacak kadar farklıdır." },
        { t: "Aks Mesafesi", d: "Z223 Maybach'ın aksı standart S-Serisi'nden <b>18 cm</b> uzun; bu fark doğrudan arka koltuğa gider ve aracın silüetini bir limuzin oranına taşır." },
      ],
      far: [
        { t: "DIGITAL LIGHT", d: "Maybach'ta da <b>1,3 milyon mikro aynalı</b> far teknolojisi var; araç yolu tarar, karşıdaki sürücüyü gölgede bırakmaz." },
        { t: "Karşılama Işığı", d: "Yaklaşan sahibini tanıyan araç, <b>ışık gösterisi</b> ile kapıyı aydınlatır — lüks, binmeden önce başlar." },
        { t: "Ambiyans Aydınlatma", d: "Kabindeki <b>64 renkli</b> ambiyans sistemi kapı panellerinden taban aydınlatmasına kadar yayılır; gece sürüşünde araç içten yıkanır." },
      ],
      jant: [
        { t: "21 inç Dövme", d: "Maybach'ın <b>çok kollu forged</b> jantı sadece gösteriş değil: konforu bozmamak için dönen kütle en aza indirilir." },
        { t: "Sessizlik Tasarımı", d: "Jant kollarının arkasındaki <b>akustik halka</b>, lastik boşluğundaki hava titreşimini keserek kabine gürültü girmesini engeller." },
        { t: "Kapaklı Jant", d: "Bazı Maybach jantlarında <b>kapak</b> kullanılır: yıldız her zaman dik durur ve hava akışı yumuşatılır. Detay, müşteriye göre seçilir." },
      ],
      motor: [
        { t: "6.0 L V12 Biturbo", d: "<b>612 PS</b> ve <b>900 Nm</b> tork; iki turbo sayesinde güç rölantiden itibaren hissedilir, 0-100 km/s 4,4 saniye civarındadır." },
        { t: "Aktif Gürültü Engelleme", d: "Kabin içindeki mikrofonlar ters faz ses üretir; motorun <b>V12 hırıltısı</b> sadece istenen anda duyulur." },
        { t: "9G-TRONIC ve 4MATIC", d: "Yumuşak dokuz ileri otomatik ve <b>4MATIC</b> dört çekiş: iki tonluk bir limuzin, ıslak zeminde bile arka koltuktaki kahveyi sallamaz." },
      ],
      ic: [
        { t: "First Class Kabin", d: "Maybach'ta ön koltuk değil <b>arka koltuk</b> sahnedir: 43,5 dereceye yatan masajlı koltuk, ayak desteği ve şampanya kadehleri." },
        { t: "Burmester 4D", d: "31 hoparlör ve koltuk içi titreşim dönüştürücüleriyle <b>konser</b> hissi; kabin yolcuları hızlanmayı bile neredeyse hissetmez." },
        { t: "Arka Kokpit", d: "İki bağımsız ekran, katlanır masalar ve kablosuz şarj: arka koltuk <b>ofis</b> olur. Şoför tarafı ise tamamen ayrı bir dünya." },
      ],
    },
  },
];

export function brandAt(i) {
  const n = BRANDS.length;
  return BRANDS[((i % n) + n) % n];
}

export function brandIndexById(id) {
  for (let i = 0; i < BRANDS.length; i++) if (BRANDS[i].id === id) return i;
  return -1;
}
