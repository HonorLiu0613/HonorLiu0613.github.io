/* ==========================================================================
   Post tag filter + title search for /posts/
   ========================================================================== */

(function () {
  'use strict';

  var tagCards = document.querySelectorAll('.post-tag-card');
  var searchInput = document.getElementById('post-search-input');
  var activeTagTitle = document.getElementById('post-active-tag');
  var postItems = document.querySelectorAll('.post-card-item');
  var yearHeadings = document.querySelectorAll('.post-year-heading');

  var currentTag = 'all';

  function applyFilters() {
    var keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Track which years have visible posts
    var yearsWithVisible = {};

    postItems.forEach(function (item) {
      var itemTags = item.getAttribute('data-tags') || '';
      var tags = itemTags ? itemTags.split(',') : [];
      var title = (item.querySelector('.post-card-title a') || {}).textContent || '';
      var titleLower = title.toLowerCase();
      var year = item.getAttribute('data-year') || '';

      var tagMatch = (currentTag === 'all') || (tags.indexOf(currentTag) !== -1);
      var searchMatch = !keyword || (titleLower.indexOf(keyword) !== -1);

      if (tagMatch && searchMatch) {
        item.classList.remove('hidden');
        yearsWithVisible[year] = true;
      } else {
        item.classList.add('hidden');
      }
    });

    // Hide year headings that have no visible posts
    yearHeadings.forEach(function (heading) {
      var y = heading.getAttribute('data-year') || '';
      if (yearsWithVisible[y]) {
        heading.classList.remove('hidden');
      } else {
        heading.classList.add('hidden');
      }
    });

    // Update active tag title
    if (currentTag !== 'all') {
      var card = document.querySelector('.post-tag-card[data-tag="' + currentTag + '"]');
      var label = card ? (card.querySelector('.post-tag-name').textContent) : currentTag;
      activeTagTitle.textContent = 'Tag: ' + label;
      activeTagTitle.style.display = '';
    } else {
      activeTagTitle.style.display = 'none';
    }
  }

  // Tag card click
  tagCards.forEach(function (card) {
    card.addEventListener('click', function () {
      tagCards.forEach(function (c) { c.classList.remove('active'); });
      card.classList.add('active');

      currentTag = card.getAttribute('data-tag');
      // Update URL hash without reload
      if (currentTag === 'all') {
        history.replaceState(null, '', window.location.pathname);
      } else {
        history.replaceState(null, '', '#' + currentTag);
      }

      applyFilters();
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      applyFilters();
    });
  }

  // Check URL hash on load
  var hash = window.location.hash.replace('#', '');
  if (hash) {
    var hashCard = document.querySelector('.post-tag-card[data-tag="' + hash + '"]');
    if (hashCard) {
      hashCard.click();
    }
  }
})();
