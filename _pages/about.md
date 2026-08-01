---
permalink: /
title: "About Me"
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

{% include base_path %}

<div class="home-hero" markdown="0">
  <div class="home-hero__categories">ROBOT · LIFE · WRITING</div>
  <h1 class="home-hero__title">Hi, I am Haoran Liu.</h1>
  <p class="home-hero__description">
    I study Robot Engineering at Northeast Electric Power University (NEEPU), 
    think about robots and automation, and keep notes on technology, books, 
    travel, and daily life.
  </p>
  <div class="home-hero__buttons">
    <a href="{{ base_path }}/" class="btn btn--deep-blue">About me</a>
    <a href="{{ base_path }}/cv/" class="btn btn--deep-blue">Curriculum Vitae (PDF)</a>
    <a href="{{ base_path }}/posts/" class="btn btn--deep-blue-outline">Browse posts</a>
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
exploring new places, and [writing about my experiences](/posts/). 
This website is a space where I document my journey — both technical and personal.

<div style="margin-top: 2.5rem;"></div>

{% assign all_updates = "" | split: "" %}
{% for post in site.posts %}
  {% assign all_updates = all_updates | push: post %}
{% endfor %}
{% for item in site.portfolio %}
  {% assign all_updates = all_updates | push: item %}
{% endfor %}
{% for item in site.experience %}
  {% assign all_updates = all_updates | push: item %}
{% endfor %}

{% assign sorted_updates = all_updates | sort: "date" | reverse %}

<div class="home-section__label">UPDATE</div>
<div class="home-section__title">Recently updated</div>

<div class="home-update__list">
{% for item in sorted_updates limit: 5 %}
  <div class="home-update__item">
    <div class="home-update__item-row">
      <a href="{{ base_path }}{{ item.url }}" class="home-update__item-title">{{ item.title }}</a>
      <span class="home-update__item-tag">
        {% if item.collection == "posts" %}
          [Blog]
        {% elsif item.collection == "portfolio" %}
          [Works]
        {% elsif item.collection == "experience" %}
          [Experience]
        {% endif %}
      </span>
      <span class="home-update__item-date">{{ item.date | date: "%Y-%m-%d" }}</span>
    </div>
    {% if item.excerpt %}
      <p class="home-update__item-excerpt">{{ item.excerpt | strip_html | truncate: 100 }}</p>
    {% endif %}
  </div>
{% endfor %}
</div>

---

<div style="text-align: center; margin-top: 2rem;">
  <a href="{{ base_path }}/posts/" class="btn btn--deep-blue-outline" style="font-size: 0.9rem !important; padding: 0.7em 2em !important;">
    Read my blog →
  </a>
</div>
