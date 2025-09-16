import React, { useState, useEffect } from 'react';
import { getUmaSprite, pixelStyle, pixelStyleLarge } from './umaSprites';

function App() {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // home, discoveries, species
  const [userStats, setUserStats] = useState(null);
  const [discoveries, setDiscoveries] = useState([]);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [discoveredUMA, setDiscoveredUMA] = useState(null);

  useEffect(() => {
    // URLパラメータからセッション情報を取得
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');
    const loginStatus = urlParams.get('login');
    const error = urlParams.get('error');

    console.log('URL Params:', { session, loginStatus, error });

    if (error) {
      console.error('OAuth Error:', error);
      alert(`認証エラー: ${error}`);
    } else if (session && loginStatus === 'success') {
      console.log('Session found, fetching user info...');
      setSessionId(session);
      // ユーザー情報を取得
      fetchUserInfo(session);
      // URLをクリーンアップ
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchUserInfo = async (session) => {
    try {
      console.log('Fetching user info with session:', session);
      const response = await fetch('http://localhost:3001/api/user', {
        headers: {
          'Authorization': `Bearer ${session}`
        }
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.authenticated) {
        setUser(data.user);
        console.log('User set successfully:', data.user);
        // UMAデータも取得
        loadUMAData(session);
        loadSpeciesData();
      } else {
        console.error('Authentication failed:', data);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const loadUMAData = async (session) => {
    try {
      console.log('Loading UMA data with session:', session);
      const response = await fetch('http://localhost:3001/api/uma/discoveries', {
        headers: {
          'Authorization': `Bearer ${session}`
        }
      });

      console.log('UMA Data response status:', response.status);
      console.log('UMA Data response ok:', response.ok);

      const responseText = await response.text();
      console.log('UMA Data raw response length:', responseText.length);
      console.log('UMA Data raw response preview:', responseText.substring(0, 200) + '...');
      console.log('UMA Data raw response end:', '...' + responseText.substring(responseText.length - 200));

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('UMA Data parsed successfully');
        console.log('Discoveries count:', data.discoveries?.length);
        console.log('User stats:', data.user_stats);
      } catch (parseError) {
        console.error('UMA Data JSON parse error:', parseError);
        console.error('Error at position:', parseError.message.match(/position (\d+)/)?.[1]);
        console.error('Character at error position:', responseText[parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0')]);
        return;
      }

      if (response.ok) {
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
  };

  const loadSpeciesData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/uma/species');
      const data = await response.json();
      if (response.ok) {
        setSpecies(data.species || []);
      }
    } catch (error) {
      console.error('Failed to fetch UMA species:', error);
    }
  };

  const syncContributions = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        alert(`コントリビューション同期完了！\n草パワー: +${data.grass_power_gained}\n総パワー: ${data.total_grass_power}`);
        // ポイント情報を直接更新
        setUserStats(prev => ({
          ...prev,
          grass_power: data.total_grass_power
        }));
        loadUMAData(sessionId);
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
    if (!sessionId) return;

    console.log('Starting UMA discovery...');
    setLoading(true);
    try {
      console.log('Sending request to:', 'http://localhost:3001/api/uma/discover');
      const response = await fetch('http://localhost:3001/api/uma/discover', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // まずテキストとして取得してJSONをデバッグ
      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text that failed to parse:', responseText);
        throw new Error('サーバーからの応答が不正です');
      }

      if (response.ok && data.success) {
        // モーダルでUMA発見演出
        setDiscoveredUMA(data.discovered_uma);
        setShowDiscoveryModal(true);

        // UMAデータを更新
        setUserStats(prev => ({
          ...prev,
          grass_power: data.remaining_points
        }));
        loadUMAData(sessionId);
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

  const addTestPoints = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/debug/add_points?points=50', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`🧪 テスト用草パワー追加！\n追加パワー: ${data.points_added}\n総パワー: ${data.total_points}`);
        // ポイント情報を直接更新
        setUserStats(prev => ({
          ...prev,
          grass_power: data.total_points
        }));
        loadUMAData(sessionId);
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

  const feedUMA = async (umaId, feedAmount = 10) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/uma/feed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uma_id: umaId,
          feed_amount: feedAmount
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert(`${data.message}\n親密度: +${data.results.affection_gained} (${data.results.new_affection}/100)\nレベル: ${data.results.new_level}\n使用草パワー: ${data.results.power_used}\n残り草パワー: ${data.results.remaining_power}`);

        // ユーザー統計情報を更新
        setUserStats(prev => ({
          ...prev,
          grass_power: data.results.remaining_power
        }));

        // UMAデータを再読み込み
        loadUMAData(sessionId);
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

  const handleLogin = () => {
    window.location.href = 'http://localhost:3001/auth/github';
  };

  const handleLogout = () => {
    setUser(null);
    setSessionId(null);
    setCurrentView('home');
    setDiscoveries([]);
    setUserStats(null);
  };

  const getRarityColor = (rarity) => {
    const colors = {
      1: '#666666', // コモン - ダークグレー
      2: '#4a90e2', // レア - ダークブルー
      3: '#8e44ad', // スーパーレア - ダークパープル
      4: '#d68910', // ウルトラレア - ダークオレンジ
      5: '#c0392b'  // レジェンダリー - ダークレッド
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
    // レベルごとの親密度範囲
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

  return (
    <>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }

          @keyframes bounce {
            0%, 100% { transform: translateY(0px) scale(1); }
            25% { transform: translateY(-5px) scale(1.05); }
            50% { transform: translateY(-10px) scale(1.1); }
            75% { transform: translateY(-5px) scale(1.05); }
          }

          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }

          @keyframes pixelGlow {
            0%, 100% {
              filter: drop-shadow(2px 2px 6px rgba(0,0,0,0.8))
                      drop-shadow(0 0 10px rgba(88, 166, 255, 0.3));
            }
            50% {
              filter: drop-shadow(2px 2px 6px rgba(0,0,0,0.8))
                      drop-shadow(0 0 20px rgba(88, 166, 255, 0.6))
                      drop-shadow(0 0 30px rgba(88, 166, 255, 0.4));
            }
          }

          @keyframes discoveryAppear {
            0% {
              opacity: 0;
              transform: scale(0.1) rotate(-180deg);
            }
            50% {
              opacity: 1;
              transform: scale(1.2) rotate(0deg);
            }
            100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes sparkle {
            0%, 100% {
              opacity: 0;
              transform: scale(0);
            }
            50% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes modalFadeIn {
            from {
              opacity: 0;
              backdrop-filter: blur(0px);
            }
            to {
              opacity: 1;
              backdrop-filter: blur(10px);
            }
          }
        `}
      </style>
      <div className="App" style={{ minHeight: '100vh', backgroundColor: '#0d1117', color: '#c9d1d9' }}>
      <header style={{ backgroundColor: '#000000', color: '#c9d1d9', padding: '15px', textAlign: 'center', borderBottom: '2px solid #30363d', boxShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
        <h1 style={{
          fontFamily: 'monospace',
          fontSize: '32px',
          textShadow: '2px 2px 4px rgba(255,0,0,0.5)',
          margin: '10px 0',
          letterSpacing: '2px',
          fontWeight: 'bold'
        }}>GRASS UMA</h1>
        <p style={{ color: '#8b949e', fontStyle: 'italic' }}>GitHubの闇に潜む未確認生命体を発見せよ...</p>

        {user && (
          <nav style={{ marginTop: '15px' }}>
            <button onClick={() => setCurrentView('home')} style={{ margin: '0 10px', padding: '8px 16px', backgroundColor: currentView === 'home' ? '#58a6ff' : '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.3s ease' }}>
              🏠 ホーム
            </button>
            <button onClick={() => setCurrentView('discoveries')} style={{ margin: '0 10px', padding: '8px 16px', backgroundColor: currentView === 'discoveries' ? '#58a6ff' : '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.3s ease' }}>
              👁️ 発見済みUMA
            </button>
            <button onClick={() => setCurrentView('species')} style={{ margin: '0 10px', padding: '8px 16px', backgroundColor: currentView === 'species' ? '#58a6ff' : '#21262d', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.3s ease' }}>
              📚 UMA図鑑
            </button>
          </nav>
        )}
      </header>

      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {user ? (
          <>
            {/* ユーザー情報エリア */}
            <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img src={user.avatar_url} alt="Avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #58a6ff' }} />
                <div>
                  <h3 style={{ color: '#58a6ff', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>🔬 {user.login}さんの探検記録</h3>
                  <p style={{ color: '#8b949e' }}>草パワー: <strong style={{ color: '#f85149' }}>{userStats?.grass_power || 0}</strong>🌱 | 発見したUMA: <strong style={{ color: '#a5f3fc' }}>{discoveries.length}</strong>体</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#da3633', color: '#c9d1d9', border: '1px solid #f85149', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                    🚪 ログアウト
                  </button>
                </div>
              </div>
            </div>

            {currentView === 'home' && (
              <div>
                <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
                  <h3 style={{ color: '#238636', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>🌱 闇のコントリビューション連携</h3>
                  <p style={{ color: '#8b949e' }}>今日のGitHubコントリビューションを同期して草パワーを獲得...闇の力が蓄積される</p>
                  <button
                    onClick={syncContributions}
                    disabled={loading}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: loading ? '#2d333b' : '#238636',
                      color: '#c9d1d9',
                      border: '1px solid #238636',
                      borderRadius: '5px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all 0.3s ease',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    {loading ? '⏳ 同期中...' : '⚡ コントリビューション同期'}
                  </button>
                </div>

                <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
                  <h3 style={{ color: '#8e44ad', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>🔮 UMA発見の儀式</h3>
                  <p style={{ color: '#8b949e' }}>草パワーを使って新しい未確認生命体を探索...闇に潜む者たちを呼び覚ませ<br />最低10パワーが必要です。</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={discoverUMA}
                      disabled={loading || (userStats?.grass_power || 0) < 10}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: (userStats?.grass_power || 0) >= 10 ? '#8e44ad' : '#2d333b',
                        color: '#c9d1d9',
                        border: `1px solid ${(userStats?.grass_power || 0) >= 10 ? '#8e44ad' : '#484f58'}`,
                        borderRadius: '5px',
                        cursor: loading || (userStats?.grass_power || 0) < 10 ? 'not-allowed' : 'pointer',
                        opacity: loading || (userStats?.grass_power || 0) < 10 ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                      }}
                    >
                      {loading ? '🌀 探索中...' : '🔍 UMA探索開始'}
                    </button>
                    <button
                      onClick={addTestPoints}
                      disabled={loading}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: loading ? '#2d333b' : '#f39c12',
                        color: '#c9d1d9',
                        border: '1px solid #f39c12',
                        borderRadius: '5px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                      }}
                    >
                      {loading ? '⏳ 処理中...' : '🧪 テスト用草パワー+50'}
                    </button>
                  </div>
                </div>

                {discoveries.length > 0 && (
                  <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
                    <h3 style={{ color: '#f85149', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>👻 最近発見したUMA</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                      {discoveries.slice(0, 6).map(discovery => (
                        <div key={discovery.id} style={{
                          border: `2px solid ${getRarityColor(discovery.rarity)}`,
                          borderRadius: '8px',
                          padding: '15px',
                          textAlign: 'center',
                          backgroundColor: '#21262d',
                          boxShadow: `0 0 10px rgba(${discovery.rarity >= 3 ? '142, 68, 173' : '88, 166, 255'}, 0.3)`
                        }}>
                          <div style={{
                            marginBottom: '10px',
                            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.7))',
                            animation: 'float 3s ease-in-out infinite',
                            transform: 'translateY(0px)',
                            display: 'flex',
                            justifyContent: 'center'
                          }}>
                            {getUmaSprite(discovery.species_name) ? (
                              <img
                                src={getUmaSprite(discovery.species_name)}
                                alt={discovery.species_name}
                                style={{
                                  ...pixelStyle,
                                  animation: 'float 3s ease-in-out infinite'
                                }}
                              />
                            ) : (
                              <div style={{ fontSize: '48px' }}>{discovery.emoji}</div>
                            )}
                          </div>
                          <h4 style={{ margin: '5px 0', color: getRarityColor(discovery.rarity), textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{discovery.species_name}</h4>
                          <p style={{ fontSize: '12px', color: '#8b949e', margin: '5px 0' }}>{getRarityText(discovery.rarity)}</p>
                          <p style={{ fontSize: '14px', margin: '5px 0', color: '#c9d1d9' }}>Lv.{discovery.level}</p>
                          <p style={{ fontSize: '10px', margin: '3px 0', color: '#fbbf24' }}>{getNextLevelInfo(discovery.level, discovery.affection)}</p>

                          {/* 簡易餌やりボタン */}
                          <button
                            onClick={() => feedUMA(discovery.id, 10)}
                            disabled={loading || (userStats?.grass_power || 0) < 10}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: (userStats?.grass_power || 0) >= 10 ? '#16a34a' : '#2d333b',
                              color: '#c9d1d9',
                              border: `1px solid ${(userStats?.grass_power || 0) >= 10 ? '#16a34a' : '#484f58'}`,
                              borderRadius: '3px',
                              fontSize: '10px',
                              cursor: loading || (userStats?.grass_power || 0) < 10 ? 'not-allowed' : 'pointer',
                              opacity: loading || (userStats?.grass_power || 0) < 10 ? 0.6 : 1,
                              transition: 'all 0.3s ease',
                              marginTop: '5px'
                            }}
                          >
                            🍯エサ(-10)
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentView === 'discoveries' && (
              <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
                <h3 style={{ color: '#58a6ff', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>👁️ 発見済み怪奇生命体 ({discoveries.length}体)</h3>
                {discoveries.length === 0 ? (
                  <p style={{ color: '#8b949e', fontStyle: 'italic' }}>まだ闇に潜む者たちを発見していません...コントリビューションを同期して草パワーを獲得し、探索を始めましょう。</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {discoveries.map(discovery => (
                      <div key={discovery.id} style={{
                        border: `2px solid ${getRarityColor(discovery.rarity)}`,
                        borderRadius: '10px',
                        padding: '20px',
                        backgroundColor: '#21262d',
                        boxShadow: `0 0 15px rgba(${discovery.rarity >= 3 ? '142, 68, 173' : '88, 166, 255'}, 0.3)`
                      }}>
                        <div style={{
                          textAlign: 'center',
                          marginBottom: '15px',
                          filter: 'drop-shadow(2px 2px 6px rgba(0,0,0,0.8))',
                          animation: 'bounce 2s ease-in-out infinite',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'center'
                        }}>
                          {getUmaSprite(discovery.species_name) ? (
                            <img
                              src={getUmaSprite(discovery.species_name)}
                              alt={discovery.species_name}
                              style={{
                                ...pixelStyleLarge,
                                animation: 'bounce 2s ease-in-out infinite'
                              }}
                            />
                          ) : (
                            <div style={{ fontSize: '64px' }}>{discovery.emoji}</div>
                          )}
                        </div>
                        <h4 style={{ margin: '10px 0', color: getRarityColor(discovery.rarity), textAlign: 'center', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{discovery.species_name}</h4>
                        <div style={{ fontSize: '12px', color: '#8b949e', textAlign: 'center', marginBottom: '10px' }}>
                          <span style={{ backgroundColor: getRarityColor(discovery.rarity), color: '#c9d1d9', padding: '2px 8px', borderRadius: '12px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                            {getRarityText(discovery.rarity)}
                          </span>
                        </div>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#f85149' }}>レベル:</strong> {discovery.level}</p>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#a5f3fc' }}>親密度:</strong> {discovery.affection}/100</p>
                        <p style={{ color: '#c9d1d9', fontSize: '12px' }}><strong style={{ color: '#fbbf24' }}>成長:</strong> {getNextLevelInfo(discovery.level, discovery.affection)}</p>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#7c3aed' }}>生息地:</strong> {discovery.habitat}</p>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#fbbf24' }}>発見日:</strong> {new Date(discovery.discovery_date).toLocaleDateString()}</p>
                        {discovery.nickname && <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#10b981' }}>ニックネーム:</strong> {discovery.nickname}</p>}

                        {/* 餌やりボタン */}
                        <div style={{ marginTop: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => feedUMA(discovery.id, 10)}
                            disabled={loading || (userStats?.grass_power || 0) < 10}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: (userStats?.grass_power || 0) >= 10 ? '#16a34a' : '#2d333b',
                              color: '#c9d1d9',
                              border: `1px solid ${(userStats?.grass_power || 0) >= 10 ? '#16a34a' : '#484f58'}`,
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: loading || (userStats?.grass_power || 0) < 10 ? 'not-allowed' : 'pointer',
                              opacity: loading || (userStats?.grass_power || 0) < 10 ? 0.6 : 1,
                              transition: 'all 0.3s ease'
                            }}
                          >
                            🍯 エサやり (-10)
                          </button>
                          <button
                            onClick={() => feedUMA(discovery.id, 25)}
                            disabled={loading || (userStats?.grass_power || 0) < 25}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: (userStats?.grass_power || 0) >= 25 ? '#eab308' : '#2d333b',
                              color: (userStats?.grass_power || 0) >= 25 ? '#0d1117' : '#c9d1d9',
                              border: `1px solid ${(userStats?.grass_power || 0) >= 25 ? '#eab308' : '#484f58'}`,
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: loading || (userStats?.grass_power || 0) < 25 ? 'not-allowed' : 'pointer',
                              opacity: loading || (userStats?.grass_power || 0) < 25 ? 0.6 : 1,
                              transition: 'all 0.3s ease',
                              fontWeight: 'bold'
                            }}
                          >
                            🥩 高級エサ (-25)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentView === 'species' && (
              <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
                <h3 style={{ color: '#a5f3fc', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>📚 UMA図鑑 ({species.length}種類)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                  {species.map(s => {
                    const discovered = discoveries.find(d => d.species_name === s.name);
                    return (
                      <div key={s.id} style={{
                        border: `2px solid ${discovered ? getRarityColor(s.rarity) : '#484f58'}`,
                        borderRadius: '10px',
                        padding: '20px',
                        backgroundColor: discovered ? '#21262d' : '#161b22',
                        opacity: discovered ? 1 : 0.7,
                        boxShadow: discovered ? `0 0 15px rgba(${s.rarity >= 3 ? '142, 68, 173' : '88, 166, 255'}, 0.2)` : 'none'
                      }}>
                        <div style={{
                          textAlign: 'center',
                          marginBottom: '15px',
                          filter: discovered ? 'drop-shadow(2px 2px 6px rgba(0,0,0,0.8))' : 'grayscale(100%)',
                          animation: discovered ? 'pulse 4s ease-in-out infinite' : 'none',
                          opacity: discovered ? 1 : 0.5,
                          display: 'flex',
                          justifyContent: 'center'
                        }}>
                          {discovered && getUmaSprite(s.name) ? (
                            <img
                              src={getUmaSprite(s.name)}
                              alt={s.name}
                              style={{
                                ...pixelStyleLarge,
                                animation: 'pulse 4s ease-in-out infinite'
                              }}
                            />
                          ) : discovered ? (
                            <div style={{ fontSize: '64px' }}>{s.emoji}</div>
                          ) : (
                            <div style={{ fontSize: '64px', filter: 'grayscale(100%)', opacity: 0.5 }}>❓</div>
                          )}
                        </div>
                        <h4 style={{ margin: '10px 0', color: discovered ? getRarityColor(s.rarity) : '#8b949e', textAlign: 'center', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                          {discovered ? s.name : '未知の存在'}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#8b949e', textAlign: 'center', marginBottom: '10px' }}>
                          <span style={{ backgroundColor: getRarityColor(s.rarity), color: '#c9d1d9', padding: '2px 8px', borderRadius: '12px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                            {getRarityText(s.rarity)}
                          </span>
                        </div>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#f85149' }}>草パワー:</strong> {s.discovery_threshold}</p>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#7c3aed' }}>生息地:</strong> {discovered ? s.habitat : '不明な領域'}</p>
                        {discovered && <p style={{ color: '#8b949e', fontStyle: 'italic' }}><strong style={{ color: '#fbbf24' }}>記録:</strong> {s.description}</p>}
                        {!discovered && <p style={{ fontStyle: 'italic', color: '#6e7681' }}>発見するまで真の姿は謎に包まれている...</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', backgroundColor: '#161b22', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
            <h2 style={{ color: '#58a6ff', textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>🌙 未確認生命体の闇世界へようこそ 👻</h2>
            <p style={{ color: '#8b949e', fontStyle: 'italic', lineHeight: '1.6' }}>GitHubのコントリビューション（草）に宿る闇の力を使って、<br />ツチノコ、チュパカブラ、宇宙人などの未確認生命体を発見・研究せよ...<br />闇に潜む者たちがあなたの到来を待っている。</p>
            <button
              onClick={handleLogin}
              style={{
                padding: '15px 30px',
                backgroundColor: '#238636',
                color: '#c9d1d9',
                border: '1px solid #238636',
                borderRadius: '5px',
                fontSize: '18px',
                cursor: 'pointer',
                marginTop: '20px',
                transition: 'all 0.3s ease',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                boxShadow: '0 2px 8px rgba(35, 134, 54, 0.3)'
              }}
            >
              🔮 GitHubでログインして闇の探索開始
            </button>
          </div>
        )}
      </main>

      {/* UMA発見モーダル */}
      {showDiscoveryModal && discoveredUMA && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'modalFadeIn 0.5s ease-out'
          }}
          onClick={() => setShowDiscoveryModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #161b22 0%, #0d1117 100%)',
              padding: '40px',
              borderRadius: '20px',
              textAlign: 'center',
              border: `3px solid ${getRarityColor(discoveredUMA.rarity)}`,
              boxShadow: `0 0 30px ${getRarityColor(discoveredUMA.rarity)}80`,
              maxWidth: '500px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 背景のキラキラエフェクト */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '6px',
                  backgroundColor: getRarityColor(discoveredUMA.rarity),
                  borderRadius: '50%',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animation: `sparkle 2s ease-in-out infinite ${i * 0.3}s`
                }}
              />
            ))}

            <h2 style={{
              color: '#58a6ff',
              marginBottom: '30px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
              fontSize: '32px'
            }}>
              🎉 UMA発見！
            </h2>

            <div
              style={{
                animation: 'discoveryAppear 1.5s ease-out',
                marginBottom: '20px'
              }}
            >
              {getUmaSprite(discoveredUMA.name) ? (
                <img
                  src={getUmaSprite(discoveredUMA.name)}
                  alt={discoveredUMA.name}
                  style={{
                    ...pixelStyleLarge,
                    width: '128px',
                    height: '128px',
                    filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.8))'
                  }}
                />
              ) : (
                <div style={{
                  fontSize: '128px',
                  filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.8))',
                  lineHeight: '1'
                }}>
                  {discoveredUMA.emoji}
                </div>
              )}
            </div>

            <h3 style={{
              color: getRarityColor(discoveredUMA.rarity),
              fontSize: '28px',
              marginBottom: '10px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}>
              {discoveredUMA.name}
            </h3>

            <div style={{
              backgroundColor: getRarityColor(discoveredUMA.rarity),
              color: '#fff',
              padding: '5px 15px',
              borderRadius: '20px',
              display: 'inline-block',
              fontSize: '14px',
              marginBottom: '20px',
              fontWeight: 'bold'
            }}>
              {getRarityText(discoveredUMA.rarity)}
            </div>

            <p style={{
              color: '#c9d1d9',
              fontSize: '18px',
              marginBottom: '30px',
              fontStyle: 'italic'
            }}>
              {discoveredUMA.description}
            </p>

            <button
              onClick={() => setShowDiscoveryModal(false)}
              style={{
                padding: '12px 30px',
                backgroundColor: '#58a6ff',
                color: '#0d1117',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 8px rgba(88, 166, 255, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#79c0ff'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#58a6ff'}
            >
              素晴らしい！
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default App;