import { iconElement } from './icons.js';
import { animateContentList } from './list-motion.js';

export function mediaSource(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim(),'https://museum.local/');
    if (!['http:','https:'].includes(url.protocol)) return null;
    if (url.hostname === 'open.spotify.com') {
      const match = url.pathname.match(/\/(?:embed\/)?(episode|track|album|playlist)\/([\w]+)/);
      if (match) return `spotify:${match[1]}:${match[2]}`;
    }
    if (['youtu.be','youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)) {
      const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1];
      if (id) return `youtube:${id}`;
    }
    if (url.hostname === 'drive.google.com') {
      const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
      if (id) return `drive:${id}`;
    }
    for (const key of [...url.searchParams.keys()]) if (/^utm_/i.test(key) || key === 'fbclid') url.searchParams.delete(key);
    url.hash = '';
    return url.href;
  } catch { return null; }
}
function linkedKind(href) {
  try {
    const url = new URL(href,'https://museum.local/');
    if (url.hostname === 'open.spotify.com') return /\/episode\//.test(url.pathname) ? 'podcast' : 'audio';
    if (/\.(jpg|jpeg|png|webp|gif|avif)$/i.test(url.pathname)) return 'image';
    if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(url.pathname)) return 'audio';
    if (url.hostname === 'drive.google.com' || /\.pdf$/i.test(url.pathname)) return 'document';
    return 'video';
  } catch { return 'video'; }
}
export function collectMedia(project) {
  const scenes = project?.scenes || {};
  const panoramas = new Set(Object.values(scenes).map(scene => mediaSource(scene.panorama)).filter(Boolean));
  const library = new Map();
  function add({href,kind,label,hotspot,audioSource},sceneId,index) {
    const key = mediaSource(href); if (!key || panoramas.has(key)) return;
    const occurrence = {sceneId,sceneTitle:scenes[sceneId].title,index};
    if (library.has(key)) { library.get(key).occurrences.push(occurrence); return; }
    library.set(key,{key,href,kind,label:(typeof label === 'string' ? label.trim() : '') || ({image:'Eser görseli',audio:'Sesli anlatım',podcast:'Podcast',document:'Belge',video:'Video / medya'})[kind],hotspot,audioSource,occurrences:[occurrence]});
  }
  for (const [sceneId,scene] of Object.entries(scenes)) {
    for (const [index,hs] of (scene.hotSpots || []).entries()) {
      if (hs.type === 'scene') continue;
      const href = hs.videoURL || hs.URL;
      if (href) {
        const kind = linkedKind(href), label = hs.text || hs.description;
        const hotspot = kind === 'image' ? {type:'info',text:label,description:hs.description,coverImage:href} : {...hs,type:'info',videoURL:href};
        add({href,kind,label,hotspot,audioSource:kind === 'audio' && !mediaSource(href)?.startsWith('spotify:') ? href : null},sceneId,index);
      } else if (hs.coverImage) {
        add({href:hs.coverImage,kind:'image',label:hs.text || hs.description,hotspot:hs},sceneId,index);
      }
    }
    if (scene.audio) add({href:scene.audio,kind:'audio',label:`${scene.title} · Sesli anlatım`,audioSource:scene.audio},sceneId,null);
  }
  return [...library.values()];
}
const searchText = value => String(value || '').toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu,'').replace(/ı/g,'i');
export function filterMedia(entries,query = '') {
  const search = searchText(query.trim());
  return entries.filter(entry => searchText([entry.label,entry.kind,kinds[entry.kind]?.text,...entry.occurrences.map(item => item.sceneTitle)].join(' ')).includes(search));
}
const kinds = {podcast:{text:'Podcast',icon:'headphones'},video:{text:'Video / medya',icon:'video'},audio:{text:'Ses',icon:'volume'},image:{text:'Görsel',icon:'image'},document:{text:'Belge',icon:'book'}};
export class MediaLibrary {
  constructor({root,getProject,onOpen,onNavigate,onTabChange}) {
    Object.assign(this,{getProject,onOpen,onNavigate,onTabChange}); this.activeTab = 'scenes'; this.queries = {scenes:'',media:''};
    const $ = id => root.querySelector(`#${id}`);
    this.search = $('search'); this.sceneList = $('sceneList'); this.mediaList = $('mediaList'); this.title = $('contentTitle'); this.count = $('sceneCount'); this.addScene = $('addScene');
    this.tabs = {scenes:$('contentScenesTab'),media:$('contentMediaTab')};
    for (const [tab,button] of Object.entries(this.tabs)) {
      button.addEventListener('click',() => this.setTab(tab));
      button.addEventListener('keydown',event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 'scenes' : event.key === 'End' ? 'media' : tab === 'scenes' ? 'media' : 'scenes';
        this.setTab(next); this.tabs[next].focus();
      });
    }
  }
  setTab(tab) {
    if (tab === this.activeTab) return;
    this.queries[this.activeTab] = this.search.value; this.activeTab = tab; this.search.value = this.queries[tab];
    this.onTabChange();
  }
  refresh({animate = false} = {}) {
    const project = this.getProject(); if (!project) return;
    const media = this.activeTab === 'media';
    this.sceneList.hidden = media; this.mediaList.hidden = !media;
    this.title.textContent = media ? 'Medyalar' : 'Sahneler';
    this.search.placeholder = media ? 'Medyalarda ara…' : 'Sahnelerde ara…'; this.search.setAttribute('aria-label',media ? 'Medya ara' : 'Sahne ara');
    if (this.addScene) this.addScene.hidden = media;
    for (const [tab,button] of Object.entries(this.tabs)) { button.classList.toggle('active',tab === this.activeTab); button.setAttribute('aria-selected',String(tab === this.activeTab)); button.tabIndex = tab === this.activeTab ? 0 : -1; }
    if (!media) { this.count.textContent = Object.keys(project.scenes).length; return; }
    const entries = collectMedia(project); this.count.textContent = entries.length;
    this.mediaList.replaceChildren();
    const filtered = filterMedia(entries,this.search.value);
    if (!filtered.length) {
      const empty = document.createElement('p'); empty.className = 'library-empty'; empty.textContent = entries.length ? 'Aramanıza uygun medya bulunamadı.' : 'Henüz medya eklenmemiş.'; this.mediaList.append(empty); return;
    }
    for (const entry of filtered) {
      const card = document.createElement('article'); card.className = 'media-card';
      const button = document.createElement('button'); button.className = 'media-open'; button.type = 'button'; button.title = entry.label;
      const icon = document.createElement('span'); icon.className = `media-card-icon media-kind-${entry.kind}`; icon.append(iconElement(kinds[entry.kind].icon));
      const text = document.createElement('span'); text.className = 'media-card-copy';
      const badge = document.createElement('span'); badge.className = 'media-card-kind'; badge.textContent = kinds[entry.kind].text;
      const title = document.createElement('strong'); title.textContent = entry.label;
      const sources = document.createElement('div'); sources.className = 'media-card-sources'; sources.setAttribute('aria-label','İlgili sahneler');
      const scenes = new Map(entry.occurrences.map(item => [item.sceneId,item.sceneTitle]));
      for (const [sceneId,sceneTitle] of scenes) {
        const link = document.createElement('button'); link.className = 'media-scene-link'; link.type = 'button'; link.textContent = sceneTitle;
        link.setAttribute('aria-label',`${sceneTitle} sahnesine git`);
        link.addEventListener('click',event => { event.stopPropagation(); this.onNavigate?.(sceneId); }); sources.append(link);
      }
      text.append(badge,title); button.append(icon,text);
      button.addEventListener('click',() => this.onOpen(entry,button)); card.append(button,sources); this.mediaList.append(card);
    }
    if (animate) animateContentList(this.mediaList);
  }
}
