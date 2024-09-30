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
        # ... code existant pour une inscription réussie ...
      else
        clean_up_passwords resource
        set_minimum_password_length
        flash.now[:alert] = resource.errors.full_messages.join(", ")
        respond_with resource
      end
    end
  
    protected
  
    def configure_sign_up_params
      devise_parameter_sanitizer.permit(:sign_up, keys: [:age, :username])
    end
  end