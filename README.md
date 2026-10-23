# Ankara Üniversitesi Müzesi · 360° Sanal Tur

Bu depo, müzenin ziyaretçilere açık statik sanal turunu içerir.

`index.html`, `tour.js`, `tour.css`, `icons.js`, `validation.mjs`, `map-data.js`, `map3d.js`, `map3d.css`, `config.json`, `vendor/`, `models/`, `images/` ve varsa `audio/` birlikte yayınlanmalıdır. GitHub Pages ile sunulabilir.

Panorama yüklenince sağ üstte küçük bir **3D mini harita** açılır. Mini haritaya tıklayınca büyük harita paneli açılır; ↙ düğmesiyle yeniden küçültülür. **3D Harita** düğmesi de büyük paneli açabilir. Model döndürülebilir, yakınlaştırılabilir ve opaklığı ayarlanabilir. Konumu tanımlanmış sahne noktaları haritadan açılır. Model ve Three.js dosyaları ilk panorama hazır olduktan sonra yüklenir; panorama açılışını bekletmez. Mini harita ve büyük panel aynı çizim alanını paylaşır. Küçük görünümde yaklaşık 20 kare/saniye kullanılır; sekme arka plandayken çizim durur. Three.js 0.180.0 yerel kopyası `vendor/three/` içindedir; lisansı aynı klasördedir.

Yerel düzenleyici, sunucu, testler ve yedek dosyaları Git takibine dahil değildir.
