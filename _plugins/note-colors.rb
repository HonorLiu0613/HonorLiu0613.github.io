require 'digest'

module NoteColors
  PALETTE = %w[coral orange yellow green sky blue purple].freeze
  NAMED = {
    'ros2' => 'green', 'px4' => 'blue', 'robotics' => 'green',
    '计算机网络' => 'sky', 'networking' => 'sky', 'tcp' => 'purple', 'udp' => 'orange',
    '深度学习' => 'purple', '领域/深度学习' => 'purple', 'deep learning' => 'purple',
    '模块/转置卷积' => 'yellow', '模块/上采样' => 'green',
    'control & estimation' => 'orange', '控制与估计' => 'orange', 'control' => 'orange',
    'kalman filter' => 'purple', 'mathematics' => 'coral',
    'software' => 'blue', 'wechat' => 'green', 'projects' => 'blue',
    'personal' => 'coral', 'graduate study' => 'yellow', 'life' => 'coral',
    'jekyll' => 'orange', 'web development' => 'blue', 'research' => 'purple',
    'notes' => 'blue', '领域' => 'blue'
  }.freeze

  # Stable across builds and pages; new labels receive a deterministic fallback.
  def note_tone(value)
    label = value.to_s.strip.downcase
    NAMED[label] || PALETTE[Digest::SHA256.hexdigest(label).to_i(16) % PALETTE.length]
  end

  # Match the browser's row sampling before JavaScript has downloaded.
  def note_row_color(palette, index, count, columns)
    columns = [columns.to_i, 1].max
    row_count = (count.to_i + columns - 1) / columns
    row_index = index.to_i / columns
    palette_index = row_count > 1 ? (row_index * (palette.size - 1).to_f / (row_count - 1)).round : 0
    palette[palette_index]
  end
end

Liquid::Template.register_filter(NoteColors)
