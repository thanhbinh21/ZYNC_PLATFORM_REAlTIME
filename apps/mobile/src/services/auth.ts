import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'zync_access_token';

export async function saveToken(token: string) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token', error);
  }
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token', error);
    return null;
  }
}

export async function removeToken() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token', error);
  }
}
