class PendingPost < ApplicationRecord
  has_one_attached :cover_image

  scope :active, -> { where("expires_at > ?", Time.current) }

  validates :token, presence: true, uniqueness: true
  validates :payload, presence: true
  validates :expires_at, presence: true
  validates :client_token, uniqueness: true, allow_nil: true

  def self.for_email(email)
    normalized = email.to_s.strip.downcase
    return none if normalized.blank?

    active.where("LOWER(email) = ?", normalized)
  end

  def title
    payload["title"].to_s
  end

  def draft?
    payload["draft"] == true
  end

  def body_excerpt
    payload["body"].to_s.truncate(140)
  end

  def expired?
    expires_at <= Time.current
  end
end
