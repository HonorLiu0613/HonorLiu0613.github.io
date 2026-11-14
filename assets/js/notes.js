'use strict';

(() => {
  const browser = document.querySelector('.notes-browser');
  if (!browser) return;
  const search = document.querySelector('#note-search');
  const domainSelect = document.querySelector('#domain-filter');
  const tagSelect = document.querySelector('#tag-filter');
  const count = document.querySelector('#result-count');
  const cards = [...document.querySelectorAll('#notes-list .note-card')];
  const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase();
  const entries = cards.map(card => ({
    card, url: card.dataset.noteUrl, domain: card.dataset.domain || '',
    tags: JSON.parse(card.dataset.tags || '[]') || [],
    text: normalize(card.textContent)
  }));
  const addOptions = (select, values) => {
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  };
  addOptions(domainSelect, entries.map(entry => entry.domain));
  addOptions(tagSelect, entries.flatMap(entry => entry.tags));
  const syncFromUrl = () => {
    const params = new URLSearchParams(location.search);
    search.value = params.get('q') || '';
    domainSelect.value = params.get('field') || '';
    tagSelect.value = params.get('tag') || '';
  };
  let fullTextLoaded = false;
  const applyFilters = (updateUrl = true) => {
    const words = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let matches = 0;
    entries.forEach(entry => {
      const visible = (!domainSelect.value || entry.domain === domainSelect.value)
        && (!tagSelect.value || entry.tags.includes(tagSelect.value))
        && words.every(word => entry.text.includes(word));
      entry.card.hidden = !visible;
      if (visible) matches++;
    });
    count.textContent = `${matches} ${matches === 1 ? 'note' : 'notes'}${search.value && !fullTextLoaded ? ' · searching titles, summaries, and tags' : ''}`;
    document.querySelector('#empty-state').hidden = matches > 0;
    if (updateUrl) {
      const url = new URL(location.href);
      [['q', search.value], ['field', domainSelect.value], ['tag', tagSelect.value]].forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      });
      history.replaceState(null, '', url);
    }
  };
  syncFromUrl();
  document.querySelector('#notes-filters').hidden = false;
  search.addEventListener('input', () => applyFilters());
  domainSelect.addEventListener('change', () => applyFilters());
  tagSelect.addEventListener('change', () => applyFilters());
  document.querySelector('#filter-reset').addEventListener('click', () => {
    search.value = ''; domainSelect.value = ''; tagSelect.value = ''; applyFilters(); search.focus();
  });
  window.addEventListener('popstate', () => { syncFromUrl(); applyFilters(false); });
  applyFilters(false);
  fetch(browser.dataset.indexUrl).then(response => {
    if (!response.ok) throw new Error('Search index unavailable');
    return response.json();
  }).then(index => {
    const byUrl = new Map(index.map(note => [note.url, note]));
    entries.forEach(entry => {
      const note = byUrl.get(entry.url);
      if (note) entry.text += ' ' + normalize(note.content);
    });
    fullTextLoaded = true;
    applyFilters(false);
  }).catch(() => { /* Titles, summaries, fields, and tags remain searchable. */ });
})();
