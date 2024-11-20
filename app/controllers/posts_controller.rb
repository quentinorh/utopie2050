require 'open-uri'

class PostsController < ApplicationController
  before_action :authenticate_user!, except: [:index, :show]
  before_action :set_post, only: [:show, :edit, :update, :destroy, :favorite, :unfavorite]
  before_action :authorize_user!, only: [:edit, :update, :destroy]

  has_scope :by_author
  has_scope :by_query
  has_scope :by_reading_time_range, using: %i[min max], type: :hash

  def index
    @max_reading_time = Post.maximum(:reading_time).to_i
    @posts = apply_scopes(Post.published).order(created_at: :desc)
  
    respond_to do |format|
      format.html
      format.turbo_stream { render turbo_stream: turbo_stream.update('posts', partial: 'posts', locals: { posts: @posts }) }
    end
  end

  def show
    unless can_view_draft?(@post)
      redirect_to posts_path, alert: "Ce récit n'est pas accessible."
      return
    end
    @report = Report.new
    @show_settings_panel = true
  end

  def new
    @post = current_user.posts.build
  end

  def create
    @post = current_user.posts.build(post_params.except(:event_code))
    set_event_code
    
    if @post.save
      redirect_to @post
    else
      render :new
    end
  end

  def edit
    @pattern_settings = JSON.parse(@post.pattern_settings || '{}')
  end

  def update
    set_event_code
    
    if @post.update(post_params.except(:event_code))
      redirect_to @post
    else
      render :edit
    end
  end

  def destroy
    @post.destroy
    respond_to do |format|
      format.html { redirect_to deleted_posts_path }
      format.turbo_stream { redirect_to deleted_posts_path }
      format.json { head :no_content }
    end
  end

  def user_posts
    @user = User.find(params[:user_id])
    @posts = @user.posts.viewable_by(current_user)
  end

  def favorite
    current_user.favorites.create(post: @post)
    
    respond_to do |format|
      format.turbo_stream { render turbo_stream: turbo_stream.replace("favorite_button", 
        partial: "shared/favorite_button", 
        locals: { post: @post }) }
      format.html { redirect_to @post }
    end
  end

  def unfavorite
    current_user.favorites.where(post: @post).destroy_all
    
    respond_to do |format|
      format.turbo_stream { render turbo_stream: turbo_stream.replace("favorite_button", 
        partial: "shared/unfavorite_button", 
        locals: { post: @post }) }
      format.html { redirect_to @post }
    end
  end

  def favorites
    @favorite_posts = Post.published
                         .joins(:favorites)
                         .where(favorites: { user_id: current_user.id })
                         .includes(:user)
    
    respond_to do |format|
      format.html
      format.turbo_stream { render turbo_stream: turbo_stream.update('favorite_posts', 
        partial: 'posts', 
        locals: { posts: @favorite_posts }) }
    end
  end

  private

  def set_post
    @post = Post.find(params[:id])
  end

  def authorize_user!
    unless current_user == @post.user || current_user.admin?
      redirect_to root_path, alert: "Tu n'es pas autorisé à effectuer cette action."
    end
  end

  def post_params
    params.require(:post).permit(:cover, :pattern_settings, :title, :body, :color, :draft,
      chapters_attributes: [:id, :title, :body, :position, :_destroy])
  end

  def can_view_draft?(post)
    return true unless post.draft == true
    current_user&.admin? || current_user == post.user
  end

  def set_event_code
    if params[:post][:event_code].present?
      event_code = EventCode.find_by(code: params[:post][:event_code])
      @post.event_code = event_code
    else
      @post.event_code = nil
    end
  end
end
