// js/render/legal.js
async function loadAndRender(path){
    const res = await fetch(path, {cache: 'no-store'});
    if (!res.ok) { console.warn('no legal file', path); return; }
    const data = await res.json();
    if (data.meta_title) document.title = data.meta_title;
    if (data.meta_description) document.querySelector('meta[name="description"]')?.setAttribute('content', data.meta_description);
    const titleEl = document.querySelector('.page-title-small') || document.querySelector('h1');
    if (titleEl && data.page_title) titleEl.textContent = data.page_title;
    const container = document.querySelector('.legal-section') || document.querySelector('main');
    if (container && data.content_html) {
      // content_html is markdown in config; the CMS stored markdown. We will render as simple HTML
      // If CMS field is actually markdown, the JSON contains markdown string; we insert as text or basic conversion.
      // For now we set innerHTML using safe minimal replace of newlines -> <p>
      // If you prefer a markdown renderer, add one (marked.js) and use it here.
      const html = data.content_html
        .split(/\n{2,}/).map(para => `<p>${para.replace(/\n/g,'<br/>')}</p>`).join('');
      container.innerHTML = html;
    }
  }
  
  (async function(){
    // try both files; which one exists is determined by the page route
    await loadAndRender('/data/impressum.json');
    await loadAndRender('/data/privacy.json');
  })();
  