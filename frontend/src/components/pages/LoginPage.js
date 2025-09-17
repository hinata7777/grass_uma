import React from 'react';

const LoginPage = ({ onLogin }) => {
  return (
    <div className="space-y-5">
      <div className="bg-uma-card p-10 rounded-lg shadow-uma border border-uma-border text-center">
        <h2 className="text-uma-primary text-2xl font-bold mb-6 drop-shadow-lg">
          🌙 未確認生命体の闇世界へようこそ 👻
        </h2>
        <p className="text-uma-muted italic leading-relaxed mb-8">
          GitHubのコントリビューション（草）に宿る闇の力を使って、<br />
          ツチノコ、チュパカブラ、宇宙人などの未確認生命体を発見・研究せよ...<br />
          闇に潜む者たちがあなたの到来を待っている。
        </p>
        <button
          onClick={onLogin}
          className="px-8 py-4 bg-grass-power text-uma-text border border-grass-power
                     rounded text-lg font-bold transition-all duration-300 drop-shadow-sm
                     hover:bg-grass-light hover:shadow-lg transform hover:scale-105"
        >
          🔮 GitHubでログインして闇の探索開始
        </button>
      </div>
    </div>
  );
};

export default LoginPage;