class Admin::PendingPostsController < ApplicationController
  include AdminAuthorizable

  def show
    @pending = PendingPost.find(params[:id])
    author = User.new(username: @pending.email.presence || "En attente")
    @post = PendingPostSession.build_post(author, @pending.payload || {})
    @post.created_at = @pending.created_at
  end

  def update
    pending = PendingPost.find(params[:id])
    email = params[:email].to_s.strip.downcase

    if params[:claim].present? && email.blank?
      redirect_to admin_dashboard_path, alert: "Indique une adresse pour rattacher ce texte."
      return
    end

    if email.present? && !email.match?(Devise.email_regexp)
      redirect_to admin_dashboard_path, alert: "Adresse email invalide."
      return
    end

    pending.update!(email: email.presence)

    unless params[:claim].present?
      redirect_to admin_dashboard_path, notice: "Adresse enregistrée."
      return
    end

    user = User.find_by("LOWER(email) = ?", email)
    unless user
      redirect_to admin_dashboard_path,
                  alert: "Aucun compte pour #{email}. L'adresse est enregistrée : le texte sera rattaché à la prochaine connexion."
      return
    end

    post = PendingPostSession.claim_record!(user, pending)
    unless post.persisted?
      redirect_to admin_dashboard_path, alert: post.errors.full_messages.to_sentence
      return
    end

    AttachCoverImageJob.perform_later(post.id)
    redirect_to admin_dashboard_path, notice: "« #{post.title} » a été rattaché à #{user.email}."
  end

  def destroy
    PendingPost.find(params[:id]).destroy
    redirect_to admin_dashboard_path, notice: "Texte en attente supprimé."
  end
end
