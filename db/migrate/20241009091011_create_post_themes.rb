class CreatePostThemes < ActiveRecord::Migration[7.0]
  def change
    create_table :post_themes do |t|
      t.references :post, null: false, foreign_key: true
      t.references :theme, null: false, foreign_key: true

      t.timestamps
    end
  end
end
