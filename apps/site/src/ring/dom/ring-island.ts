const RING_SELECTOR = '[data-ring]';
const VISIBLE_HYDRATION = 'visible';

async function startRing(root: HTMLElement): Promise<void> {
  const { attachRing } = await import('./ring-controller.ts');
  attachRing(root);
}

function startRingWhenVisible(root: HTMLElement): void {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some(({ isIntersecting }) => isIntersecting)) {
      observer.disconnect();
      void startRing(root);
    }
  });
  observer.observe(root);
}

for (const root of document.querySelectorAll<HTMLElement>(RING_SELECTOR)) {
  if (root.dataset.ringHydration === VISIBLE_HYDRATION) {
    startRingWhenVisible(root);
  } else {
    void startRing(root);
  }
}
