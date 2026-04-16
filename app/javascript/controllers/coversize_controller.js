import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["svg"];

  connect() {
    // SVG fills 100% via CSS — no JS sizing needed
  }
}
