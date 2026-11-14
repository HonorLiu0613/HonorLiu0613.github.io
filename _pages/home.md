---
layout: home
permalink: /
title: About Me
section: home
redirect_from: [/about/, /about.html]
---


{% assign base_path = site.baseurl %}

<div class="home-hero" markdown="0">
  <div class="home-hero__categories">ROBOT · LIFE · WRITING</div>
  <h1 class="home-hero__title">Hi, I am Haoran Liu.</h1>
  <p class="home-hero__description">
    I study Robot Engineering at Northeast Electric Power University (NEEPU), 
    think about robots and automation, and keep notes on technology, books, 
    travel, and daily life.
  </p>
  <div class="home-hero__buttons">
    <a href="#about-me" class="btn btn--deep-blue">About me</a>
    <a href="{{ base_path }}/cv/" class="btn btn--deep-blue">Curriculum Vitae (PDF)</a>
    <a href="{{ base_path }}/notes/" class="btn btn--deep-blue-outline">Browse notes</a>
  </div>
</div>

<div class="home-section__label">RESEARCH & PROJECTS</div>
<div class="home-section__title">What I'm working on</div>

- **Robot Engineering** — Studying robot design, control systems, and autonomous navigation at NEEPU
- **Embedded Systems** — Building projects with Arduino, STM32, and ESP32
- **Programming** — Writing code in Python, C/C++, and MATLAB for robotics applications

<div style="margin-top: 2.5rem;"></div>

<div class="home-section__label">LIFE</div>
<div class="home-section__title">Beyond the lab</div>

When I'm not studying or coding, I enjoy reading, watching films, 
exploring new places, and [writing about my experiences](/notes/). 
This website is a space where I document my journey — both technical and personal.

<div style="margin-top: 2.5rem;"></div>

{% assign public_notes = site.notes | where: 'publish', true %}
{% assign featured_notes = public_notes | where: 'featured', true | sort: 'date' | reverse %}
<section class="home-featured" aria-labelledby="featured-title">
  <div class="home-section__label">SELECTED NOTES</div>
  <h2 class="home-section__title" id="featured-title">Featured notes</h2>
  <div class="home-update__list">{% for note in featured_notes limit: 3 %}
    <article class="home-update__item">
      <div class="home-update__item-row"><a class="home-update__item-title" href="{{ note.url | relative_url }}">{{ note.title }}</a><span class="home-update__item-tag">[{{ note.domain }}]</span></div>
      <p class="home-update__item-excerpt">{{ note.excerpt | strip_html | truncate: 100 }}</p>
    </article>
  {% endfor %}</div>
</section>
{% assign sorted_updates = public_notes | concat: site.experience | sort: 'updated' | reverse %}

<div class="home-section__label">UPDATE</div>
<div class="home-section__title">Recently updated</div>

<div class="home-update__list">
{% for item in sorted_updates limit: 5 %}
  <div class="home-update__item">
    <div class="home-update__item-row">
      <a href="{{ base_path }}{{ item.url }}" class="home-update__item-title">{{ item.title }}</a>
      <span class="home-update__item-tag">
        {% if item.collection == "notes" %}
          [Notes]
                {% elsif item.collection == "experience" %}
          [Experience]
        {% endif %}
      </span>
      <span class="home-update__item-date">{{ item.updated | date: "%Y-%m-%d" }}</span>
    </div>
    {% if item.excerpt %}
      <p class="home-update__item-excerpt">{{ item.excerpt | strip_html | truncate: 100 }}</p>
    {% endif %}
  </div>
{% endfor %}
</div>

---

<div style="text-align: center; margin-top: 2rem;">
  <a href="{{ base_path }}/notes/" class="btn btn--deep-blue-outline" style="font-size: 0.9rem !important; padding: 0.7em 2em !important;">
    Browse notes →
  </a>
</div>
