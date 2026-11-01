# Ankara Üniversitesi Müzesi · 360° Sanal Tur

Bu depo, müzenin ziyaretçilere açık statik sanal turunu içerir.

`index.html`, `tour.js`, `tour.css`, `media-library.js`, `list-motion.js`, `content-motion.js`, `image-viewer.js`, `scene-navigation.js`, `spotify-player.js`, `icons.js`, `validation.mjs`, `map-data.js`, `map3d.js`, `map3d.css`, `model-data.js`, `model-viewer.js`, `model-viewer.css`, `config.json`, `vendor/`, `models/`, `images/` ve varsa `audio/` birlikte yayınlanmalıdır. GitHub Pages ile sunulabilir.

Panorama üzerindeki sahne geçişlerinde bakış yönü, dikey açı ve yakınlık korunur. Sol taraftaki sahne listesinden seçim yapıldığında ise kayıtlı başlangıç açısı ve yakınlığı kullanılır. Panoramalar arasındaki yön farkı haritanın yön düzeltmelerinden hesaplanır; harita kapalıyken de çalışır. İlk açılışta sahnenin kayıtlı başlangıç açısı kullanılır.

Bilgi ve medya pencereleri, tıklanan panorama noktasından veya medya kartından büyüyerek ekranın ortasına gelir. Sahne geçişleri bundan etkilenmez. Cihazın hareket azaltma tercihi açıksa bu animasyon atlanır.

Fotoğraflarda fare tekerleğiyle yakınlaştırılıp uzaklaştırılabilir; yakınlaştırdıktan sonra sol tuşla sürüklenebilir. Çift tıklama başlangıç görünümüne döndürür. Klavyeden +/−, yön tuşları ve 0 da kullanılabilir.

Sol içerik menüsündeki **Sahneler / Medyalar** sekmeleriyle panoramalar veya turda kullanılan podcast, video, eser görseli, belge ve sesler listelenebilir. Aynı içeriğin farklı sahnelerdeki kopyaları tek medya kartında birleştirilir. Kartın altındaki sahne adları tıklanarak ilgili panoramaya geçilir; medyanın kendisi üstteki başlıktan açılır. Arama başlığı ve bulunduğu bölümleri kapsar. 360° panoramalar ve yalnızca metin içeren bilgi noktaları medya listesine dahil değildir.

Spotify panelindeki **Gezerken dinle** seçeneği oynatıcıyı mini haritanın altında küçük, etkileşimi engellemeyen bir görünüme alır. Aynı oynatıcı korunur; sahneler arasında gezerken dinlemeye devam edilebilir. ⤢ ile panel büyütülür, × ile dinleme bitirilir. Harita kapalıysa oynatıcı sağ üstte tek başına görünür.

Panorama yüklenince sağ üstte küçük bir **3D mini harita** açılır. Mini haritaya tıklayınca büyük harita paneli açılır; ↙ düğmesiyle yeniden küçültülür. **3D Harita** düğmesi de büyük paneli açabilir. Model döndürülebilir, yakınlaştırılabilir ve opaklığı ayarlanabilir. Konumu tanımlanmış sahne noktaları haritadan açılır. Model ve Three.js dosyaları ilk panorama hazır olduktan sonra yüklenir; panorama açılışını bekletmez. Mini harita ve büyük panel aynı çizim alanını paylaşır. Küçük görünümde yaklaşık 20 kare/saniye kullanılır; sekme arka plandayken çizim durur. Three.js 0.180.0 yerel kopyası `vendor/three/` içindedir; lisansı aynı klasördedir.

Yerel düzenleyici, sunucu, testler ve yedek dosyaları Git takibine dahil değildir.

3D eser noktaları: Yerel editörde **3D model ekle** düğmesiyle konum seçilir, **GLB model yükle** ile dosya eklenir. Nokta uygulanıp proje kaydedilir. Blender’dan glTF 2.0 → GLB olarak, dokuları dosyaya dahil ederek ve Draco sıkıştırmasını kapatarak dışa aktarın. Model yalnızca gezinme alanının içinde, bulanık panoramanın önünde açılır. Sol menü ve üst çubuk bulanıklaşmaz. Sol tuş döndürür, tekerlek yakınlaştırır, sağ tuş veya Shift + sol tuş kaydırır. Dokunmatik ekranda tek parmak döndürür, iki parmak yakınlaştırıp kaydırır. Görünümü sıfırla başlangıca döndürür; × veya Esc kapatır. Modeller Medyalar sekmesinde de listelenir. Kapanınca çizim ve model kaynakları serbest bırakılır.
