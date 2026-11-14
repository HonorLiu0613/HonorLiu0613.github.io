"""Check built internal links and core section routes using only Python's stdlib."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote, urljoin
import json
import sys
import xml.etree.ElementTree as ET


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.references = []
        self.duplicates = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        identity = attrs.get('id')
        if identity:
            if identity in self.ids:
                self.duplicates.append(identity)
            self.ids.add(identity)
        for key in ['href', 'src', 'data']:
            if attrs.get(key) and (key != 'data' or tag == 'object'):
                self.references.append(attrs[key])


root = Path(sys.argv[1] if len(sys.argv) > 1 else '_site').resolve()
errors = []
pages = {}
for path in root.rglob('*.html'):
    relative = path.relative_to(root).as_posix()
    route = '/' + relative
    if route.endswith('index.html'):
        route = route[:-10]
    page = Page(path.read_text(encoding='utf-8'))
    pages[route] = page
    errors.extend(f'{route}: duplicate id {value}' for value in page.duplicates)

for route, page in pages.items():
    for reference in page.references:
        target = urlsplit(urljoin('https://honorliu.top' + route, reference))
        if target.scheme not in ('https', 'http') or target.netloc != 'honorliu.top':
            continue
        url = unquote(target.path)
        candidate = root / url.lstrip('/')
        if candidate.is_dir():
            candidate /= 'index.html'
        if not candidate.is_file():
            errors.append(f'{route}: missing target {reference}')
        elif target.fragment and (url.endswith('/') or url.endswith('.html')):
            target_page = pages.get(url)
            if target_page and unquote(target.fragment) not in target_page.ids:
                errors.append(f'{route}: missing anchor {reference}')

for route in ['/', '/notes/', '/experience/', '/cv/']:
    if route not in pages:
        errors.append(f'Missing core section: {route}')

index_path = root / 'notes-index.json'
if index_path.exists():
    index = json.loads(index_path.read_text(encoding='utf-8'))
    urls = [entry['url'] for entry in index]
    if len(urls) != len(set(urls)):
        errors.append('Search index has duplicate note URLs')
    for url in urls:
        if url not in pages:
            errors.append(f'Search result has no page: {url}')
else:
    errors.append('Missing notes search index')

feed_path = root / 'feed.xml'
if feed_path.exists():
    feed = ET.parse(feed_path)
    entries = feed.findall('{http://www.w3.org/2005/Atom}entry')
    if len(entries) != min(len(urls), 20):
        errors.append('RSS entry count does not match the public Notes collection')
else:
    errors.append('Missing Notes RSS feed')

math_article = root / 'notes/kalman-filter-derivation/index.html'
if math_article.exists():
    text = math_article.read_text(encoding='utf-8')
    for formula in ['$v_{k}$', '$R$']:
        if formula not in text and ('\\('+formula[1:-1]+'\\)') not in text:
            errors.append(f'Inline formula was corrupted during rendering: {formula}')
    if 'JEKYLLMATH' in text:
        errors.append('Unrestored math placeholder in generated article')

for directory in ['scripts', 'docs', 'tools', 'vendor', 'node_modules', 'talkmap', 'markdown_generator']:
    if (root / directory).exists():
        errors.append(f'Non-public directory leaked into build: {directory}')

if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print(f'PASS: {len(pages)} HTML pages; all internal links, anchors, core routes, and search results resolve.')
