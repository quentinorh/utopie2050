class ReportsController < ApplicationController
  def new
    @post = Post.find(params[:post_id])
    @report = @post.reports.new
  end

  def create
    @post = Post.find(params[:post_id])
    @report = @post.reports.build(report_params)
    @report.user = current_user if user_signed_in?

    if @report.save
      head :ok
    else
      head :unprocessable_entity
    end
  end

  private

  def report_params
    params.require(:report).permit(:comment)
  end
end 