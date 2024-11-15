class Report < ApplicationRecord
  belongs_to :post
  belongs_to :user, optional: true
  
  validates :comment, presence: true
  validates :status, inclusion: { in: %w[pending reviewed dismissed] }
end 