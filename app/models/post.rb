class Post < ApplicationRecord
  belongs_to :user
  has_one_attached :photo
  has_many :chapters, -> { order(position: :asc) }, dependent: :destroy
  has_many :post_themes, dependent: :destroy
  has_many :bookmarks, dependent: :destroy
  has_many :themes, through: :post_themes
  has_many :favorites, dependent: :destroy
  has_many :favorited_by, through: :favorites, source: :user
  before_save :update_color_from_pattern_settings

  accepts_nested_attributes_for :chapters, allow_destroy: true

  validates :title, presence: true
  # validates :image_rights, acceptance: { accept: true, message: "doit être coché pour publier" }

  attr_accessor :skip_photo_validation
  # validates :photo, presence: true, unless: -> { skip_photo_validation }

  scope :published, -> { where(draft: false) }
  scope :drafts, -> { where(draft: true) }
  scope :by_author, ->(user_id) { where(user_id: user_id) }
  scope :by_query, ->(query) { global_search(query) }

  after_save :generate_themes_from_openai

  include PgSearch::Model
  pg_search_scope :global_search,
    against: [ :title, :body ],
    associated_against: {
      user: [ :username ]
    },
    using: {
      tsearch: { prefix: true }
    }

  def calculate_reading_time
    words_per_minute = 180
    total_word_count = (body.present? ? body.split.size : 0) + chapters.sum { |chapter| chapter.body.split.size }
    reading_time_seconds = (total_word_count.to_f / words_per_minute * 60).round
    minutes = reading_time_seconds / 60
    seconds = reading_time_seconds % 60
    "#{minutes} min #{seconds.to_s.rjust(2, '0')}"
  end

  def calculate_spoken_time
    words_per_minute = 150
    total_word_count = (body.present? ? body.split.size : 0) + chapters.sum { |chapter| chapter.body.split.size }
    reading_time_seconds = (total_word_count.to_f / words_per_minute * 60).round
    minutes = reading_time_seconds / 60
    seconds = reading_time_seconds % 60
    "#{minutes} min #{seconds.to_s.rjust(2, '0')}"
  end

  private

  def update_color_from_pattern_settings
    if pattern_settings.present?
      settings = JSON.parse(pattern_settings)
      self.color = "hsl(#{settings['hue']}, 100%, 50%)" if settings['hue'].present?
    end
  end

  def generate_themes_from_openai
    content = "#{title}\n#{body}\n" + chapters.map(&:body).join("\n")
    existing_themes = Theme.pluck(:name).join(", ")

    # Utilise le service OpenAI pour générer les thématiques à partir du contenu tronqué
    generated_themes = OpenAiService.new.generate_themes(content, existing_themes)
    update_themes(generated_themes)
  end

  def update_themes(generated_themes)
    generated_themes.each do |theme_name|
      theme = Theme.find_or_create_by(name: theme_name)
      post_themes.find_or_create_by(theme: theme)
    end
  end

  def image_presence
    if photo.blank?
      errors.add(:base, "You must upload an image")
    end
  end
end
