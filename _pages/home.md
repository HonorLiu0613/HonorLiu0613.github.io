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
  <div class="home-hero__top">
    <div class="home-hero__eyebrow"><span data-home-copy="en">ROBOTICS · ROBOT CONTROL</span><span data-home-copy="zh" hidden>机器人 · 机器人控制</span></div>
    <div class="home-language-switch" role="group" aria-label="Choose language">
      <button type="button" data-home-lang="en" lang="en" aria-pressed="true">EN</button>
      <button type="button" data-home-lang="zh" lang="zh-CN" aria-pressed="false">中文</button>
    </div>
  </div>
  <h1 class="home-hero__title" id="intro-title"><span data-home-copy="en">Hi, I am Haoran Liu.</span><span data-home-copy="zh" hidden>你好，我是刘浩然。</span></h1>
  <p class="home-hero__description" data-home-copy="en">I am an undergraduate student in Robot Engineering at Northeast Electric Power University, graduating in June 2027. I will join East China University of Science and Technology as a professional master's student in September 2027. My research interest is robot control.</p>
  <p class="home-hero__description" data-home-copy="zh" hidden>我目前就读于东北电力大学机器人工程专业，预计于2027年6月毕业，并将于2027年9月进入华东理工大学攻读专业硕士。我的研究兴趣是机器人控制。</p>
  <ul class="interest-list" aria-label="Research interests">
    {% for interest in site.data.home.interests %}<li><span data-home-copy="en">{{ interest.en }}</span><span data-home-copy="zh" hidden>{{ interest.zh }}</span></li>{% endfor %}
  </ul>
  <div class="home-hero__actions">
    <a class="home-button home-button--primary" href="{{ '/notes/' | relative_url }}"><span data-home-copy="en">Browse notes</span><span data-home-copy="zh" hidden>浏览笔记</span><span aria-hidden="true"> &rarr;</span></a>
    <a class="home-button home-button--secondary" href="https://github.com/{{ site.author.github }}" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
  </div>
</section>

<section class="home-education" aria-labelledby="education-title">
  <div class="home-section__heading-row">
    <h2 id="education-title"><span data-home-copy="en">Education</span><span data-home-copy="zh" hidden>教育经历</span></h2>
    <span class="home-section__label"><span data-home-copy="en">ACADEMIC PATH</span><span data-home-copy="zh" hidden>求学经历</span></span>
  </div>
  <ol class="home-education__list">
    {% for item in site.data.home.education %}
    <li class="home-education__item">
      <span class="home-education__period"><span data-home-copy="en">{{ item.period_en }}</span><span data-home-copy="zh" hidden>{{ item.period_zh }}</span></span>
      <h3><span data-home-copy="en">{{ item.institution_en }}</span><span data-home-copy="zh" hidden>{{ item.institution_zh }}</span></h3>
      <p><span data-home-copy="en">{{ item.program_en }}</span><span data-home-copy="zh" hidden>{{ item.program_zh }}</span></p>
    </li>
    {% endfor %}
  </ol>
</section>

<hr class="home-divider">

<div class="home-notes-grid">
  <section class="home-card home-recent" aria-labelledby="recent-title">
    <div class="home-section__heading-row">
      <h2 id="recent-title"><span data-home-copy="en">Recent Notes</span><span data-home-copy="zh" hidden>近期笔记</span></h2>
      <a href="{{ '/notes/' | relative_url }}"><span data-home-copy="en">All notes</span><span data-home-copy="zh" hidden>全部笔记</span><span aria-hidden="true"> &rarr;</span></a>
    </div>
    <div class="home-post-list">
      {% for note in recent_notes limit: 3 %}
      <article class="home-post">
        <div class="home-post__meta">
          {% if note.domain %}<span>{{ note.domain }}</span>{% endif %}
          <time datetime="{{ note.date | date_to_xmlschema }}">{{ note.date | date: '%b %Y' }}</time>
        </div>
        <h3><a href="{{ note.url | relative_url }}">{{ note.title }}</a></h3>
        <p>{{ note.description | default: note.excerpt | strip_html | normalize_whitespace | truncate: 108 }}</p>
      </article>
      {% endfor %}
    </div>
  </section>

  {% if featured_note %}
  <section class="home-card home-featured" aria-labelledby="featured-title">
    <div class="home-section__heading-row">
      <h2 id="featured-title"><span data-home-copy="en">Featured Note</span><span data-home-copy="zh" hidden>精选笔记</span></h2>
      <span class="home-featured__mark" aria-hidden="true">✦</span>
    </div>
    <a class="home-featured__link" href="{{ featured_note.url | relative_url }}">
      <span class="home-featured__domain">{{ featured_note.domain | default: 'Note' }}</span>
      <h3>{{ featured_note.title }}</h3>
      <p>{{ featured_note.description | default: featured_note.excerpt | strip_html | normalize_whitespace | truncate: 180 }}</p>
      <span class="home-featured__date"><time datetime="{{ featured_note.date | date_to_xmlschema }}">{{ featured_note.date | date: '%B %d, %Y' }}</time><span aria-hidden="true"> &rarr;</span></span>
    </a>
    {% if featured_note.tags.size > 0 %}
    <ul class="home-featured__tags" aria-label="Topics">{% for tag in featured_note.tags limit: 3 %}<li>{{ tag }}</li>{% endfor %}</ul>
    {% endif %}
  </section>
  {% endif %}
</div>
