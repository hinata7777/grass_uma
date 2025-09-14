import React, { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);

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
      } else {
        console.error('Authentication failed:', data);
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    }
  };

  const handleLogin = () => {
    window.location.href = 'http://localhost:3001/auth/github';
  };

  const handleLogout = () => {
    setUser(null);
    setSessionId(null);
  };

  return (
    <div className="App">
      <header className="App-header" style={{ padding: '20px', textAlign: 'center' }}>
        <h1>GitHub UMA</h1>
        <p>GitHub草でUMAを育てよう！</p>

        {user ? (
          <div style={{ marginTop: '20px' }}>
            <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '8px', margin: '10px 0' }}>
              <img
                src={user.avatar_url}
                alt="Avatar"
                style={{ width: '50px', height: '50px', borderRadius: '50%' }}
              />
              <h3>ようこそ、{user.login}さん！</h3>
              <p>GitHub ID: {user.id}</p>
              <p>フォロワー: {user.followers}人</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              ログアウト
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <p>GitHubでログインしてUMAを育て始めましょう！</p>
            <button
              onClick={handleLogin}
              style={{
                padding: '15px 30px',
                backgroundColor: '#238636',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              GitHubでログイン
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;