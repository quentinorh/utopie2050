# Pin npm packages by running ./bin/importmap
pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin "gsap", to: "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"
pin_all_from "app/javascript/controllers", under: "controllers"
