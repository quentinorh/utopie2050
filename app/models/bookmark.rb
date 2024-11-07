class Bookmark < ApplicationRecord
    belongs_to :user
    belongs_to :post
    
    validates :character_position, presence: true
    validates :user_id, uniqueness: { scope: :post_id }
  end