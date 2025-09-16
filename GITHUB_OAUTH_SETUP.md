# GitHub OAuth App セットアップ手順

## 1. GitHub OAuth App を作成

1. GitHubにログイン
2. Settings → Developer settings → OAuth Apps
3. "New OAuth App" をクリック
4. 以下の情報を入力：

```
Application name: GitHub UMA
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:3001/auth/github/callback
Application description: GitHub草でUMAを育てるアプリ
```

## 2. Client ID と Client Secret を取得

作成後に表示される：
- Client ID: `abcd1234...`
- Client Secret: `xyz789...` (Generate a new client secret をクリック)

## 3. 環境変数を設定

`.env` ファイルを作成：

```bash
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
GITHUB_REDIRECT_URI=http://localhost:3001/auth/github/callback
```

## 4. Docker Compose で環境変数を読み込み

`docker-compose.yml` に追加：

```yaml
backend:
  # ... 既存設定
  environment:
    - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
    - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
    - GITHUB_REDIRECT_URI=${GITHUB_REDIRECT_URI}
```

## 5. テスト用URL

- OAuth開始: http://localhost:3001/auth/github
- API確認: http://localhost:3001/
- ヘルスチェック: http://localhost:3001/health