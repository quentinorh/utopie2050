import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["content"];

  speak() {
    console.log("Speaking...");
    const content = this.contentTarget.value || this.contentTarget.textContent;
    const utterance = new SpeechSynthesisUtterance(content);

    // Set the language to French
    utterance.lang = 'fr-FR';

    // Optional: Select a specific French voice if available
    // const voices = speechSynthesis.getVoices();
    // const frenchVoice = voices.find(voice => voice.lang === 'fr-FR');
    // if (frenchVoice) {
    //   utterance.voice = frenchVoice;
    // }

    speechSynthesis.speak(utterance);
  }

  stop() {
    speechSynthesis.cancel();
  }
}
