module AdminAuthorizable
  extend ActiveSupport::Concern

  included do
    before_action :authorize_admin
  end

  private

  def authorize_admin
    unless current_user&.admin?
      redirect_to root_path, alert: "Vous n'avez pas l'autorisation d'accéder à cette page."
    end
  end
end 