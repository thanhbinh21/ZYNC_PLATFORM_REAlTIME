import { apiClient } from './api';

interface SignResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export async function uploadFile(file: File, folder = 'stories'): Promise<string> {
  const { data } = await apiClient.post<{ success: boolean; data: SignResponse }>(
    '/api/upload/sign',
    { folder },
  );

  const { signature, timestamp, apiKey, cloudName } = data.data;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  const resourceType = file.type.startsWith('video/') ? 'video' : 'image';

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    { method: 'POST', body: formData },
  );

  if (!res.ok) {
    throw new Error('Upload failed');
  }

  const result = await res.json() as { secure_url: string };
  return result.secure_url;
}
