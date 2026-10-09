class Admin::DashboardController < ApplicationController
  before_action :authenticate_user!
  before_action :authorize_admin

  def index
    @event_codes = EventCode.includes(:posts).all
    @posts = Post.includes(:user, :reports).order(created_at: :desc)
    @users = User.includes(:posts).order(created_at: :desc)
    @reports = Report.includes(:post, :user).order(created_at: :desc)
    @pending_posts = PendingPost.order(created_at: :desc)

    if params[:search].present?
      @posts = @posts.where("title ILIKE ?", "%#{params[:search]}%")
      @pending_posts = @pending_posts.where("payload->>'title' ILIKE ?", "%#{params[:search]}%")
    end

    @users_by_email = @users.index_by { |user| user.email.downcase }
  end

  def reel_data
    post = Post.includes(:user).find(params[:id])
    settings = post.pattern_settings.present? ? JSON.parse(post.pattern_settings) : {}
    hue = settings["hue"] || settings["color"] || 200

    render json: {
      title: post.title,
      username: post.user.username,
      body: post.body,
      cover: post.cover,
      pattern_settings: settings,
      hue: hue.to_i
    }
  end

  private

  def authorize_admin
    unless current_user&.admin?
      redirect_to root_path
    end
  end
end 