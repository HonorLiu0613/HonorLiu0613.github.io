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
end

Liquid::Template.register_filter(NoteColors)
