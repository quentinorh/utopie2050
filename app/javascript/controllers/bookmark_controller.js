import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["button"]
  
  connect() {
    this.loadBookmark()
  }
  
  async toggle() {
    const postId = this.element.dataset.postId;
    const currentPosition = this.getCurrentPosition();
    this.insertBookmark(); // Appel de la méthode ici
  }
  
  getCurrentPosition() {
    try {
      const postBody = document.querySelector('.post-body');
      const viewportTop = window.scrollY + 90;
      const elements = postBody.querySelectorAll('p, h2');

      for (let el of elements) {
        const rect = el.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const elementBottom = rect.bottom + window.scrollY;

        if (elementTop <= viewportTop && elementBottom >= viewportTop) {
          const precedingTextLength = Array.from(elements)
            .slice(0, Array.from(elements).indexOf(el))
            .reduce((acc, el) => acc + el.textContent.length, 0);

          const elementProgress = (viewportTop - elementTop) / (elementBottom - elementTop);
          const currentElementPosition = Math.floor(el.textContent.length * elementProgress);

          return {
            element: el,
            position: currentElementPosition,
            totalPosition: precedingTextLength + currentElementPosition
          };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async insertBookmark() {
    // Supprimez toute icône de marque-page existante
    const existingBookmark = document.querySelector('.bookmark-icon');
    if (existingBookmark) {
      existingBookmark.remove(); // Supprime l'élément span directement
    }

    const positionInfo = this.getCurrentPosition();
    if (positionInfo) {
      const { element, position } = positionInfo;

      // Si la position est 0, supprimez le marque-page
      if (position === 0) {
        await this.removeBookmark();
        return;
      }

      const text = element.textContent;
      const beforeText = text.slice(0, position);
      const afterText = text.slice(position);

      // Créez un élément span avec une icône de marque-page
      const bookmarkIcon = '<span class="bookmark-icon"><i class="fa-solid fa-circle text-sm text-gray-500"></i></span>';

      // Insérez l'icône de marque-page à gauche de la ligne
      element.innerHTML = beforeText + bookmarkIcon + afterText;
      element.style.position = 'relative'; // Assurez-vous que l'élément parent a une position relative

      // Envoyer la position au serveur
      await this.saveBookmark(positionInfo.totalPosition);
    } else {
      // Si aucune position n'est trouvée, supprimez le marque-page
      await this.removeBookmark();
    }
  }

  async removeBookmark() {
    const postId = this.element.dataset.postId;
    if (this.isUserLoggedIn()) {
      try {
        const response = await fetch(`/futurs/${postId}/bookmark`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          }
        });

        const data = await response.json();
        if (data.status === 'success') {
          console.log('Bookmark removed successfully');
        } else {
          console.error('Failed to remove bookmark');
        }
      } catch (error) {
        console.error('Error removing bookmark:', error);
      }
    } else {
      // Supprimer le marque-page du cookie
      document.cookie = `bookmark_${postId}=; path=/; max-age=0`;
    }
  }

  async saveBookmark(characterPosition) {
    const postId = this.element.dataset.postId;
    if (this.isUserLoggedIn()) {
      try {
        const response = await fetch(`/futurs/${postId}/bookmark`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          },
          body: JSON.stringify({ character_position: characterPosition })
        });

        const data = await response.json();
        if (data.status === 'success') {
          console.log('Bookmark saved successfully');
        } else {
          console.error('Failed to save bookmark');
        }
      } catch (error) {
        console.error('Error saving bookmark:', error);
      }
    } else {
      // Stocker le marque-page dans un cookie
      document.cookie = `bookmark_${postId}=${characterPosition}; path=/; max-age=31536000`; // 1 an
    }
  }

  async loadBookmark() {
    const postId = this.element.dataset.postId;
    if (this.isUserLoggedIn()) {
      try {
        const response = await fetch(`/futurs/${postId}/bookmark`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          }
        });

        const data = await response.json();
        if (data.status === 'success' && data.bookmark) {
          this.displayBookmark(data.bookmark.character_position);
        }
      } catch (error) {
        console.error('Error loading bookmark:', error);
      }
    } else {
      // Charger le marque-page depuis un cookie
      const cookieValue = document.cookie.split('; ').find(row => row.startsWith(`bookmark_${postId}`));
      if (cookieValue) {
        const characterPosition = cookieValue.split('=')[1];
        this.displayBookmark(characterPosition);
      }
    }
  }

  displayBookmark(characterPosition) {
    const postBody = document.querySelector('.post-body');
    const elements = postBody.querySelectorAll('p, h2');
    let totalLength = 0;

    for (let el of elements) {
      const textLength = el.textContent.length;
      if (totalLength + textLength >= characterPosition) {
        const positionInElement = characterPosition - totalLength;
        const text = el.textContent;
        const beforeText = text.slice(0, positionInElement);
        const afterText = text.slice(positionInElement);

        // Créez un élément span avec une icône de marque-page
        const bookmarkIcon = '<span class="bookmark-icon"><i class="fa-solid fa-circle text-sm text-gray-500"></i></span>';

        // Insérez l'icône de marque-page à gauche de la ligne
        el.innerHTML = beforeText + bookmarkIcon + afterText;
        el.style.position = 'relative'; // Assurez-vous que l'élément parent a une position relative

        // Faire défiler la page jusqu'à l'élément contenant le marque-page
        const rect = el.getBoundingClientRect();
        const offset = window.scrollY + rect.top - 90; // Ajustez 90 pour compenser la barre de navigation
        window.scrollTo({ top: offset, behavior: 'smooth' });

        break;
      }
      totalLength += textLength;
    }
  }

  isUserLoggedIn() {
    // Vérifiez si une balise meta indique que l'utilisateur est connecté
    const userLoggedInMeta = document.querySelector('meta[name="user-logged-in"]');
    return userLoggedInMeta && userLoggedInMeta.getAttribute('content') === 'true';
  }
}