require 'digest'

# Native Obsidian rendering is refreshed by Website Note Sync, before Jekyll builds.
Jekyll::Hooks.register :site, :post_read do |site|
  collection = site.collections['notes']
  next unless collection
  # A false or absent publish flag must not leave an accessible article route.
  collection.docs.reject! { |note| note.data['publish'] != true }
  collection.docs.each do |note|
    next unless note.data['rendered_body']
    raw = File.read(note.path, encoding: 'bom|utf-8').gsub("\r\n", "\n")
    body = raw.sub(/\A---\n[\s\S]*?\n---(?:\n|\z)/, '')
    expected = note.data['rendered_source_hash']
    include_name = note.data['rendered_body'].to_s
    valid_include = include_name.match?(/\Arendered-notes\/[a-z0-9]+(?:-[a-z0-9]+)*\.html\z/) &&
      File.file?(File.join(site.source, '_includes', include_name))
    unless expected == Digest::SHA256.hexdigest(body) && valid_include
      raise Jekyll::Errors::FatalException,
        "#{note.relative_path}: run Website Note Sync in Obsidian before building; the native article rendering is stale or missing."
    end
  end
end
