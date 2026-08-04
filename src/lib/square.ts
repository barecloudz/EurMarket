export const squareAppId = import.meta.env.VITE_SQUARE_APP_ID || '';
export const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID || '';

if (!squareAppId) {
  console.warn('[Square] App ID not found. Set VITE_SQUARE_APP_ID in environment variables.');
}
if (!squareLocationId) {
  console.warn('[Square] Location ID not found. Set VITE_SQUARE_LOCATION_ID in environment variables.');
}
