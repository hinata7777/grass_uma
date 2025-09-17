import React from 'react';
import { getUmaSprite, pixelStyleLarge } from '../../umaSprites';

const UMADiscoveryModal = ({
  show,
  onClose,
  discoveredUMA,
  onShareToX,
  getRarityColor,
  getRarityText
}) => {
  if (!show || !discoveredUMA) return null;

  return (
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
        animation: 'modal-fade 0.5s ease-out'
      }}
      onClick={onClose}
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
            animation: 'discovery 1.5s ease-out',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
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
                filter: `drop-shadow(4px 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 20px ${getRarityColor(discoveredUMA.rarity)}80)`,
                animation: 'bounce-soft 2s ease-in-out infinite'
              }}
            />
          ) : (
            <div style={{
              fontSize: '128px',
              filter: `drop-shadow(4px 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 20px ${getRarityColor(discoveredUMA.rarity)}80)`,
              lineHeight: '1',
              animation: 'bounce-soft 2s ease-in-out infinite'
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => onShareToX(discoveredUMA.name, 1, false, true)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1da1f2',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 8px rgba(29, 161, 242, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0d8bd9'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#1da1f2'}
          >
            🐦 Xで共有
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: '#484f58',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#6e7681'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#484f58'}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default UMADiscoveryModal;