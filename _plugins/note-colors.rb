require 'digest'

module NoteColors
  PALETTE = %w[blue violet teal amber rose cyan indigo orange lime slate].freeze
  NAMED = {
    'ros2' => 'teal', 'px4' => 'blue', 'robotics' => 'teal',
    '计算机网络' => 'cyan', 'networking' => 'cyan', 'tcp' => 'indigo', 'udp' => 'orange',
    '深度学习' => 'violet', '领域/深度学习' => 'violet', 'deep learning' => 'violet',
    '模块/转置卷积' => 'amber', '模块/上采样' => 'teal',
    'control & estimation' => 'amber', '控制与估计' => 'amber', 'control' => 'amber',
    'kalman filter' => 'violet', 'mathematics' => 'rose',
    'software' => 'blue', 'wechat' => 'teal', 'projects' => 'indigo',
    'personal' => 'rose', 'graduate study' => 'amber', 'life' => 'rose',
    'jekyll' => 'orange', 'web development' => 'blue', 'research' => 'indigo',
    'notes' => 'slate', '领域' => 'slate'
  }.freeze

  # Stable across builds and pages; new labels receive a deterministic fallback.
  def note_tone(value)
    label = value.to_s.strip.downcase
    NAMED[label] || PALETTE[Digest::SHA256.hexdigest(label).to_i(16) % PALETTE.length]
  end
end

Liquid::Template.register_filter(NoteColors)
