class Post < ApplicationRecord
  belongs_to :user
  has_one_attached :photo

  validates :title, :body, presence: true
  validate :image_presence

  scope :published, -> { where(draft: false) }
  scope :drafts, -> { where(draft: true) }
  
  def calculate_reading_time
    words_per_minute = 238
    word_count = body.split.size
    reading_time_minutes = (word_count.to_f / words_per_minute).ceil
    reading_time_minutes
  end

  private

  def image_presence
    if photo.blank? && unsplash_image_url.blank?
      errors.add(:base, "You must upload an image or select one from Unsplash")
    end
  end
end
