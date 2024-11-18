class RemoveEventCodeStringFromPosts < ActiveRecord::Migration[7.0]
  def up
    remove_column :posts, :event_code
  end

  def down
    add_column :posts, :event_code, :string
  end
end