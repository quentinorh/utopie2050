class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [ :home ]

  def home
    @posts = Post.published.order(created_at: :desc)
  end

  def test
    # Laissez vide pour le moment
  end
end
