class AddDraftToPosts < ActiveRecord::Migration[7.0]
  def change
    add_column :posts, :draft, :boolean
  end
end
