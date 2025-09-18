import React from 'react';

const ExperienceHelpModal = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6 rounded-2xl border-2 border-blue-400 shadow-2xl max-w-md w-full mx-4 max-h-screen overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-blue-400 mb-2">
            💡 経験値システムについて
          </h3>
        </div>

        <div className="space-y-6 text-gray-300">
          <div>
            <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center">
              🌱 草パワーを与える
            </h4>
            <p className="mb-3 text-sm">
              UMAに草パワーを与えることで経験値を獲得できます：
            </p>
            <ul className="space-y-2 text-sm bg-gray-800 rounded-lg p-3">
              <li className="flex items-center justify-between">
                <span>🌱 草パワー(-10)</span>
                <span className="text-green-400 font-semibold">10経験値</span>
              </li>
              <li className="flex items-center justify-between">
                <span>⚡ 強化草パワー(-25)</span>
                <span className="text-yellow-400 font-semibold">30経験値 (1.2倍!)</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center">
              📈 レベルアップ
            </h4>
            <p className="mb-3 text-sm">
              経験値が一定値に達するとUMAがレベルアップします：
            </p>
            <ul className="space-y-1 text-sm bg-gray-800 rounded-lg p-3">
              <li>• レベル2: 10経験値</li>
              <li>• レベル3: 22経験値（累積）</li>
              <li>• レベル50: 約2,500経験値（累積）</li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center">
              💪 高レベル育成
            </h4>
            <p className="text-sm">
              レベル10以降は経験値獲得効率が少し下がりますが、より強力なUMAに成長します！
            </p>
          </div>

          <div className="text-center pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors duration-300"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceHelpModal;