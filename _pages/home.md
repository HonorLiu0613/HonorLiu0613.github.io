---
layout: home
permalink: /
title: About Me
section: home
redirect_from: [/about/, /about.html]
---

{% assign public_notes = site.notes | where: 'publish', true | sort: 'date' | reverse %}

<section class="home-section home-introduction" aria-labelledby="about-title">
  <h1 id="about-title"><span data-home-copy="en">About Me</span><span data-home-copy="zh" hidden>关于我</span></h1>
  <p data-home-copy="en">I am Haoran Liu, an undergraduate student in Robot Engineering at Northeast Electric Power University. I expect to graduate in June 2027 and have been admitted to a professional master's program at East China University of Science and Technology, starting in September 2027.</p>
  <p data-home-copy="zh" hidden>我是刘浩然，目前就读于东北电力大学机器人工程专业本科，预计于2027年6月毕业，已推免至华东理工大学攻读专业硕士，预计于2027年9月入学。</p>
  <p data-home-copy="en">My research interest is robot control. This website is where I share learning notes and selected work.</p>
  <p data-home-copy="zh" hidden>我的研究兴趣是机器人控制。这个网站用于分享学习笔记与项目记录。</p>
</section>

<section class="home-section" aria-labelledby="interests-title">
  <h2 id="interests-title"><span data-home-copy="en">Research Interests</span><span data-home-copy="zh" hidden>研究兴趣</span></h2>
  <ul class="interest-list">{% for interest in site.data.home.interests %}<li><span data-home-copy="en">{{ interest.en }}</span><span data-home-copy="zh" hidden>{{ interest.zh }}</span></li>{% endfor %}</ul>
</section>

<section class="home-section" aria-labelledby="education-title">
  <h2 id="education-title"><span data-home-copy="en">Education</span><span data-home-copy="zh" hidden>教育经历</span></h2>
  <ol class="home-education">{% for item in site.data.home.education %}
    <li class="home-education__item">
      <div class="home-education__period"><span data-home-copy="en">{{ item.period_en }}</span><span data-home-copy="zh" hidden>{{ item.period_zh }}</span></div>
      <div>
        <h3><span data-home-copy="en">{{ item.institution_en }}</span><span data-home-copy="zh" hidden>{{ item.institution_zh }}</span></h3>
        <p><span data-home-copy="en">{{ item.program_en }}</span><span data-home-copy="zh" hidden>{{ item.program_zh }}</span></p>
      </div>
    </li>{% endfor %}
  </ol>
</section>

{% if site.data.home.projects.size > 0 %}
<section class="home-section" aria-labelledby="projects-title">
  <h2 id="projects-title"><span data-home-copy="en">Selected Projects</span><span data-home-copy="zh" hidden>代表项目</span></h2>
  <ul class="home-records">{% for item in site.data.home.projects %}<li><h3>{% if item.url %}<a href="{{ item.url }}">{% endif %}<span data-home-copy="en">{{ item.title_en }}</span><span data-home-copy="zh" hidden>{{ item.title_zh }}</span>{% if item.url %}</a>{% endif %}</h3><p><span data-home-copy="en">{{ item.summary_en }}</span><span data-home-copy="zh" hidden>{{ item.summary_zh }}</span></p></li>{% endfor %}</ul>
</section>
{% endif %}

{% if site.data.home.awards.size > 0 %}
<section class="home-section" aria-labelledby="awards-title">
  <h2 id="awards-title"><span data-home-copy="en">Honors &amp; Awards</span><span data-home-copy="zh" hidden>荣誉与奖项</span></h2>
  <ul class="home-records">{% for item in site.data.home.awards %}<li><h3><span data-home-copy="en">{{ item.title_en }}</span><span data-home-copy="zh" hidden>{{ item.title_zh }}</span></h3><p><span data-home-copy="en">{{ item.detail_en }}</span><span data-home-copy="zh" hidden>{{ item.detail_zh }}</span></p></li>{% endfor %}</ul>
</section>
{% endif %}

<section class="home-section home-recent" aria-labelledby="recent-title">
  <div class="home-section__heading-row">
    <h2 id="recent-title"><span data-home-copy="en">Recent Notes</span><span data-home-copy="zh" hidden>近期笔记</span></h2>
    <a href="{{ '/notes/' | relative_url }}"><span data-home-copy="en">All notes</span><span data-home-copy="zh" hidden>全部笔记</span><span aria-hidden="true"> &rarr;</span></a>
  </div>
  <div class="home-post-list">
    {% for note in public_notes limit: 2 %}
      <article class="home-post">
        <div class="home-post__main">
          <h3><a href="{{ note.url | relative_url }}">{{ note.title }}</a></h3>
          <p>{{ note.description | default: note.excerpt | strip_html | truncate: 88 }}</p>
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
