module Admin
  class EventCodesController < ApplicationController
    def index
      @event_codes = EventCode.all
    end

    def new
      @event_code = EventCode.new
      render partial: 'admin/event_codes/form'
    end

    def create
      @event_code = EventCode.new(event_code_params)
      if @event_code.save
        respond_to do |format|
          format.turbo_stream do
            render turbo_stream: [
              turbo_stream.append('event_codes_tbody', partial: 'admin/event_codes/event_code', locals: { event_code: @event_code }),
              turbo_stream.update('event_code_form', ''),
              turbo_stream.update('event_codes_count') do
                "Codes événements (#{EventCode.count})"
              end
            ]
          end
          format.html { redirect_to admin_dashboard_path }
        end
      else
        render partial: 'form', status: :unprocessable_entity
      end
    end

    def edit
      @event_code = EventCode.find(params[:id])
      render partial: 'form', locals: { event_code: @event_code }
    end

    def update
      @event_code = EventCode.find(params[:id])
      if @event_code.update(event_code_params)
        respond_to do |format|
          format.turbo_stream do
            render turbo_stream: [
              turbo_stream.replace("event_code_#{@event_code.id}", partial: 'admin/event_codes/event_code', locals: { event_code: @event_code }),
              turbo_stream.update('event_code_form', '')
            ]
          end
          format.html { redirect_to admin_dashboard_path }
        end
      else
        render partial: 'form', status: :unprocessable_entity
      end
    end

    def destroy
      @event_code = EventCode.find(params[:id])
      @event_code.destroy
      respond_to do |format|
        format.turbo_stream
        format.html { redirect_to admin_dashboard_path, notice: 'Event code supprimé avec succès.' }
      end
    end

    private

    def event_code_params
      params.require(:event_code).permit(:code, :text, :link, :color)
    end
  end
end
