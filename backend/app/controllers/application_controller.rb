class ApplicationController < ActionController::API
  def index
    render json: { message: "Rails API is running!" }
  end
end