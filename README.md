# Ankara Üniversitesi Müzesi · 360° Sanal Tur

Bu depo, müzenin ziyaretçilere açık statik sanal turunu içerir.

`index.html`, `tour.js`, `tour.css`, `media-library.js`, `list-motion.js`, `content-motion.js`, `image-viewer.js`, `spotify-player.js`, `icons.js`, `validation.mjs`, `map-data.js`, `map3d.js`, `map3d.css`, `config.json`, `vendor/`, `models/`, `images/` ve varsa `audio/` birlikte yayınlanmalıdır. GitHub Pages ile sunulabilir.

Bilgi ve medya pencereleri, tıklanan panorama noktasından veya medya kartından büyüyerek ekranın ortasına gelir. Sahne geçişleri bundan etkilenmez. Cihazın hareket azaltma tercihi açıksa bu animasyon atlanır.

Fotoğraflarda fare tekerleğiyle yakınlaştırılıp uzaklaştırılabilir; yakınlaştırdıktan sonra sol tuşla sürüklenebilir. Çift tıklama başlangıç görünümüne döndürür. Klavyeden +/−, yön tuşları ve 0 da kullanılabilir.

Sol içerik menüsündeki **Sahneler / Medyalar** sekmeleriyle panoramalar veya turda kullanılan podcast, video, eser görseli, belge ve sesler listelenebilir. Aynı içeriğin farklı sahnelerdeki kopyaları tek medya kartında birleştirilir. Kartın altındaki sahne adları tıklanarak ilgili panoramaya geçilir; medyanın kendisi üstteki başlıktan açılır. Arama başlığı ve bulunduğu bölümleri kapsar. 360° panoramalar ve yalnızca metin içeren bilgi noktaları medya listesine dahil değildir.

Spotify panelindeki **Gezerken dinle** seçeneği oynatıcıyı mini haritanın altında küçük, etkileşimi engellemeyen bir görünüme alır. Aynı oynatıcı korunur; sahneler arasında gezerken dinlemeye devam edilebilir. ⤢ ile panel büyütülür, × ile dinleme bitirilir. Harita kapalıysa oynatıcı sağ üstte tek başına görünür.

Panorama yüklenince sağ üstte küçük bir **3D mini harita** açılır. Mini haritaya tıklayınca büyük harita paneli açılır; ↙ düğmesiyle yeniden küçültülür. **3D Harita** düğmesi de büyük paneli açabilir. Model döndürülebilir, yakınlaştırılabilir ve opaklığı ayarlanabilir. Konumu tanımlanmış sahne noktaları haritadan açılır. Model ve Three.js dosyaları ilk panorama hazır olduktan sonra yüklenir; panorama açılışını bekletmez. Mini harita ve büyük panel aynı çizim alanını paylaşır. Küçük görünümde yaklaşık 20 kare/saniye kullanılır; sekme arka plandayken çizim durur. Three.js 0.180.0 yerel kopyası `vendor/three/` içindedir; lisansı aynı klasördedir.

Yerel düzenleyici, sunucu, testler ve yedek dosyaları Git takibine dahil değildir.
