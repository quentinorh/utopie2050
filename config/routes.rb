Rails.application.routes.draw do
  devise_for :users, controllers: { registrations: 'users/registrations' }
  
  resources :posts do
    collection do
      get :favorites
      get :deleted
    end
    
    member do
      delete :remove_photo
      post 'favorite'
      delete 'unfavorite'
    end
    resource :bookmark, only: [:create, :destroy, :show]
    resources :reports, only: [:new, :create]
  end

  devise_scope :user do
    # Routes personnalisées pour vérifier l'unicité des champs
    get '/users/check_username', to: 'users/registrations#check_username'
    get '/users/check_email', to: 'users/registrations#check_email'
    
    # Changement du nom de la route pour éviter le conflit avec user_confirmation
    get 'confirmation', to: 'users/registrations#confirmation', as: 'registration_confirmation'
  end

  get 'user_posts/:user_id', to: 'posts#user_posts', as: 'user_posts'

  root to: "pages#home"

  namespace :admin do
    get 'dashboard', to: 'dashboard#index'
    resources :users
    resources :reports, only: [:destroy]
    resources :event_codes
  end

  get '/sitemap.xml', to: redirect('https://sp2050.s3.us-east-1.amazonaws.com/sitemaps/sitemap.xml.gz')
end