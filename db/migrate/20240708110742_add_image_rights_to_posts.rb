class AddImageRightsToPosts < ActiveRecord::Migration[7.0]
  def change
    add_column :posts, :image_rights, :boolean
  end
end
