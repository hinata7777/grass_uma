console.log('UMA Sprite for ツチノコ:', getUmaSprite('ツチノコ'));
// UMAドット絵スプライト データ
// 各UMAの名前をキーとして、Base64エンコードされたGIFデータを格納

export const umaSprites = {
  'ツチノコ': 'data:image/gif;base64,R0lGODlhEAAQAPIAAAAAAP///wAAAPDw8Obm5tzc3MjIyL6+viwAAAAAEAAQAAADJgi63P4wykmrvTjrzbv/YCiOZGmeaKqubOu+cCzPdG3feK7vfO8LAQA7'
};

// UMA名からファイル名を生成する関数
export const getUmaSprite = (umaName) => {
  return umaSprites[umaName] || null;
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