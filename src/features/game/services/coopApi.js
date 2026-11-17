// HTTP client for the co-op multiplayer rooms (server/coop.js).
import { request } from './gameApi';

const path = (code, suffix = '') => `/coop/rooms/${encodeURIComponent(String(code || '').toUpperCase())}${suffix}`;

export const coopApi = {
  createRoom: (token, body) => request('POST', '/coop/rooms', { token, body }),
  myRooms: (token) => request('GET', '/coop/rooms/mine', { token }),
  getRoom: (token, code) => request('GET', path(code), { token }),
  joinRoom: (token, code, body) => request('POST', path(code, '/join'), { token, body }),
  reportProgress: (token, code, body) => request('POST', path(code, '/progress'), { token, body }),
  claim: (token, code) => request('POST', path(code, '/claim'), { token }),
  leave: (token, code) => request('POST', path(code, '/leave'), { token }),
  leaderboard: (token, limit = 20) => request('GET', `/coop/leaderboard?limit=${limit}`, { token }),
};
