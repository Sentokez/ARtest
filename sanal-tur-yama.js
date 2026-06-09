// ==========================================
// BİLGİ PENCERESİ BOYUT VE GİZLEME AYARLARI
// ==========================================
const bilgiPenceresiGenislik = "800px"; 
const bilgiFotoYukseklik     = "60vh";  

const customStyles = `
  /* Sol alttaki siyah sahne ismi kutusunu tamamen gizler */
  .pnlm-title-box {
    display: none !important;
  }

  /* Butonların üzerine gelince çıkan platformun kendi yazılarını gizler */
  .vt-hotspot::after {
    display: none !important;
    content: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }

  /* Pannellum'un varsayılan ipucu kutularını tamamen ezmek için */
  .pnlm-tooltip span {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }

  .info-overlay .info-content {
    max-width: ${bilgiPenceresiGenislik} !important;
    overflow: visible !important; 
    position: relative;
  }
  
  .info-img-wrapper {
    width: 100%;
    overflow: hidden !important;
    border-radius: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    transform: translateZ(0);
    will-change: transform;
  }
  
  .info-overlay .info-img {
    max-height: ${bilgiFotoYukseklik} !important;
    transform-origin: center center !important;
    cursor: default !important;
    pointer-events: auto !important;
    user-select: none;
    -webkit-user-drag: none;
    
    will-change: transform;
    backface-visibility: hidden;
    transform: translate3d(0,0,0);
    transition: transform 0.08s cubic-bezier(0.25, 1, 0.5, 1);
  }

  /* KAPATMA (X) BUTONU MİLİMETRİK ORTALAMA VE ANİMASYON KİLİTLEME */
  .btn-close {
    display: grid !important;          
    place-items: center !important;     
    line-height: 0 !important;          
    padding: 0 !important;              
    padding-bottom: 2px !important;     
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;         
    min-height: 44px !important;        
    max-width: 44px !important;         
    max-height: 44px !important;        
    border-radius: 50% !important;      
    box-sizing: border-box !important;  
    contain: layout size style !important; 
  }

  .btn-close:hover {
    width: 44px !important;
    height: 44px !important;
    transform: rotate(90deg) scale(1.1) !important; 
    transform-origin: center center !important;
  }

  /* FULL SCREEN (TAM EKRAN) KATMAN VE BOYUT DÜZELTMESİ */
  :-webkit-full-screen .info-overlay,
  :-ms-fullscreen .info-overlay,
  :fullscreen .info-overlay {
    z-index: 2147483647 !important; 
    pointer-events: auto !important;
  }

  :-webkit-full-screen .ui-layer,
  :-ms-fullscreen .ui-layer,
  :fullscreen .ui-layer {
    z-index: 2147483646 !important;
  }

  :-webkit-full-screen .btn-close,
  :-ms-fullscreen .btn-close,
  :fullscreen .btn-close {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    min-height: 44px !important;
    max-width: 44px !important;
    max-height: 44px !important;
    border-radius: 50% !important;
  }
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = customStyles;
document.head.appendChild(styleSheet);




// =========================================================================
// GÜVENLİ VE DİNAMİK BOYUTLU MEDYA POP-UP KATMANI (KAPATMA İSTİSNALI)
// =========================================================================
const videoOverlayHTML = `
<div class="info-overlay" id="videoOverlay" onclick="closeVideo()">
  <div class="info-content" id="videoGövde" style="max-width: 800px; width: 90%; padding: 25px 20px 20px 20px; background: #fff; border-radius: 20px; position: relative;">
    <button class="btn-close" onclick="closeVideo()" style="position: absolute; top: -15px; right: -15px; z-index: 9999999 !important; pointer-events: auto !important;">×</button>
    <div id="videoWrapper" style="position: relative; width: 100%; height: auto; overflow: hidden; border-radius: 15px;">
      <iframe id="videoPlayer" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width: 100%; display: block;"></iframe>
    </div>
  </div>
</div>`;

document.documentElement.insertAdjacentHTML('beforeend', videoOverlayHTML);

// ÇARPI BUTONUNU KORUYAN PLATFORM ENGELLEME KALKANI
const güvenliBölge = document.getElementById('videoOverlay');
if (güvenliBölge) {
  const olaylarıKes = (e) => { 
    // Eğer tıklanan şey veya tıklanan şeyin üst elemanı çarpı butonu ise engelleme yapma!
    if (e.target.closest('.btn-close')) {
      return; 
    }
    // Diğer tüm tık tık hareketlerinde platformun videoyu durdurmasını engelle
    e.stopPropagation(); 
  };
  güvenliBölge.addEventListener('click', olaylarıKes, true);
  güvenliBölge.addEventListener('mousedown', olaylarıKes, true);
  güvenliBölge.addEventListener('mouseup', olaylarıKes, true);
}
if (typeof config !== 'undefined' && config.scenes) {
  Object.keys(config.scenes).forEach(sid => {
    if(config.scenes[sid].hotSpots) {
      config.scenes[sid].hotSpots.forEach(hs => {
        if(hs.URL) {
          hs.videoURL = hs.URL; 
          delete hs.URL;       
        }
      });
    }
  });
}

// =========================================================================
// EVRENSEL MEDYA OYNATICI MOTORU (DİNAMİK BOYUT SÜRÜMÜ)
// =========================================================================
window.openVideo = function(url) {
  const videoPlayer = document.getElementById('videoPlayer');
  const videoOverlay = document.getElementById('videoOverlay');
  const videoWrapper = document.getElementById('videoWrapper');
  
  let embedUrl = url;
  let pencereYukseklik = "450px"; // Varsayılan genel yükseklik
  
  // 1. YouTube Dönüştürücü (Klasik 16:9 Sinematik Oran İster)
  if (url.includes('youtube.com/watch?v=') || url.includes('youtu.be/')) {
    const videoId = url.includes('youtu.be/') ? url.split('youtu.be/')[1].split('?')[0] : url.split('v=')[1].split('&')[0];
    embedUrl = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&controls=0&disablekb=1';
    
    // Genişliğin %56.25'i kadar yükseklik vererek tam 16:9 YouTube standartı yakalıyoruz
    pencereYukseklik = (videoWrapper.offsetWidth * 0.5625) + "px";
  } 
  
  // 2. Google Drive Dönüştürücü (Belgeler veya videolar için ideal dikey/yatay oran)
  else if (url.includes('drive.google.com') && url.includes('/view')) {
    embedUrl = url.split('/view')[0] + '/preview';
    pencereYukseklik = "500px"; // Drive dökümanları veya videoları için en temiz boy
  } 
  
  // 3. Spotify Dönüştürücü (Spotify kompakt bir player olduğu için yüksekliği daraltıyoruz)
  else if (url.includes('spotify.com')) {
    embedUrl = url;
    // Gönderdiğin görseldeki dikey player boşluğunu sıfırlamak için tam yükseklik
    pencereYukseklik = "155px"; 
  }
  
  // iframe ve dış kutunun yüksekliğini milimetrik olarak eşitliyoruz
  videoPlayer.style.height = pencereYukseklik;
  videoWrapper.style.height = pencereYukseklik;
  
  videoPlayer.src = embedUrl;
  videoOverlay.classList.add('active');
}

window.closeVideo = function() {
  const videoPlayer = document.getElementById('videoPlayer');
  const videoOverlay = document.getElementById('videoOverlay');
  videoOverlay.classList.remove('active');
  videoPlayer.src = '';
}


// ==========================================
// DİNAMİK MOUSE TEKERLEK ZOOM VE SÜRÜKLEME (PAN) SİSTEMİ
// ==========================================

let scale = 1;
const minScale = 1;
const maxScale = 5;      
const zoomSpeed = 0.2;

let isDragging = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;

function updateImgTransform(img) {
  if (!img) return;
  img.style.transform = `translate3d(${translateX}px, ${translateY}px, 0px) scale(${scale})`;
  
  if (isDragging) {
    img.style.setProperty('cursor', 'move', 'important'); 
  } else if (scale === minScale) {
    img.style.setProperty('cursor', 'default', 'important'); 
  } else if (scale === maxScale) {
    img.style.setProperty('cursor', 'zoom-out', 'important'); 
  }
}

document.addEventListener('wheel', (e) => {
  const infoOverlay = document.getElementById('infoOverlay');
  const infoImg = document.getElementById('infoImg');
  
  if (infoOverlay && infoOverlay.classList.contains('active') && e.target === infoImg) {
    e.preventDefault();
    
    if (e.deltaY < 0) {
      scale += zoomSpeed;
    } else {
      scale -= zoomSpeed;
    }
    
    scale = Math.max(minScale, Math.min(maxScale, scale));
    
    if (scale === 1) {
      translateX = 0;
      translateY = 0;
    }
    
    updateImgTransform(infoImg);

    if (!isDragging && scale > minScale && scale < maxScale) {
      if (e.deltaY < 0) {
        infoImg.style.setProperty('cursor', 'zoom-in', 'important');  
      } else {
        infoImg.style.setProperty('cursor', 'zoom-out', 'important'); 
      }
    }
  }
}, { passive: false });

document.addEventListener('mousedown', (e) => {
  if (e.target && e.target.id === 'infoImg' && scale > 1) {
    e.preventDefault();
    isDragging = true;
    e.target.style.transition = 'none'; 
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    updateImgTransform(e.target);
  }
}, true);

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const infoImg = document.getElementById('infoImg');
  if (infoImg) {
    e.preventDefault();
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    
    requestAnimationFrame(() => {
      updateImgTransform(infoImg);
    });
  }
}, true);

document.addEventListener('mouseup', (e) => {
  if (isDragging) {
    isDragging = false;
    const infoImg = document.getElementById('infoImg');
    if (infoImg) {
      infoImg.style.transition = 'transform 0.1s ease-out';
      if (scale === maxScale) {
        infoImg.style.setProperty('cursor', 'zoom-out', 'important');
      } else if (scale === minScale) {
        infoImg.style.setProperty('cursor', 'default', 'important');
      } else {
        infoImg.style.setProperty('cursor', 'zoom-in', 'important');
      }
      updateImgTransform(infoImg);
    }
  }
}, true);

document.addEventListener('mouseleave', () => {
  if (isDragging) {
    isDragging = false;
    const infoImg = document.getElementById('infoImg');
    if (infoImg) {
      infoImg.style.transition = 'transform 0.1s ease-out';
      updateImgTransform(infoImg);
    }
  }
}, true);


// ==========================================
// ARKA PLAN TEMİZLİKÇİSİ VE TIKLAMA YÖNETİMİ
// ==========================================

function temizleButonYazilari() {
  setTimeout(() => {
    const butonlar = document.querySelectorAll('.vt-hotspot');
    butonlar.forEach(btn => {
      if (btn.getAttribute('title')) btn.removeAttribute('title');
      
      const icYazilar = btn.querySelectorAll('*');
      icYazilar.forEach(el => {
        if(el.innerText) el.innerText = '';
        if(el.textContent) el.textContent = '';
      });
    });
  }, 300); 
}

if(typeof viewer !== 'undefined') {
  viewer.on('load', temizleButonYazilari);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    if(typeof viewer !== 'undefined') viewer.on('load', temizleButonYazilari);
  });
}

function tamEkranKontrol() {
  const infoOverlay = document.getElementById('infoOverlay');
  const videoOverlay = document.getElementById('videoOverlay');
  const viewerEl = document.getElementById('viewer');
  
  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
    if(infoOverlay && infoOverlay.parentNode !== viewerEl) viewerEl.appendChild(infoOverlay);
    if(videoOverlay && videoOverlay.parentNode !== viewerEl) viewerEl.appendChild(videoOverlay);
  } else {
    if(infoOverlay && infoOverlay.parentNode === viewerEl) document.body.appendChild(infoOverlay);
    if(videoOverlay && videoOverlay.parentNode === viewerEl) document.body.appendChild(videoOverlay);
  }
}
document.addEventListener('fullscreenchange', tamEkranKontrol);
document.addEventListener('webkitfullscreenchange', tamEkranKontrol);
document.addEventListener('msfullscreenchange', tamEkranKontrol);

document.addEventListener('click', (e) => {
  if(e.target.closest('.type-scene')) {
    temizleButonYazilari();
  }

  const infoTarget = e.target.closest('.type-info');
  if(infoTarget) {
    setTimeout(() => {
      let infoImg = document.getElementById('infoImg');
      if(infoImg && !infoImg.parentNode.classList.contains('info-img-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'info-img-wrapper';
        infoImg.parentNode.insertBefore(wrapper, infoImg);
        wrapper.appendChild(infoImg);
      }
      
      if(infoImg) {
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateImgTransform(infoImg);
      }
    }, 100);
  }

  const videoTarget = e.target.closest('.type-video');
  if(videoTarget && typeof viewer !== 'undefined') {
    const hsId = Array.from(videoTarget.classList).find(c => c.startsWith('hs-id-')).split('hs-id-')[1];
    const sceneId = viewer.getScene();
    const hs = config.scenes[sceneId].hotSpots.find(h => h.cssClass.includes(hsId));
    if(hs && hs.videoURL) {
      openVideo(hs.videoURL);
    }
  }
}, true);
// ==========================================
// ÖZEL LOADING EKRANINI KALDIRMA MOTORU
// ==========================================
function ozelLoadingEkraniniKapat() {
  const ozelEkran = document.getElementById('ozel-loading-screen');
  if (ozelEkran) {
    // Tur hazır olduğunda sınıfa 'kaybol' ekleyerek 0.8 saniyede pürüzsüzce kapatır
    ozelEkran.classList.add('kaybol');
    // Bellekten tamamen silmek için animasyon bitiminde DOM'dan uçurur
    setTimeout(() => { ozelEkran.remove(); }, 800);
  }
}

// Pannellum motoru ilk sahneyi tamamen çizdiği an ekranı kapatır
if (typeof viewer !== 'undefined') {
  viewer.on('load', ozelLoadingEkraniniKapat);
} else {
  // Eğer motor gecikirse tarayıcı yüklemesi bittiğinde her halükarda kapatır (Güvenlik kilidi)
  window.addEventListener('load', ozelLoadingEkraniniKapat);
}