import { useState, useEffect } from 'react';
import apiService from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
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
      apiService.setSessionId(session);
      fetchUserInfo(session);
      // URLをクリーンアップ
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchUserInfo = async (session) => {
    try {
      console.log('Fetching user info with session:', session);
      const data = await apiService.fetchUserInfo();
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
    const currentPort = window.location.port;
    const backendPort = currentPort === '3010' ? '3001' : '3001';
    window.location.href = `http://localhost:${backendPort}/auth/github?frontend_port=${currentPort}`;
  };

  const handleLogout = () => {
    setUser(null);
    setSessionId(null);
    apiService.setSessionId(null);
  };

  return {
    user,
    sessionId,
    loading,
    setLoading,
    handleLogin,
    handleLogout,
    isAuthenticated: !!user
  };
};