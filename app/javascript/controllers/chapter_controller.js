import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["chapters", "chapter", "chapterIndex"]

  addChapter(event) {
    event.preventDefault();

    // Crée un nouvel élément div pour contenir le chapitre
    const newChapter = document.createElement("div");
    newChapter.classList.add("chapter-fields", "mt-sm");
    const nextIndex = parseInt(this.chapterIndexTargets.pop().textContent.trim()) + 1;

    // Générer l'HTML pour le nouveau chapitre
    newChapter.innerHTML = `
      <label class="tw-form-label">Titre du chapitre</label>
      <input type="text" name="post[chapters_attributes][${nextIndex}][title]" class="tw-form-input">

      <label class="tw-form-label">Texte du chapitre</label>
      <textarea name="post[chapters_attributes][${nextIndex}][body]" class="tw-form-input", rows="5"></textarea>

      <input type="hidden" name="post[chapters_attributes][${nextIndex}][position]" value="">
      <input type="hidden" name="post[chapters_attributes][${nextIndex}][_destroy]" value="false">

      <a href="#" class="tw-btn-secondary" data-action="click->chapter#removeChapter">Supprimer ce chapitre</a>
    `;

    // Ajouter le nouveau chapitre à la section des chapitres
    this.chaptersTarget.appendChild(newChapter);
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
