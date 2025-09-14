Rails.application.routes.draw do
  root "application#index"

  namespace :api do
    namespace :v1 do
      # API routes here
    end
  end
end