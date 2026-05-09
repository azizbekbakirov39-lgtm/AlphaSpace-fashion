import { auth, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { toast } from 'sonner';
import { getApiBaseUrl } from '../utils/mediaUtils';

export const uploadToFirebase = async (file: File, folder: string): Promise<string> => {
  const extension = file.name.split('.').pop() || (file.type.startsWith('video') ? 'mp4' : 'jpg');
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  const fileRef = ref(storage, fileName);
  const result = await uploadBytes(fileRef, file, { contentType: file.type });
  return await getDownloadURL(result.ref);
};

export const uploadToR2 = async (file: File, folder: string = 'uploads'): Promise<string> => {
  const formData = new FormData();
  formData.append('files', file, file.name);
  formData.append('folder', folder);

  const response = await fetch(`${getApiBaseUrl()}/api/media-hub`, { 
    method: 'POST', 
    body: formData 
  });

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.error || errorMessage;
    } catch (e) {
      if (response.status === 413) {
        errorMessage = "Fayl hajmi juda katta (Server cheklovi). Kamroq hajmdagi fayl yuklang.";
      }
    }
    
    if (errorMessage.includes("R2 is not configured") || errorMessage.includes("sozlanmagan")) {
      throw new Error("R2_NOT_CONFIGURED");
    }
    throw new Error(errorMessage);
  }

  let data;
  const text = await response.text();
  if (!text) {
    throw new Error(`Empty response from server. Status: ${response.status}`);
  }
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse R2 upload response as JSON. Status:", response.status, "Text snippet:", text.substring(0, 500));
    throw new Error(`Failed to parse response as JSON. Status: ${response.status}`);
  }

  if (data.urls && data.urls.length > 0) {
    return data.urls[0].url;
  }
  
  throw new Error("No URL returned from server");
};

export const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
  try {
    // Only use R2 as requested
    return await uploadToR2(file, folder);
  } catch (error: any) {
    console.error("R2 upload error:", error);
    
    if (error.message === "R2_NOT_CONFIGURED") {
      toast.error("Cloudflare R2 sozlanmagan. Iltimos, Secret sozlamalarini tekshiring.");
    } else {
      toast.error(`Faylni yuklab bo'lmadi: ${error.message}`);
    }
    
    throw error;
  }
};

