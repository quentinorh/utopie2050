class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [ :home ]

  def home
    @posts = Post.published.order(created_at: :desc)
    @published_posts_count = @posts.count
    @published_authors_count = Post.published.distinct.count(:user_id)
  end

  def test
    # Laissez vide pour le moment
  end
end
