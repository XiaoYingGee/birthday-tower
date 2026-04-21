export function setupModalKeyboard(overlays: HTMLElement[]): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
      const el = m.target as HTMLElement;
      if (el.classList.contains('visible')) {
        requestAnimationFrame(() => {
          const first = el.querySelector<HTMLButtonElement>('button:not([disabled])');
          if (first) first.classList.add('kb-focus');
        });
      } else {
        el.querySelectorAll('.kb-focus').forEach((b) => b.classList.remove('kb-focus'));
      }
    }
  });
  for (const o of overlays) {
    observer.observe(o, { attributes: true, attributeFilter: ['class'] });
  }

  const handler = (e: KeyboardEvent): void => {
    const active = overlays.find((o) => o.classList.contains('visible'));
    if (!active) return;

    const btns = Array.from(active.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    if (btns.length === 0) return;

    const focused = btns.findIndex((b) => b.classList.contains('kb-focus'));

    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'w' || e.key === 'a') {
      e.preventDefault();
      btns.forEach((b) => b.classList.remove('kb-focus'));
      const next = focused <= 0 ? btns.length - 1 : focused - 1;
      btns[next].classList.add('kb-focus');
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 's' || e.key === 'd') {
      e.preventDefault();
      btns.forEach((b) => b.classList.remove('kb-focus'));
      const next = focused < 0 ? 0 : (focused + 1) % btns.length;
      btns[next].classList.add('kb-focus');
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = focused >= 0 ? btns[focused] : btns[0];
      target.click();
      btns.forEach((b) => b.classList.remove('kb-focus'));
    }
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
    observer.disconnect();
  };
}
