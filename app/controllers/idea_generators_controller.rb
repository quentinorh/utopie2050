class IdeaGeneratorsController < ApplicationController
  skip_before_action :authenticate_user!, only: :spark

  def spark
    result = IdeaGeneratorService.spark(
      part: params[:part],
      noun: params[:noun],
      adjective: params[:adjective]
    )

    render json: result
  end
end
