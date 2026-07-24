class Users::RegistrationsController < Devise::RegistrationsController
  before_action :configure_sign_up_params, only: [:create]
  before_action :reject_honeypot, only: [:create]

  def create
    build_resource(sign_up_params)
    resource.skip_confirmation_notification!

    begin
      resource.save
    rescue Net::SMTPFatalError, Net::SMTPSyntaxError => e
      Rails.logger.error "[SMTP] Erreur lors de l'envoi du magic-link : #{e.message}"
      resource.destroy if resource.persisted?
      flash.now[:alert] = "L'adresse email semble invalide ou n'accepte pas les emails. Veuillez vérifier votre adresse."
      respond_with resource
      return
    rescue Net::SMTPError => e
      Rails.logger.error "[SMTP] Erreur SMTP inattendue : #{e.message}"
    end

    yield resource if block_given?
    if resource.persisted?
      begin
        resource.send_magic_link!
      rescue Net::SMTPFatalError, Net::SMTPSyntaxError => e
        Rails.logger.error "[SMTP] Erreur lors de l'envoi du magic-link : #{e.message}"
        resource.destroy
        flash.now[:alert] = "L'adresse email semble invalide ou n'accepte pas les emails. Veuillez vérifier votre adresse."
        respond_with resource
        return
      rescue Net::SMTPError => e
        Rails.logger.error "[SMTP] Erreur SMTP inattendue : #{e.message}"
      end

      set_flash_message! :notice, :"signed_up_but_unconfirmed"
      expire_data_after_sign_in!
      redirect_to registration_confirmation_path
    else
      flash.now[:alert] = resource.errors.full_messages.join(", ")
      respond_with resource
    end
  end

  def check_username
    username = params[:username].strip.downcase
    exists = User.where("LOWER(username) = ?", username).exists?
    render json: { exists: exists }
  end

  def check_email
    email = params[:email].strip.downcase
    exists = User.exists?(email: email)
    render json: { exists: exists }
  end

  def confirmation
    render "registrations/confirmation"
  end

  protected

  def configure_sign_up_params
    devise_parameter_sanitizer.permit(:sign_up, keys: [:age, :username])
  end

  def update_resource(resource, params)
    resource.update_without_password(params.except(:current_password))
  end

  private

  def reject_honeypot
    if params.dig(:user, :website_url).present?
      Rails.logger.warn "[Honeypot] Bot détecté depuis l'IP #{request.remote_ip}"
      redirect_to registration_confirmation_path
    end
  end
end
