import { apiClient } from './api';

interface SignResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

interface UploadFileOptions {
  onProgress?: (percent: number) => void;
}

export async function uploadFile(
  file: File,
  folder = 'stories',
  options?: UploadFileOptions,
): Promise<string> {
  const { data } = await apiClient.post<{ success: boolean; data: SignResponse }>(
    '/api/upload/sign',
    { folder },
  );

  const { signature, timestamp, apiKey, cloudName, folder: signedFolder } = data.data;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', signedFolder);

  const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options?.onProgress) {
        return;
      }

      const percent = Math.round((event.loaded / event.total) * 100);
      options.onProgress(percent);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as { secure_url: string });
        } catch {
          reject(new Error('Upload failed'));
        }
        return;
      }

      try {
        const parsed = JSON.parse(xhr.responseText) as { error?: { message?: string } };
        reject(new Error(parsed.error?.message ?? 'Upload failed'));
      } catch {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Upload failed'));
    };

    xhr.send(formData);
  });

  return result.secure_url;
}
