import React from 'react';
import { getUmaSprite, pixelStyleLarge } from '../../umaSprites';

const SpeciesPage = ({
  species,
  discoveries,
  getRarityColor,
  getRarityText
}) => {
  return (
    <div className="bg-uma-card p-5 rounded-lg shadow-uma border border-uma-border">
      <h3 className="text-cyan-300 drop-shadow-sm title-section font-bold mb-4">
        📚 UMA図鑑 ({species.length}種類)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
        {species.map(s => {
          const discovered = discoveries.find(d => d.species_name === s.name);
          return (
            <div
              key={s.id}
              className={`border-2 rounded-lg p-5 transition-all duration-300 ${
                discovered
                  ? 'bg-uma-dark opacity-100'
                  : 'bg-uma-card opacity-70'
              } ${
                discovered && s.rarity >= 3
                  ? 'shadow-glow-purple'
                  : discovered
                    ? 'shadow-glow-blue'
                    : 'shadow-none'
              }`}
              style={{
                borderColor: discovered ? getRarityColor(s.rarity) : '#484f58'
              }}
            >
              <div className={`text-center mb-4 flex justify-center ${
                discovered
                  ? 'drop-shadow-lg animate-pulse-soft opacity-100'
                  : 'grayscale opacity-50'
              }`}>
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
                  <div className="text-6xl">{s.emoji}</div>
                ) : (
                  <div className="text-6xl grayscale opacity-50">❓</div>
                )}
              </div>
              <h4
                className="my-2 text-center drop-shadow-sm title-section"
                style={{ color: discovered ? getRarityColor(s.rarity) : '#8b949e' }}
              >
                {discovered ? s.name : '未知の存在'}
              </h4>
              <div className="text-xs text-uma-muted text-center mb-2">
                <div className="flex flex-wrap justify-center gap-1">
                  <span
                    className="px-2 py-1 rounded-full text-uma-text drop-shadow-sm"
                    style={{ backgroundColor: getRarityColor(s.rarity) }}
                  >
                    {getRarityText(s.rarity)}
                  </span>
                  {s.is_limited_time && (
                    <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs drop-shadow-sm animate-pulse">
                      ⏰ 期間限定
                    </span>
                  )}
                </div>
              </div>
              <p className="text-uma-text text-small">
                <span className="text-red-400 font-bold">草パワー:</span> {s.discovery_threshold}
              </p>
              <p className="text-uma-text text-small">
                <span className="text-purple-400 font-bold">生息地:</span> {discovered ? s.habitat : '不明な領域'}
              </p>
              {discovered && (
                <p className="text-uma-muted italic text-small">
                  <span className="text-yellow-400 font-bold">記録:</span> {s.description}
                </p>
              )}
              {!discovered && (
                <p className="italic text-uma-muted text-small">
                  発見するまで真の姿は謎に包まれている...
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpeciesPage;