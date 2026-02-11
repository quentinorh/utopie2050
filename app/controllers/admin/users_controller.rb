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

  def destroy_multiple
    user_ids = params[:user_ids] || []
    
    if user_ids.empty?
      redirect_to admin_dashboard_path, alert: 'Aucun utilisateur sélectionné.'
      return
    end

    # Empêcher la suppression de l'utilisateur admin actuel
    user_ids = user_ids.reject { |id| id.to_i == current_user.id }
    
    users = User.where(id: user_ids)
    count = users.count
    
    users.each(&:destroy)
    
    redirect_to admin_dashboard_path, notice: "#{count} utilisateur(s) supprimé(s) avec succès."
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
      redirect_to root_path
    end
  end
end 