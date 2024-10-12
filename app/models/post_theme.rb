class PostTheme < ApplicationRecord
  belongs_to :post
  belongs_to :theme
end
