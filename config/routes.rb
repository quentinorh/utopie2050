Rails.application.routes.draw do
  devise_for :users, skip: [:passwords], controllers: {
    registrations: "users/registrations",
    sessions: "users/sessions"
  }

  devise_scope :user do
    get "/users/check_username", to: "users/registrations#check_username"
    get "/users/check_email", to: "users/registrations#check_email"
    get "confirmation", to: "users/registrations#confirmation", as: "registration_confirmation"
  end

  post "users/magic_link", to: "users/magic_links#create", as: :user_magic_links
  get "users/magic_link/:token", to: "users/magic_links#show", as: :user_magic_link

  resources :posts, path: "futurs" do
    collection do
      get :deleted
      post :stage
      get :pending
      post :pending_auth
      get :claim
    end

    member do
      delete :remove_photo
      post "favorite"
      delete "unfavorite"
      get "export/pdf", action: :export_pdf, as: :export_pdf
      get "export/epub", action: :export_epub, as: :export_epub
    end
    resources :reports, only: [:new, :create]
  end

  get "mes_futurs", to: "posts#user_posts", as: "user_posts"
  get "mes_favoris", to: "posts#favorites", as: "user_favorites"

  get "ecrire-le-futur", to: "pages#writing_tutorial", as: "writing_tutorial"
  get "idea_generator/spark", to: "idea_generators#spark", as: "idea_generator_spark"

  root to: "pages#home"

  namespace :admin do
    get "dashboard", to: "dashboard#index"
    get "posts/:id/reel_data", to: "dashboard#reel_data", as: :reel_data
    resources :users do
      collection do
        delete :destroy_multiple
      end
    end
    resources :reports, only: [:destroy]
    resources :event_codes
  end

  get "/sitemap.xml.gz", to: redirect("https://sp2050.s3.us-east-1.amazonaws.com/sitemaps/sitemap.xml.gz")

  get "test", to: "pages#test"
end
