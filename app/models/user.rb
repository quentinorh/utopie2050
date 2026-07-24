class User < ApplicationRecord
  MAGIC_LINK_TTL = 20.minutes

  devise :database_authenticatable, :registerable,
         :rememberable, :validatable, :confirmable

  validates :username, presence: true, uniqueness: { case_sensitive: false, message: "Ce nom d'utilisateur est déjà pris." }
  validates :email, presence: true, uniqueness: { case_sensitive: false, message: "Cette adresse email est déjà utilisée." }
  validates :age, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  has_many :posts, dependent: :destroy
  has_many :favorites, dependent: :destroy
  has_many :favorited_posts, through: :favorites, source: :post

  before_validation :set_default_username, on: :create

  scope :has_posts, -> {
    joins(:posts)
      .where(posts: { draft: [false, nil] })
      .distinct
  }

  # Comptes non confirmés depuis plus de 48h (probablement des bots)
  scope :unconfirmed_expired, -> {
    where(confirmed_at: nil)
      .where(
        "(confirmation_sent_at IS NOT NULL AND confirmation_sent_at < ?) OR (confirmation_sent_at IS NULL AND created_at < ?)",
        48.hours.ago,
        48.hours.ago
      )
  }

  def self.cleanup_unconfirmed!
    users = unconfirmed_expired
    count = users.count
    users.destroy_all
    Rails.logger.info "[Cleanup] #{count} compte(s) non confirmé(s) supprimé(s)"
    count
  end

  def admin?
    role == "admin"
  end

  def password_required?
    false
  end

  def send_magic_link!
    raw = SecureRandom.urlsafe_base64(32)
    update!(
      magic_link_token: self.class.digest_magic_link_token(raw),
      magic_link_sent_at: Time.current
    )
    MagicLinkMailer.with(user: self, token: raw).login_link.deliver_now
    raw
  end

  def self.consume_magic_link(raw_token)
    return nil if raw_token.blank?

    user = find_by(magic_link_token: digest_magic_link_token(raw_token))
    return nil unless user
    return nil if user.magic_link_sent_at.blank? || user.magic_link_sent_at < MAGIC_LINK_TTL.ago

    user.confirm unless user.confirmed?
    user.update!(magic_link_token: nil, magic_link_sent_at: nil)
    user
  end

  def self.digest_magic_link_token(raw_token)
    Digest::SHA256.hexdigest(raw_token)
  end

  private

  def set_default_username
    if username.blank?
      self.username = "user#{id || User.maximum(:id).to_i + 1}"
    end
  end
end
