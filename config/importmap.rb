# Pin npm packages by running ./bin/importmap
pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "gsap", to: "https://ga.jspm.io/npm:gsap@3.12.5/index.js"
pin "gsap/scrollTrigger", to: "https://ga.jspm.io/npm:gsap@3.12.5/dist/ScrollTrigger.js"
pin "@studio-freight/lenis", to: "https://ga.jspm.io/npm:@studio-freight/lenis@1.0.42/dist/lenis.mjs"
pin "splitting", to: "https://ga.jspm.io/npm:splitting@1.1.0/dist/splitting.js"
pin "nouislider", to: "https://ga.jspm.io/npm:nouislider@15.8.1/dist/nouislider.mjs"