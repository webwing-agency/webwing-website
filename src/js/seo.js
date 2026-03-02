function upsertMetaByName(name, content) {
  let node = document.head.querySelector(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('name', name);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function upsertMetaByProperty(property, content) {
  let node = document.head.querySelector(`meta[property="${property}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('property', property);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content);
}

function upsertCanonical(href) {
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
}

function toAbsoluteUrl(pathOrUrl) {
  try {
    return new URL(pathOrUrl, window.location.origin).toString();
  } catch {
    return window.location.href;
  }
}

export function applySeo({
  title,
  description,
  canonicalPath,
  robots = 'index,follow,max-image-preview:large',
  ogImagePath = '/assets/hero-bg.png'
} = {}) {
  const effectiveTitle = title || document.title;
  const existingDescription = document.head.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const effectiveDescription = description || existingDescription;
  const canonicalUrl = toAbsoluteUrl(canonicalPath || window.location.pathname);
  const ogImage = toAbsoluteUrl(ogImagePath);

  if (effectiveTitle) document.title = effectiveTitle;
  if (effectiveDescription) upsertMetaByName('description', effectiveDescription);
  if (robots) upsertMetaByName('robots', robots);

  upsertCanonical(canonicalUrl);

  upsertMetaByProperty('og:locale', 'de_DE');
  upsertMetaByProperty('og:type', 'website');
  upsertMetaByProperty('og:site_name', 'Webwing Design Agency');
  upsertMetaByProperty('og:title', effectiveTitle);
  upsertMetaByProperty('og:description', effectiveDescription);
  upsertMetaByProperty('og:url', canonicalUrl);
  upsertMetaByProperty('og:image', ogImage);

  upsertMetaByName('twitter:card', 'summary_large_image');
  upsertMetaByName('twitter:title', effectiveTitle);
  upsertMetaByName('twitter:description', effectiveDescription);
  upsertMetaByName('twitter:image', ogImage);
}
