class Post < ApplicationRecord
  belongs_to :user
  has_one_attached :photo
  has_many :chapters, -> { order(position: :asc) }, dependent: :destroy

  accepts_nested_attributes_for :chapters, allow_destroy: true

  validates :title, presence: true
  validates :image_rights, acceptance: { accept: true, message: "doit être coché pour publier" }

  attr_accessor :skip_photo_validation
  validates :photo, presence: true, unless: -> { skip_photo_validation }

  scope :published, -> { where(draft: false) }
  scope :drafts, -> { where(draft: true) }

  def calculate_reading_time
    words_per_minute = 238
    total_word_count = chapters.sum { |chapter| chapter.body.split.size }
    reading_time_seconds = (total_word_count.to_f / words_per_minute * 60).round
    minutes = reading_time_seconds / 60
    seconds = reading_time_seconds % 60
    "#{minutes} min #{seconds.to_s.rjust(2, '0')}"
  end

  def calculate_spoken_time
    words_per_minute = 150
    total_word_count = chapters.sum { |chapter| chapter.body.split.size }
    reading_time_seconds = (total_word_count.to_f / words_per_minute * 60).round
    minutes = reading_time_seconds / 60
    seconds = reading_time_seconds % 60
    "#{minutes} min #{seconds.to_s.rjust(2, '0')}"
  end

  private

  def image_presence
    if photo.blank?
      errors.add(:base, "You must upload an image")
    end
  end
end
