class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [ :home, :writing_tutorial ]

  def home
    @posts = Post.published.order(created_at: :desc)
    @published_posts_count = @posts.count
    @published_authors_count = Post.published.distinct.count(:user_id)
  end

  def writing_tutorial
    @skip_path = new_post_path
    @writing_tutorial_trends = WritingTutorialTrends::BY_THEME
    @narrative_styles = WritingTutorialNarrativeStyles::STYLES
  end
end
