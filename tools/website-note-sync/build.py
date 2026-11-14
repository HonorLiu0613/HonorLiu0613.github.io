"""Bundle the desktop Obsidian plugin using Python's standard library."""
from pathlib import Path

root = Path(__file__).resolve().parent
names = ['sync-core', 'border-snapshot', 'render-utils', 'git-publisher', 'media-content', 'media-page', 'media-publisher', 'main']
chunks = ["'use strict';\nconst nativeRequire=require;\nconst modules={\n"]
for name in names:
    chunks.append(repr('./' + name) + ': function(module,exports,require){\n' +
                  (root / 'src' / (name + '.js')).read_text(encoding='utf-8') + '\n},\n')
chunks.append('};\nconst cache={};\nfunction load(name){if(!modules[name])return nativeRequire(name);'
              'if(!cache[name]){const part={exports:{}};cache[name]=part;modules[name](part,part.exports,load);}'
              'return cache[name].exports;}\nmodule.exports=load("./main");\n')
(root / 'main.js').write_text(''.join(chunks), encoding='utf-8')
print('Built main.js; install it with manifest.json in .obsidian/plugins/website-note-sync/.')
