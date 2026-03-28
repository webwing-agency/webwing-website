// admin/preview-templates.js — robust preview template
if (window.CMS) {
    const CMS = window.CMS;
  
    function safeString(x) {
      if (x === undefined || x === null) return '';
      // if it's an object, JSON stringify short version:
      if (typeof x !== 'string') return String(x);
      return x;
    }
  
    CMS.registerPreviewTemplate('home_json', function (data) {
      const el = document.createElement('div');
  
      const rawTitle = safeString(data?.hero?.title_html || data?.hero?.title || '');
      const title = document.createElement('h1');
      // Use textContent or sanitized insertion — keep preview simple
      title.textContent = rawTitle.replace(/<\/?[^>]+(>|$)/g, ''); // strip tags for preview
      el.appendChild(title);
  
      const p = document.createElement('p');
      p.textContent = safeString(data?.hero?.subtitle || '');
      el.appendChild(p);
  
      return el;
    });
  }
  