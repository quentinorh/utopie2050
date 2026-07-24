class Users::SessionsController < Devise::SessionsController
  # La connexion se fait via magic-link (Users::MagicLinksController)
  # ou Google OAuth. Devise gère uniquement new / destroy.
  def create
    redirect_to new_user_session_path, alert: "Utilise le lien magique envoyé par email pour te connecter."
  end
end
