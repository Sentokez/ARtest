// Shared SVG icons keep the local editor and the published tour identical.
// All geometry is defined here; project data can only select a known icon.
const icons = {
  'arrow-up': ['Yukarı / ileri', ['M12 20V4', 'm5 11 7-7 7 7']],
  'arrow-right': ['Sağa', ['M4 12h16', 'm13 5 7 7-7 7']],
  'arrow-left': ['Sola', ['M20 12H4', 'm11 5-7 7 7 7']],
  'arrow-down': ['Aşağı', ['M12 4v16', 'm5 13 7 7 7-7']],
  'chevron-up': ['Yukarı şevron', ['m5 16 7-8 7 8']],
  'chevron-right': ['Sağa şevron', ['m8 5 8 7-8 7']],
  'chevron-left': ['Sola şevron', ['m16 5-8 7 8 7']],
  'chevron-down': ['Aşağı şevron', ['m5 8 7 8 7-8']],
  'turn-right': ['Sağa dön', ['M5 20V9a3 3 0 0 1 3-3h11', 'm14 2 5 4-5 4']],
  'turn-left': ['Sola dön', ['M19 20V9a3 3 0 0 0-3-3H5', 'm10 2-5 4 5 4']],
  stairs: ['Merdiven', ['M3 20h6v-6h6V8h6V3']],
  door: ['Kapı / çıkış', ['M4 21V3h12v18', 'M2 21h18', 'M12 12h.01']],
  home: ['Ana giriş', ['m3 10 9-7 9 7', 'M5 9v12h14V9', 'M9 21v-8h6v8']],
  location: ['Konum', ['M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z', 'M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z']],
  map: ['Harita', ['m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z', 'M9 3v16', 'M15 5v16']],
  info: ['Bilgi', ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M12 11v6', 'M12 7h.01']],
  video: ['Video / oynat', ['m9 5 11 7-11 7Z']],
  film: ['Film', ['M3 3h18v18H3Z', 'M7 3v18', 'M17 3v18', 'M3 8h4', 'M3 16h4', 'M17 8h4', 'M17 16h4']],
  headphones: ['Podcast / kulaklık', ['M3 14v-3a9 9 0 0 1 18 0v3', 'M3 12h4v8H5a2 2 0 0 1-2-2Z', 'M21 12h-4v8h2a2 2 0 0 0 2-2Z']],
  microphone: ['Mikrofon', ['M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0Z', 'M5 10v2a7 7 0 0 0 14 0v-2', 'M12 19v3', 'M8 22h8']],
  volume: ['Ses / anlatım', ['m3 9 5 0 5-5v16l-5-5H3Z', 'M17 8a6 6 0 0 1 0 8', 'M20 5a10 10 0 0 1 0 14']],
  image: ['Fotoğraf / eser', ['M3 3h18v18H3Z', 'm3 17 6-6 5 5 3-3 4 4', 'M16 7h.01']],
  book: ['Kitap / belge', ['M12 5v16', 'M3 3c4-1 6 0 9 2 3-2 5-3 9-2v16c-4-1-6 0-9 2-3-2-5-3-9-2Z']],
  search: ['İncele / büyüteç', ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z', 'm15 15 6 6']],
  museum: ['Müze / fakülte', ['m2 8 10-6 10 6Z', 'M4 21h16', 'M6 11v7', 'M12 11v7', 'M18 11v7']],
  accessibility: ['Erişilebilirlik', ['M12 3h.01', 'M4 7h16', 'M12 7v7', 'm7 22 5-8 5 8']],
  link: ['Bağlantı', ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71']],
  star: ['Öne çıkan eser', ['m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z']]
};

export const iconOptions = Object.entries(icons).map(([id, [label]]) => ({ id, label }));
export function resolveIcon(hs, fallback = 'info') {
  if (Object.hasOwn(icons, hs.icon)) return hs.icon;
  const legacy = iconOptions.find(({ id }) => hs.cssClass?.includes(`icon-${id}`));
  return legacy?.id || (hs.cssClass?.includes('icon-move-forward') ? 'arrow-up' : fallback);
}
export function iconElement(id) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true', focusable:'false'})) svg.setAttribute(key, value);
  svg.classList.add('point-symbol');
  for (const d of (Object.hasOwn(icons, id) ? icons[id] : icons.info)[1]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d); svg.append(path);
  }
  return svg;
}
export function iconStroke(value, fallback = 2.5) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(5, parsed)) : fallback;
}
export function pointVisual(id) {
  const visual = document.createElement('span');
  visual.className = 'point-visual';
  visual.append(iconElement(id));
  return visual;
}
