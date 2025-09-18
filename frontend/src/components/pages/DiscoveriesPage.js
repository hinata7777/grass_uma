import React, { useState } from 'react';
import UMACard from '../uma/UMACard';
import ExperienceHelpModal from '../modals/ExperienceHelpModal';

const DiscoveriesPage = ({
  discoveries,
  userStats,
  loading,
  onFeedUMA,
  getRarityColor,
  getRarityText,
  getNextLevelInfo
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  return (
    <div className="bg-uma-card p-5 rounded-lg shadow-uma border border-uma-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-uma-primary drop-shadow-sm title-section font-bold">
          👁️ 発見済みUMA ({discoveries.length}体)
        </h3>
        <button
          onClick={() => setShowHelpModal(true)}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors duration-300 flex items-center gap-1"
        >
          ❓ 経験値とは？
        </button>
      </div>
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

      <ExperienceHelpModal
        show={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
};

export default DiscoveriesPage;