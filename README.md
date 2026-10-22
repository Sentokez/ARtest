# Ankara Üniversitesi Müzesi · Sanal tur editörü

Windows'ta **baslat.cmd** dosyasını çift tıklayın ve tarayıcıda aşağıdaki adresi açın. Komut penceresi açık kalmalıdır.

- Düzenleyici: http://127.0.0.1:4173/editor.html
- Ziyaretçi turu: http://127.0.0.1:4173/

Node.js 20+ gerekir. Başlatıcı, varsa Codex'in bu bilgisayardaki Node kurulumunu da kullanır. Alternatif: `npm start` veya `node server.mjs`. HTML dosyasını doğrudan çift tıklamak yerine sunucu adresini kullanın.

## Düzenleme

1. Soldan bir sahne seçin. **+** ile bir veya birden fazla 360° fotoğraf yükleyin. Yaklaşık 2:1 oranında equirectangular JPG, PNG veya WebP kullanın. Normal fotoğraf 360° panoramaya dönüştürülmez.
2. Panoramayı sürükleyerek yönünüzü ayarlayın. **Bu açıyı kaydet** o sahnenin ilk bakış yönünü ve yakınlaştırmasını saklar. **Başlangıç yap** turun ilk sahnesini seçer.
3. **Geçiş ekle**, **Bilgi ekle** veya **Medya ekle** seçip panoramada bir konuma tıklayın. Hedef sahne, açıklama, eser görseli ve simgeyi düzenleyin. Mevcut noktaları sağdaki listeden veya panorama üzerinden açın. **Panoramadan yeni konum seç** ile taşıyın. Esc yerleştirmeyi iptal eder.
4. **Görünüm** sekmesinden ana renk, nokta rengi/boyutu/şekli, animasyon, etiket ve yükleme ekranını düzenleyin. Nokta penceresindeki özel görünüm seçeneğiyle tek bir noktaya farklı renk ve boyut verin.
5. **Ön izleme** noktaların ziyaretçiye nasıl çalıştığını gösterir. **Düzenlemeye dön** ile devam edin. Ses ziyaretçinin oynat düğmesine basmasıyla başlar.
6. **Projeyi kaydet** değişiklikleri `config.json` dosyasına yazar. Önceki dosya `backups/` klasörüne otomatik yedeklenir. **Geri al** son 30 düzenlemeye kadar çalışır; sayfa yenilendiğinde geçmiş sıfırlanır. Kaydetmeden kapanırsanız tarayıcı uyarır. Nokta penceresinde ayrıca **Noktayı uygula** düğmesine basılmalıdır.

Görseller `images/`, sesler `audio/` klasörüne yüklenir. Dosya başına sınır 60 MB'dır. Ses için MP3, WAV ve OGG desteklenir. Sahne silme, o sahneye gelen geçişleri de kaldırır; asıl görsel dosyasını silmez. Dosyaların korunması geri almayı mümkün kılar.

**Nokta kopyalama:** Mevcut bir noktayı açıp **Noktayı kopyala** düğmesine basın, ardından panoramada kopyanın konumunu seçin. Formdaki içerik, hedef sahne, simge ve özel görünüm ayarları kopyalanır; asıl nokta değişmez. Üst araç çubuğundaki **Noktayı yapıştır** ile aynı kopyayı tekrar veya başka bir sahnede yerleştirebilirsiniz. Her kopya ayrı düzenlenir ve **Geri al** ile kaldırılabilir. Esc yerleştirmeyi iptal eder. Kopyalama belleği sayfa yenilendiğinde sıfırlanır; eklediğiniz noktaları kalıcılaştırmak için **Projeyi kaydet** düğmesine basın.

**JSON dışa aktar** yalnızca tur ayarlarını indirir; görsel ve sesleri içermez. Başka bilgisayara taşımak için proje klasörünü bütünüyle kopyalayın. JSON içe aktarırken aynı göreli dosya yollarının mevcut olması gerekir. Yedek açmak için `backups/` içindeki JSON'u içe aktarabilirsiniz.

## Yapı ve yapılan iyileştirmeler

- `config.json`: Tek tur veri kaynağı. HTML'deki daha güncel 20 sahne ve 57 nokta buraya taşındı; sahne adları korundu.
- `app.js`, `tour.css`: Ziyaretçi turu ve editör aynı görüntüleme kodunu paylaşır. HTML içine gömülü büyük veri ve sonradan CSS/DOM değiştiren yamalar yeni turda kullanılmaz.
- `server.mjs`: Bağımlılıksız, yalnızca bu bilgisayara (`127.0.0.1`) açık yükleme/kaydetme sunucusu. Kayıt öncesinde veri doğrulama, önceki sürüm yedeği ve geçici dosyadan atomik değiştirme uygular.
- `vendor/`: Mevcut Pannellum 2.5.6 yerel kopyası ve lisansı. Görüntüleyici için CDN gerekmez. YouTube, Drive ve Spotify içerikleri internet ve ilgili paylaşım izinlerini gerektirir. Tanınmayan medya adresleri yeni sekme bağlantısı olarak gösterilir.
- `images/thumbs/`: Küçük sahne görselleri. Sahne listesi için orijinal 4–5 MB panoramalar yüklenmez. Yeni yüklenen panoramalara da küçük görsel üretilir.
- Tek yükleme ekranı, erişilebilir nokta düğmeleri, tam ekranda çalışan içerik pencereleri, hareket azaltma tercihi ve hata/yeniden deneme durumu eklendi. Bilgi metni HTML olarak çalıştırılmaz.
- Eski tur `legacy.html` ve `sanal-tur-yama.js` ile korunur. Önceki bağımsız JSON `config.original.json` dosyasındadır. Yeni editör bunları değiştirmez.

## Yayınlama ve sınırlar

Ziyaretçi turu statik barındırmaya uygundur: `index.html`, `app.js`, `validation.mjs`, `tour.css`, `config.json`, `vendor/`, `images/` ve `audio/` birlikte yayınlanabilir. Sunucuyu veya editörü internete açmaya gerek yoktur. Statik barındırmada editörün kaydetme/yükleme işlemleri çalışmaz; düzenlemeler yerelde yapılır, ardından dosyalar yayınlanır. Bu çalışma herhangi bir yere yayınlanmadı.

Bu sürüm tek kullanıcı için yerel editördür; eşzamanlı ekip düzenlemesi ve sürümler arası birleştirme içermez. Aynı projeyi birden fazla sekmede düzenlemeyin. Büyük panoramaların ilk açılış süresi hâlâ orijinal dosya boyutu ve cihazın WebGL kapasitesine bağlıdır; asıl görseller kalite kaybını önlemek için yeniden sıkıştırılmadı. Mevcut dil düğmeleri müze içeriklerini çevirmediğinden yeni arayüz Türkçe hazırlanmıştır.

Kontroller: `npm test`. Pannellum API kaynağı: https://pannellum.org/documentation/api/
