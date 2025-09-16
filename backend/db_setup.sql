-- 未確認生命体（UMA）ゲーム用データベーススキーマ

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    github_user_id INTEGER UNIQUE NOT NULL,
    github_username VARCHAR(255) NOT NULL,
    github_avatar_url VARCHAR(500),
    discovery_points INTEGER DEFAULT 0, -- 発見ポイント
    total_discoveries INTEGER DEFAULT 0, -- 総発見数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- UMA種類マスターテーブル（発見可能なUMA一覧）
CREATE TABLE IF NOT EXISTS uma_species (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- ツチノコ、チュパカブラ、等
    description TEXT,
    emoji VARCHAR(10), -- 🐍、👽、等
    rarity INTEGER DEFAULT 1, -- 1:コモン, 2:レア, 3:スーパーレア, 4:ウルトラレア, 5:レジェンダリー
    discovery_threshold INTEGER DEFAULT 10, -- 発見に必要なポイント
    habitat VARCHAR(100), -- 生息地・発見場所
    evolution_from INTEGER REFERENCES uma_species(id), -- 進化前のUMA ID
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーが発見したUMAテーブル
CREATE TABLE IF NOT EXISTS user_uma_discoveries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    uma_species_id INTEGER REFERENCES uma_species(id),
    nickname VARCHAR(100), -- ユーザーが付けたニックネーム
    level INTEGER DEFAULT 1,
    affection INTEGER DEFAULT 0, -- 親密度
    discovery_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_contributions_fed INTEGER DEFAULT 0, -- 与えたコントリビューション総数
    is_favorite BOOLEAN DEFAULT false,
    UNIQUE(user_id, uma_species_id) -- 同じUMAは1体まで
);

-- 日々のコントリビューション記録テーブル
CREATE TABLE IF NOT EXISTS daily_contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contribution_date DATE NOT NULL,
    contribution_count INTEGER DEFAULT 0,
    discovery_points_gained INTEGER DEFAULT 0,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, contribution_date)
);

-- UMA発見・成長ログテーブル
CREATE TABLE IF NOT EXISTS uma_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    uma_discovery_id INTEGER REFERENCES user_uma_discoveries(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL, -- discovery, feeding, evolution, level_up
    description TEXT,
    points_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_user_id);
CREATE INDEX IF NOT EXISTS idx_uma_species_rarity ON uma_species(rarity);
CREATE INDEX IF NOT EXISTS idx_user_discoveries_user_id ON user_uma_discoveries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_contributions_user_date ON daily_contributions(user_id, contribution_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON uma_activity_logs(user_id);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新トリガー
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期UMA種類データ投入
INSERT INTO uma_species (name, description, emoji, rarity, discovery_threshold, habitat) VALUES
('ツチノコ', '幻の蛇型未確認生命体。お酒を好むとされる', '🐍', 2, 50, '深い森'),
('チュパカブラ', '吸血する謎の生物。夜間に目撃される', '🦇', 3, 100, '南米の山地'),
('エイリアン', '小柄で大きな目を持つ宇宙人', '👽', 3, 150, 'UFO内部'),
('雪男', '雪山に住む大型の類人猿型生物', '🦍', 2, 80, 'ヒマラヤ山脈'),
('ネッシー', '湖に住む首長竜型の生物', '🦕', 3, 120, 'ネス湖'),
('河童', '川に住む亀のような妖怪', '🐢', 1, 20, '日本の川'),
('ジャッカロープ', '角の生えたウサギ型の未確認生物', '🐰', 1, 15, 'アメリカ西部'),
('ケセランパセラン', '白い毛玉のような謎の生物', '🤍', 1, 25, '日本の山地'),
('スカイフィッシュ', '空中を高速で移動する棒状生物', '🐟', 2, 60, '空中'),
('モスマン', '蛾のような羽を持つ人型生物', '🦋', 3, 120, '廃墟'),
('ビッグフット', '北米の森に住む大型類人猿', '🦶', 2, 90, '北米の森'),
('マーメイド', '美しい人魚型の海洋生物', '🧜‍♀️', 4, 200, '深海')
ON CONFLICT DO NOTHING;