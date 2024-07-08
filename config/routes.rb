Rails.application.routes.draw do
  devise_for :users
  resources :posts do
    member do
      delete :remove_photo
    end
  end
  root to: "posts#index"
end
