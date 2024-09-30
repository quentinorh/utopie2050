Rails.application.routes.draw do
  devise_for :users, controllers: { registrations: 'users/registrations' }
  resources :posts do
    member do
      delete :remove_photo
    end
    collection do
      get :search_unsplash
    end
  end

  get 'user_posts/:user_id', to: 'posts#user_posts', as: 'user_posts'

  root to: "pages#home"
  resources :posts
end
