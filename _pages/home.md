---
layout: home
permalink: /
title: About Me
section: home
redirect_from: [/about/, /about.html]
---

{% assign public_notes = site.notes | where: 'publish', true | sort: 'date' | reverse %}

<section class="home-hero" aria-labelledby="intro-title">
  <div class="home-hero__categories">ROBOT ENGINEERING · NEEPU</div>
  <h2 class="home-hero__title" id="intro-title">Hi, I am Haoran Liu.</h2>
  <p class="home-hero__description">
    I study Robot Engineering at Northeast Electric Power University. I am interested in robot systems, control and estimation, and embedded development, and use this site to share notes from my learning.
  </p>
  <div class="home-hero__buttons">
    <a href="{{ '/files/cv.pdf' | relative_url }}" class="btn btn--deep-blue">Curriculum Vitae (PDF)</a>
    <a href="{{ '/notes/' | relative_url }}" class="btn btn--deep-blue-outline">Browse notes</a>
  </div>
</section>

<section class="home-interests" aria-labelledby="interests-title">
  <div class="home-section__label">AREAS OF INTEREST</div>
  <h2 class="home-section__title" id="interests-title">What I am learning</h2>
  <ul class="interest-list">
    <li>Robotics &amp; autonomous systems</li>
    <li>Control &amp; state estimation</li>
    <li>Embedded systems</li>
  </ul>
</section>

<section class="home-recent" aria-labelledby="recent-title">
  <div class="home-section__label">RECENT WRITING</div>
  <div class="home-section__heading-row">
    <h2 class="home-section__title" id="recent-title">Recent notes</h2>
    <a class="home-section__link" href="{{ '/notes/' | relative_url }}">All notes <span aria-hidden="true">→</span></a>
  </div>
  <div class="home-post-list">
    {% for note in public_notes limit: 3 %}
      <article class="home-post">
        <div class="home-post__main">
          <h3><a href="{{ note.url | relative_url }}">{{ note.title }}</a></h3>
          <p>{{ note.description | default: note.excerpt | strip_html | truncate: 104 }}</p>
          {% if note.tags.size > 0 %}
            <ul class="home-post__tags" aria-label="Topics">
              {% for tag in note.tags limit: 2 %}<li>{{ tag }}</li>{% endfor %}
            </ul>
          {% endif %}
        </div>
        <div class="home-post__meta">
          {% if note.domain %}<span>{{ note.domain }}</span>{% endif %}
          <time datetime="{{ note.date | date_to_xmlschema }}">{{ note.date | date: '%b %Y' }}</time>
        </div>
      </article>
    {% endfor %}
  </div>
</section>
