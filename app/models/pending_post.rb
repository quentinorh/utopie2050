class PendingPost < ApplicationRecord
  has_one_attached :cover_image

  scope :active, -> { where("expires_at > ?", Time.current) }

  validates :token, presence: true, uniqueness: true
  validates :payload, presence: true
  validates :expires_at, presence: true
end
