import { Controller } from "@hotwired/stimulus"
import { gsap } from "gsap"

export default class extends Controller {
  static targets = ["step", "flashMessages", "username", "email", "password", "usernameError", "emailError", "ageError", "passwordError", "nextStepUsernameButton", "nextStepEmailButton"];

  connect() {
    this.usernameUnique = false
    this.emailUnique = false
    this.passwordValid = false
    document.addEventListener('keydown', this.handleKeydown.bind(this))
  }

  disconnect() {
    document.removeEventListener('keydown', this.handleKeydown.bind(this))
  }

  handleKeydown(event) {
    if (!document.querySelector('#registration-steps')) return;
    
    if (event.key === "Enter") {
      event.preventDefault();
      const currentStep = this.stepTargets.find(step => step.style.display !== 'none');
      const nextButton = currentStep.querySelector('[data-action="click->signup#nextStep"]');
      
      if (nextButton) {
        nextButton.click();
      }
    }
  }

  nextStep(event) {
    const nextStepId = event.currentTarget.dataset.nextStep;
    const currentStepId = this.stepTargets.find(step => step.style.display !== 'none').id;
    const currentStep = document.getElementById(currentStepId);
    const inputs = currentStep.querySelectorAll('input');
    let isValid = true;

    inputs.forEach(input => {
      if (input.required && !input.value.trim()) {
        isValid = false;
        input.classList.add('border-red-500');
        
        const fieldName = input.name.replace('user[', '').replace(']', '');
        const errorTarget = this[`${fieldName}ErrorTarget`];
        
        if (errorTarget) {
          errorTarget.innerText = `Le champ "${fieldName}" est obligatoire.`;
        }
      } else {
        input.classList.remove('border-red-500');
        
        const fieldName = input.name.replace('user[', '').replace(']', '');
        const errorTarget = this[`${fieldName}ErrorTarget`];
        
        if (errorTarget) {
          errorTarget.innerText = '';
        }
      }
    });

    if (isValid) {
      this.fadeTransition(currentStepId, nextStepId);
    }
  }

  previousStep(event) {
    const currentStepId = this.stepTargets.find(step => step.style.display !== 'none').id;
    const previousStepId = event.currentTarget.dataset.stepId;
    this.fadeTransition(currentStepId, previousStepId);
  }

  fadeTransition(currentStepId, nextStepId) {
    const currentStep = document.getElementById(currentStepId);
    const nextStep = document.getElementById(nextStepId);

    gsap.to(currentStep, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        currentStep.style.display = 'none';
        nextStep.style.display = 'block';
        gsap.fromTo(nextStep, 
          { opacity: 0 },
          { opacity: 1, duration: 0.3 }
        );
      }
    });
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (email.length === 0) {
      this.emailErrorTarget.innerText = "L'email ne peut pas être vide."
      this.emailUnique = false
      this.toggleNextStepEmailButton()
      return
    }

    if (!emailRegex.test(email)) {
      this.emailErrorTarget.innerText = "Veuillez entrer une adresse email valide."
      this.emailUnique = false
      this.toggleNextStepEmailButton()
      return
    }

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
  }

  checkPassword() {
    const password = this.passwordTarget.value.trim()
    
    if (password.length < 6) {
      this.passwordErrorTarget.innerText = "Le mot de passe doit contenir au moins 6 caractères."
      this.passwordValid = false
    } else {
      this.passwordErrorTarget.innerText = ""
      this.passwordValid = true
    }
    this.toggleNextStepEmailButton()
  }

  toggleNextStepUsernameButton() {
    if (this.usernameUnique) {
      this.nextStepUsernameButtonTarget.removeAttribute("disabled")
    } else {
      this.nextStepUsernameButtonTarget.setAttribute("disabled", "true")
    }
  }

  toggleNextStepEmailButton() {
    if (this.emailUnique && this.passwordValid) {
      this.nextStepEmailButtonTarget.removeAttribute("disabled")
    } else {
      this.nextStepEmailButtonTarget.setAttribute("disabled", "true")
    }
  }
}
