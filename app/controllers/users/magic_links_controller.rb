class Users::MagicLinksController < ApplicationController
  skip_before_action :authenticate_user!

  def create
    email = params.dig(:user, :email).to_s.strip.downcase
    user = User.find_by("LOWER(email) = ?", email)

    begin
      user&.send_magic_link!
    rescue Net::SMTPFatalError, Net::SMTPSyntaxError => e
      Rails.logger.error "[SMTP] Erreur magic-link : #{e.message}"
      redirect_to new_user_session_path, alert: "L'adresse email semble invalide ou n'accepte pas les emails."
      return
    rescue Net::SMTPError => e
      Rails.logger.error "[SMTP] Erreur SMTP inattendue (magic-link) : #{e.message}"
    end

    redirect_to magic_link_redirect_path,
                notice: "Si un compte existe pour cette adresse, un lien de connexion t'a été envoyé."
  end

  def show
    user = User.consume_magic_link(params[:token])

    if user
      sign_in(user)
      redirect_to after_sign_in_path_for(user), notice: "Tu es connecté·e."
    else
      redirect_to magic_link_redirect_path,
                  alert: "Ce lien est invalide ou a expiré. Demande un nouveau lien de connexion."
    end
  end

  private

  def magic_link_redirect_path
    PendingPostSession.fetch(session) ? pending_posts_path : new_user_session_path
  end
end
