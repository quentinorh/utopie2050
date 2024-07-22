class Post < ApplicationRecord
  belongs_to :user
  has_one_attached :photo

  validates :title, :body, presence: true
  validate :image_presence

  scope :published, -> { where(draft: false) }
  scope :drafts, -> { where(draft: true) }

  private

  def image_presence
    if photo.blank? && unsplash_image_url.blank?
      errors.add(:base, "You must upload an image or select one from Unsplash")
    end
  end
end
