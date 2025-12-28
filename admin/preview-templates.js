// admin/preview-templates.js
if (window.CMS) {
    const CMS = window.CMS;
  
    CMS.registerPreviewTemplate('home_json', function (data) {
      const el = document.createElement('div');
      const title = document.createElement('h1');
      title.textContent = (data.hero && data.hero.title_html) ? data.hero.title_html.replace(/<[^>]*>?/gm, '') : 'Homepage preview';
      el.appendChild(title);
      return el;
    });
  
    const makeSimplePreview = (getText) => (data) => {
      const el = document.createElement('div');
      const title = document.createElement('h2');
      title.textContent = data.page_title || 'Page preview';
      el.appendChild(title);
      const p = document.createElement('p');
      p.textContent = getText(data);
      el.appendChild(p);
      return el;
    };
  
    CMS.registerPreviewTemplate('services', makeSimplePreview(d => (d.services && d.services.length ? d.services[0].title : 'No services yet')));
    CMS.registerPreviewTemplate('projects', makeSimplePreview(d => (d.projects && d.projects.length ? d.projects[0].title : 'No projects yet')));
    CMS.registerPreviewTemplate('kontakt', makeSimplePreview(d => d.email || d.phone || 'No contact yet'));
    CMS.registerPreviewTemplate('book_call', makeSimplePreview(d => (d.contact && d.contact.email) || 'No booking info'));
    CMS.registerPreviewTemplate('impressum', makeSimplePreview(d => (d.content_html ? (d.content_html.slice(0,120) + '...') : 'No content')));
    CMS.registerPreviewTemplate('privacy', makeSimplePreview(d => (d.content_html ? (d.content_html.slice(0,120) + '...') : 'No content')));
  }
  