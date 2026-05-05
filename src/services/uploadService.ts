import { auth, storageService } from '../firebase';
import { toast } from 'sonner';

export const uploadToR2 = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('files', file, file.name);

  const response = await fetch('/api/upload-to-r2', { 
    method: 'POST', 
    body: formData 
  });

  const data = await response.json();
  if (!response.ok) {
    if (data.error && data.error.includes("R2 is not configured")) {
      throw new Error("R2_NOT_CONFIGURED");
    }
    throw new Error(data.error || `Upload failed with status ${response.status}`);
  }

  if (data.urls && data.urls.length > 0) {
    return data.urls[0].url;
  }
  
  throw new Error("No URL returned from server");
};

export const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
  try {
    // Try R2
    return await uploadToR2(file);
  } catch (error: any) {
    console.error("R2 upload error:", error);
    toast.error("Faylni yuklab bo'lmadi. Iltimos, Cloudflare R2 sozlamalarini tekshiring.");
    throw new Error("Faylni yuklab bo'lmadi. R2 sozlanmagan bo'lishi mumkin.");
  }
};

