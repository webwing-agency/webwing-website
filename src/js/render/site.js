let sitePromise = null;

function safeString(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

async function fetchSiteData() {
  if (!sitePromise) {
    sitePromise = fetch('/data/site.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch site.json: ${res.status}`);
        }
        return res.json();
      })
      .catch((err) => {
        sitePromise = null;
        throw err;
      });
  }

  return sitePromise;
}

function createAnchor(doc, link = {}, className = '') {
  const a = doc.createElement('a');
  a.href = safeString(link.href || '#');
  a.textContent = safeString(link.label || '');
  if (className) a.className = className;
  return a;
}

function renderHeader(header = {}, doc = document) {
  const nav = doc.querySelector('.nav-links');
  if (nav && Array.isArray(header.nav_links)) {
    nav.innerHTML = '';
    header.nav_links.forEach((link) => {
      const classes = ['nav-link'];
      if (link?.is_cta) classes.push('cta-link');
      nav.appendChild(createAnchor(doc, link, classes.join(' ')));
    });
  }

  const popupLinks = doc.querySelector('.popup-menu-link-container');
  if (popupLinks && Array.isArray(header.popup_links)) {
    popupLinks.innerHTML = '';
    header.popup_links.forEach((link) => {
      const item = doc.createElement('div');
      item.className = 'popup-link';
      item.appendChild(createAnchor(doc, link));
      popupLinks.appendChild(item);
    });
  }

  const popupDecorations = doc.querySelector('.popup-menu-decorations');
  if (popupDecorations) {
    popupDecorations.innerHTML = '';

    const appendSpan = (text) => {
      const span = doc.createElement('span');
      span.textContent = safeString(text);
      popupDecorations.appendChild(span);
    };

    const appendLinkedSpan = (text, href) => {
      const span = doc.createElement('span');
      const a = doc.createElement('a');
      a.href = href;
      a.textContent = safeString(text);
      span.appendChild(a);
      popupDecorations.appendChild(span);
    };

    appendSpan(header.popup_brand_text || 'Webwing Design Agency');
    appendSpan('+');
    appendLinkedSpan(header.email || '', `mailto:${safeString(header.email || '')}`);
    appendSpan('+');
    appendLinkedSpan(header.phone || '', `tel:${safeString(header.phone || '')}`);
    appendSpan('+');
    appendSpan(header.status_text || '');
  }
}

function renderFooter(footer = {}, doc = document) {
  const slogan = doc.querySelector('.logo-container .slogan');
  if (slogan && footer.slogan) slogan.textContent = safeString(footer.slogan);

  const about = doc.querySelector('.footer-about');
  if (about && footer.about) about.textContent = safeString(footer.about);

  const meta = doc.querySelector('.footer-meta');
  if (meta && footer.copyright) meta.textContent = safeString(footer.copyright);

  const footerNav = doc.querySelector('.footer-nav');
  if (footerNav && Array.isArray(footer.nav_links)) {
    footerNav.innerHTML = '';
    footer.nav_links.forEach((link) => {
      const item = doc.createElement('div');
      item.className = 'footer-nav-link';
      item.appendChild(createAnchor(doc, link));
      footerNav.appendChild(item);
    });
  }

  const legalLinks = doc.querySelector('.legal-links');
  if (legalLinks && Array.isArray(footer.legal_links)) {
    legalLinks.innerHTML = '';
    footer.legal_links.forEach((link) => {
      legalLinks.appendChild(createAnchor(doc, link));
    });
  }
}

export async function initSiteChrome(doc = document) {
  try {
    const data = await fetchSiteData();
    renderHeader(data?.header || {}, doc);
    renderFooter(data?.footer || {}, doc);
  } catch (err) {
    console.error('[site] failed to render global chrome', err);
  }
}
