class Post < ApplicationRecord
  belongs_to :user
  has_one_attached :photo
  has_one_attached :cover_image
  has_many :chapters, -> { order(position: :asc) }, dependent: :destroy
  has_many :post_themes, dependent: :destroy
  has_many :bookmarks, dependent: :destroy
  has_many :themes, through: :post_themes
  has_many :favorites, dependent: :destroy
  has_many :favorited_by, through: :favorites, source: :user
  has_many :reports, dependent: :destroy
  belongs_to :event_code, optional: true
  before_save :update_color_from_pattern_settings, :set_reading_time

  accepts_nested_attributes_for :chapters, allow_destroy: true

  validates :title, presence: true

  attr_accessor :skip_photo_validation

  scope :published, -> { where("draft IS NULL OR draft = ?", false) }
  scope :drafts, -> { where(draft: true) }
  scope :by_author, ->(user_id) { where(user_id: user_id) }
  scope :by_query, ->(query) { global_search(query) }
  scope :by_reading_time_range, ->(min, max) {
    where("reading_time >= ? AND reading_time <= ?", min, max)
  }
  scope :viewable_by, ->(user) {
    if user&.admin?
      all
    elsif user
      where('draft = false OR user_id = ?', user.id)
    else
      where(draft: false)
    end
  }

  include PgSearch::Model
  pg_search_scope :global_search,
    against: [ :title, :body ],
    associated_against: {
      user: [ :username ],
      chapters: [ :title, :body ]
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

  def event_code_details
    return nil unless event_code
    {
      text: event_code.text,
      link: event_code.link,
      color: event_code.color
    }
  end

  def social_image_url
    return nil unless cover_image.attached?
    
    public_id = "utopia2050/#{cover_image.key}"
    Cloudinary::Utils.cloudinary_url(
      public_id,
      type: :upload,
      resource_type: :image,
      format: :jpg,
      transformation: {
          width: 1000,
          height: 1400,
          crop: :fill,
          quality: :auto
      }
    )
  end

  private

  def update_color_from_pattern_settings
    if pattern_settings.present?
      settings = JSON.parse(pattern_settings)
      self.color = "hsl(#{settings['hue']}, 100%, 50%)" if settings['hue'].present?
    end
  end

  def set_reading_time
    self.reading_time = calculate_reading_time.to_i
  end
end
