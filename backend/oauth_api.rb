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

      # POSTリクエストの場合、ボディを読み込み
      body = nil
      if method == 'POST' && headers['content-length']
        content_length = headers['content-length'].to_i
        body = client.read(content_length) if content_length > 0
      end

      # ルーティング処理
      response = route_request(method, path, headers, body)

      client.print response
      client.close
    end
  end

  private

  def route_request(method, path, headers, body = nil)
    # パスとクエリパラメータを分離
    path_without_query = path.split('?').first
    @request_body = body  # インスタンス変数に保存

    puts "DEBUG: Received request - Method: #{method}, Path: #{path_without_query}"

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
      if method == 'POST'
        discover_new_uma(headers)
      else
        json_response({ error: "Method not allowed. Use POST." }, 405)
      end

    when '/api/uma/feed'
      if method == 'POST'
        feed_uma(headers)
      else
        json_response({ error: "Method not allowed. Use POST." }, 405)
      end

    when '/api/debug/add_points'
      debug_add_points(headers, path)

    when '/health'
      json_response({ status: "ok", timestamp: Time.now.to_i })

    when '/debug/sessions'
      json_response({
        active_sessions: @sessions.keys.length,
        session_ids: @sessions.keys.map { |id| id[0..8] + "..." },
        full_session_id: @sessions.keys.first
      })

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
        # 草パワー計算
        grass_power_gained = calculate_grass_power_from_contributions(today_contributions)

        puts "DEBUG: Today's contributions: #{today_contributions}, Grass power to gain: #{grass_power_gained}"

        # ユーザーのIDを取得
        user_result = conn.exec_params(
          "SELECT id FROM users WHERE github_user_id = $1",
          [session[:user]['id']]
        )

        if user_result.ntuples > 0
          user_id = user_result[0]['id'].to_i

          # 既存の記録をチェック
          existing_result = conn.exec_params(
            "SELECT contribution_count, grass_power_gained FROM daily_contributions WHERE user_id = $1 AND contribution_date = $2",
            [user_id, today]
          )

          if existing_result.ntuples > 0
            # 既存の記録がある場合、差分のみ計算
            old_contributions = existing_result[0]['contribution_count'].to_i
            old_power = existing_result[0]['grass_power_gained'].to_i

            if today_contributions != old_contributions
              # コントリビューション数が変わった場合のみ更新
              power_difference = grass_power_gained - old_power

              # 記録を更新
              conn.exec_params(
                "UPDATE daily_contributions SET contribution_count = $3, grass_power_gained = $4, synced_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND contribution_date = $2",
                [user_id, today, today_contributions, grass_power_gained]
              )

              # 草パワー差分のみ追加
              conn.exec_params(
                "UPDATE users SET grass_power = grass_power + $2 WHERE id = $1",
                [user_id, power_difference]
              )

              grass_power_gained = power_difference
            else
              # 変更なしの場合
              puts "DEBUG: No change in contributions, grass power gained: 0"
              grass_power_gained = 0
            end
          else
            # 新規記録の場合
            conn.exec_params(
              "INSERT INTO daily_contributions (user_id, contribution_date, contribution_count, grass_power_gained) VALUES ($1, $2, $3, $4)",
              [user_id, today, today_contributions, grass_power_gained]
            )

            # ユーザーの草パワーを更新
            conn.exec_params(
              "UPDATE users SET grass_power = grass_power + $2 WHERE id = $1",
              [user_id, grass_power_gained]
            )
          end

          # 更新後の草パワー取得
          updated_result = conn.exec_params(
            "SELECT grass_power FROM users WHERE id = $1",
            [user_id]
          )
          current_power = updated_result[0]['grass_power'].to_i

          json_response({
            username: username,
            date: today.to_s,
            contributions_count: today_contributions,
            grass_power_gained: grass_power_gained,
            total_grass_power: current_power,
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

  def calculate_grass_power_from_contributions(count)
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
    puts "DEBUG: Starting JSON response generation..."
    begin
      body = data.to_json
      puts "DEBUG: JSON encoding successful, body length: #{body.length}"
    rescue => e
      puts "JSON encoding error: #{e.message}"
      puts "Data: #{data.inspect}"
      body = { error: "JSON encoding failed" }.to_json
      status = 500
    end

    status_text = case status
    when 200 then "OK"
    when 302 then "Found"
    when 400 then "Bad Request"
    when 401 then "Unauthorized"
    when 404 then "Not Found"
    else "Internal Server Error"
    end

    # 正確なバイト長を計算
    body_bytes = body.bytesize

    response = "HTTP/1.1 #{status} #{status_text}\r\n" +
    "Content-Type: application/json; charset=utf-8\r\n" +
    "Access-Control-Allow-Origin: *\r\n" +
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
    "Access-Control-Allow-Headers: Content-Type, Authorization\r\n" +
    "Content-Length: #{body_bytes}\r\n" +
    "\r\n" +
    body

    puts "DEBUG: Response length - Body bytes: #{body_bytes}, Total response length: #{response.bytesize}"
    response
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
    puts "DEBUG: Getting UMA discoveries..."

    auth_header = headers['authorization']
    unless auth_header && auth_header.start_with?('Bearer ')
      puts "DEBUG: No authorization header for discoveries"
      return json_response({ error: "No authorization header", authenticated: false }, 401)
    end

    session_id = auth_header.sub('Bearer ', '')
    session = @sessions[session_id]
    unless session
      puts "DEBUG: Invalid session for discoveries"
      return json_response({ error: "Invalid session", authenticated: false }, 401)
    end

    puts "DEBUG: Session found for discoveries: #{session[:user]['login']}"

    conn = db_connection
    unless conn
      puts "DEBUG: Database connection failed for discoveries"
      return json_response({ error: "Database connection failed" }, 500)
    end

    begin
      # ユーザー確保
      ensure_user_exists(session[:user])

      # まずユーザー情報を取得
      puts "DEBUG: Fetching user info for github_user_id: #{session[:user]['id']}"
      user_result = conn.exec_params(
        "SELECT grass_power, total_discoveries FROM users WHERE github_user_id = $1",
        [session[:user]['id']]
      )

      puts "DEBUG: User query returned #{user_result.ntuples} rows"

      user_stats = if user_result.ntuples > 0
        stats = {
          grass_power: user_result[0]['grass_power'].to_i,
          total_discoveries: user_result[0]['total_discoveries'].to_i
        }
        puts "DEBUG: User stats: #{stats}"
        stats
      else
        puts "DEBUG: No user found, returning default stats"
        { grass_power: 0, total_discoveries: 0 }
      end

      # ユーザーの発見したUMA取得
      puts "DEBUG: Fetching discoveries for github_user_id: #{session[:user]['id']}"
      result = conn.exec_params(
        "SELECT ud.*, us.name, us.emoji, us.rarity, us.habitat
         FROM user_uma_discoveries ud
         JOIN uma_species us ON ud.uma_species_id = us.id
         JOIN users u ON ud.user_id = u.id
         WHERE u.github_user_id = $1
         ORDER BY ud.discovery_date DESC",
        [session[:user]['id']]
      )

      puts "DEBUG: Discoveries query returned #{result.ntuples} rows"

      discoveries = result.map do |row|
        discovery = {
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
        puts "DEBUG: Discovery: #{discovery}"
        discovery
      end

      puts "DEBUG: Total discoveries processed: #{discoveries.length}"

      response_data = {
        discoveries: discoveries,
        user_stats: user_stats,
        total_discovered: discoveries.length
      }

      puts "DEBUG: About to send discoveries response with #{discoveries.length} discoveries"
      puts "DEBUG: User stats being sent: #{user_stats}"

      json_response(response_data)
    rescue => e
      puts "Error fetching user discoveries: #{e.message}"
      json_response({ error: "Failed to fetch discoveries" }, 500)
    ensure
      conn&.close
    end
  end

  def discover_new_uma(headers)
    puts "DEBUG: Starting UMA discovery..."

    auth_header = headers['authorization']
    unless auth_header && auth_header.start_with?('Bearer ')
      puts "DEBUG: No authorization header"
      return json_response({ error: "No authorization header", authenticated: false }, 401)
    end

    session_id = auth_header.sub('Bearer ', '')
    session = @sessions[session_id]
    unless session
      puts "DEBUG: Invalid session"
      return json_response({ error: "Invalid session", authenticated: false }, 401)
    end

    puts "DEBUG: Session found for user: #{session[:user]['login']}"

    conn = db_connection
    unless conn
      puts "DEBUG: Database connection failed"
      return json_response({ error: "Database connection failed" }, 500)
    end

    begin
      # ユーザー確保
      ensure_user_exists(session[:user])

      # ユーザーの現在の草パワー取得
      user_result = conn.exec_params(
        "SELECT id, grass_power FROM users WHERE github_user_id = $1",
        [session[:user]['id']]
      )

      if user_result.ntuples == 0
        puts "DEBUG: User not found in database"
        return json_response({ error: "User not found" }, 404)
      end

      user_id = user_result[0]['id'].to_i
      current_power = user_result[0]['grass_power'].to_i

      puts "DEBUG: User ID: #{user_id}, Current grass power: #{current_power}"

      if current_power < 10
        puts "DEBUG: Not enough grass power - Current: #{current_power}, Required: 10"
        return json_response({
          error: "Not enough grass power",
          current_power: current_power,
          required_power: 10
        }, 400)
      end

      # 発見可能なUMAをランダム選択（未発見のもの）
      puts "DEBUG: Searching for discoverable UMA with #{current_power} grass power for user #{user_id}"

      species_result = conn.exec_params(
        "SELECT us.* FROM uma_species us
         WHERE us.is_active = true
         AND us.discovery_threshold <= $1
         AND us.id NOT IN (
           SELECT uma_species_id FROM user_uma_discoveries WHERE user_id = $2
         )
         ORDER BY RANDOM() LIMIT 1",
        [current_power, user_id]
      )

      puts "DEBUG: Found #{species_result.ntuples} available UMA species"

      if species_result.ntuples == 0
        puts "DEBUG: No new UMA available for discovery"
        return json_response({
          message: "No new UMA available for discovery",
          current_power: current_power
        })
      end

      species = species_result[0]
      discovery_cost = [species['discovery_threshold'].to_i, 10].max

      puts "DEBUG: Selected UMA: #{species['name']}, Cost: #{discovery_cost}"

      # UMA発見を記録
      puts "DEBUG: Recording UMA discovery..."
      conn.exec_params(
        "INSERT INTO user_uma_discoveries (user_id, uma_species_id, discovery_date) VALUES ($1, $2, CURRENT_TIMESTAMP)",
        [user_id, species['id']]
      )

      # 草パワー消費とカウンタ更新
      puts "DEBUG: Updating user grass power and discovery count..."
      conn.exec_params(
        "UPDATE users SET grass_power = grass_power - $2, total_discoveries = total_discoveries + 1 WHERE id = $1",
        [user_id, discovery_cost]
      )

      # アクティビティログ記録
      puts "DEBUG: Recording activity log..."
      conn.exec_params(
        "INSERT INTO uma_activity_logs (user_id, activity_type, description, points_used) VALUES ($1, 'discovery', $2, $3)",
        [user_id, "新しいUMA「#{species['name']}」を発見しました！", discovery_cost]
      )

      puts "DEBUG: UMA discovery completed successfully!"

      discovered_uma = {
        name: species['name'],
        emoji: species['emoji'],
        description: species['description'],
        rarity: species['rarity'].to_i,
        habitat: species['habitat']
      }

      response_data = {
        success: true,
        discovered_uma: discovered_uma,
        power_used: discovery_cost,
        remaining_power: current_power - discovery_cost
      }

      puts "DEBUG: Sending response: #{response_data.inspect}"
      json_response(response_data)
    rescue => e
      puts "Error discovering UMA: #{e.message}"
      json_response({ error: "Failed to discover UMA" }, 500)
    ensure
      conn&.close
    end
  end

  def feed_uma(headers)
    puts "DEBUG: Feed UMA request received"
    puts "DEBUG: Headers: #{headers.inspect}"
    puts "DEBUG: Request body: #{@request_body.inspect}"

    auth_header = headers['authorization']
    unless auth_header && auth_header.start_with?('Bearer ')
      puts "DEBUG: No authorization header found"
      return json_response({ error: "認証が必要です", authenticated: false }, 401)
    end

    session_id = auth_header.sub('Bearer ', '')
    session = @sessions[session_id]
    unless session
      puts "DEBUG: Invalid session: #{session_id}"
      return json_response({ error: "無効なセッションです", authenticated: false }, 401)
    end

    puts "DEBUG: Session found: #{session[:user]['login']}"

    begin
      # POST データを読み込み（JSON形式）
      data = JSON.parse(@request_body || '{}') rescue {}

      uma_discovery_id = data['uma_id']
      feed_amount = (data['feed_amount'] || 10).to_i  # デフォルト10草パワー

      unless uma_discovery_id
        return json_response({ error: "UMA IDが必要です" }, 400)
      end

      conn = db_connection
      return json_response({ error: "データベース接続に失敗しました" }, 500) unless conn

      # ユーザー情報を取得
      user_result = conn.exec_params(
        "SELECT id, grass_power FROM users WHERE github_user_id = $1",
        [session[:user]['id']]
      )

      if user_result.ntuples == 0
        return json_response({ error: "ユーザーが見つかりません" }, 404)
      end

      user_id = user_result[0]['id'].to_i
      current_power = user_result[0]['grass_power'].to_i

      # 草パワーが足りるかチェック
      if current_power < feed_amount
        return json_response({
          error: "草パワーが不足しています",
          required: feed_amount,
          current: current_power
        }, 400)
      end

      # UMAの発見記録を確認（ユーザーが実際に発見したUMAか）
      uma_result = conn.exec_params(
        "SELECT id, level, affection FROM user_uma_discoveries WHERE id = $1 AND user_id = $2",
        [uma_discovery_id, user_id]
      )

      if uma_result.ntuples == 0
        return json_response({ error: "指定されたUMAが見つかりません" }, 404)
      end

      current_level = uma_result[0]['level'].to_i
      current_affection = uma_result[0]['affection'].to_i

      # 餌やり効果を計算
      affection_gain = calculate_affection_gain(feed_amount, current_level)
      new_affection = [current_affection + affection_gain, 100].min  # 親密度は最大100

      # レベルアップ判定
      new_level = calculate_level_from_affection(new_affection)
      level_up = new_level > current_level

      # データベース更新
      conn.exec_params("BEGIN")

      # UMAの親密度・レベル更新
      conn.exec_params(
        "UPDATE user_uma_discoveries SET level = $1, affection = $2 WHERE id = $3",
        [new_level, new_affection, uma_discovery_id]
      )

      # ユーザーの草パワー減少
      conn.exec_params(
        "UPDATE users SET grass_power = grass_power - $1 WHERE id = $2",
        [feed_amount, user_id]
      )

      # アクティビティログ記録
      activity_desc = level_up ?
        "UMAに餌をあげてレベルが#{current_level}から#{new_level}に上がりました！" :
        "UMAに餌をあげて親密度が#{affection_gain}上がりました"

      conn.exec_params(
        "INSERT INTO uma_activity_logs (user_id, activity_type, description, points_used) VALUES ($1, 'feeding', $2, $3)",
        [user_id, activity_desc, feed_amount]
      )

      conn.exec_params("COMMIT")

      json_response({
        success: true,
        message: level_up ? "🎉 レベルアップしました！" : "🍯 UMAが喜んでいます！",
        results: {
          affection_gained: affection_gain,
          new_affection: new_affection,
          new_level: new_level,
          level_up: level_up,
          power_used: feed_amount,
          remaining_power: current_power - feed_amount
        }
      })

    rescue JSON::ParserError
      json_response({ error: "リクエストデータが不正です" }, 400)
    rescue => e
      puts "Error feeding UMA: #{e.message}"
      puts e.backtrace
      conn&.exec_params("ROLLBACK") rescue nil
      json_response({ error: "UMA餌やりに失敗しました" }, 500)
    ensure
      conn&.close
    end
  end

  # 餌やりの親密度上昇量を計算
  def calculate_affection_gain(feed_amount, current_level)
    base_gain = feed_amount / 5  # 5草パワーで1親密度
    # レベルが高いほど効率が少し悪くなる
    level_penalty = current_level * 0.1
    [base_gain - level_penalty, 1].max.to_i  # 最低1は上がる
  end

  # 親密度からレベルを計算
  def calculate_level_from_affection(affection)
    case affection
    when 0..19
      1
    when 20..39
      2
    when 40..59
      3
    when 60..79
      4
    when 80..100
      5
    else
      1
    end
  end

  def debug_add_points(headers, path)
    auth_header = headers['authorization']
    unless auth_header && auth_header.start_with?('Bearer ')
      return json_response({ error: "No authorization header", authenticated: false }, 401)
    end

    session_id = auth_header.sub('Bearer ', '')
    session = @sessions[session_id]
    unless session
      return json_response({ error: "Invalid session", authenticated: false }, 401)
    end

    # クエリパラメータからポイント数を取得
    uri = URI(path)
    params = URI.decode_www_form(uri.query || '')
    points = params.find { |k, v| k == 'points' }&.last&.to_i || 50

    conn = db_connection
    return json_response({ error: "Database connection failed" }, 500) unless conn

    begin
      ensure_user_exists(session[:user])

      # ユーザーに草パワーを追加
      conn.exec_params(
        "UPDATE users SET grass_power = grass_power + $2 WHERE github_user_id = $1",
        [session[:user]['id'], points]
      )

      # 更新後の草パワー取得
      result = conn.exec_params(
        "SELECT grass_power FROM users WHERE github_user_id = $1",
        [session[:user]['id']]
      )

      total_power = result[0]['grass_power'].to_i

      json_response({
        success: true,
        power_added: points,
        total_power: total_power,
        message: "Debug: #{points} grass power added"
      })
    rescue => e
      puts "Error adding debug points: #{e.message}"
      json_response({ error: "Failed to add points" }, 500)
    ensure
      conn&.close
    end
  end
end

# サーバー開始
if __FILE__ == $0
  api = GitHubOAuthAPI.new
  api.start
end