require 'digest'
require 'fileutils'

module WebsiteAssets
  class VersionedFile < Jekyll::StaticFile
    def initialize(site, relative, original)
      super(site, site.source, File.dirname(relative), File.basename(relative))
      @original = original
    end

    def modified?
      true
    end

    def mtime
      File.mtime(@original)
    end

    def write(dest)
      target = destination(dest)
      FileUtils.mkdir_p(File.dirname(target))
      FileUtils.cp(@original, target)
      true
    end
  end

  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      versions = {}
      %w[assets/css/*.css assets/js/*.js].each do |pattern|
        Dir.glob(File.join(site.source, pattern)).sort.each do |original|
          digest = Digest::SHA256.file(original).hexdigest[0, 16]
          basename = File.basename(original, File.extname(original))
          relative = "assets/versioned/#{basename}-#{digest}#{File.extname(original)}"
          source_relative = original.delete_prefix(site.source + '/').tr('\\', '/')
          versions['/' + source_relative] = '/' + relative
          site.static_files << VersionedFile.new(site, relative, original)
        end
      end
      site.data['asset_fingerprints'] = versions
    end
  end

  module Filters
    def versioned_asset(input)
      site = @context.registers[:site]
      site.data.fetch('asset_fingerprints').fetch(input.to_s)
    end
  end
end

Liquid::Template.register_filter(WebsiteAssets::Filters)
