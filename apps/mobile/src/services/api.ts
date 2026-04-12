import axios from 'axios';
import { getToken } from './auth';
import Constants from 'expo-constants';

let API_URL = 'http://10.0.2.2:3000/api';
if (process.env.EXPO_PUBLIC_API_URL) {
  API_URL = process.env.EXPO_PUBLIC_API_URL;
} else if (__DEV__ && Constants.expoConfig?.hostUri) {
  const host = Constants.expoConfig.hostUri.split(':')[0];
  API_URL = `http://${host}:3000/api`;
}

export { API_URL };

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
