require 'socket'
require 'json'
require 'uri'
require 'net/http'
require 'openssl'
require 'base64'

class GitHubOAuthAPI
  def initialize(port = 3000)
    @port = port
    @server = TCPServer.new('0.0.0.0', port)
    @sessions = {} # 簡易セッション管理

    # GitHub OAuth設定（環境変数から取得）
    @client_id = ENV['GITHUB_CLIENT_ID'] || 'your_github_client_id'
    @client_secret = ENV['GITHUB_CLIENT_SECRET'] || 'your_github_client_secret'
    @redirect_uri = ENV['GITHUB_REDIRECT_URI'] || 'http://localhost:3001/auth/github/callback'

    puts "GitHub UMA API server starting on port #{port}..."
    puts "GitHub OAuth configured:"
    puts "  Client ID: #{@client_id[0..10]}..."
    puts "  Redirect URI: #{@redirect_uri}"
  end

  def start
    loop do
      client = @server.accept
      request_line = client.gets

      next unless request_line

      method, path, _ = request_line.split(' ')
      headers = {}

      # リクエストヘッダー読み込み
      loop do
        line = client.gets.chomp
        break if line.empty?
        key, value = line.split(': ', 2)
        headers[key.downcase] = value if key && value
      end

      # ルーティング処理
      response = route_request(method, path, headers)

      client.print response
      client.close
    end
  end

  private

  def route_request(method, path, headers)
    case path
    when '/'
      json_response({ message: "GitHub UMA API is running!", endpoints: [
        "GET /auth/github - Start GitHub OAuth",
        "GET /auth/github/callback - OAuth callback",
        "GET /api/user - Get user info",
        "GET /health - Health check"
      ]})

    when '/auth/github'
      github_oauth_redirect

    when '/auth/github/callback'
      handle_github_callback(path)

    when '/api/user'
      get_current_user(headers)

    when '/health'
      json_response({ status: "ok", timestamp: Time.now.to_i })

    else
      json_response({ error: "Not Found" }, 404)
    end
  end

  def github_oauth_redirect
    state = generate_random_string(32)
    auth_url = "https://github.com/login/oauth/authorize?" +
               "client_id=#{@client_id}&" +
               "redirect_uri=#{URI.encode_www_form_component(@redirect_uri)}&" +
               "scope=read:user&" +
               "state=#{state}"

    redirect_response(auth_url)
  end

  def handle_github_callback(path)
    # URLからcodeとstateを抽出
    uri = URI(path)
    params = URI.decode_www_form(uri.query || '')
    code = params.find { |k, v| k == 'code' }&.last

    unless code
      return json_response({ error: "Authorization code not found" }, 400)
    end

    # GitHubからアクセストークンを取得
    token_response = exchange_code_for_token(code)

    if token_response['access_token']
      # ユーザー情報を取得
      user_info = get_github_user_info(token_response['access_token'])

      if user_info
        # セッションを作成
        session_id = generate_random_string(64)
        @sessions[session_id] = {
          access_token: token_response['access_token'],
          user: user_info,
          created_at: Time.now
        }

        # フロントエンドにリダイレクト（セッションIDをクエリパラメータで渡す）
        redirect_response("http://localhost:3000?session=#{session_id}&login=success")
      else
        redirect_response("http://localhost:3000?error=user_info_failed")
      end
    else
      redirect_response("http://localhost:3000?error=token_exchange_failed")
    end
  end

  def exchange_code_for_token(code)
    uri = URI('https://github.com/login/oauth/access_token')

    params = {
      'client_id' => @client_id,
      'client_secret' => @client_secret,
      'code' => code
    }

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request['Accept'] = 'application/json'
    request.set_form_data(params)

    response = http.request(request)
    JSON.parse(response.body) rescue {}
  end

  def get_github_user_info(access_token)
    uri = URI('https://api.github.com/user')

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Get.new(uri)
    request['Authorization'] = "token #{access_token}"
    request['User-Agent'] = 'GitHub-UMA-App'

    response = http.request(request)
    JSON.parse(response.body) rescue nil
  end

  def get_current_user(headers)
    auth_header = headers['authorization']

    if auth_header && auth_header.start_with?('Bearer ')
      session_id = auth_header.sub('Bearer ', '')
      session = @sessions[session_id]

      if session
        json_response({
          user: session[:user],
          authenticated: true
        })
      else
        json_response({ error: "Invalid session", authenticated: false }, 401)
      end
    else
      json_response({ error: "No authorization header", authenticated: false }, 401)
    end
  end

  def generate_random_string(length)
    SecureRandom.urlsafe_base64(length)[0, length]
  end

  def json_response(data, status = 200)
    body = data.to_json

    status_text = case status
    when 200 then "OK"
    when 302 then "Found"
    when 400 then "Bad Request"
    when 401 then "Unauthorized"
    when 404 then "Not Found"
    else "Internal Server Error"
    end

    "HTTP/1.1 #{status} #{status_text}\r\n" +
    "Content-Type: application/json\r\n" +
    "Access-Control-Allow-Origin: *\r\n" +
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
    "Access-Control-Allow-Headers: Content-Type, Authorization\r\n" +
    "Content-Length: #{body.length}\r\n" +
    "\r\n" +
    body
  end

  def redirect_response(location)
    "HTTP/1.1 302 Found\r\n" +
    "Location: #{location}\r\n" +
    "Access-Control-Allow-Origin: *\r\n" +
    "Content-Length: 0\r\n" +
    "\r\n"
  end
end

# サーバー開始
if __FILE__ == $0
  api = GitHubOAuthAPI.new
  api.start
end