require 'socket'
require 'json'
require 'uri'
require 'net/http'
require 'openssl'
require 'base64'
require 'securerandom'
require 'date'
require 'pg'

class GitHubOAuthAPI
  def initialize(port = 3000)
    @port = port
    @server = TCPServer.new('0.0.0.0', port)
    @sessions = {} # 簡易セッション管理

    # GitHub OAuth設定（環境変数から取得）
    @client_id = ENV['GITHUB_CLIENT_ID'] || 'your_github_client_id'
    @client_secret = ENV['GITHUB_CLIENT_SECRET'] || 'your_github_client_secret'
    @redirect_uri = ENV['GITHUB_REDIRECT_URI'] || 'http://localhost:3001/auth/github/callback'

    # PostgreSQL接続設定
    @db_config = {
      host: 'db',
      port: 5432,
      dbname: 'myapp_development',
      user: 'postgres',
      password: 'password'
    }

    puts "GitHub UMA API server starting on port #{port}..."
    puts "GitHub OAuth configured:"
    puts "  Client ID: #{@client_id[0..10]}..."
    puts "  Redirect URI: #{@redirect_uri}"
    puts "PostgreSQL connection configured for UMA database"
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
        "GET /api/uma/species - Get all UMA species",
        "GET /api/uma/discoveries - Get user's UMA discoveries",
        "POST /api/uma/discover - Try to discover new UMA",
        "POST /api/uma/feed - Feed UMA with contributions",
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

    when '/api/uma/species'
      get_uma_species(headers)

    when '/api/uma/discoveries'
      get_user_uma_discoveries(headers)

    when '/api/uma/discover'
      discover_new_uma(headers)

    when '/api/uma/feed'
      feed_uma(headers)

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

    conn = db_connection
    return json_response({ error: "Database connection failed" }, 500) unless conn

    begin
      # ユーザー確保
      ensure_user_exists(session[:user])

      username = session[:user]['login']
      today = Date.today
      today_contributions = get_today_contributions(session[:access_token], username, today)

      if today_contributions
        # 発見ポイント計算
        discovery_points_gained = calculate_discovery_points_from_contributions(today_contributions)

        # ユーザーのIDを取得
        user_result = conn.exec_params(
          "SELECT id FROM users WHERE github_user_id = $1",
          [session[:user]['id']]
        )

        if user_result.ntuples > 0
          user_id = user_result[0]['id'].to_i

          # 日々のコントリビューション記録を更新または挿入
          conn.exec_params(
            "INSERT INTO daily_contributions (user_id, contribution_date, contribution_count, discovery_points_gained)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, contribution_date)
             DO UPDATE SET contribution_count = $3, discovery_points_gained = $4, synced_at = CURRENT_TIMESTAMP",
            [user_id, today, today_contributions, discovery_points_gained]
          )

          # ユーザーの発見ポイントを更新
          conn.exec_params(
            "UPDATE users SET discovery_points = discovery_points + $2 WHERE id = $1",
            [user_id, discovery_points_gained]
          )

          # 更新後のポイント取得
          updated_result = conn.exec_params(
            "SELECT discovery_points FROM users WHERE id = $1",
            [user_id]
          )
          current_points = updated_result[0]['discovery_points'].to_i

          json_response({
            username: username,
            date: today.to_s,
            contributions_count: today_contributions,
            discovery_points_gained: discovery_points_gained,
            total_discovery_points: current_points,
            synced_at: Time.now.to_i
          })
        else
          json_response({ error: "User not found" }, 404)
        end
      else
        json_response({ error: "Failed to sync contributions" }, 500)
      end
    rescue => e
      puts "Error syncing contributions: #{e.message}"
      json_response({ error: "Failed to sync contributions" }, 500)
    ensure
      conn&.close
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

  def calculate_discovery_points_from_contributions(count)
    case count
    when 0
      0
    when 1..2
      count * 5   # 5-10ポイント
    when 3..5
      count * 8   # 24-40ポイント
    when 6..10
      count * 12  # 72-120ポイント
    when 11..20
      count * 15  # 165-300ポイント
    else
      count * 20  # 20ポイント/コントリビューション
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

  # === UMA関連メソッド ===

  def db_connection
    PG.connect(@db_config)
  rescue => e
    puts "Database connection error: #{e.message}"
    nil
  end

  def ensure_user_exists(github_user)
    conn = db_connection
    return false unless conn

    begin
      # ユーザーの存在確認・作成
      result = conn.exec_params(
        "SELECT id FROM users WHERE github_user_id = $1",
        [github_user['id']]
      )

      if result.ntuples == 0
        # 新規ユーザー作成
        conn.exec_params(
          "INSERT INTO users (github_user_id, github_username, github_avatar_url) VALUES ($1, $2, $3)",
          [github_user['id'], github_user['login'], github_user['avatar_url']]
        )
      else
        # 既存ユーザー情報更新
        conn.exec_params(
          "UPDATE users SET github_username = $2, github_avatar_url = $3, updated_at = CURRENT_TIMESTAMP WHERE github_user_id = $1",
          [github_user['id'], github_user['login'], github_user['avatar_url']]
        )
      end
      true
    rescue => e
      puts "User creation error: #{e.message}"
      false
    ensure
      conn&.close
    end
  end

  def get_uma_species(headers)
    conn = db_connection
    return json_response({ error: "Database connection failed" }, 500) unless conn

    begin
      result = conn.exec("SELECT * FROM uma_species WHERE is_active = true ORDER BY rarity, discovery_threshold")

      species = result.map do |row|
        {
          id: row['id'].to_i,
          name: row['name'],
          description: row['description'],
          emoji: row['emoji'],
          rarity: row['rarity'].to_i,
          discovery_threshold: row['discovery_threshold'].to_i,
          habitat: row['habitat']
        }
      end

      json_response({ species: species })
    rescue => e
      puts "Error fetching UMA species: #{e.message}"
      json_response({ error: "Failed to fetch UMA species" }, 500)
    ensure
      conn&.close
    end
  end

  def get_user_uma_discoveries(headers)
    auth_header = headers['authorization']
    unless auth_header && auth_header.start_with?('Bearer ')
      return json_response({ error: "No authorization header", authenticated: false }, 401)
    end

    session_id = auth_header.sub('Bearer ', '')
    session = @sessions[session_id]
    unless session
      return json_response({ error: "Invalid session", authenticated: false }, 401)
    end

    conn = db_connection
    return json_response({ error: "Database connection failed" }, 500) unless conn

    begin
      # ユーザー確保
      ensure_user_exists(session[:user])

      # ユーザーの発見したUMA取得
      result = conn.exec_params(
        "SELECT ud.*, us.name, us.emoji, us.rarity, us.habitat, u.discovery_points, u.total_discoveries
         FROM user_uma_discoveries ud
         JOIN uma_species us ON ud.uma_species_id = us.id
         JOIN users u ON ud.user_id = u.id
         WHERE u.github_user_id = $1
         ORDER BY ud.discovery_date DESC",
        [session[:user]['id']]
      )

      discoveries = result.map do |row|
        {
          id: row['id'].to_i,
          species_name: row['name'],
          emoji: row['emoji'],
          nickname: row['nickname'],
          level: row['level'].to_i,
          affection: row['affection'].to_i,
          rarity: row['rarity'].to_i,
          habitat: row['habitat'],
          discovery_date: row['discovery_date'],
          total_contributions_fed: row['total_contributions_fed'].to_i,
          is_favorite: row['is_favorite'] == 't'
        }
      end

      user_stats = {
        discovery_points: result.ntuples > 0 ? result[0]['discovery_points'].to_i : 0,
        total_discoveries: result.ntuples > 0 ? result[0]['total_discoveries'].to_i : 0
      }

      json_response({
        discoveries: discoveries,
        user_stats: user_stats,
        total_discovered: discoveries.length
      })
    rescue => e
      puts "Error fetching user discoveries: #{e.message}"
      json_response({ error: "Failed to fetch discoveries" }, 500)
    ensure
      conn&.close
    end
  end

  def discover_new_uma(headers)
    auth_header = headers['authorization']
    unless auth_header && auth_header.start_with?('Bearer ')
      return json_response({ error: "No authorization header", authenticated: false }, 401)
    end

    session_id = auth_header.sub('Bearer ', '')
    session = @sessions[session_id]
    unless session
      return json_response({ error: "Invalid session", authenticated: false }, 401)
    end

    conn = db_connection
    return json_response({ error: "Database connection failed" }, 500) unless conn

    begin
      # ユーザー確保
      ensure_user_exists(session[:user])

      # ユーザーの現在のポイント取得
      user_result = conn.exec_params(
        "SELECT id, discovery_points FROM users WHERE github_user_id = $1",
        [session[:user]['id']]
      )

      return json_response({ error: "User not found" }, 404) if user_result.ntuples == 0

      user_id = user_result[0]['id'].to_i
      current_points = user_result[0]['discovery_points'].to_i

      if current_points < 10
        return json_response({
          error: "Not enough discovery points",
          current_points: current_points,
          required_points: 10
        }, 400)
      end

      # 発見可能なUMAをランダム選択（未発見のもの）
      species_result = conn.exec_params(
        "SELECT us.* FROM uma_species us
         WHERE us.is_active = true
         AND us.discovery_threshold <= $1
         AND us.id NOT IN (
           SELECT uma_species_id FROM user_uma_discoveries WHERE user_id = $2
         )
         ORDER BY RANDOM() LIMIT 1",
        [current_points, user_id]
      )

      if species_result.ntuples == 0
        return json_response({
          message: "No new UMA available for discovery",
          current_points: current_points
        })
      end

      species = species_result[0]
      discovery_cost = [species['discovery_threshold'].to_i, 10].max

      # UMA発見を記録
      conn.exec_params(
        "INSERT INTO user_uma_discoveries (user_id, uma_species_id, discovery_date) VALUES ($1, $2, CURRENT_TIMESTAMP)",
        [user_id, species['id']]
      )

      # ポイント消費とカウンタ更新
      conn.exec_params(
        "UPDATE users SET discovery_points = discovery_points - $2, total_discoveries = total_discoveries + 1 WHERE id = $1",
        [user_id, discovery_cost]
      )

      # アクティビティログ記録
      conn.exec_params(
        "INSERT INTO uma_activity_logs (user_id, activity_type, description, points_used) VALUES ($1, 'discovery', $2, $3)",
        [user_id, "新しいUMA「#{species['name']}」を発見しました！", discovery_cost]
      )

      json_response({
        success: true,
        discovered_uma: {
          name: species['name'],
          emoji: species['emoji'],
          description: species['description'],
          rarity: species['rarity'].to_i,
          habitat: species['habitat']
        },
        points_used: discovery_cost,
        remaining_points: current_points - discovery_cost
      })
    rescue => e
      puts "Error discovering UMA: #{e.message}"
      json_response({ error: "Failed to discover UMA" }, 500)
    ensure
      conn&.close
    end
  end

  def feed_uma(headers)
    # TODO: UMA育成機能の実装
    json_response({ message: "UMA feeding feature coming soon!" })
  end
end

# サーバー開始
if __FILE__ == $0
  api = GitHubOAuthAPI.new
  api.start
end