class PagesController < ApplicationController
  skip_before_action :authenticate_user!, only: [ :home ]

  def home
    @posts = Post.published.order(created_at: :desc)
    # Top 20 authors by published-post count, each with their most
    # recent published post pre-loaded (used as the typo-scroll cover).
    @featured_users = User
      .joins(:posts)
      .where(posts: { draft: [false, nil] })
      .group("users.id")
      .order(Arel.sql("COUNT(posts.id) DESC"))
      .limit(20)
    @featured_user_covers = Post
      .where(user_id: @featured_users.pluck(:id), draft: [false, nil])
      .order(created_at: :desc)
      .group_by(&:user_id)
      .transform_values(&:first)
  end

  def test
    # Laissez vide pour le moment
  end
end
