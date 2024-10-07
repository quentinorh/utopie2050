class Users::RegistrationsController < Devise::RegistrationsController
  before_action :configure_sign_up_params, only: [:create]

  def new
    super
  end

  def create
    build_resource(sign_up_params)

    resource.save
    yield resource if block_given?
    if resource.persisted?
      # Si l'utilisateur doit confirmer son email
      if resource.active_for_authentication?
        set_flash_message! :notice, :signed_up
        sign_up(resource_name, resource)
        redirect_to registration_confirmation_path # Redirection vers la page de confirmation personnalisée
      else
        set_flash_message! :notice, :"signed_up_but_#{resource.inactive_message}"
        expire_data_after_sign_in!
        redirect_to registration_confirmation_path # Redirection vers la page de confirmation personnalisée
      end
    else
      clean_up_passwords resource
      set_minimum_password_length
      flash.now[:alert] = resource.errors.full_messages.join(", ")
      respond_with resource
    end
  end

  def check_username
    username = params[:username].strip.downcase
    exists = User.where('LOWER(username) = ?', username).exists?
    render json: { exists: exists }
  end

  def check_email
    email = params[:email].strip.downcase
    exists = User.exists?(email: email)
    render json: { exists: exists }
  end

  def confirmation
    render 'registrations/confirmation' # Indiquer explicitement le chemin vers la vue
  end

  protected

  def configure_sign_up_params
    devise_parameter_sanitizer.permit(:sign_up, keys: [:age, :username])
  end
end