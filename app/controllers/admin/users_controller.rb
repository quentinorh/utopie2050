class Admin::UsersController < ApplicationController
  before_action :authenticate_user!
  before_action :authorize_admin
  before_action :set_user, only: [:show, :edit, :update, :destroy]

  def show
  end

  def edit
  end

  def update
    if @user.update(user_params)
      redirect_to admin_user_path(@user), notice: 'Utilisateur mis à jour avec succès.'
    else
      render :edit
    end
  end

  def destroy
    @user.destroy
    redirect_to admin_dashboard_path, notice: 'Utilisateur supprimé avec succès.'
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def user_params
    params.require(:user).permit(:username, :email) # ajoutez les champs autorisés
  end

  def authorize_admin
    unless current_user&.admin?
      redirect_to root_path, alert: "Accès non autorisé"
    end
  end
end 