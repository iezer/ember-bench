require "bundler/setup"
require "rack"

PATH_INFO  = "PATH_INFO"
EXPIRATION = { "Cache-Control" => "public, max-age=0" } # max-age=31536000
NOT_FOUND  = [404, {}, ["Not Found"]]

class FarFutureExpire
  def initialize(app, *)
    @app = app
  end

  def call(env)
    result = @app.call(env)
    result[1].merge!(EXPIRATION)
    result
  end
end

class InternalRedirect
  def initialize(app, *)
    @app = app
  end

  def call(env)

    # TODO probably a better way to do this
    is_asset = env[PATH_INFO].end_with?(".js") || env[PATH_INFO].end_with?(".css")
    unless is_asset
      # Always return index.html
      env[PATH_INFO] = "index.html"
    end

    # TODO experiment name and port shouldbe configurable
    port = env["SERVER_PORT"]
    path_root = port.to_i == 9292 ? "/app-master/" : "/app-old/"
    env[PATH_INFO] = path_root + env[PATH_INFO]
    puts "serving #{env[PATH_INFO]} on port #{port}"
    @app.call(env)
  end
end

use FarFutureExpire
use InternalRedirect
use Rack::Static, urls: [""], root: "dist"

run ->(env) { NOT_FOUND }
