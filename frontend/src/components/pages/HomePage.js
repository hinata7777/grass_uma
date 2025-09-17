import React from 'react';
import UMACard from '../uma/UMACard';

const HomePage = ({
  userStats,
  discoveries,
  loading,
  onSyncContributions,
  onDiscoverUMA,
  onAddTestPoints,
  onResetDiscoveries,
  onFeedUMA,
  getRarityColor,
  getRarityText,
  getNextLevelInfo
}) => {
  return (
    <div className="space-y-5">
      {/* コントリビューション同期セクション */}
      <div className="bg-uma-card p-5 rounded-lg shadow-uma border border-uma-border">
        <h3 className="text-grass-power drop-shadow-sm font-bold title-section mb-2">
          🌱 闇のコントリビューション連携
        </h3>
        <p className="text-uma-muted mb-4 text-small">
          今日のGitHubコントリビューションを同期して草パワーを獲得...闇の力が蓄積される
        </p>
        <button
          onClick={onSyncContributions}
          disabled={loading}
          className={`px-6 py-3 rounded border transition-all duration-300 drop-shadow-sm
                     ${loading
                       ? 'bg-gray-700 border-gray-600 text-uma-muted cursor-not-allowed opacity-60'
                       : 'bg-grass-power border-grass-power text-uma-text hover:bg-grass-light'
                     }`}
        >
          {loading ? '⏳ 同期中...' : '⚡ コントリビューション同期'}
        </button>
      </div>

      {/* UMA発見セクション */}
      <div className="bg-uma-card p-5 rounded-lg shadow-uma border border-uma-border">
        <h3 className="text-uma-secondary drop-shadow-sm font-bold title-section mb-2">
          🔮 UMA発見の儀式
        </h3>
        <p className="text-uma-muted mb-4 text-small">
          草パワーを使って新しい未確認生命体を探索...闇に潜む者たちを呼び覚ませ<br />
          最低10パワーが必要です。
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onDiscoverUMA}
            disabled={loading || (userStats?.grass_power || 0) < 10}
            className={`px-6 py-3 rounded border transition-all duration-300 drop-shadow-sm
                       ${(userStats?.grass_power || 0) >= 10 && !loading
                         ? 'bg-uma-secondary border-uma-secondary text-uma-text hover:bg-purple-600'
                         : 'bg-gray-700 border-gray-600 text-uma-muted cursor-not-allowed opacity-60'
                       }`}
          >
            {loading ? '🌀 探索中...' : '🔍 UMA探索開始'}
          </button>
          <button
            onClick={() => onAddTestPoints(50)}
            disabled={loading}
            className={`px-6 py-3 rounded border transition-all duration-300 drop-shadow-sm
                       ${loading
                         ? 'bg-gray-700 border-gray-600 text-uma-muted cursor-not-allowed opacity-60'
                         : 'bg-action-warning border-action-warning text-uma-text hover:bg-yellow-600'
                       }`}
          >
            {loading ? '⏳ 処理中...' : '🧪 テスト用草パワー+50'}
          </button>
          <button
            onClick={() => onAddTestPoints(500)}
            disabled={loading}
            className={`px-6 py-3 rounded border transition-all duration-300 drop-shadow-sm
                       ${loading
                         ? 'bg-gray-700 border-gray-600 text-uma-muted cursor-not-allowed opacity-60'
                         : 'bg-red-600 border-red-600 text-uma-text hover:bg-red-700'
                       }`}
          >
            {loading ? '⏳ 処理中...' : '🚀 開発用草パワー+500'}
          </button>
          <button
            onClick={() => {
              if (window.confirm('UMA発見データを全て削除しますか？この操作は取り消せません。')) {
                onResetDiscoveries();
              }
            }}
            disabled={loading}
            className={`px-6 py-3 rounded border transition-all duration-300 drop-shadow-sm
                       ${loading
                         ? 'bg-gray-700 border-gray-600 text-uma-muted cursor-not-allowed opacity-60'
                         : 'bg-red-800 border-red-800 text-uma-text hover:bg-red-900'
                       }`}
          >
            🗑️ UMAデータリセット
          </button>
        </div>
      </div>

      {/* 最近発見したUMAセクション */}
      {discoveries.length > 0 && (
        <div className="bg-uma-card p-5 rounded-lg shadow-uma border border-uma-border">
          <h3 className="text-red-400 drop-shadow-sm font-bold title-section mb-4">
            👻 最近発見したUMA
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {discoveries.slice(0, 6).map(discovery => (
              <UMACard
                key={discovery.id}
                discovery={discovery}
                userStats={userStats}
                loading={loading}
                onFeedUMA={onFeedUMA}
                getRarityColor={getRarityColor}
                getRarityText={getRarityText}
                getNextLevelInfo={getNextLevelInfo}
                size="small"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;