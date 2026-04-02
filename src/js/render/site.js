function safeString(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

function escapeHtml(value) {
  return safeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let siteDataPromise = null;

async function fetchSiteData() {
  if (!siteDataPromise) {
    siteDataPromise = fetch('/data/site.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch site.json: ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        siteDataPromise = null;
        throw err;
      });
  }

  return siteDataPromise;
}

function buildHeaderLink(link) {
  const classes = ['nav-link'];
  if (link?.is_cta) classes.push('cta-link');
  return `<a href="${escapeHtml(link?.href || '#')}" class="${classes.join(' ')}">${escapeHtml(link?.label || '')}</a>`;
}

function buildPopupLink(link) {
  return `<div class="popup-link"><a href="${escapeHtml(link?.href || '#')}">${escapeHtml(link?.label || '')}</a></div>`;
}

function buildFooterNavLink(link) {
  return `<div class="footer-nav-link"><a href="${escapeHtml(link?.href || '#')}">${escapeHtml(link?.label || '')}</a></div>`;
}

function buildFooterAnchor(link) {
  return `<a href="${escapeHtml(link?.href || '#')}">${escapeHtml(link?.label || '')}</a>`;
}

function renderHeader(headerData = {}) {
  const nav = document.querySelector('header .nav-links');
  if (nav && Array.isArray(headerData.nav_links)) {
    nav.innerHTML = headerData.nav_links.map(buildHeaderLink).join('');
  }

  const popupLinks = document.querySelector('.popup-menu-link-container');
  if (popupLinks && Array.isArray(headerData.popup_links)) {
    popupLinks.innerHTML = headerData.popup_links.map(buildPopupLink).join('');
  }

  const decorations = document.querySelector('.popup-menu-decorations');
  if (decorations) {
    decorations.innerHTML = [
      `<span>${escapeHtml(headerData.popup_brand_text || '')}</span>`,
      '<span>+</span>',
      `<span><a href="kontakt.html">${escapeHtml(headerData.email || '')}</a></span>`,
      '<span>+</span>',
      `<span><a href="kontakt.html">${escapeHtml(headerData.phone || '')}</a></span>`,
      '<span>+</span>',
      `<span>${escapeHtml(headerData.status_text || '')}</span>`
    ].join('');
  }
}

function renderFooter(footerData = {}) {
  document.querySelectorAll('.slogan').forEach((el) => {
    el.textContent = safeString(footerData.slogan || '');
  });

  document.querySelectorAll('.footer-about').forEach((el) => {
    el.textContent = safeString(footerData.about || '');
  });

  document.querySelectorAll('.footer-meta').forEach((el) => {
    el.textContent = safeString(footerData.copyright || '');
  });

  const simpleFooterNav = document.querySelector('footer .footer-nav');
  if (simpleFooterNav && Array.isArray(footerData.nav_links)) {
    simpleFooterNav.innerHTML = footerData.nav_links.map(buildFooterNavLink).join('');
  }

  const legalLinks = document.querySelector('footer .legal-links');
  if (legalLinks && Array.isArray(footerData.legal_links)) {
    legalLinks.innerHTML = footerData.legal_links.map(buildFooterAnchor).join('');
  }

  const companyLinks = document.querySelector('footer .footer-links[aria-label="Unternehmen"]');
  if (companyLinks && Array.isArray(footerData.nav_links)) {
    companyLinks.innerHTML = footerData.nav_links.map(buildFooterAnchor).join('');
  }

  const legalColumnLinks = document.querySelector('footer .footer-links[aria-label="Rechtliches"]');
  if (legalColumnLinks && Array.isArray(footerData.legal_links)) {
    legalColumnLinks.innerHTML = footerData.legal_links.map(buildFooterAnchor).join('');
  }

  const companyTitle = document.querySelector('footer .footer-links[aria-label="Unternehmen"]')?.closest('.footer-link-column')?.querySelector('.footer-column-title');
  if (companyTitle && footerData.company_title) {
    companyTitle.textContent = safeString(footerData.company_title);
  }

  const legalTitle = document.querySelector('footer .footer-right-column .footer-link-column .footer-column-title');
  if (legalTitle && footerData.legal_title) {
    legalTitle.textContent = safeString(footerData.legal_title);
  }

  const ctaTitle = document.querySelector('footer .footer-cta-column .footer-column-title');
  if (ctaTitle && footerData.cta_title) {
    ctaTitle.textContent = safeString(footerData.cta_title);
  }

  const footerCta = document.querySelector('footer .footer-cta-column .footer-cta');
  if (footerCta) {
    if (footerData.cta_text) footerCta.textContent = safeString(footerData.cta_text);
    if (footerData.cta_link) footerCta.href = safeString(footerData.cta_link);
  }
}

export async function initSiteChrome() {
  try {
    const data = await fetchSiteData();
    renderHeader(data.header || {});
    renderFooter(data.footer || {});
  } catch (err) {
    console.error('[site] Failed to initialize site chrome', err);
  }
}
