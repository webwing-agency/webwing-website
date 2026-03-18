const CARD_SELECTOR = '.grid-card, .contact-card, .book-call-card';

let enabled = false;

function supportsInteractiveGlare() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function resetCard(card) {
  card.style.setProperty('--card-glare-x', '50%');
  card.style.setProperty('--card-glare-y', '50%');
  card.style.setProperty('--card-glare-opacity', '0');
}

function bindCard(card) {
  if (!card || card.dataset.glareBound === '1') return;
  card.dataset.glareBound = '1';
  resetCard(card);

  card.addEventListener('pointerenter', () => {
    card.style.setProperty('--card-glare-opacity', '0.55');
  });

  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--card-glare-x', `${x}%`);
    card.style.setProperty('--card-glare-y', `${y}%`);
    card.style.setProperty('--card-glare-opacity', '0.78');
  });

  card.addEventListener('pointerleave', () => {
    resetCard(card);
  });
}

export function initCardGlare(root = document) {
  if (!supportsInteractiveGlare()) {
    if (enabled) {
      document.querySelectorAll(CARD_SELECTOR).forEach(resetCard);
    }
    enabled = false;
    return;
  }

  enabled = true;
  root.querySelectorAll(CARD_SELECTOR).forEach(bindCard);
}
