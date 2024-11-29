import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["chapters", "chapter", "chapterIndex"]

  connect() {
    // Initialiser le compteur avec le plus grand index existant + 1
    this.nextIndex = 0;
    if (this.chapterIndexTargets.length > 0) {
      this.nextIndex = Math.max(...this.chapterIndexTargets.map(target => 
        parseInt(target.textContent.trim())
      )) + 1;
    }
  }

  addChapter(event) {
    event.preventDefault();

    const newChapter = document.createElement("div");
    newChapter.classList.add("chapter-fields", "mt-sm");
    
    // Utiliser this.nextIndex et l'incrémenter après
    newChapter.innerHTML = `
      <div class="hidden" data-chapter-target="chapterIndex">
        ${this.nextIndex}
      </div>
      <label class="tw-form-label">Titre du chapitre</label>
      <input type="text" name="post[chapters_attributes][${this.nextIndex}][title]" class="tw-form-input">

      <label class="tw-form-label">Texte du chapitre</label>
      <textarea name="post[chapters_attributes][${this.nextIndex}][body]" class="tw-form-input", rows="5"></textarea>

      <input type="hidden" name="post[chapters_attributes][${this.nextIndex}][position]" value="">
      <input type="hidden" name="post[chapters_attributes][${this.nextIndex}][_destroy]" value="false">

      <a href="#" class="tw-btn-secondary" data-action="click->chapter#removeChapter">Supprimer ce chapitre</a>
    `;

    this.chaptersTarget.appendChild(newChapter);
    this.nextIndex++; // Incrémenter l'index pour le prochain chapitre
  }

  removeChapter(event) {
    event.preventDefault();
    const chapter = event.currentTarget.closest(".chapter-fields");

    // Si le champ caché _destroy existe, définissez-le à true pour marquer pour suppression
    const destroyInput = chapter.querySelector("input[name*='_destroy']");
    if (destroyInput) {
      destroyInput.value = "1";
      chapter.style.display = "none"; // Cache le chapitre visuellement
    } else {
      chapter.remove(); // Si ce n'est pas encore sauvegardé, on l'enlève du DOM
    }
  }
}
