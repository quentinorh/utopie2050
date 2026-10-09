class AddEmailAndClientTokenToPendingPosts < ActiveRecord::Migration[7.0]
  def change
    add_column :pending_posts, :email, :string
    add_column :pending_posts, :client_token, :string
    add_index :pending_posts, :email
    add_index :pending_posts, :client_token, unique: true
  end
end
