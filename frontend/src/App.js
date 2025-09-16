import React, { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // home, discoveries, species
  const [userStats, setUserStats] = useState(null);
  const [discoveries, setDiscoveries] = useState([]);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(false);

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
      const response = await fetch('http://localhost:3001/api/uma/discoveries', {
        headers: {
          'Authorization': `Bearer ${session}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setDiscoveries(data.discoveries || []);
        setUserStats(data.user_stats || {});
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
        alert(`コントリビューション同期完了！\n発見ポイント: +${data.discovery_points_gained}\n総ポイント: ${data.total_discovery_points}`);
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

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/uma/discover', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`🎉 新しいUMAを発見しました！\n${data.discovered_uma.emoji} ${data.discovered_uma.name}\n${data.discovered_uma.description}\n\n使用ポイント: ${data.points_used}\n残りポイント: ${data.remaining_points}`);
        loadUMAData(sessionId);
      } else {
        alert(data.error || data.message || 'UMA発見に失敗しました');
      }
    } catch (error) {
      console.error('Failed to discover UMA:', error);
      alert('UMA発見に失敗しました');
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

  return (
    <div className="App" style={{ minHeight: '100vh', backgroundColor: '#0d1117', color: '#c9d1d9' }}>
      <header style={{ backgroundColor: '#000000', color: '#c9d1d9', padding: '15px', textAlign: 'center', borderBottom: '2px solid #30363d', boxShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
        <h1 style={{ textShadow: '2px 2px 4px rgba(255,0,0,0.5)', margin: '10px 0' }}>👻 GitHub UMA 🌙</h1>
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
                  <p style={{ color: '#8b949e' }}>発見ポイント: <strong style={{ color: '#f85149' }}>{userStats?.discovery_points || 0}</strong> | 発見したUMA: <strong style={{ color: '#a5f3fc' }}>{discoveries.length}</strong>体</p>
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
                  <p style={{ color: '#8b949e' }}>今日のGitHubコントリビューションを同期して発見ポイントを獲得...闇の力が蓄積される</p>
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
                  <p style={{ color: '#8b949e' }}>発見ポイントを使って新しい未確認生命体を探索...闇に潜む者たちを呼び覚ませ<br />最低10ポイントが必要です。</p>
                  <button
                    onClick={discoverUMA}
                    disabled={loading || (userStats?.discovery_points || 0) < 10}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: (userStats?.discovery_points || 0) >= 10 ? '#8e44ad' : '#2d333b',
                      color: '#c9d1d9',
                      border: `1px solid ${(userStats?.discovery_points || 0) >= 10 ? '#8e44ad' : '#484f58'}`,
                      borderRadius: '5px',
                      cursor: loading || (userStats?.discovery_points || 0) < 10 ? 'not-allowed' : 'pointer',
                      opacity: loading || (userStats?.discovery_points || 0) < 10 ? 0.6 : 1,
                      transition: 'all 0.3s ease',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    {loading ? '🌀 探索中...' : '🔍 UMA探索開始'}
                  </button>
                </div>

                {discoveries.length > 0 && (
                  <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
                    <h3 style={{ color: '#f85149', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>👻 最近発見した怪奇生命体</h3>
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
                          <div style={{ fontSize: '48px', marginBottom: '10px', filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.7))' }}>{discovery.emoji}</div>
                          <h4 style={{ margin: '5px 0', color: getRarityColor(discovery.rarity), textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{discovery.species_name}</h4>
                          <p style={{ fontSize: '12px', color: '#8b949e', margin: '5px 0' }}>{getRarityText(discovery.rarity)}</p>
                          <p style={{ fontSize: '14px', margin: '5px 0', color: '#c9d1d9' }}>Lv.{discovery.level}</p>
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
                  <p style={{ color: '#8b949e', fontStyle: 'italic' }}>まだ闇に潜む者たちを発見していません...コントリビューションを同期して発見ポイントを獲得し、探索を始めましょう。</p>
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
                        <div style={{ textAlign: 'center', fontSize: '64px', marginBottom: '15px', filter: 'drop-shadow(2px 2px 6px rgba(0,0,0,0.8))' }}>{discovery.emoji}</div>
                        <h4 style={{ margin: '10px 0', color: getRarityColor(discovery.rarity), textAlign: 'center', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{discovery.species_name}</h4>
                        <div style={{ fontSize: '12px', color: '#8b949e', textAlign: 'center', marginBottom: '10px' }}>
                          <span style={{ backgroundColor: getRarityColor(discovery.rarity), color: '#c9d1d9', padding: '2px 8px', borderRadius: '12px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                            {getRarityText(discovery.rarity)}
                          </span>
                        </div>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#f85149' }}>レベル:</strong> {discovery.level}</p>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#a5f3fc' }}>親密度:</strong> {discovery.affection}/100</p>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#7c3aed' }}>生息地:</strong> {discovery.habitat}</p>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#fbbf24' }}>発見日:</strong> {new Date(discovery.discovery_date).toLocaleDateString()}</p>
                        {discovery.nickname && <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#10b981' }}>ニックネーム:</strong> {discovery.nickname}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentView === 'species' && (
              <div style={{ backgroundColor: '#161b22', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.5)', border: '1px solid #30363d' }}>
                <h3 style={{ color: '#a5f3fc', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>📚 怪奇生命体図鑑 ({species.length}種類)</h3>
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
                        <div style={{ textAlign: 'center', fontSize: '64px', marginBottom: '15px', filter: discovered ? 'drop-shadow(2px 2px 6px rgba(0,0,0,0.8))' : 'grayscale(100%)' }}>
                          {discovered ? s.emoji : '❓'}
                        </div>
                        <h4 style={{ margin: '10px 0', color: discovered ? getRarityColor(s.rarity) : '#8b949e', textAlign: 'center', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                          {discovered ? s.name : '未知の存在'}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#8b949e', textAlign: 'center', marginBottom: '10px' }}>
                          <span style={{ backgroundColor: getRarityColor(s.rarity), color: '#c9d1d9', padding: '2px 8px', borderRadius: '12px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                            {getRarityText(s.rarity)}
                          </span>
                        </div>
                        <p style={{ color: '#c9d1d9' }}><strong style={{ color: '#f85149' }}>発見ポイント:</strong> {s.discovery_threshold}</p>
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
    </div>
  );
}

export default App;