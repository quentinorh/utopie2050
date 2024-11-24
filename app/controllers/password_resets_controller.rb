class PasswordResetsController < ApplicationController
  def create
    current_user.send_reset_password_instructions
    redirect_to edit_user_registration_path, notice: "Les instructions de réinitialisation ont été envoyées à ton adresse email."
  end
end 