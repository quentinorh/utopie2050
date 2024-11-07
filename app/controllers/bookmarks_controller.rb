class BookmarksController < ApplicationController
    before_action :authenticate_user!
    before_action :set_post
    
    def create
        @bookmark = current_user.bookmarks.find_or_initialize_by(post: @post)
        @bookmark.character_position = params[:character_position]
    
        Rails.logger.debug "Bookmark params: #{params.inspect}"
        Rails.logger.debug "Bookmark valid? #{@bookmark.valid?}"
        Rails.logger.debug "Bookmark errors: #{@bookmark.errors.full_messages}"
    
        respond_to do |format|
          if @bookmark.save
            format.json { render json: { status: 'success', bookmark: @bookmark } }
          else
            format.json { render json: { status: 'error', errors: @bookmark.errors.full_messages }, status: :unprocessable_entity }
          end
        end
    end
    
    def destroy
      @bookmark = current_user.bookmarks.find_by(post: @post)
      @bookmark&.destroy
      
      respond_to do |format|
        format.json { render json: { status: 'success' } }
      end
    end
    
    def show
      @bookmark = current_user.bookmarks.find_by(post: @post)
      
      respond_to do |format|
        if @bookmark
          format.json { render json: { status: 'success', bookmark: @bookmark } }
        else
          format.json { render json: { status: 'error' }, status: :not_found }
        end
      end
    end
    
    private
    
    def set_post
      @post = Post.find(params[:post_id])
    end
  end