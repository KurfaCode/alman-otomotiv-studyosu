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
        { t: "1886 — Otomobilin Doğuşu", d: "<b>Carl Benz</b>, 1886'da Mannheim'da <b>DRP 37435</b> patentini alarak dünyanın ilk içten yanmalı otomobilini icat etti. Gottlieb Daimler ise aynı yıl ilk 4 tekerlekli motorlu aracı üretti; modern ulaşım çağı başladı." },
        { t: "Bertha Benz Cesareti", d: "<b>Bertha Benz</b> 1888'de eşinden habersiz 106 km sürerek ilk uzun yolculuğu yaptı. Tıkanan yakıt borusunu saç tokasıyla açtı, eczaneden ligroin alarak tarihin <b>ilk akaryakıt istasyonunu</b> gayriresmi kurmuş oldu." },
        { t: "Üç Köşeli Yıldız & Güvenlik", d: "Yıldız amblemi <b>karada, denizde ve havada</b> motorizasyonu simgeler. <b>Béla Barényi</b>'nin darbe emici gövdesi (1951), ilk ABS (1978) ve hava yastığı ile Mercedes, otomotiv güvenlik standardını dünyaya armağan etti." },
      ],
      tasarim: [
        { t: "Sensual Purity Felsefesi", d: "Mercedes'in <b>Duygusal Saflık</b> çizgisi keskin girintileri reddeder; ışığı pürüzsüz büken heykelsi yüzeyler sunar. Uzun kaput, geriye yaslanmış kabin ve kısa bagaj oranı markanın asil silüetini oluşturur." },
        { t: "Cd 0,24 Aerodinamik Verim", d: "Rüzgâr tünelinde şekillenen gövde <b>0,24 Cd</b> sürtünme katsayısına sahiptir. Düz taban kaplaması ve hava perdeleri rüzgâr direncini kırarak hem kabin sessizliğini korur hem de yüksek hızda yakıt tüketimini düşürür." },
        { t: "W206 Lüks Sedan Oranları", d: "<b>4.751 mm</b> uzunluk ve <b>2.865 mm</b> aks mesafesi ile W206, S-Serisi'nin görkemli oranlarını kompakt sınıfa taşır. Ön ızgaraya işlenen yüzlerce krom yıldız motifi, markanın kusursuz detay işçiliğini sergiler." },
      ],
      far: [
        { t: "DIGITAL LIGHT Devrimi", d: "Her farda <b>1,3 milyon mikro ayna</b> bulunur; ışık 2,6 milyon piksele bölünür. Karşıdan gelen aracın gözünü kamaştırmadan etrafını gölgeler, gerektiğinde yola uyarı sembolleri ve şerit kılavuzları yansıtabilir." },
        { t: "ULTRA RANGE Uzun Far", d: "Sistem <b>650 metreye</b> kadar kesintisiz aydınlatma sağlar. Yasal sınırların izin verdiği en üst aydınlatma şiddetini üreterek otoyol sürüşlerinde sürücüye gündüz berraklığında bir görüş ufku sunar." },
        { t: "Adaptif Işık Asistanı", d: "<b>Highbeam Assist Plus</b> kamerayla yolu tarar; viraj açısına göre farı yönlendirir, şehir içinde kavşakları geniş açıyla yıkar ve tabela parlamalarını önlemek için o noktadaki ışık şiddetini otomatik kısar." },
      ],
      jant: [
        { t: "AMG Dövme Hafif Alaşım", d: "AMG jantları yüksek basınçlı <b>dövme alüminyum</b> tekniğiyle üretilir. Geleneksel döküm jantlara göre %20 daha hafiftir; dönen yaylanmayan kütleyi azaltarak viraj çevikliğini ve süspansiyon tepki hızını artırır." },
        { t: "Aerodinamik Soğutma Kolları", d: "Türbin formundaki jant kolları tekerlek davlumbazındaki türbülansı emer ve <b>fren disklerine soğuk hava</b> pompalar. Bu tasarım hem sürtünmeyi düşürür hem de sert frenlemelerde disklerin aşırı ısınmasını engeller." },
        { t: "Arka Aks Yönlendirme (2.5°)", d: "Opsiyonel arka aks sistemi arka tekerlekleri <b>2,5 dereceye kadar</b> çevirir. 60 km/s altında ön tekerleklerin tersine dönerek dönüş çapını 43 cm daraltır; yüksek hızda ise aynı yöne dönerek rayda gidiyormuş hissi verir." },
      ],
      motor: [
        { t: "M254 Motor & 48V Mild-Hybrid", d: "2.0 litre turbo ünite <b>258 PS ve 400 Nm</b> üretir. Entegre marş jeneratörü (ISG) kalkışta anında <b>+20 PS ve +200 Nm</b> elektrik desteği sağlar; turbo boşluğunu tamamen yok eder ve fren enerjisini geri kazanır." },
        { t: "9G-TRONIC & 4MATIC Aktarma", d: "9 ileri tork konvertörlü otomatik şanzıman milisaniyeler içinde pürüzsüz vites değişimi yapar. <b>4MATIC</b> akıllı dört tekerlekten çekiş sistemi torku ön ve arka aksa dinamik dağıtarak 0-100 km/s hızlanmayı <b>6.0 saniyede</b> tamamlar." },
        { t: "AMG F1 Hibrit Teknolojisi", d: "Aynı gövdenin AMG C 63 versiyonu F1'den aktarılan <b>elektrikli egzoz turbosu</b> ve arka aks bataryasıyla 4 silindirden tam <b>680 PS ve 1.020 Nm</b> çıkarır; dünyanın seri üretimdeki en güçlü 4 silindirli motorudur." },
      ],
      ic: [
        { t: "MBUX Yapay Zekâ Kokpiti", d: "11,9 inç dikey OLED dokunmatik ekran sürücüye doğru 6 derece eğimlidir. <b>“Hey Mercedes”</b> sesli asistanı sürücünün alışkanlıklarını öğrenir, akıllı ev sistemleriyle konuşur ve artırılmış gerçeklikli navigasyon sunar." },
        { t: "Burmester 3D Surround Ses", d: "Berlinli lüks ses uzmanı <b>Burmester</b> tarafından kalibre edilen 15 hoparlörlü 710 watt ses mimarisi, kabini akustik bir konser salonuna çevirir. Ön koltuk sırtlıklarındaki bas dönüştürücüler sesi hissettirir." },
        { t: "ENERGIZING Konfor & Ambiyans", d: "64 renkli aktif ambiyans aydınlatması kör nokta uyarısıyla entegre yanıp söner. Isıtmalı, havalandırmalı ve masajlı koltuklar iklimlendirme ve müzikle senkronize çalışarak sürücünün zindeliğini en üst düzeyde tutar." },
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
        { t: "1916 — Uçak Motorlarından Yola", d: "BMW, 1916'da Münih'te uçak motoru üretmek amacıyla kuruldu. Amblemdeki mavi-beyaz renkler havacılık pervanesi değil, <b>Bavyera Eyaleti'nin resmi bayrak renkleridir</b>; 1928'de otomobil, 1923'te R32 motosiklet doğdu." },
        { t: "Neue Klasse & Markanın Kurtuluşu", d: "1959'da iflasın eşiğine gelen ve Mercedes'e satılmak üzere olan BMW'yi, 1961'de tanıtılan <b>Neue Klasse 1500</b> kurtardı. Bu model, modern <b>kompakt lüks spor sedan</b> konseptini dünyada ilk kez tanımlayan araç oldu." },
        { t: "BMW M — Dünyanın En Güçlü Harfi", d: "1972'de yarış pistlerini fethetmek için <b>BMW Motorsport GmbH</b> kuruldu. E30 M3 tarihin en çok yarış kazanan binek aracı olurken; 1984'te çıkan ilk M5, pist performansını iş dünyasının lüks sedanına taşıdı." },
      ],
      tasarim: [
        { t: "Hofmeister Kink İmzası", d: "1961'den beri C sütununda yer alan <b>ileri kıvrımlı cam çizgisi</b> (Hofmeister Kink), arkadan itişli gücü simgeler. Böbrek ızgaralar ve çift dairesel farlarla birlikte bir BMW'yi kilometrelerce öteden tanıtır." },
        { t: "Karbon Fiber Tavan (CFRP)", d: "M5 Competition'ın tavanı saf <b>karbon fiber takviyeli polimerden (CFRP)</b> üretilmiştir. Aracın ağırlık merkezini yere yaklaştırarak gövde salınımını azaltır; süperspor otomobil dengesini lüks bir sedana kazandırır." },
        { t: "M Aerodinamik Aynalar & Kanat", d: "Çift kollu M ayna kapakları hava akımını yan camlardan pürüzsüzce uzaklaştırır. Arka difüzör ve bagaj üstü karbon spoyler 300 km/s hızda arka aksa gerçek yere basma kuvveti (downforce) uygulayarak dengeyi kilitler." },
      ],
      far: [
        { t: "BMW Laserlight Teknolojisi", d: "M5'in karakteristik mavi x desenli lazer farları, standart LED'lerden 10 kat daha parlaktır. <b>650 metre</b> menziliyle geceyi gündüze çevirir; fosfor kristali sayesinde gözü yormayan saf beyaz ışık huzmesi yayar." },
        { t: "Selective Beam Gölgeleme", d: "Uzun farlar açıkken öndeki veya karşıdan gelen araçları kamera ile anlık takip eder; ışık demetini o araçların etrafından mekanik ve dijital olarak keser. Sürücü uzun farları kapatmadan yolu kusursuz görmeye devam eder." },
        { t: "İkonik Çift L Gündüz İmzası", d: "BMW'nin efsanevi 'Angel Eyes' dairesel halkaları, F90 LCI kasada keskin çift L formunda yeniden yorumlandı. Hem gündüz fark edilirliği artırır hem de M5'in yırtıcı ve otoriter bakışını mühürler." },
      ],
      jant: [
        { t: "20 inç 789M Dövme Jantlar", d: "Competition paketine özel <b>Style 789 M</b> jantlar saf dövme alüminyumdur. İki renkli cilası ve çift kollu Y yapısı, süspansiyon yaylanmayan kütlesini hafifleterek Nürburgring pistindeki tur sürelerini saniyelerce kısaltır." },
        { t: "M Karbon Seramik Frenler", d: "Altın sarısı kaliperlerle donatılan <b>M Carbon Ceramic</b> diskler, çelik disklere göre 23 kg daha hafiftir. 1000°C'yi aşan pist sıcaklıklarında bile fren şişmesi (fading) yaşamaz; M5'i milimetrik mesafede durdurur." },
        { t: "50:50 Mükemmel Ağırlık Dengesi", d: "Motor ön aksın gerisine çekilerek BMW'nin kutsal kuralı olan <b>%50 ön - %50 arka</b> ağırlık dağılımı sağlandı. Sertleştirilmiş motor kulakları ve Competition şasi ayarları virajlarda gövde burulmasını sıfıra indirir." },
      ],
      motor: [
        { t: "S63 4.4L V8 Biturbo — 625 PS", d: "V silindir bloğunun tam ortasına yerleştirilen 'Hot-V' çift twin-scroll turbo mimarisi, egzoz gazı yolunu kısaltır. <b>625 beygir ve 750 Nm tork</b> ile 0-100 km/s hızlanmasını sadece <b>3,3 saniyede</b> tamamlar." },
        { t: "M xDrive & Saf 2WD Drift Modu", d: "M5 tarihinde ilk kez sunulan akıllı <b>M xDrive</b> sistemi, tek tuşla ön aksı tamamen devreden çıkarabilir. <b>2WD modu</b> seçildiğinde M5, 625 beygiri yalnızca arka tekerleklere aktaran safkan bir pist canavarına dönüşür." },
        { t: "8 İleri M Steptronic Şanzıman", d: "Drivelogic sistemine sahip şanzıman, vites geçiş sertliğini 3 kademede ayarlar. Yarış modunda sıralı bir yarış şanzımanı gibi vitesleri sertçe kilitler; M Driver's paketiyle son hız elektronik olarak <b>305 km/s</b>'ye açılır." },
      ],
      ic: [
        { t: "Direksiyondaki Kırmızı M1/M2", d: "M deri direksiyon üzerindeki kırmızı <b>M1 ve M2</b> tuşları sürücünün motor, süspansiyon, direksiyon, egzoz ve çekiş tercihlerini hafızaya alır. Tek dokunuşla sakin bir makam aracından pist rekoru kıran bir makineye geçer." },
        { t: "Işıklı M5 Logolu Merino Koltuk", d: "Koltuk başlıklarında karanlıkta parlayan M5 logoları yer alır. İnce işlenmiş <b>Merino deri</b>, elektrikli yan destekler ve havalandırma fonksiyonu, yüksek g-kuvvetli virajlarda sürücüyü milim kaydırmadan sarar." },
        { t: "Bowers & Wilkins Diamond Ses", d: "Saf elmas kubbeli tweeter'lara ve 16 hoparlöre sahip 1.400 watt'lık <b>Bowers & Wilkins Diamond Surround</b> ses sistemi, paslanmaz çelik hoparlör ızgaralarının içinden aydınlatılarak kabinde görsel ve işitsel bir şölen sunar." },
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
        { t: "Dört Halkanın Birleşimi (1932)", d: "Dört halkalı amblem, 1932'de birleşen dört Saksonya markasını temsil eder: <b>Audi, DKW, Horch ve Wanderer</b>. Bu birliktelikten doğan Auto Union Gümüş Okları, 1930'larda 16 silindirli Grand Prix rekorları kırdı." },
        { t: "Adı Nereden Geliyor? 'Dinle!'", d: "Kurucu <b>August Horch</b> kendi soyadını ticari nedenlerle kullanamayınca, arkadaşının oğlunun önerisiyle soyadının Almanca anlamı olan 'Dinle!' kelimesinin Latince karşılığını seçti: <b>“Audi!”</b> Böylece dev doğdu." },
        { t: "Quattro & Ralli Devrimi (1980)", d: "1980'de Ferdinand Piëch'in geliştirdiği <b>quattro</b> sürekli dört çeker sistemi, Dünya Ralli Şampiyonası'nı kökünden değiştirdi. <b>Michèle Mouton</b> ve Walter Röhrl efsanesiyle quattro, otomotivde yeni bir çağ açtı." },
      ],
      tasarim: [
        { t: "Bauhaus Geometrisi & Kavis", d: "1998'deki ilk neslinden bu yana Audi TT, <b>Bauhaus tasarım okulunun</b> saf geometrisini taşır: dairesel çamurluklar ve tek yay tavan çizgisi. Iconic Edition, bu heykelsi mirasa üretilen son 100 adetlik şaheserdir." },
        { t: "Nardo Grisi & Aerokit Paketi", d: "Bu özel seri yalnızca Audi Sport'un yarış kökenli <b>Nardo Grisi</b> rengiyle üretildi. Rüzgâr tünelinde test edilen karbon ön kanatçıklar (canards), yan etekler ve sabit karbon arka kanat yere basma kuvvetini katlar." },
        { t: "Audi Space Frame (ASF) Şasi", d: "Gövdenin ön kısmı hafif <b>alüminyumdan</b>, arka kısmı ise ağırlık dengesini sağlamak için çelikten üretilmiştir. ASF mimarisi sayesinde gövde burulma direnci muazzam seviyededir; viraj tepkileri cerrahi hassasiyettedir." },
      ],
      far: [
        { t: "Matrix LED Teknolojisi", d: "Audi, far teknolojisinde dünyaya öncülük eden markadır. TT RS'in <b>Matrix LED</b> farları yolu bağımsız diyotlarla anlık aydınlatır; viraj içine önceden ışık saçar ve karşı trafiğin gözünü kamaştırmadan kör nokta bırakmaz." },
        { t: "OLED Arka Stop Lambaları", d: "Seri üretimde ilk kez sunulan <b>Organik LED (OLED)</b> stoplar, cam plaka üzerine basılmış mikroskobik katmanlardan oluşur. Homojen 3D ışık saçar, gölge oluşturmaz ve araca yaklaşırken büyüleyici bir karşılama animasyonu oynatır." },
        { t: "Dinamik Kayan Sinyaller", d: "Audi'nin otomotiv dünyasına kazandırdığı <b>dinamik sıralı sinyal</b> teknolojisi, milisaniyeler içinde dönüş yönüne doğru akarak diğer sürücülerin tepki süresini kısaltır; gece görünürlüğünü en üst noktaya taşır." },
      ],
      jant: [
        { t: "20 inç Parlak Siyah RS Jantlar", d: "Iconic Edition'a özel 7 kollu 20 inç jantlar yüksek mukavemetli hafif alaşımdan üretilmiştir. Geniş tabanlı <b>255/30 R20</b> Pirelli P Zero lastikler pistte yanal tutunmayı en yüksek g-kuvvetlerine kadar korur." },
        { t: "Dalgalı RS Çelik & Seramik Fren", d: "Önde 370 mm çapında <b>dalgalı (wave)</b> tasarımlı 8 pistonlu fren diskleri bulunur. Dalgalı kenar yapısı dönen kütleyi yaklaşık 2 kg hafifletir ve soğuma yüzeyini genişleterek pistte ısınmadan kaynaklı fren kaybını önler." },
        { t: "Audi Magnetic Ride Süspansiyon", d: "Amortisörlerin içindeki manyetik parçacıklı özel sıvı, elektrik akımıyla milisaniyeler içinde sertleşir veya yumuşar. Virajda gövde yatmasını anında engelleyerek pist hassasiyeti ile cadde konforunu tek tuşla buluşturur." },
      ],
      motor: [
        { t: "Efsanevi 2.5 TFSI 5 Silindir", d: "Yılın Motoru ödülünü 9 kez üst üste kazanan efsanevi ünite <b>400 PS ve 480 Nm</b> güç üretir. <b>1-2-4-5-3</b> benzersiz ateşleme sırası, 1980'lerin ralli otomobillerinden miras kalan o unutulmaz gırtlaktan kükremeyi yaratır." },
        { t: "quattro & 7 İleri S tronic", d: "Çift kavramalı 7 ileri <b>S tronic</b> şanzıman milisaniyeler içinde vites atar. Çoklu kavramalı elektro-hidrolik quattro sistemi torkun %100'ünü anlık olarak arka aksa aktarabilir; 0-100 km/s hızlanması sadece <b>3,7 saniyedir</b>." },
        { t: "280 km/s Sınırlandırılmamış Hız", d: "Iconic Edition'da standart 250 km/s hız limiti fabrikadan <b>280 km/s</b> seviyesine kaldırılmıştır. Aktif egzoz kapakçıkları RS düğmesiyle açılarak 5 silindirin senfonisini kabine ve piste doğrudan iletir." },
      ],
      ic: [
        { t: "Audi Virtual Cockpit (12,3 inç)", d: "İlk kez TT ile dünyaya tanıtılan <b>Virtual Cockpit</b>, orta konsol ekranını kaldırıp tüm bilgileri sürücünün gözü önüne taşır. RS ekranında büyük merkezi devir saati, g-kuvveti ölçer ve lastik basınç grafiği yer alır." },
        { t: "Özel RS Petekli Alcantara Koltuk", d: "İnce Nappa deri ve Alcantara karışımı spor koltuklar sarı petek dikişlerle işlenmiştir. Koltuk sırtlıklarındaki 'iconic edition' kabartması ve vites kolundaki özel seri numarası bu 100 araçlık koleksiyonu ölümsüzleştirir." },
        { t: "Türbin Menfezler & Ergonomi", d: "Uçak türbinlerini andıran havalandırma menfezlerinin ortasında dijital ekranlar ve klima kumandaları yer alır. Tüm kontroller sürücü odaklıdır; eller direksiyondan hiç ayrılmadan sürüş modları yönetilebilir." },
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
        { t: "1948 — 356 No.1 ve Bir Rüya", d: "<b>Ferry Porsche</b> hayalindeki hafif ve çevik spor arabayı bulamayınca Avusturya Gmünd'de ilk <b>356 No.1</b>'i elleriyle yaptı. 1931'de Stuttgart'ta babası Ferdinand Porsche'nin kurduğu mühendislik dehası böyle taçlandı." },
        { t: "1963 — Ölümsüz İkon: Porsche 911", d: "Ferdinand Alexander 'Butzi' Porsche tarafından tasarlanan 911, arkadan motorlu boxer düzeniyle 60 yıldır dünyanın en başarılı spor otomobilidir. İlk adı 901 olan model, Peugeot itirazı sonrası efsanevi <b>911</b> adını aldı." },
        { t: "Le Mans'ta 19 Genel Zafer", d: "Porsche, dünyanın en zorlu dayanıklılık yarışı olan <b>Le Mans 24 Saat</b>'i 19 kez genel klasmanda kazanarak kırılması imkânsız bir rekora sahiptir. 917'den 919 Hybrid'e uzanan yarış genleri doğrudan cadde otomobillerine akar." },
      ],
      tasarim: [
        { t: "Kuğu Boyun (Swan-Neck) Kanat", d: "Devasa arka kanat gövdeye üstten kuğu boynu ayaklarla bağlanır. Kanadın alt yüzeyi pürüzsüz kaldığı için hava akımı kesintiye uğramaz; hava sürtünmesini artırmadan arka aksa yüzlerce kilo yere basma kuvveti kazandırır." },
        { t: "60 Yıllık Değişmeyen Silüet", d: "Önde karakteristik fırlak çamurluklar, alçak burun ve arkaya doğru kesintisiz inen tavan çizgisi. 992 GT3 R, 1963'teki orijinal 911 hatlarını saf aerodinamik yarış mühendisliğiyle buluşturan yaşayan bir sanat eseridir." },
        { t: "Karbon Kompozit Gövde (CFRP)", d: "Kapılar, çamurluklar, kaput ve tavan saf karbon fiber kompozitten üretilmiştir. Yarışa hazır kuru ağırlığı sadece <b>1.250 kg</b> olan araç, akıllı hafif gövde mimarisi sayesinde virajlarda inanılmaz bir çevikliğe ulaşır." },
      ],
      far: [
        { t: "Dört Noktalı Porsche LED İmzası", d: "Farların içindeki <b>4 noktalı LED gündüz aydınlatması</b>, Le Mans kazananı 919 Hybrid prototipinden mirastır. Dikiz aynasında görüldüğü anda arkadan bir Porsche'nin geldiğini tüm dünyaya ilan eden efsanevi bir imzadır." },
        { t: "24 Saat Le Mans Aydınlatması", d: "Gece dayanıklılık yarışları için farlar modüler yüksek güçlü LED çiplerle donatılmıştır. Pit stop esnasında bir temas yaşanırsa far ünitesi saniyeler içinde sökülüp yenisiyle değiştirilecek hızlı kilit sistemine sahiptir." },
        { t: "FIA Yağmur Lambası", d: "Arka difüzörün tam ortasında yer alan yüksek yoğunluklu FIA onaylı yağmur ledi, ıslak pistte oluşan devasa su sisinde arkadan gelen yarışçıları uyarır ve fren anında flaşör yaparak çarpışmaları önler." },
      ],
      jant: [
        { t: "Merkezi Kilitli Dövme Jantlar", d: "Beş bijon yerine motor sporlarından aktarılan tek bir <b>merkezi kilit somunu (Zentralverschluss)</b> kullanılır. Pit stoplarda lastik değişimini 3 saniyeye indirir; dönen kütleyi azaltarak tekerleğin yere basışını iyileştirir." },
        { t: "Tek Parça Monoblok Frenler", d: "Önde 6 pistonlu, arkada 4 pistonlu yekpare alüminyum yarış kaliperleri görev yapar. İçten havalandırmalı çelik yarış diskleri ve özel soğutma kanalları, Nürburgring 24 Saat yarışının acımasız temposunda fren hissini korur." },
        { t: "Safkan Yarış Lastikleri", d: "Önde 300 mm, arkada 310 mm tabanlı slick yarış lastikleri kullanılır. Arka aksın üzerindeki motor ağırlığı, viraj çıkışında tekerlekleri piste adeta yapıştırarak başka hiçbir arabada olmayan bir çekiş (traksiyon) üretir." },
      ],
      motor: [
        { t: "4.2L Atmosferik Boxer — 565 PS", d: "Turbo olmadan, safkan atmosferik güç: <b>4.194 cc</b> altı silindirli boxer motor tam <b>9.250 devir/dakika</b> çevirir. Kuru karter (dry sump) yağlama sistemi sayesinde yüksek g-kuvvetli virajlarda motor yağsız kalmaz." },
        { t: "Boxer Motorun Fiziksel Zaferi", d: "Pistonları yatay karşılıklı çalışan <b>Boxer motor</b>, ağırlık merkezini asfalta en yakın seviyeye indirir. Motor titreşimlerini doğal olarak dengeler; gaz pedalına dokunulduğu an gecikmesiz, jilet gibi bir tepki verir." },
        { t: "6 İleri Sıralı Yarış Şanzımanı", d: "Debriyaj pedalı olmadan, direksiyon arkasındaki pnömatik kulakçıklarla milisaniyede vites geçişi yapan <b>sıralı (sequential)</b> şanzıman. Gücü mekanik sınırlı kaydırmalı diferansiyel ile arka tekerleklere aktarır." },
      ],
      ic: [
        { t: "FIA Onaylı Güvenlik Kafesi", d: "İç mekân tüm lüks unsurlardan arındırılmış, yüksek dayanımlı çelikten <b>roll-cage</b> güvenlik kafesiyle çevrilmiştir. Sürücü karbon fiber yarış koltuğuna 6 noktalı kemerle sabitlenir; tavanında acil kurtarma kapağı vardır." },
        { t: "Solda Kontak Anahtarı Mirası", d: "Porsche'lerde kontak anahtarı her zaman <b>direksiyonun solundadır</b>. Bu gelenek, Le Mans yarışçılarının araca koşup binerken sol elle motoru çalıştırıp aynı anda sağ elle vitese takarak saniye kazanma taktiğinden doğmuştur." },
        { t: "Karbon Yarış Direksiyonu", d: "F1 tipi direksiyon üzerinde çekiş kontrolü (TC), ABS hassasiyeti ve telsiz düğmeleri yer alır. 10,3 inç renkli yarış ekranı sürücüye lastik sıcaklıkları, fren basınçları ve tur zaman farklarını canlı olarak iletir." },
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
        { t: "1937 — Bir Halk Otomobili Rüyası", d: "Volkswagen, adını doğrudan 'halkın arabası' felsefesinden alır. <b>Ferdinand Porsche</b> tarafından tasarlanan hava soğutmalı <b>Beetle (Tosbağa)</b>, 21,5 milyondan fazla üretilerek tarihin en ikonik otomobili haline geldi." },
        { t: "1945 — Binbaşı Ivan Hirst", d: "Savaş sonrası bombalanan Wolfsburg fabrikasını İngiliz subayı <b>Ivan Hirst</b> enkazdan kurtardı. Beetle'ın dâhiyane mühendisliğini fark edip orduya 20.000 adet sipariş verdi ve VW'nin küresel bir deve dönüşmesini sağladı." },
        { t: "1974 Golf & Hot-Hatch Doğuşu", d: "Giorgetto Giugiaro tasarımı <b>Golf Mk1</b> kompakt sınıfı icat etti. 1976'da mühendislerin gizlice geliştirdiği <b>GTI</b> ise yarış performansını halka indirerek 'Hot-Hatch' kategorisini yarattı; 37 milyondan fazla sattı." },
      ],
      tasarim: [
        { t: "Black Edition Karartılmış Asalet", d: "Özel seride VW amblemi, R logoları, ayna kapakları ve egzoz çıkışları tamamen parlak siyaha bürünür. Golf'ün 50 yıllık zamansız C sütunu çizgisi, karartılmış gövde detaylarıyla yırtıcı bir gece avcısına dönüşür." },
        { t: "MQB evo Modüler Platform Dehası", d: "Volkswagen Grubu'nun geliştirdiği <b>MQB evo</b> platformu, yüksek mukavemetli sıcak şekillendirilmiş çelik kullanır. Milyonlarca araca can veren bu şasi, Golf R'da olağanüstü bir gövde sertliği ve güvenlik sağlar." },
        { t: "Motorsport Tavan Spoyleri", d: "R-Performance paketine dahil olan çift katmanlı tavan spoyleri, arka dingil üzerindeki kaldırma kuvvetini nötralize eder. Arka difüzörle birlikte çalışarak yüksek hızlarda aracı yola vakumlar." },
      ],
      far: [
        { t: "IQ.LIGHT Matrix LED Farlar", d: "Golf 8.5'in gelişmiş <b>IQ.LIGHT</b> sistemi, her farda bağımsız yönetilen matris LED modülleri barındırır. Karşıdan gelen araçları milimetrik maskelerken 500 metrelik uzun far menziliyle geceyi aydınlatır." },
        { t: "Aydınlatmalı Ön Izgara ve Logo", d: "Panjur boyunca uzanan yatay LED ışık şeridi ve tarihte ilk kez aydınlatılan <b>ışıklı VW amblemi</b>, aracın gece imzasını oluşturur. Far içi karartılmış zemin Black Edition'ın agresif duruşunu tamamlar." },
        { t: "3D LED Arka Karşılama Efekti", d: "Arka stop lambaları kişiselleştirilebilir 3 farklı animasyon senaryosuna sahiptir. Araca yaklaşırken sürücüyü selamlayan ışık şovu ve dinamik kayar sinyaller, halk otomobilinde süper lüks teknoloji hissi yaşatır." },
      ],
      jant: [
        { t: "19 inç Estoril & Warmenau Dövme", d: "Standart siyah 19 inç Estoril jantların yanı sıra, opsiyonel <b>Warmenau dövme jantlar</b> tekerlek başına tam 8 kg ağırlık tasarrufu sağlar. Bu hafiflik süspansiyon tepkisini keskinleştirip direksiyon hissini artırır." },
        { t: "R Performans Çapraz Frenler", d: "Ön aksta 357 mm çapında delikli ve içten havalandırmalı fren diskleri ile mavi R kaliperleri bulunur. Alüminyum poyra göbeği sayesinde disk başına 600 gram hafifleme sağlanmış, pistte fren dayanımı artırılmıştır." },
        { t: "DCC Adaptif Şasi Kontrolü", d: "DCC sistemi saniyede 200 kez yol şartlarını ve tekerlek hareketlerini analiz eder. Amortisör valflerini anlık ayarlayarak konfor modunda yumuşak bir aile arabası, Race modunda ise kaskatı bir pist yarışçısı yaratır." },
      ],
      motor: [
        { t: "EA888 evo4 2.0 TSI — 333 PS", d: "Dördüncü nesil EA888 turbo motor <b>333 beygir ve 420 Nm</b> üretir. 350 bar doğrudan enjeksiyon ve değişken supap zamanlamasıyla bugüne kadar üretilmiş en güçlü seri üretim fabrika çıkışlı Golf modelidir." },
        { t: "R-Performance Tork Vektörleme", d: "4MOTION çekiş sistemi arka aksta iki bağımsız çok diskli kavrama kullanır. Torku sadece ön-arka değil, arka sağ ve sol tekerlekler arasında %100'e kadar paylaştırır; araca drift ve viraj açma kabiliyeti kazandırır." },
        { t: "Nürburgring Özel Modu & 270 km/s", d: "7 ileri çift kavramalı DSG şanzıman ve R-Performance paketiyle son hız <b>270 km/s</b>'ye çıkar. 'Special' modu amortisörleri Nürburgring Nordschleife'nin dalgalı asfaltına göre özel yumuşatarak azami tutunma sağlar." },
      ],
      ic: [
        { t: "Yenilenen MIB4 12,9 inç Ekran", d: "Mk8.5 ile gelen 12,9 inçlik <b>MIB4 multimedya</b> sistemi tamamen yeni işlemci mimarisine ve aydınlatmalı klima kaydırıcılarına sahiptir. ChatGPT entegreli sesli asistan IDA, doğal konuşma dilini anında kavrar." },
        { t: "R Spor Direksiyon & Yarış Modu", d: "Direksiyondaki mavi <b>R tuşu</b> tek basışla aracı doğrudan 'Race' moduna alır. Uzatılmış vites kulakçıkları ve delikli deri kaplama virajlarda üstün hakimiyet sunarken, fiziksel tuşlar direksiyona geri dönmüştür." },
        { t: "Entegre Başlıklı R Koltuklar", d: "Koyu mavi dikişli ve karbon desenli Nappa deri spor koltuklar, ısıtma ve havalandırma fonksiyonlarıyla donatılmıştır. Sırtlıktaki mavi R nakışı, kompakt bir hatchback içinde süperspor otomobil hissi uyandırır." },
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
        { t: "Wilhelm Maybach: Baş Mühendis", d: "Gottlieb Daimler'in dahi başmühendisi Wilhelm Maybach, petek radyatör ve modern karbüratörü icat etti. 1901'de ilk modern araba sayılan <b>Mercedes 35 PS</b>'i tasarlayarak Fransa'da 'Tasarımcıların Kralı' unvanını kazandı." },
        { t: "Zeppelin Hava Gemisi Motorları", d: "1909'da oğlu Karl Maybach ile hava gemisi motorları üretmek için kurulan Maybach, devasa <b>Zeppelin</b> zeplinlerine güç verdi. 1921'den itibaren ise krallar ve imparatorlar için dünyanın en lüks otomobillerini üretti." },
        { t: "Mercedes-Maybach Rönesansı", d: "2002'deki 57 ve 62 modellerinin ardından Maybach, günümüzde Mercedes-Benz'in en üst kişiselleştirme ve lüks zirvesi haline geldi. Çift 'M' amblemi, yüzyıllık Alman zanaatkârlığını ve en seçkin mühendisliği temsil eder." },
      ],
      tasarim: [
        { t: "El İşçiliği İki Renkli Boya", d: "Maybach'ın <b>Zweifarblackierung</b> iki renkli boyası Manufaktur atölyesinde uzman ustalarca elle uygulanır. İki rengin kesiştiği 4 milimetrelik ayrım çizgisi tek bir kıl fırçayla çekilir; işlem tam bir hafta sürer." },
        { t: "Karakteristik Dikey Izgara", d: "Ön ızgaradaki ince dikey krom şeritler çizgili takım elbiselerden ilham almıştır. Geniş krom C sütunu üzerinde gururla parlayan Maybach logosu ve 18 cm uzatılmış gövde, yolda krallara layık asil bir duruş sergiler." },
        { t: "Elektrikli Konfor Arka Kapılar", d: "Arka kapılar düğmeyle veya şoför tarafından elektrikli açılıp kapanabilir. Kör nokta sensörleriyle entegre çalışan kapılar, arkadan bisiklet veya yaya yaklaşıyorsa çarpmayı önlemek için açılmayı otomatik olarak durdurur." },
      ],
      far: [
        { t: "DIGITAL LIGHT Projeksiyon Farı", d: "2,6 milyon mikro aynalı fütüristik aydınlatma, yola yaya geçidi veya inşaat alanı kılavuz çizgileri yansıtabilir. Dar geçitlerde yol genişliğini asfaltın üzerine ışıkla çizerek şoföre hatasız bir görüş rehberliği sağlar." },
        { t: "Maybach Karşılama Işık Şovu", d: "Araç sahibinin yaklaştığını anahtardan algıladığı anda kapı eşiklerine hareketli Maybach logoları yansıtır. Farlar ve stoplar kademeli olarak yükselen bir ışık balesi sahneleyerek lüks seremonisini binmeden başlatır." },
        { t: "Gelişmiş Arka Okuma Işıkları", d: "Arka kabindeki adaptif okuma lambaları ışığın açısını, boyutunu ve parlaklığını yolcunun baş hareketlerine göre ayarlar. İster çalışırken odaklanmış sıcak ışık, ister dinlenirken loş ambiyans aydınlatması sunar." },
      ],
      jant: [
        { t: "21 inç Maybach Dövme Disk Jant", d: "Tarihi Maybach modellerine saygı duruşunda bulunan geniş yüzeyli <b>Forged Monoblok</b> jantlar, tekerlek çevresindeki hava türbülansını keser. Yüksek parlaklıktaki seramik cila el işçiliğiyle saatlerce parlatılır." },
        { t: "Akustik Köpüklü Sessiz Lastik", d: "Lastiklerin iç yüzeyine gürültüyü emen özel poliüretan <b>akustik köpük</b> yerleştirilmiştir. Asfalttan gelen yol uğultusunu ve lastik rezonansını kaynağında yok ederek Maybach'ın fısıltı sessizliğindeki kabinini korur." },
        { t: "E-ACTIVE BODY CONTROL Uçan Halı", d: "Stereo kameralar yolu saniyede 1.000 kez tarar ve kasisleri önceden görür. 48 voltluk elektro-hidrolik süspansiyon her tekerleği bağımsız alçaltıp yükselterek gövdeyi sarsıntısız tutar; adeta uçan halıda hissettirir." },
      ],
      motor: [
        { t: "M279 6.0L V12 Biturbo — 612 PS", d: "Safkan mühendislik anıtı 6.0 litre V12 motor, <b>612 beygir güç ve 900 Nm tork</b> üretir. İki buçuk tonluk bir sarayı rölantiden itibaren kesintisiz ve ipeksi bir çekişle 0'dan 100 km/s hıza sadece <b>4,5 saniyede</b> fırlatır." },
        { t: "V12 ile İlk Kez 4MATIC Çekiş", d: "Maybach tarihinde ilk kez V12 motor, <b>4MATIC akıllı dört tekerlekten çekiş</b> sistemiyle eşleştirildi. Gücü kayıpsız yere aktarırken arka koltuktaki devlet başkanlarının veya yöneticilerin kahvelerini bile dalgalandırmaz." },
        { t: "Aktif Yol Gürültüsü Engelleme", d: "Kabin içi sensörler süspansiyon ve yol seslerini dinler; Burmester sistemi aracılığıyla hoparlörlerden ters fazda ses dalgaları yayarak gürültüyü tamamen nötrler. Motor sesi sadece istendiğinde hafif bir uğultu olarak duyulur." },
      ],
      ic: [
        { t: "First-Class Arka Yaşam Alanı", d: "Standart S-Serisi'nden 18 cm daha uzun aks mesafesi doğrudan arka yolcuya ayrılmıştır. 43,5 derece yatan executive koltuklar bacak desteği, baldır masajı, boyun ısıtması ve gümüş kaplama şampanya kadehleriyle taçlandırılır." },
        { t: "Burmester High-End 4D Ses", d: "31 hoparlör, 8 bas dönüştürücü ve 1.750 watt gücündeki Burmester 4D ses sistemi, müziği sadece kulaklara değil koltukların içindeki rezonatörler sayesinde tüm vücuda hissettirir. Akustik yalıtım çift katmanlı camlarla korunur." },
        { t: "Manufaktur Deri & Ahşap Zanaatı", d: "Tavan döşemesine kadar her köşe en seçkin Nappa deriyle kaplanmıştır. Açık gözenekli ceviz ağacı kaplamalar ve alüminyum kakmalar elle yerleştirilir; her Maybach sipariş sahibine özel kişiselleştirilmiş tekil bir sanat eseridir." },
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
