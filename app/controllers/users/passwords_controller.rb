class Users::PasswordsController < Devise::PasswordsController
  skip_before_action :require_no_authentication
  
  # Permet l'accès à la page de réinitialisation même si connecté
  def edit
    super
  end

  # Gère la mise à jour du mot de passe
  def update
    super
  end

  protected

  def after_resetting_password_path_for(resource)
    edit_user_registration_path
  end
end 