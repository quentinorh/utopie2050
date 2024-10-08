class RemoveUnsplashImageUrlFromPosts < ActiveRecord::Migration[7.0]
  def change
    remove_column :posts, :unsplash_image_url, :string
  end
end
