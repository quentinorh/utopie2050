class Admin::DashboardController < ApplicationController
  before_action :authenticate_user!
  before_action :authorize_admin

  def index
    @event_codes = EventCode.includes(:posts).all
    @posts = Post.includes(:user, :reports).order(created_at: :desc)
    @users = User.includes(:posts).order(created_at: :desc)
    @reports = Report.includes(:post, :user).order(created_at: :desc)

    if params[:search].present?
      @posts = @posts.where("title ILIKE ?", "%#{params[:search]}%")
    end
  end

  private

  def authorize_admin
    unless current_user&.admin?
      redirect_to root_path
    end
  end
end 