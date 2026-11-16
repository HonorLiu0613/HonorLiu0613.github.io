---
layout: home
permalink: /
title: About Me
section: home
redirect_from: [/about/, /about.html]
---

{% assign public_notes = site.notes | where: 'publish', true | sort: 'date' | reverse %}
{% assign featured_notes = public_notes | where: 'featured', true %}
{% assign featured_note = featured_notes | first %}
{% if featured_note == nil %}{% assign featured_note = public_notes | first %}{% endif %}
{% assign recent_notes = public_notes | where_exp: 'note', 'note.url != featured_note.url' %}

<section class="home-hero" aria-labelledby="intro-title">
  <div class="home-hero__top"><div class="home-hero__eyebrow">ROBOTICS · ROBOT CONTROL</div></div>
  <h1 class="home-hero__title" id="intro-title">Hi, I am Haoran Liu.</h1>
  <p class="home-hero__description">I am an undergraduate student in Robot Engineering at Northeast Electric Power University, graduating in June 2027. I will join East China University of Science and Technology as a professional master's student in September 2027. My research interest is robot control.</p>
  <ul class="interest-list" aria-label="Research interests">
    {% for interest in site.data.home.interests %}<li>{{ interest }}</li>{% endfor %}
  </ul>
  <div class="home-hero__actions">
    <a class="home-button home-button--primary" href="{{ '/notes/' | relative_url }}">Browse notes <span aria-hidden="true"> &rarr;</span></a>
    <a class="home-button home-button--secondary" href="https://github.com/{{ site.author.github }}" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
  </div>
</section>

<section class="home-education" aria-labelledby="education-title">
  <div class="home-section__heading-row">
    <h2 id="education-title">Education</h2>
    <span class="home-section__label">ACADEMIC PATH</span>
  </div>
  <ol class="home-education__list">
    {% for item in site.data.home.education %}
    <li class="home-education__item">
      <div class="home-education__card">
        <span class="home-education__period">{{ item.period }}</span>
        <h3>{{ item.institution }}</h3>
        <p>{{ item.program }}</p>
      </div>
    </li>
    {% endfor %}
  </ol>
</section>

<hr class="home-divider">

<div class="home-notes-grid">
  <section class="home-card home-recent" aria-labelledby="recent-title">
    <div class="home-section__heading-row">
      <h2 id="recent-title">Recent Notes</h2>
      <a href="{{ '/notes/' | relative_url }}">All notes <span aria-hidden="true"> &rarr;</span></a>
    </div>
    <div class="home-post-list">
      {% for note in recent_notes limit: 3 %}
      <article class="home-post">
        <div class="home-post__meta">
          {% if note.domain %}<span>{{ note.domain }}</span>{% endif %}
          <time datetime="{{ note.date | date_to_xmlschema }}">{{ note.date | date: '%b %Y' }}</time>
        </div>
        <h3><a href="{{ note.url | relative_url }}">{{ note.title }}</a></h3>
        {% if note.tags.size > 0 %}<ul class="home-post__tags" aria-label="Topics">{% for tag in note.tags limit: 3 %}<li data-tone="{{ tag | note_tone }}">{{ tag }}</li>{% endfor %}</ul>{% endif %}
      </article>
      {% endfor %}
    </div>
  </section>

  {% if featured_note %}
  <section class="home-card home-featured" aria-labelledby="featured-title">
    <div class="home-section__heading-row">
      <h2 id="featured-title">Featured Note</h2>
      <span class="home-featured__mark" aria-hidden="true">✦</span>
    </div>
    <a class="home-featured__link" href="{{ featured_note.url | relative_url }}">
      <span class="home-featured__domain">{{ featured_note.domain | default: 'Note' }}</span>
      <h3>{{ featured_note.title }}</h3>
      <span class="home-featured__date"><time datetime="{{ featured_note.date | date_to_xmlschema }}">{{ featured_note.date | date: '%B %d, %Y' }}</time><span aria-hidden="true"> &rarr;</span></span>
    </a>
    {% if featured_note.tags.size > 0 %}
    <ul class="home-featured__tags" aria-label="Topics">{% for tag in featured_note.tags limit: 3 %}<li data-tone="{{ tag | note_tone }}">{{ tag }}</li>{% endfor %}</ul>
    {% endif %}
  </section>
  {% endif %}
</div>
