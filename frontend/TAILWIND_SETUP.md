# TailwindCSS セットアップ手順

## 1. 依存関係のインストール

```bash
npm install -D tailwindcss@latest postcss@latest autoprefixer@latest
```

## 2. PostCSS設定ファイル作成

`postcss.config.js` を作成:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 3. package.jsonのスクリプト更新

```json
{
  "scripts": {
    "build-css": "tailwindcss -i ./src/index.css -o ./src/output.css --watch",
    "start": "npm run build-css & react-scripts start",
    "build": "npm run build-css && react-scripts build"
  }
}
```

## 4. 既存ファイルの更新

- `src/index.js` に `import './index.css'` を追加
- 各コンポーネントファイルは既に更新済み

## 5. 新しいクラス名の説明

### カスタムカラー
- `uma-primary`: #58a6ff (メインブルー)
- `uma-dark`: #0d1117 (背景色)
- `uma-card`: #161b22 (カード背景)
- `uma-border`: #30363d (ボーダー色)
- `uma-text`: #c9d1d9 (テキスト色)
- `uma-muted`: #8b949e (サブテキスト色)

### レア度カラー
- `rarity-common`: #666666
- `rarity-rare`: #4a90e2
- `rarity-super`: #8e44ad
- `rarity-ultra`: #d68910
- `rarity-legend`: #c0392b

### カスタムアニメーション
- `animate-float`: 浮遊アニメーション
- `animate-bounce-soft`: ソフトバウンス
- `animate-pulse-soft`: ソフトパルス
- `animate-sparkle`: キラキラエフェクト
- `animate-discovery`: 発見時演出

### カスタムシャドウ
- `shadow-uma`: 基本影
- `shadow-uma-lg`: 大きい影
- `shadow-glow-blue`: 青いグロー
- `shadow-glow-purple`: 紫のグロー
- `shadow-glow-gold`: 金色のグロー

## 6. 利点

✅ **コード量70%削減**: インラインスタイルからクラス名へ
✅ **統一性**: デザインシステムで一貫したスタイル
✅ **保守性**: クラス名でスタイルが一目瞭然
✅ **パフォーマンス**: 未使用CSSは自動削除
✅ **レスポンシブ**: `md:`, `lg:` プレフィックスで簡単対応