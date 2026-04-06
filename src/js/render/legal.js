// js/render/legal.js
import { applySeo } from '../seo.js';
import { fetchCmsJson } from '../utils/cms-json.js';
import { getGlobalOgImage } from './site.js';

function markdownToHtmlBasic(md) {
    if (!md) return '';
    const lines = String(md).split('\n');
    const out = [];
    let inList = false;
  
    const closeList = () => {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
    };
  
    lines.forEach(raw => {
      const line = raw.trim();
      if (!line) {
        closeList();
        return;
      }
      if (/^---+$/.test(line)) {
        closeList();
        out.push('<hr/>');
        return;
      }
      if (/^###\s+/.test(line)) {
        closeList();
        out.push(`<h3>${line.replace(/^###\s+/, '')}</h3>`);
        return;
      }
      if (/^##\s+/.test(line)) {
        closeList();
        out.push(`<h2>${line.replace(/^##\s+/, '')}</h2>`);
        return;
      }
      if (/^#\s+/.test(line)) {
        closeList();
        out.push(`<h1>${line.replace(/^#\s+/, '')}</h1>`);
        return;
      }
      if (/^[-*]\s+/.test(line)) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push(`<li>${line.replace(/^[-*]\s+/, '')}</li>`);
        return;
      }
      closeList();
      out.push(`<p>${line}</p>`);
    });
  
    closeList();
    return out.join('');
  }
  
  async function loadAndRender(path, canonicalPath){
    const data = await fetchCmsJson(path);
    if (data.meta_title) document.title = data.meta_title;
    if (data.meta_description) document.querySelector('meta[name="description"]')?.setAttribute('content', data.meta_description);
    const globalOg = await getGlobalOgImage();
    applySeo({
      title: data.meta_title,
      description: data.meta_description,
      canonicalPath,
      robots: 'noindex, nofollow',
      ogImagePath: globalOg
    });
    const titleEl = document.querySelector('.page-title-small') || document.querySelector('h1');
    if (titleEl && data.page_title) titleEl.textContent = data.page_title;
    const container = document.querySelector('.legal-content') || document.querySelector('.legal-section') || document.querySelector('main');
    if (container && data.content_html) {
      const raw = String(data.content_html || '').trim();
      const looksLikeHtml = /<\w+[\s>]/.test(raw);
      container.innerHTML = looksLikeHtml ? raw : markdownToHtmlBasic(raw);
    }
  }
  
  export async function initLegalPage() {
    const main = document.querySelector('main[data-legal]');
    const key = main?.dataset?.legal;
    const map = {
      impressum: { dataPath: '/data/impressum.json', canonicalPath: '/impressum.html' },
      privacy: { dataPath: '/data/privacy.json', canonicalPath: '/datenschutzerkl%C3%A4rung.html' },
      agb: { dataPath: '/data/agb.json', canonicalPath: '/agb.html' }
    };
    const target = map[key] || map.impressum;
    await loadAndRender(target.dataPath, target.canonicalPath);
  }
  
