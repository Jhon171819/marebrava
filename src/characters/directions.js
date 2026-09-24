export const DIRECTIONS = ['right','down-right','down','down-left','left','up-left','up','up-right'];
export function directionIndex(angle) {
  return ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
}
export function directionView(index) {
  return ['profile','front-diagonal','front','front-diagonal','profile','back-diagonal','back','back-diagonal'][index];
}
