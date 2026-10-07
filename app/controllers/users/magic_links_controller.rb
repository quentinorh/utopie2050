class Users::MagicLinksController < ApplicationController
  skip_before_action :authenticate_user!

  def create
    email = params.dig(:user, :email).to_s.strip.downcase
    unless email.match?(Devise.email_regexp)
      redirect_to new_user_session_path, alert: email.blank? ? "Indique ton adresse email." : "Cette adresse email n'est pas valide."
      return
    end

    user = User.find_by("LOWER(email) = ?", email)

    if user
      # « Se souvenir de moi » : mémorisé le temps de l'aller-retour email, puis
      # appliqué à la connexion effective (action #show).
      session[:magic_link_remember] = ActiveModel::Type::Boolean.new.cast(params.dig(:user, :remember_me))

      begin
        user.send_magic_link!
      rescue Net::SMTPFatalError, Net::SMTPSyntaxError => e
        Rails.logger.error "[SMTP] Erreur magic-link : #{e.message}"
        redirect_to new_user_session_path, alert: "Adresse email invalide ou refusée."
        return
      rescue Net::SMTPError => e
        Rails.logger.error "[SMTP] Erreur SMTP inattendue (magic-link) : #{e.message}"
      end

      remember_magic_link_result(email, "sent")
    else
      session.delete(:magic_link_remember)
      remember_magic_link_result(email, "unknown")
    end

    redirect_to user_magic_link_result_path
  end

  def result
    @email = session[:magic_link_email].to_s
    @status = session[:magic_link_status].to_s
    return if @email.present? && %w[sent unknown].include?(@status)

    redirect_to new_user_session_path
  end

  def show
    user = User.consume_magic_link(params[:token])

    if user
      # Applique « Se souvenir de moi » (cookie persistant via Devise rememberable).
      user.remember_me = true if session.delete(:magic_link_remember)
      sign_in(user)
      redirect_to after_sign_in_path_for(user), notice: "Tu es connecté·e."
    else
      redirect_to magic_link_redirect_path,
                  alert: "Ce lien est invalide ou a expiré. Demande un nouveau lien de connexion."
    end
  end

  private

  def remember_magic_link_result(email, status)
    session[:magic_link_email] = email
    session[:magic_link_status] = status
  end

  def magic_link_redirect_path
    PendingPostSession.fetch(session) ? pending_posts_path : new_user_session_path
  end
end
