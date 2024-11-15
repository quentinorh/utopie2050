import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  handleSubmit(event) {
    if (event.detail.success) {
      this.element.reset()
      const actionsController = this.application.getControllerForElementAndIdentifier(
        document.querySelector("[data-controller~='actions']"),
        "actions"
      )
      actionsController.toggleReportConfirmationPanel()
    }
  }
} 