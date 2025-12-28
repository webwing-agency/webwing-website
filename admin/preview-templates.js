// admin/preview-templates.js
if (window.CMS) {
    const CMS = window.CMS;
    CMS.registerPreviewTemplate('home_json', function (data) {
      const el = document.createElement('div');
      const title = document.createElement('h1');
      const rawTitle = (data && data.hero && (typeof data.hero.title_html === 'string')) ? data.hero.title_html : 'Homepage preview';
      // strip tags for the preview title to avoid innerHTML surprises
      title.textContent = rawTitle.replace(/<[^>]*>?/gm, '');
      el.appendChild(title);
      const p = document.createElement('p');
      p.textContent = (data && data.hero && data.hero.subtitle) ? data.hero.subtitle : '';
      el.appendChild(p);
      return el;
    });
  }
  