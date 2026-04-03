function normalizePath(path) {
  const raw = String(path || '').trim();
  if (!raw) return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function buildCandidates(path) {
  const normalized = normalizePath(path);
  const originUrl = new URL(normalized, window.location.origin);
  return Array.from(new Set([
    normalized,
    originUrl.pathname,
    originUrl.href
  ]));
}

function parseJsonText(text, sourceLabel) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error(`Empty JSON response from ${sourceLabel}`);
  if (/^<!DOCTYPE html/i.test(raw) || /^<html[\s>]/i.test(raw)) {
    throw new Error(`Received HTML instead of JSON from ${sourceLabel}`);
  }
  return JSON.parse(raw);
}

async function fetchJsonCandidate(candidate) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), 5000)
    : null;

  try {
    const response = await fetch(candidate, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json, text/plain;q=0.9, */*;q=0.1' },
      signal: controller?.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    return parseJsonText(text, candidate);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function loadInlineFallback(inlineScriptId) {
  if (!inlineScriptId) return null;
  const el = document.getElementById(inlineScriptId);
  if (!el) return null;

  try {
    return parseJsonText(el.textContent || '', `inline fallback ${inlineScriptId}`);
  } catch (error) {
    console.error(`[cms-json] Failed to parse inline fallback ${inlineScriptId}`, error);
    return null;
  }
}

export async function fetchCmsJson(path, { inlineScriptId, validate } = {}) {
  const errors = [];

  for (const candidate of buildCandidates(path)) {
    try {
      const data = await fetchJsonCandidate(candidate);
      if (typeof validate === 'function') validate(data);
      return data;
    } catch (error) {
      errors.push(`[${candidate}] ${error.message}`);
    }
  }

  const fallback = loadInlineFallback(inlineScriptId);
  if (fallback) {
    if (typeof validate === 'function') validate(fallback);
    console.warn(`[cms-json] Using inline fallback for ${path}. Fetch failures: ${errors.join(' | ')}`);
    return fallback;
  }

  throw new Error(`Failed to load CMS JSON for ${path}. ${errors.join(' | ')}`);
}
