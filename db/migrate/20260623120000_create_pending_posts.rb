class CreatePendingPosts < ActiveRecord::Migration[7.0]
  def change
    create_table :pending_posts do |t|
      t.string :token, null: false
      t.jsonb :payload, null: false, default: {}
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :pending_posts, :token, unique: true
    add_index :pending_posts, :expires_at
  end
end
