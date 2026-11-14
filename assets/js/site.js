'use strict';

// Build the article outline without changing its HTML or heading labels.
const articleBody = document.querySelector('#note-content');
const toc = document.querySelector('.note-toc');
if (articleBody && toc) {
  const headings = [...articleBody.querySelectorAll('h1, h2, h3')];
  const list = document.querySelector('#toc-list');
  const minLevel = Math.min(...headings.map(heading => Number(heading.tagName.slice(1))));
  const links = [];
  headings.forEach((heading, index) => {
    if (!heading.id) {
      let id = `section-${index + 1}`;
      while (document.getElementById(id)) id += '-';
      heading.id = id;
    }
    const item = document.createElement('li');
    item.className = `toc-level-${Number(heading.tagName.slice(1)) - minLevel + 1}`;
    const link = document.createElement('a');
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent;
    item.append(link);
    list.append(item);
    links.push(link);
  });
  toc.hidden = headings.length === 0;
  if (matchMedia('(max-width: 760px)').matches) toc.querySelector('details').open = false;
  let scheduled = false;
  const updateOutline = () => {
    let activeIndex = 0;
    headings.forEach((heading, index) => { if (heading.getBoundingClientRect().top <= 100) activeIndex = index; });
    links.forEach((link, index) => {
      if (index === activeIndex) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateOutline); }
  }, {passive: true});
  updateOutline();
}

// Block controls are separate from inline-code styles.
document.querySelectorAll('.note-body pre > code').forEach(code => {
  const pre = code.parentElement;
  const languageHost = code.closest('[class*="language-"]');
  const language = languageHost?.className.match(/(?:^|\s)language-([^\s]+)/)?.[1] || 'text';
  const toolbar = document.createElement('div');
  toolbar.className = 'code-toolbar';
  const label = document.createElement('span');
  label.textContent = language.toUpperCase();
  toolbar.append(label);
  if (navigator.clipboard && window.isSecureContext) {
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.textContent = 'Copy';
    copyButton.setAttribute('aria-label', `Copy ${language} code`);
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        copyButton.textContent = 'Copied';
      } catch { copyButton.textContent = 'Copy failed'; }
      setTimeout(() => { copyButton.textContent = 'Copy'; }, 1800);
    });
    toolbar.append(copyButton);
  }
  pre.before(toolbar);
});
