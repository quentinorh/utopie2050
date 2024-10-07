import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["step", "flashMessages", "username", "email", "usernameError", "emailError", "nextStepUsernameButton", "nextStepEmailButton"];

  connect() {
    this.usernameUnique = false
    this.emailUnique = false
    // Ajouter un écouteur d'événement pour détecter la touche "Entrée"
    document.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnect() {
    // Supprimer l'écouteur d'événement lors de la déconnexion du contrôleur
    document.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault(); // Empêche le comportement par défaut de soumission du formulaire
      const currentStep = this.stepTargets.find(step => step.style.display !== 'none');
      const nextButton = currentStep.querySelector('[data-action="click->signup#nextStep"]');
      
      if (nextButton) {
        nextButton.click(); // Simule un clic sur le bouton "Suivant" de l'étape actuelle
      }
    }
  }

  nextStep(event) {
    const nextStepId = event.currentTarget.dataset.nextStep; // Récupérer l'ID de l'étape suivante
    const currentStepId = this.stepTargets.find(step => step.style.display !== 'none').id; // Trouver l'étape actuelle
    const currentStep = document.getElementById(currentStepId);
    const inputs = currentStep.querySelectorAll('input');
    let isValid = true;
    let errorMessages = [];

    inputs.forEach(input => {
      if (input.required && !input.value.trim()) {
        isValid = false;
        input.classList.add('border-red-500');
        let fieldName = input.labels[0]?.textContent || input.placeholder || input.name.replace(/user\\[|\\]/g, '');
        fieldName = fieldName.replace(/\\s*\\*\\s*$/, '').trim();
        errorMessages.push(`Le champ "${fieldName}" est obligatoire.`);
      } else {
        input.classList.remove('border-red-500');
      }
    });

    if (isValid) {
      this.stepTargets.forEach(step => step.style.display = 'none');
      document.getElementById(nextStepId).style.display = 'block';
    } else {
      this.showFlash('error', errorMessages.join('<br>'));
    }
  }

  previousStep(event) {
    const stepId = event.currentTarget.dataset.stepId; // Récupérer l'ID de l'étape à partir de l'événement
    const stepElement = document.getElementById(stepId);
    this.stepTargets.forEach(step => step.style.display = 'none');
    stepElement.style.display = 'block';
  }

  showFlash(type, message) {
    const alertClass = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700';
    
    this.flashMessagesTarget.innerHTML = `
      <div class="border px-4 py-3 rounded relative ${alertClass}" role="alert">
        <span class="block sm:inline">${message}</span>
      </div>
    `;

    this.flashMessagesTarget.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      this.flashMessagesTarget.innerHTML = '';
    }, 5000);
  }

  checkUsername() {
    const username = this.usernameTarget.value.trim().toLowerCase()

    if (username.length > 0) {
      fetch(`/users/check_username?username=${username}`)
        .then(response => response.json())
        .then(data => {
          if (data.exists) {
            this.usernameErrorTarget.innerText = "Ce nom d'utilisateur est déjà pris."
            this.usernameUnique = false
          } else {
            this.usernameErrorTarget.innerText = ""
            this.usernameUnique = true
          }
          this.toggleNextStepUsernameButton()
        })
    } else {
      this.usernameErrorTarget.innerText = "Le nom d'utilisateur ne peut pas être vide."
      this.usernameUnique = false
      this.toggleNextStepUsernameButton()
    }
  }

  checkEmail() {
    const email = this.emailTarget.value.trim().toLowerCase()

    if (email.length > 0) {
      fetch(`/users/check_email?email=${email}`)
        .then(response => response.json())
        .then(data => {
          if (data.exists) {
            this.emailErrorTarget.innerText = "Cette adresse email est déjà utilisée."
            this.emailUnique = false
          } else {
            this.emailErrorTarget.innerText = ""
            this.emailUnique = true
          }
          this.toggleNextStepEmailButton()
        })
    } else {
      this.emailErrorTarget.innerText = "L'email ne peut pas être vide."
      this.emailUnique = false
      this.toggleNextStepEmailButton()
    }
  }

  toggleNextStepUsernameButton() {
    if (this.usernameUnique) {
      this.nextStepUsernameButtonTarget.removeAttribute("disabled")
    } else {
      this.nextStepUsernameButtonTarget.setAttribute("disabled", "true")
    }
  }

  toggleNextStepEmailButton() {
    if (this.emailUnique) {
      this.nextStepEmailButtonTarget.removeAttribute("disabled")
    } else {
      this.nextStepEmailButtonTarget.setAttribute("disabled", "true")
    }
  }
}
