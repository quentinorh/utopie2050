// app/javascript/controllers/scroll_controller.js
import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["content", "scrollPercentage"];

  connect() {
    //this.updateScrollPercentage();
    //window.addEventListener("scroll", this.updateScrollPercentage.bind(this));
    console.log("connected");
  }

  // disconnect() {
  //   window.removeEventListener("scroll", this.updateScrollPercentage.bind(this));
  // }

  // updateScrollPercentage() {
  //   //const content = this.contentTarget;
  //   //console.log(this.scrollPercentageTarget);
  //   const scrollPercentage = this.calculateScrollPercentage(content);

  //   this.scrollPercentageTarget.textContent = `Scroll : ${scrollPercentage}%`;
  // }

  // calculateScrollPercentage(element) {
  //   const scrollTop = element.scrollTop;
  //   const scrollHeight = element.scrollHeight;
  //   const clientHeight = element.clientHeight;

  //   const scrollableHeight = scrollHeight - clientHeight;
  //   const scrollPercentage = (scrollTop / scrollableHeight) * 100;

  //   return Math.round(scrollPercentage);
  // }
}
