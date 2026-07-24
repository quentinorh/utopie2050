class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [ :home, :test ]

  def home
    @posts = Post.published.order(created_at: :desc)
    @published_posts_count = @posts.count
    @published_authors_count = Post.published.distinct.count(:user_id)
  end

  # Labo de design : 10 pistes pour le panneau .cover-controls__body.
  # Page autonome (aucun layout) pour ne pas hériter du CSS applicatif.
  def test
    render layout: false
  end
end
