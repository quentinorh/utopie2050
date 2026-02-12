class ApplicationController < ActionController::Base
  before_action :authenticate_user!
  before_action :configure_permitted_parameters, if: :devise_controller?

  rescue_from ActionController::InvalidAuthenticityToken, with: :handle_invalid_authenticity_token

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:username])
    devise_parameter_sanitizer.permit(:account_update, keys: [:username, :email, :age])
  end

  private

  def handle_invalid_authenticity_token
    if request.path == "/users/sign_in" && request.post?
      redirect_to new_user_session_path, alert: "Votre session a expiré. Veuillez réessayer."
    else
      redirect_to root_path, alert: "Votre session a expiré. Veuillez réessayer."
    end
  end
end
