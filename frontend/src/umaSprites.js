// UMAドット絵スプライト データ
// 各UMAの名前をキーとして、Base64エンコードされたGIFデータを格納

export const umaSprites = {
  'ツチノコ': null
};

// UMA名からファイル名を生成する関数
export const getUmaSprite = (umaName) => {
  // publicフォルダの画像を参照
  return `/sprites/${umaName}_ドット.png`;
};

// ドット絵表示用のスタイル
export const pixelStyle = {
  imageRendering: 'pixelated',
  width: '48px',
  height: '48px',
  objectFit: 'contain'
};

export const pixelStyleLarge = {
  imageRendering: 'pixelated',
  width: '64px',
  height: '64px',
  objectFit: 'contain'
};