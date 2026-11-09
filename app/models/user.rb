class User < ApplicationRecord
  MAGIC_LINK_TTL = 20.minutes

  # remember_token : sans mot de passe, authenticatable_salt est vide et
  # Rememberable refuse le cookie « Se souvenir de moi ».
  devise :database_authenticatable, :registerable,
         :rememberable, :validatable, :confirmable

  validates :username, presence: true, uniqueness: { case_sensitive: false, message: "est déjà pris" }
  validates :email, presence: true, uniqueness: { case_sensitive: false, message: "est déjà utilisée" }
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

  # « 60 ans », « 60 » ou 60 : seul le nombre est conservé. Une saisie sans
  # chiffre est laissée telle quelle pour que la validation la signale.
  def age=(value)
    if value.is_a?(String)
      digits = value[/\d+/]
      value = digits || value.strip.presence
    end
    super(value)
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

  # Correction d'adresse depuis « Vérifie ta boîte mail » : le compte non
  # confirmé créé à la première saisie garde le même nom ; on change seulement
  # l'email. Sans cela, l'unicité du username bloque et le texte reste perdu.
  def self.reclaim_unconfirmed_for_pending!(username:, new_email:, previous_email:, age: nil)
    previous = previous_email.to_s.strip.downcase
    fresh = new_email.to_s.strip.downcase
    return nil if previous.blank? || fresh.blank? || previous == fresh

    user = find_by("LOWER(username) = ?", username.to_s.strip.downcase)
    return nil unless user
    return nil if user.confirmed?
    return nil if user.posts.exists?
    return nil unless user.email.downcase == previous
    return nil if where("LOWER(email) = ?", fresh).where.not(id: user.id).exists?

    user.skip_reconfirmation!
    user.skip_confirmation_notification!
    user.email = fresh
    user.age = age if age.present?
    user.save ? user : nil
  end

  private

  def set_default_username
    if username.blank?
      self.username = "user#{id || User.maximum(:id).to_i + 1}"
    end
  end
end
