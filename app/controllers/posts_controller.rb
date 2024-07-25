require 'open-uri'

class PostsController < ApplicationController
  before_action :authenticate_user!, except: [:index, :show]
  before_action :set_post, only: [:show, :edit, :update, :destroy, :remove_photo]
  protect_from_forgery except: :search_unsplash

  def index
    @posts = Post.all
  end

  def show
  end

  def new
    @post = current_user.posts.build
  end

  def create
    @post = current_user.posts.build(post_params)
    if @post.unsplash_image_url.present?
      download_unsplash_image(@post.unsplash_image_url)
    end

    if @post.save
      redirect_to @post, notice: 'Post was successfully created.'
    else
      render :new
    end
  end

  def edit
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
      format.html { redirect_to posts_url, notice: 'Post was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  def user_posts
    @user = User.find(params[:user_id])
    @posts = @user.posts
  end

  def search_unsplash
    @photos = Unsplash::Photo.search(params[:query])
    respond_to do |format|
      format.js
    end
  end

  private

  def set_post
    @post = Post.find(params[:id])
  end

  def download_unsplash_image(url)
    downloaded_image = URI.open(url)
    @post.photo.attach(io: downloaded_image, filename: "unsplash_image_#{Time.now.to_i}.jpg", content_type: 'image/jpeg')
  end

  def post_params
    params.require(:post).permit(:title, :body, :photo, :unsplash_image_url, :color, :draft, :image_rights)
  end
end
