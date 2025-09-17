import { useState, useCallback } from 'react';
import apiService from '../services/api';

export const useUMA = () => {
  const [userStats, setUserStats] = useState(null);
  const [discoveries, setDiscoveries] = useState([]);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [discoveredUMA, setDiscoveredUMA] = useState(null);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);

  const loadUMAData = useCallback(async () => {
    try {
      console.log('Loading UMA data...');
      const data = await apiService.getUmaDiscoveries();

      if (data.discoveries) {
        console.log('Setting discoveries:', data.discoveries);
        console.log('Setting user stats:', data.user_stats);
        setDiscoveries(data.discoveries || []);
        setUserStats(data.user_stats || {});
      } else {
        console.error('UMA Data fetch failed:', data);
      }
    } catch (error) {
      console.error('Failed to fetch UMA discoveries:', error);
    }
  }, []);

  const loadSpeciesData = useCallback(async () => {
    try {
      const data = await apiService.getUmaSpecies();
      if (data.species) {
        setSpecies(data.species || []);
      }
    } catch (error) {
      console.error('Failed to fetch UMA species:', error);
    }
  }, []);

  const syncContributions = async () => {
    setLoading(true);
    try {
      const data = await apiService.syncContributions();
      if (data.total_grass_power !== undefined) {
        alert(`コントリビューション同期完了！\n草パワー: +${data.grass_power_gained}\n総パワー: ${data.total_grass_power}`);
        setUserStats(prev => ({
          ...prev,
          grass_power: data.total_grass_power
        }));
        loadUMAData();
      } else {
        alert('同期に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to sync contributions:', error);
      alert('同期に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const discoverUMA = async () => {
    console.log('Starting UMA discovery...');
    setLoading(true);
    try {
      const data = await apiService.discoverUma();

      if (data.success) {
        setDiscoveredUMA(data.discovered_uma);
        setShowDiscoveryModal(true);
        setUserStats(prev => ({
          ...prev,
          grass_power: data.remaining_power
        }));
        loadUMAData();
      } else {
        console.error('UMA discovery failed:', data);
        alert(data.error || data.message || 'UMA発見に失敗しました');
      }
    } catch (error) {
      console.error('Failed to discover UMA:', error);
      alert('UMA発見に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const feedUMA = async (umaId, feedAmount = 10) => {
    setLoading(true);
    try {
      const data = await apiService.feedUma(umaId, feedAmount);

      if (data.success) {
        // レベルアップした場合はモーダル表示
        if (data.results.level_up) {
          const currentUMA = discoveries.find(d => d.id === umaId);
          if (currentUMA) {
            setLevelUpData({
              umaName: currentUMA.species_name,
              emoji: currentUMA.emoji,
              oldLevel: data.results.new_level - 1,
              newLevel: data.results.new_level,
              affection: data.results.new_affection
            });
            setShowLevelUpModal(true);
          }
        } else {
          alert(`${data.message}\n親密度: +${data.results.affection_gained} (${data.results.new_affection}/100)\nレベル: ${data.results.new_level}\n使用草パワー: ${data.results.power_used}\n残り草パワー: ${data.results.remaining_power}`);
        }

        setUserStats(prev => ({
          ...prev,
          grass_power: data.results.remaining_power
        }));
        loadUMAData();
      } else {
        alert('エサやりに失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to feed UMA:', error);
      alert('エサやりに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const addTestPoints = async (points = 50) => {
    setLoading(true);
    try {
      const data = await apiService.addTestPoints(points);
      if (data.success) {
        alert(`🚀 開発用草パワー追加！\n追加パワー: ${data.power_added}\n総パワー: ${data.total_power}`);
        setUserStats(prev => ({
          ...prev,
          grass_power: data.total_power
        }));
        loadUMAData();
      } else {
        alert('草パワー追加に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to add test points:', error);
      alert('草パワー追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const resetDiscoveries = async () => {
    setLoading(true);
    try {
      const data = await apiService.resetDiscoveries();
      if (data.success) {
        alert('🗑️ UMA発見データをリセットしました！');
        // 状態をリセット
        setDiscoveries([]);
        setUserStats(prev => ({
          ...prev,
          total_discoveries: 0
        }));
        // 最新データを再読み込み
        await loadUMAData();
      } else {
        alert('リセットに失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to reset discoveries:', error);
      alert('リセットに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ユーティリティ関数
  const getRarityColor = (rarity) => {
    const colors = {
      1: '#666666',
      2: '#4a90e2',
      3: '#8e44ad',
      4: '#d68910',
      5: '#c0392b'
    };
    return colors[rarity] || '#666666';
  };

  const getRarityText = (rarity) => {
    const texts = {
      1: 'コモン',
      2: 'レア',
      3: 'スーパーレア',
      4: 'ウルトラレア',
      5: 'レジェンダリー'
    };
    return texts[rarity] || 'コモン';
  };

  const getNextLevelInfo = (currentLevel, affection) => {
    const levelThresholds = {
      1: { min: 0, max: 19 },
      2: { min: 20, max: 39 },
      3: { min: 40, max: 59 },
      4: { min: 60, max: 79 },
      5: { min: 80, max: 100 }
    };

    if (currentLevel >= 5) {
      return "最大レベル";
    }

    const nextLevel = currentLevel + 1;
    const nextLevelThreshold = levelThresholds[nextLevel]?.min || 100;
    const pointsNeeded = nextLevelThreshold - affection;

    return pointsNeeded > 0 ? `あと${pointsNeeded}ポイントでLv.${nextLevel}` : `Lv.${nextLevel}可能`;
  };

  const shareToX = (umaName, level, isLevelUp = false, isDiscovery = false) => {
    let text = '';
    if (isDiscovery) {
      text = `🔍 新しいUMAを発見しました！\n${umaName}\n\n#GRASSUMA #GitHub #UMA発見`;
    } else if (isLevelUp) {
      text = `🎉 ${umaName}がレベル${level}にレベルアップしました！\n\n#GRASSUMA #レベルアップ #UMA育成`;
    } else {
      text = `🌱 ${umaName} (Lv.${level})を育成中！\n\n#GRASSUMA #UMA育成`;
    }

    const url = encodeURIComponent(window.location.origin);
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
    window.open(tweetUrl, '_blank', 'width=550,height=420');
  };

  return {
    userStats,
    discoveries,
    species,
    loading,
    showDiscoveryModal,
    setShowDiscoveryModal,
    discoveredUMA,
    showLevelUpModal,
    setShowLevelUpModal,
    levelUpData,
    loadUMAData,
    loadSpeciesData,
    syncContributions,
    discoverUMA,
    feedUMA,
    addTestPoints,
    resetDiscoveries,
    getRarityColor,
    getRarityText,
    getNextLevelInfo,
    shareToX
  };
};