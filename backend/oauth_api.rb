require 'socket'
require 'json'
require 'uri'
require 'net/http'
require 'openssl'
require 'base64'
require 'securerandom'
require 'date'

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
    # パスとクエリパラメータを分離
    path_without_query = path.split('?').first

    # CORS preflight request (OPTIONS) の処理
    if method == 'OPTIONS'
      return cors_preflight_response
    end

    case path_without_query
    when '/'
      json_response({ message: "GitHub UMA API is running!", endpoints: [
        "GET /auth/github - Start GitHub OAuth",
        "GET /auth/github/callback - OAuth callback",
        "GET /api/user - Get user info",
        "GET /api/contributions - Get user contributions",
        "POST /api/sync - Sync today's contributions",
        "GET /health - Health check"
      ]})

    when '/auth/github'
      github_oauth_redirect

    when '/auth/github/callback'
      handle_github_callback(path)

    when '/api/user'
      get_current_user(headers)

    when '/api/contributions'
      get_user_contributions(headers)

    when '/api/sync'
      sync_daily_contributions(headers)

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

  def get_user_contributions(headers)
    auth_header = headers['authorization']

    unless auth_header && auth_header.start_with?('Bearer ')
      return json_response({ error: "No authorization header", authenticated: false }, 401)
    end

    session_id = auth_header.sub('Bearer ', '')
    session = @sessions[session_id]

    unless session
      return json_response({ error: "Invalid session", authenticated: false }, 401)
    end

    username = session[:user]['login']
    contributions = fetch_github_contributions(session[:access_token], username)

    if contributions
      json_response({
        username: username,
        contributions: contributions,
        fetched_at: Time.now.to_i
      })
    else
      json_response({ error: "Failed to fetch contributions" }, 500)
    end
  end

  def sync_daily_contributions(headers)
    auth_header = headers['authorization']

    unless auth_header && auth_header.start_with?('Bearer ')
      return json_response({ error: "No authorization header", authenticated: false }, 401)
    end

    session_id = auth_header.sub('Bearer ', '')
    session = @sessions[session_id]

    unless session
      return json_response({ error: "Invalid session", authenticated: false }, 401)
    end

    username = session[:user]['login']
    today = Date.today
    today_contributions = get_today_contributions(session[:access_token], username, today)

    if today_contributions
      # 経験値計算
      exp_gained = calculate_exp_from_contributions(today_contributions)

      json_response({
        username: username,
        date: today.to_s,
        contributions_count: today_contributions,
        experience_gained: exp_gained,
        synced_at: Time.now.to_i
      })
    else
      json_response({ error: "Failed to sync contributions" }, 500)
    end
  end

  def fetch_github_contributions(access_token, username)
    # GitHub GraphQL API でContributionを取得
    query = {
      "query" => <<~GRAPHQL,
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }
      GRAPHQL
      "variables" => { "username" => username }
    }

    uri = URI('https://api.github.com/graphql')
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request['Authorization'] = "bearer #{access_token}"
    request['Content-Type'] = 'application/json'
    request.body = query.to_json

    response = http.request(request)

    if response.code == '200'
      data = JSON.parse(response.body)
      if data['data'] && data['data']['user']
        contribution_data = data['data']['user']['contributionsCollection']['contributionCalendar']

        # 最近30日分のcontributionを整形
        recent_contributions = []
        contribution_data['weeks'].each do |week|
          week['contributionDays'].each do |day|
            recent_contributions << {
              date: day['date'],
              count: day['contributionCount']
            }
          end
        end

        {
          total_contributions: contribution_data['totalContributions'],
          recent_days: recent_contributions.last(30) # 最近30日
        }
      else
        nil
      end
    else
      puts "GitHub API Error: #{response.code} - #{response.body}"
      nil
    end
  rescue => e
    puts "Error fetching contributions: #{e.message}"
    nil
  end

  def get_today_contributions(access_token, username, date)
    contributions = fetch_github_contributions(access_token, username)
    return nil unless contributions

    today_data = contributions[:recent_days].find { |day| day[:date] == date.to_s }
    today_data ? today_data[:count] : 0
  end

  def calculate_exp_from_contributions(count)
    case count
    when 0
      0
    when 1..3
      count * 10
    when 4..10
      count * 15
    when 11..20
      count * 20
    else
      count * 25
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

  def cors_preflight_response
    "HTTP/1.1 200 OK\r\n" +
    "Access-Control-Allow-Origin: *\r\n" +
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
    "Access-Control-Allow-Headers: Content-Type, Authorization\r\n" +
    "Access-Control-Max-Age: 86400\r\n" +
    "Content-Length: 0\r\n" +
    "\r\n"
  end
end

# サーバー開始
if __FILE__ == $0
  api = GitHubOAuthAPI.new
  api.start
end