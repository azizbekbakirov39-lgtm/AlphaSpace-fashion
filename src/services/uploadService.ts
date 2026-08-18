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
  const fileType = file.type || 'application/octet-stream';

  // 1. Serverdan presigned URL olish (kichik so'rov, Vercel limitiga tushmaydi)
  const presignResponse = await fetch(`${getApiBaseUrl()}/api/get-r2-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, fileType: fileType, folder }),
  });

  if (!presignResponse.ok) {
    let errorMessage = `Presigned URL olishda xato: ${presignResponse.status}`;
    try {
      const data = await presignResponse.json();
      errorMessage = data.error || errorMessage;
      if (errorMessage.includes("sozlanmagan") || errorMessage.includes("R2")) {
        throw new Error("R2_NOT_CONFIGURED");
      }
    } catch (e: any) {
      if (e.message === "R2_NOT_CONFIGURED") throw e;
    }
    throw new Error(errorMessage);
  }

  const { uploadUrl, publicUrl } = await presignResponse.json();

  // 2. Faylni to'g'ridan-to'g'ri R2 ga yuklash (Vercel bypass — cheksiz hajm!)
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': fileType },
  });

  if (!uploadResponse.ok) {
    throw new Error(`R2 ga yuklashda xato: ${uploadResponse.status}`);
  }

  return publicUrl;
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

