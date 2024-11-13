require 'open-uri'

class PostsController < ApplicationController
  before_action :authenticate_user!, except: [:index, :show]
  before_action :set_post, only: [:show, :edit, :update, :destroy, :remove_photo]

  has_scope :by_author
  has_scope :by_query

  def index
    @posts = apply_scopes(Post).all

    respond_to do |format|
      format.html
      format.turbo_stream { render turbo_stream: turbo_stream.update('posts', partial: 'posts', locals: { posts: @posts }) }
    end
  end

  def show
    @show_settings_panel = true
  end

  def new
    @post = current_user.posts.build
  end

  def create
    @post = current_user.posts.build(post_params)
    if @post.save
      redirect_to @post
    else
      Rails.logger.debug @post.errors.full_messages
      render :new
    end
  end

  def edit
    @post = Post.find(params[:id])
    @pattern_settings = JSON.parse(@post.pattern_settings || '{}')
  end

  def update
    if @post.update(post_params)
      redirect_to @post, notice: 'Post was successfully updated.'
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
    @posts = @user.posts
  end

  def favorite
    @post = Post.find(params[:id])
    current_user.favorites.create(post: @post)
    
    respond_to do |format|
      format.turbo_stream { render turbo_stream: turbo_stream.replace("favorite_button", 
        partial: "shared/favorite_button", 
        locals: { post: @post }) }
      format.html { redirect_to @post }
    end
  end

  def unfavorite
    @post = Post.find(params[:id])
    current_user.favorites.where(post: @post).destroy_all
    
    respond_to do |format|
      format.turbo_stream { render turbo_stream: turbo_stream.replace("favorite_button", 
        partial: "shared/unfavorite_button", 
        locals: { post: @post }) }
      format.html { redirect_to @post }
    end
  end

  def favorites
    @favorite_posts = Post.joins(:favorites)
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

  def post_params
    params.require(:post).permit(:cover, :pattern_settings, :title, :photo, :image_rights, :body, :color, :draft,
      chapters_attributes: [:id, :title, :body, :position, :_destroy])
  end
end
