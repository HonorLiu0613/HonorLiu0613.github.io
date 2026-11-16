(() => {
  const root = document.querySelector('[data-home-language-root]');
  if (!root) return;

  const storageKey = 'honorliu-home-language';
  const copy = [...root.querySelectorAll('[data-home-copy]')];
  const buttons = [...root.querySelectorAll('[data-home-lang]')];

  function setLanguage(language, persist = true) {
    const selected = language === 'zh' ? 'zh' : 'en';
    root.dataset.currentLanguage = selected;
    copy.forEach((element) => {
      element.hidden = element.dataset.homeCopy !== selected;
    });
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.homeLang === selected));
    });
    document.documentElement.lang = selected === 'zh' ? 'zh-CN' : 'en';

    if (persist) {
      try {
        localStorage.setItem(storageKey, selected);
      } catch (_) {
        // The selected language still works when storage is unavailable.
      }
    }
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.homeLang));
  });

  let preferred = 'en';
  try {
    preferred = localStorage.getItem(storageKey) || preferred;
  } catch (_) {
    // Keep English as the default when storage is unavailable.
  }
  setLanguage(preferred, false);
})();
