// Import and register all your controllers from the importmap under controllers/*

import { application } from "controllers/application"

import HelloController from "./hello_controller"
application.register("hello", HelloController)

import UnsplashController from "./unsplash_controller"
application.register("unsplash", UnsplashController)

import ColorPickerController from "./color_picker_controller"
application.register("color-picker", ColorPickerController)

// Eager load all controllers defined in the import map under controllers/**/*_controller
import { eagerLoadControllersFrom } from "@hotwired/stimulus-loading"
eagerLoadControllersFrom("controllers", application)

// Lazy load controllers as they appear in the DOM (remember not to preload controllers in import map!)
// import { lazyLoadControllersFrom } from "@hotwired/stimulus-loading"
// lazyLoadControllersFrom("controllers", application)
