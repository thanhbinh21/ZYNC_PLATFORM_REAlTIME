import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';
import Constants from 'expo-constants';

let SOCKET_URL = 'http://10.0.2.2:3000';
if (process.env.EXPO_PUBLIC_SOCKET_URL) {
  SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;
} else if (__DEV__ && Constants.expoConfig?.hostUri) {
  const host = Constants.expoConfig.hostUri.split(':')[0];
  SOCKET_URL = `http://${host}:3000`;
}

export { SOCKET_URL };

let socket: Socket | null = null;

export const socketService = {
  connect: async () => {
    if (socket?.connected) return;

    const token = await getToken();
    if (!token) return;

    socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket: () => socket,
};
