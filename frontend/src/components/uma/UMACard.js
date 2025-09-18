import React from 'react';
import { getUmaSprite, pixelStyle, pixelStyleLarge } from '../../umaSprites';

const UMACard = ({
  discovery,
  userStats,
  loading,
  onFeedUMA,
  getRarityColor,
  getRarityText,
  getNextLevelInfo,
  size = 'small',
  showFeeding = true
}) => {
  const isLarge = size === 'large';
  const pixelStyles = isLarge ? pixelStyleLarge : pixelStyle;

  const rarityGlow = discovery.rarity >= 3 ? 'shadow-glow-purple' : 'shadow-glow-blue';
  const animation = isLarge ? 'animate-bounce-soft' : 'animate-float';

  return (
    <div
      className={`uma-card border-2 ${isLarge ? 'rounded-lg p-5' : 'rounded-lg p-4'}
                  text-center bg-uma-card ${rarityGlow}`}
      style={{ borderColor: getRarityColor(discovery.rarity) }}
    >
      <div className={`${isLarge ? 'mb-4' : 'mb-3'}
                      drop-shadow-[2px_2px_6px_rgba(0,0,0,0.8)]
                      ${animation} cursor-pointer flex justify-center`}>
        {getUmaSprite(discovery.species_name) ? (
          <img
            src={getUmaSprite(discovery.species_name)}
            alt={discovery.species_name}
            className={`pixel-art ${animation}`}
            style={pixelStyles}
          />
        ) : (
          <div className={isLarge ? 'text-6xl' : 'text-5xl'}>
            {discovery.emoji}
          </div>
        )}
      </div>

      <h4
        className="my-2 text-center drop-shadow-sm"
        style={{ color: getRarityColor(discovery.rarity) }}
      >
        {discovery.species_name}
      </h4>

      <div className="text-xs text-uma-muted text-center mb-3">
        <div className="flex flex-wrap justify-center gap-1">
          <span
            className="px-2 py-1 rounded-full text-uma-text text-xs drop-shadow-sm"
            style={{ backgroundColor: getRarityColor(discovery.rarity) }}
          >
            {getRarityText(discovery.rarity)}
          </span>
          {discovery.is_limited_time && (
            <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs drop-shadow-sm animate-pulse">
              ⏰ 期間限定
            </span>
          )}
        </div>
      </div>

      <p className="text-uma-text text-sm">
        <span className="text-red-400 font-bold">レベル:</span> {discovery.level}
      </p>
      <p className="text-uma-text text-sm">
        <span className="text-cyan-300 font-bold">経験値:</span> {discovery.experience}
      </p>
      <p className="text-uma-text text-xs">
        <span className="text-yellow-400 font-bold">成長:</span> {getNextLevelInfo(discovery.level, discovery.experience)}
      </p>

      {isLarge && (
        <>
          <p className="text-uma-text text-sm">
            <span className="text-purple-400 font-bold">生息地:</span> {discovery.habitat}
          </p>
          <p className="text-uma-text text-sm">
            <span className="text-yellow-400 font-bold">発見日:</span> {new Date(discovery.discovery_date).toLocaleDateString()}
          </p>
          {discovery.nickname && (
            <p className="text-uma-text text-sm">
              <span className="text-green-400 font-bold">ニックネーム:</span> {discovery.nickname}
            </p>
          )}
        </>
      )}

      {showFeeding && (
        <div className={`mt-4 flex ${isLarge ? 'gap-2' : 'gap-1'} flex-wrap justify-center`}>
          <button
            onClick={() => onFeedUMA(discovery.id, 10)}
            disabled={loading || (userStats?.grass_power || 0) < 10}
            className={`${isLarge ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-xs'}
                       rounded transition-all duration-300 border
                       ${(userStats?.grass_power || 0) >= 10
                         ? 'bg-green-500 border-green-500 text-white hover:bg-green-600'
                         : 'bg-gray-700 border-gray-600 text-uma-muted cursor-not-allowed opacity-60'
                       }`}
          >
            🌱草パワー(-10)
          </button>
          {isLarge && (
            <button
              onClick={() => onFeedUMA(discovery.id, 25)}
              disabled={loading || (userStats?.grass_power || 0) < 25}
              className={`px-3 py-1.5 text-xs rounded transition-all duration-300 border font-bold
                         ${(userStats?.grass_power || 0) >= 25
                           ? 'bg-yellow-500 border-yellow-500 text-uma-dark hover:bg-yellow-600'
                           : 'bg-gray-700 border-gray-600 text-uma-muted cursor-not-allowed opacity-60'
                         }`}
            >
              ⚡ 強化草パワー (-25)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UMACard;