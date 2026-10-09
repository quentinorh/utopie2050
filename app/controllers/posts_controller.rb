require 'open-uri'

class PostsController < ApplicationController
  before_action :authenticate_user!, except: [:index, :show, :export_pdf, :export_epub, :new, :stage, :pending, :pending_auth, :pending_cover]
  before_action :set_post, only: [:show, :edit, :update, :destroy, :favorite, :unfavorite, :export_pdf, :export_epub]
  before_action :authorize_user!, only: [:edit, :update, :destroy]
  before_action :load_pending_post, only: [:pending, :pending_auth, :pending_cover, :claim]

  has_scope :by_author
  has_scope :by_query
  has_scope :by_reading_time_range, using: %i[min max], type: :hash

  def index
    @max_reading_time = Post.maximum(:reading_time).to_i
    @posts = apply_scopes(Post.published).order(created_at: :desc)
    @filters_active = params[:by_query].present? || params[:by_author].present? ||
      (params.dig(:by_reading_time_range, :min).to_i > 0) ||
      (params.dig(:by_reading_time_range, :max).present? && params.dig(:by_reading_time_range, :max).to_i < @max_reading_time)

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def show
    unless can_view_draft?(@post)
      redirect_to posts_path, alert: "Ce futur n'est pas accessible."
      return
    end
    @report = Report.new
    @show_settings_panel = true
  end

  def new
    @post = user_signed_in? ? current_user.posts.build : Post.new
    @guest_writer = !user_signed_in?
    @client_token = SecureRandom.uuid
  end

  def stage
    @client_token = params.dig(:post, :client_token).presence || SecureRandom.uuid
    @post = Post.new(stage_post_params.except(:event_code, :client_token))
    @guest_writer = true

    if @post.title.blank?
      @post.errors.add(:title, :blank)
      render :new, status: :unprocessable_entity
      return
    end

    PendingPostSession.store(session, params)
    redirect_to pending_posts_path
  end

  def pending
    redirect_to claim_posts_path if user_signed_in?
  end

  def pending_auth
    redirect_to claim_posts_path and return if user_signed_in?

    if params[:website_url].present?
      Rails.logger.warn "[Honeypot] Bot détecté depuis l'IP #{request.remote_ip} (pending_auth)"
      redirect_to pending_posts_path(mail_sent: 1) and return
    end

    email = params[:email].to_s.strip.downcase
    unless email.match?(Devise.email_regexp)
      flash.now[:alert] = email.blank? ? "Indique ton adresse email." : "Cette adresse email n'est pas valide."
      @pending_auth_email = email
      render :pending, status: :unprocessable_entity
      return
    end

    user = User.find_by("LOWER(email) = ?", email)
    if user
      deliver_pending_link(user)
      return
    end

    username = pending_username_param
    terms_ok = ActiveModel::Type::Boolean.new.cast(params[:terms_accepted])

    unless username.present? && terms_ok
      assign_identity_form(email, username, terms_ok)
      render :pending, status: :unprocessable_entity
      return
    end

    user = User.new(email: email, username: username, age: params[:age].presence || 0)
    user.skip_confirmation_notification!

    unless user.save
      flash.now[:alert] = user.errors.full_messages.to_sentence
      if user.errors[:username].empty?
        @pending_auth_email = email
        @identity_username = username
        @pending_auth_age = params[:age].to_s
        @terms_already_accepted = true
      else
        assign_identity_form(email, username, true)
        @show_username = true
      end
      render :pending, status: :unprocessable_entity
      return
    end

    deliver_pending_link(user)
  end

  # Remplace l'image de partage une fois le nom connu, sans recharger la page.
  def pending_cover
    refresh_pending_cover
    head :no_content
  end

  def claim
    posts = []
    PendingPostSession.claimable_records(session, current_user).each do |record|
      post = PendingPostSession.claim_record!(current_user, record)
      unless post.persisted?
        redirect_to pending_posts_path, alert: post.errors.full_messages.to_sentence
        return
      end

      AttachCoverImageJob.perform_later(post.id)
      posts << post
    end
    PendingPostSession.clear_token!(session)

    if posts.empty?
      redirect_to new_post_path, alert: "Aucun futur en attente. Tu peux recommencer ton écriture."
      return
    end

    notice = if posts.many?
      "Tes textes ont été enregistrés."
    elsif posts.first.draft
      "Ton brouillon a été enregistré."
    else
      "Ton futur a été publié."
    end
    destination = posts.one? ? posts.first : user_posts_path
    redirect_to destination, notice: notice, flash: { clear_registration_prefill: true }
  end

  def create
    @post = current_user.posts.build(post_params.except(:event_code))
    set_event_code
    
    if @post.save
      AttachCoverImageJob.perform_later(@post.id)
      redirect_to @post, flash: { clear_registration_prefill: true }
    else
      render :new
    end
  end

  def edit
    @pattern_settings = JSON.parse(@post.pattern_settings || '{}')
  end

  def update
    set_event_code
    @post.assign_attributes(post_params.except(:event_code))
    
    if @post.save
      AttachCoverImageJob.perform_later(@post.id)
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
    @user = current_user
    @posts = @user.posts

    @user_posts = @user.posts

    respond_to do |format|
      format.html
      format.turbo_stream { render turbo_stream: turbo_stream.update('user_posts', 
        partial: 'posts', 
        locals: { posts: @user_posts }) }
    end
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

  def export_pdf
    return unless authorize_export!

    exporter = build_exporter
    send_data exporter.to_pdf,
              filename: "#{exporter.filename_base}.pdf",
              type: "application/pdf",
              disposition: "attachment"
  end

  def export_epub
    return unless authorize_export!

    exporter = build_exporter
    send_data exporter.to_epub,
              filename: "#{exporter.filename_base}.epub",
              type: "application/epub+zip",
              disposition: "attachment"
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
    @post = Post.includes(cover_image_attachment: :blob).find(params[:id])
  end

  def authorize_user!
    unless current_user == @post.user || current_user.admin?
      redirect_to root_path, alert: "Tu n'es pas autorisé à effectuer cette action."
    end
  end

  def post_params
    params.require(:post).permit(:cover, :pattern_settings, :title, :body, :color, :draft,
      :cover_image,
      chapters_attributes: [:id, :title, :body, :position, :_destroy])
  end

  def stage_post_params
    params.require(:post).permit(:cover, :pattern_settings, :title, :body, :color, :draft,
      :cover_image, :event_code, :client_token,
      chapters_attributes: [:id, :title, :body, :position, :_destroy])
  end

  def pending_username_param
    value = params[:username].to_s.strip
    return if value.blank? || value == "…"

    value
  end

  def assign_identity_form(email, username, terms_ok)
    @needs_identity = true
    @show_username = username.blank?
    @show_terms = !terms_ok
    @identity_username = username.to_s
    @pending_auth_email = email
    @pending_auth_age = params[:age].to_s
  end

  def deliver_pending_link(user)
    PendingPostSession.assign_email!(session, user.email)
    refresh_pending_cover

    begin
      user.send_magic_link!
    rescue Net::SMTPFatalError, Net::SMTPSyntaxError => e
      Rails.logger.error "[SMTP] Erreur pending_auth : #{e.message}"
      flash.now[:alert] = "L'adresse email semble invalide ou n'accepte pas les emails."
      @pending_auth_email = user.email
      @cover_username = user.username
      render :pending, status: :unprocessable_entity
      return
    rescue Net::SMTPError => e
      Rails.logger.error "[SMTP] Erreur SMTP inattendue (pending_auth) : #{e.message}"
    end

    redirect_to pending_posts_path(mail_sent: 1), flash: { pending_author: user.username }
  end

  def refresh_pending_cover
    file = params[:cover_image]
    return if file.blank?

    PendingPostSession.find_record(session)&.cover_image&.attach(file)
  rescue StandardError => e
    Rails.logger.error "[PendingPost] Couverture non remplacée : #{e.message}"
  end

  def load_pending_post
    @pending_post = PendingPostSession.fetch(session)
    return if @pending_post
    return if user_signed_in? && %w[pending claim].include?(action_name) && PendingPostSession.pending_for?(session, current_user)

    redirect_to new_post_path, alert: "Aucun futur en attente. Tu peux recommencer ton écriture."
  end

  def can_view_draft?(post)
    return true unless post.draft == true
    current_user&.admin? || current_user == post.user
  end

  def build_exporter
    PostExportService.new(@post, og_image_url: absolute_open_graph_image_url)
  end

  def absolute_open_graph_image_url
    url = helpers.open_graph_image_url_for(@post).to_s.strip
    return url if url.start_with?("http://", "https://")

    URI.join("#{request.base_url}/", url.delete_prefix("/")).to_s
  end

  def authorize_export!
    unless can_view_draft?(@post)
      redirect_to posts_path, alert: "Ce futur n'est pas accessible."
      return false
    end

    true
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
