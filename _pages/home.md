---
layout: home
permalink: /
title: About Me
section: home
redirect_from: [/about/, /about.html]
---

{% assign public_notes = site.notes | where: 'publish', true | sort: 'date' | reverse %}
{% assign recent_notes = public_notes | slice: 0, 3 %}
{% assign palette_last_index = site.data.note_palette.size | minus: 1 %}
{% assign recent_last_index = recent_notes.size | minus: 1 %}

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

<section class="home-recent" aria-labelledby="recent-title">
  <div class="home-section__heading-row">
    <h2 id="recent-title">Recent Notes</h2>
    <a href="{{ '/notes/' | relative_url }}">All notes <span aria-hidden="true"> &rarr;</span></a>
  </div>
  <div class="home-card home-post-list">
    {% for note in recent_notes %}
    {% assign palette_index = 0 %}
    {% if recent_last_index > 0 %}{% assign palette_index = forloop.index0 | times: palette_last_index | times: 1.0 | divided_by: recent_last_index | round %}{% endif %}
    <article class="home-post" style="--note-row-color: {{ site.data.note_palette[palette_index] }};">
      <div class="home-post__meta">
        <div class="note-card__field"><span class="note-card__label">Field:</span><span class="field-badge">{{ note.domain | default: 'Notes' }}</span></div>
        <time datetime="{{ note.date | date_to_xmlschema }}">{{ note.date | date: '%b %Y' }}</time>
      </div>
      <h3><a href="{{ note.url | relative_url }}">{{ note.title }}</a></h3>
      {% if note.tags.size > 0 %}<div class="home-post__topics"><span class="note-card__label">Tags:</span><div class="tag-list">{% for tag in note.tags %}<a class="tag" href="{{ '/notes/' | relative_url }}?tag={{ tag | url_encode }}">{{ tag }}</a>{% endfor %}</div></div>{% endif %}
    </article>
    {% endfor %}
  </div>
</section>
