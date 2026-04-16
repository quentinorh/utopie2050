import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["chapters", "chapter", "chapterIndex", "chapterNumber", "count"]

  connect() {
    // Initialiser le compteur avec le plus grand index existant + 1
    this.nextIndex = 0;
    if (this.chapterIndexTargets.length > 0) {
      this.nextIndex = Math.max(...this.chapterIndexTargets.map(target =>
        parseInt(target.textContent.trim())
      )) + 1;
    }
    this.refreshNumbering();
  }

  addChapter(event) {
    event.preventDefault();

    const newChapter = document.createElement("article");
    newChapter.classList.add("chapter-card");
    newChapter.dataset.chapterTarget = "chapter";

    newChapter.innerHTML = `
      <header class="chapter-card__header">
        <div class="chapter-card__index font-mono">
          <span aria-hidden="true">Chapitre</span>
          <span class="tabular-nums" data-chapter-target="chapterNumber">1</span>
        </div>
        <button type="button"
                class="chapter-card__delete"
                data-action="click->chapter#removeChapter"
                aria-label="Supprimer ce chapitre">
          <svg viewBox="0 0 16 16" class="size-3.5" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13"/>
          </svg>
        </button>
      </header>
      <div class="hidden" data-chapter-target="chapterIndex">
        ${this.nextIndex}
      </div>

      <input type="text"
             name="post[chapters_attributes][${this.nextIndex}][title]"
             class="chapter-card__title-input"
             placeholder="Titre du chapitre">

      <textarea name="post[chapters_attributes][${this.nextIndex}][body]"
                class="chapter-card__body-input"
                rows="6"
                placeholder="Texte du chapitre…"></textarea>

      <input type="hidden" name="post[chapters_attributes][${this.nextIndex}][position]" value="">
      <input type="hidden" name="post[chapters_attributes][${this.nextIndex}][_destroy]" value="false">
    `;

    this.chaptersTarget.appendChild(newChapter);
    this.nextIndex++;

    // Focus sur le titre du nouveau chapitre
    requestAnimationFrame(() => {
      const titleInput = newChapter.querySelector(".chapter-card__title-input");
      if (titleInput) titleInput.focus();
    });

    this.refreshNumbering();
  }

  removeChapter(event) {
    event.preventDefault();
    const chapter = event.currentTarget.closest(".chapter-card") || event.currentTarget.closest(".chapter-fields");
    if (!chapter) return;

    const destroyInput = chapter.querySelector("input[name*='_destroy']");
    chapter.classList.add("is-removing");

    setTimeout(() => {
      if (destroyInput) {
        // Marquer pour suppression côté Rails et masquer (les chapitres persistés
        // doivent rester dans le DOM pour que Rails reçoive _destroy=1).
        destroyInput.value = "1";
        chapter.style.display = "none";
      } else {
        chapter.remove();
      }
      this.refreshNumbering();
    }, 200);
  }

  refreshNumbering() {
    if (!this.hasChapterTarget) {
      if (this.hasCountTarget) this.countTarget.textContent = "00";
      return;
    }
    const visibleChapters = this.chapterTargets.filter(card => {
      const destroyInput = card.querySelector("input[name*='_destroy']");
      const isDestroyed = destroyInput && destroyInput.value === "1";
      return !isDestroyed && card.style.display !== "none";
    });

    visibleChapters.forEach((card, index) => {
      const numberEl = card.querySelector('[data-chapter-target="chapterNumber"]');
      if (numberEl) numberEl.textContent = String(index + 1).padStart(2, "0");
    });

    if (this.hasCountTarget) {
      this.countTarget.textContent = String(visibleChapters.length).padStart(2, "0");
    }
  }
}
