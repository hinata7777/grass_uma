import React from 'react';

const Header = ({ user, currentView, setCurrentView, onLogout }) => {
  const getNavButtonClass = (view) =>
    `mx-2 px-4 py-2 rounded transition-all duration-300 border border-uma-border
     ${currentView === view
       ? 'bg-uma-primary text-uma-dark font-bold'
       : 'bg-uma-card text-uma-text hover:bg-uma-border'
     }`;

  return (
    <header className="bg-black text-uma-text p-4 text-center border-b-2 border-uma-border shadow-uma-lg">
      <h1 className="title-large font-bold my-2 tracking-wider text-grass-power
                     drop-shadow-[2px_2px_4px_rgba(35,134,54,0.5)]">
        GRASS UMA
      </h1>
      <p className="text-uma-muted text-small">
        GitHubの闇に潜む未確認生命体を発見せよ...
      </p>

      {user && (
        <nav className="mt-4">
          <button
            onClick={() => setCurrentView('home')}
            className={getNavButtonClass('home')}
          >
            🏠 ホーム
          </button>
          <button
            onClick={() => setCurrentView('discoveries')}
            className={getNavButtonClass('discoveries')}
          >
            👁️ 発見済みUMA
          </button>
          <button
            onClick={() => setCurrentView('species')}
            className={getNavButtonClass('species')}
          >
            📚 UMA図鑑
          </button>
        </nav>
      )}
    </header>
  );
};

export default Header;