-- 親密度から経験値への移行スクリプト
-- affectionカラムをexperienceカラムに変更

-- 1. 新しいexperienceカラムを追加（既に存在する場合はスキップ）
ALTER TABLE user_uma_discoveries
ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;

-- 2. 既存のaffectionデータをexperienceにコピー
UPDATE user_uma_discoveries
SET experience = COALESCE(affection, 0)
WHERE experience = 0;

-- 3. affectionカラムを削除（データが確実にコピーされた後）
-- ALTER TABLE user_uma_discoveries DROP COLUMN IF EXISTS affection;

-- 注意：affectionカラムの削除は慎重に行ってください
-- データの整合性を確認してから実行することを推奨します