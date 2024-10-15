class ChangeKeywordsTypeInPosts < ActiveRecord::Migration[7.0]
  def change
    ##remove_column :posts, :keywords
    add_column :posts, :keywords, :string, array: true, default: []  
  end
end
