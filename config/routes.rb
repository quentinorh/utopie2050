Rails.application.routes.draw do
  devise_for :users, controllers: {
    registrations: 'users/registrations',
    passwords: 'users/passwords'
  }
  
  resources :posts, path: 'futurs' do
    collection do
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

  get 'mes_futurs', to: 'posts#user_posts', as: 'user_posts'
  get 'mes_favoris', to: 'posts#favorites', as: 'user_favorites'

  root to: "pages#home"

  namespace :admin do
    get 'dashboard', to: 'dashboard#index'
    resources :users
    resources :reports, only: [:destroy]
    resources :event_codes
  end

  get '/sitemap.xml.gz', to: redirect('https://sp2050.s3.us-east-1.amazonaws.com/sitemaps/sitemap.xml.gz')

  post 'password_resets', to: 'password_resets#create'

  get 'test', to: 'pages#test'
end