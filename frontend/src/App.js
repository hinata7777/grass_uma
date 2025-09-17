import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useUMA } from './hooks/useUMA';
import Header from './components/common/Header';
import HomePage from './components/pages/HomePage';
import DiscoveriesPage from './components/pages/DiscoveriesPage';
import SpeciesPage from './components/pages/SpeciesPage';
import LoginPage from './components/pages/LoginPage';
import UMADiscoveryModal from './components/modals/UMADiscoveryModal';
import LevelUpModal from './components/modals/LevelUpModal';
import './index.css';

function App() {
  const [currentView, setCurrentView] = useState('home');

  const auth = useAuth();
  const uma = useUMA();

  useEffect(() => {
    if (auth.isAuthenticated) {
      uma.loadUMAData();
      uma.loadSpeciesData();
    }
  }, [auth.isAuthenticated, uma.loadUMAData, uma.loadSpeciesData]);

  const handleLogout = () => {
    auth.handleLogout();
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen bg-uma-dark text-uma-text">
      <Header
        user={auth.user}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
      />

      <main className="p-5 w-full">
        {auth.isAuthenticated ? (
          <>
            {/* ユーザー情報エリア */}
            <div className="bg-uma-card p-5 rounded-lg mb-5 shadow-uma border border-uma-border">
              <div className="flex items-center gap-4">
                <img
                  src={auth.user.avatar_url}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border-2 border-uma-primary"
                />
                <div className="flex-1">
                  <h3 className="text-uma-primary font-bold text-lg drop-shadow-sm">
                    🔬 {auth.user.login}さんの探検記録
                  </h3>
                  <p className="text-uma-muted text-small text-mixed">
                    <span>草パワー:</span>
                    <span className="text-red-400 font-bold">{uma.userStats?.grass_power || 0}</span>
                    <span>🌱 | 発見したUMA:</span>
                    <span className="text-cyan-300 font-bold">{uma.discoveries.length}</span>
                    <span>体</span>
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-action-danger text-uma-text border border-red-400
                           rounded hover:bg-red-600 transition-colors duration-300"
                >
                  🚪 ログアウト
                </button>
              </div>
            </div>

            {/* ページ表示 */}
            {currentView === 'home' && (
              <HomePage
                userStats={uma.userStats}
                discoveries={uma.discoveries}
                loading={uma.loading}
                onSyncContributions={uma.syncContributions}
                onDiscoverUMA={uma.discoverUMA}
                onAddTestPoints={uma.addTestPoints}
                onFeedUMA={uma.feedUMA}
                getRarityColor={uma.getRarityColor}
                getRarityText={uma.getRarityText}
                getNextLevelInfo={uma.getNextLevelInfo}
              />
            )}

            {currentView === 'discoveries' && (
              <DiscoveriesPage
                discoveries={uma.discoveries}
                userStats={uma.userStats}
                loading={uma.loading}
                onFeedUMA={uma.feedUMA}
                getRarityColor={uma.getRarityColor}
                getRarityText={uma.getRarityText}
                getNextLevelInfo={uma.getNextLevelInfo}
              />
            )}

            {currentView === 'species' && (
              <SpeciesPage
                species={uma.species}
                discoveries={uma.discoveries}
                getRarityColor={uma.getRarityColor}
                getRarityText={uma.getRarityText}
              />
            )}
          </>
        ) : (
          <LoginPage onLogin={auth.handleLogin} />
        )}
      </main>

      {/* モーダル */}
      <LevelUpModal
        show={uma.showLevelUpModal}
        onClose={() => uma.setShowLevelUpModal(false)}
        levelUpData={uma.levelUpData}
        onShareToX={uma.shareToX}
      />

      <UMADiscoveryModal
        show={uma.showDiscoveryModal}
        onClose={() => uma.setShowDiscoveryModal(false)}
        discoveredUMA={uma.discoveredUMA}
        onShareToX={uma.shareToX}
        getRarityColor={uma.getRarityColor}
        getRarityText={uma.getRarityText}
      />
    </div>
  );
}

export default App;