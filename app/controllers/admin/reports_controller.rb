class Admin::ReportsController < ApplicationController
  before_action :authenticate_user!
  before_action :authorize_admin

  def index
    @reports = Report.includes(:post, :user).order(created_at: :desc)
  end

  def update
    @report = Report.find(params[:id])
    if @report.update(report_params)
      redirect_to admin_reports_path, notice: 'Statut du signalement mis à jour.'
    else
      redirect_to admin_reports_path, alert: 'Erreur lors de la mise à jour.'
    end
  end

  def destroy
    @report = Report.find(params[:id])
    if @report.destroy
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to admin_dashboard_path }
      end
    end
  end

  private

  def report_params
    params.require(:report).permit(:status)
  end

  def authorize_admin
    unless current_user&.admin?
      redirect_to root_path
    end
  end
end 