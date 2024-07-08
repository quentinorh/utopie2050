class Post < ApplicationRecord
  belongs_to :user
  mount_uploader :photo, PhotoUploader

  validates :title, :body, presence: true
  validate :image_presence

  private

  def image_presence
    if photo.blank? && unsplash_image_url.blank?
      errors.add(:base, "You must upload an image or select one from Unsplash")
    end
  end
end
