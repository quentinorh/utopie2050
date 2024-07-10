Rails.application.routes.draw do
  devise_for :users
  resources :posts do
    member do
      delete :remove_photo
    end
    collection do
      get :search_unsplash
    end
  end
  root to: "posts#index"
end
