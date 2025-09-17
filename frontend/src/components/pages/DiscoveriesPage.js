import React from 'react';
import UMACard from '../uma/UMACard';

const DiscoveriesPage = ({
  discoveries,
  userStats,
  loading,
  onFeedUMA,
  getRarityColor,
  getRarityText,
  getNextLevelInfo
}) => {
  return (
    <div className="bg-uma-card p-5 rounded-lg shadow-uma border border-uma-border">
      <h3 className="text-uma-primary drop-shadow-sm title-section font-bold mb-4">
        👁️ 発見済み怪奇生命体 ({discoveries.length}体)
      </h3>
      {discoveries.length === 0 ? (
        <p className="text-uma-muted italic text-small">
          まだ闇に潜む者たちを発見していません...コントリビューションを同期して草パワーを獲得し、探索を始めましょう。
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
          {discoveries.map(discovery => (
            <UMACard
              key={discovery.id}
              discovery={discovery}
              userStats={userStats}
              loading={loading}
              onFeedUMA={onFeedUMA}
              getRarityColor={getRarityColor}
              getRarityText={getRarityText}
              getNextLevelInfo={getNextLevelInfo}
              size="large"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscoveriesPage;