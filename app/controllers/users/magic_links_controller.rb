class Users::MagicLinksController < ApplicationController
  skip_before_action :authenticate_user!

  def create
    email = params.dig(:user, :email).to_s.strip.downcase
    user = User.find_by("LOWER(email) = ?", email)

    # « Se souvenir de moi » : mémorisé le temps de l'aller-retour email, puis
    # appliqué à la connexion effective (action #show).
    session[:magic_link_remember] = ActiveModel::Type::Boolean.new.cast(params.dig(:user, :remember_me))

    begin
      user&.send_magic_link!
    rescue Net::SMTPFatalError, Net::SMTPSyntaxError => e
      Rails.logger.error "[SMTP] Erreur magic-link : #{e.message}"
      return respond_magic_link(alert: "Adresse email invalide ou refusée.")
    rescue Net::SMTPError => e
      Rails.logger.error "[SMTP] Erreur SMTP inattendue (magic-link) : #{e.message}"
    end

    respond_magic_link(notice: "Si un compte existe, un lien t'est envoyé.")
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

  # Répond en Turbo Stream (pas de rechargement) : met à jour la flash et, en cas
  # de succès, bascule le CTA sur « Renvoyer un code de connexion » — l'email saisi
  # reste en place. Fallback HTML (sans JS) : redirection classique.
  def respond_magic_link(notice: nil, alert: nil)
    respond_to do |format|
      format.turbo_stream do
        flash.now[:notice] = notice if notice
        flash.now[:alert] = alert if alert

        streams = [turbo_stream.update("flashes", partial: "shared/flashes")]
        if notice
          streams << turbo_stream.update(
            "signin-submit",
            partial: "devise/sessions/submit",
            locals: { label: "Renvoyer un code de connexion" }
          )
        end
        render turbo_stream: streams
      end

      format.html do
        redirect_to(alert ? new_user_session_path : magic_link_redirect_path,
                    notice: notice, alert: alert)
      end
    end
  end

  def magic_link_redirect_path
    PendingPostSession.fetch(session) ? pending_posts_path : new_user_session_path
  end
end
