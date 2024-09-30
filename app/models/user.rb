class User < ApplicationRecord
  # Devise modules...
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable, :confirmable

  # Validations
  validates :username, presence: true, uniqueness: true
  validates :age, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :email, presence: true, uniqueness: true

  # Associations
  has_many :posts, dependent: :destroy

  # Ajouter un callback pour s'assurer que le pseudo est toujours présent
  before_validation :set_default_username, on: :create

  private

  def set_default_username
    if self.username.blank?
      self.username = "user#{self.id || User.maximum(:id).to_i + 1}"
    end
  end
end
