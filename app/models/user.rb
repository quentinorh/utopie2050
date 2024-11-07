class User < ApplicationRecord
  # Devise modules...
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :confirmable

  # Validations
  validates :username, presence: true, uniqueness: { case_sensitive: false, message: "Ce nom d'utilisateur est déjà pris." }
  validates :email, presence: true, uniqueness: { case_sensitive: false, message: "Cette adresse email est déjà utilisée." }
  validates :age, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  # Associations
  has_many :posts, dependent: :destroy
  has_many :bookmarks, dependent: :destroy
  has_many :bookmarked_posts, through: :bookmarks, source: :post

  # Ajouter un callback pour s'assurer que le pseudo est toujours présent
  before_validation :set_default_username, on: :create

  scope :has_posts, -> { joins(:posts).distinct }

  private

  def set_default_username
    if self.username.blank?
      self.username = "user#{self.id || User.maximum(:id).to_i + 1}"
    end
  end
end
