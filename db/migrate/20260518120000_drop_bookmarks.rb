class DropBookmarks < ActiveRecord::Migration[7.0]
  def up
    drop_table :bookmarks, if_exists: true
  end

  def down
    create_table :bookmarks do |t|
      t.references :user, null: false, foreign_key: true
      t.references :post, null: false, foreign_key: true
      t.integer :character_position, null: false
      t.timestamps
    end
    add_index :bookmarks, [:user_id, :post_id], unique: true
  end
end
