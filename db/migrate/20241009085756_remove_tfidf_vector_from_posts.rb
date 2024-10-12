class RemoveTfidfVectorFromPosts < ActiveRecord::Migration[7.0]
  def change
    remove_column :posts, :tfidf_vector, :text
  end
end
