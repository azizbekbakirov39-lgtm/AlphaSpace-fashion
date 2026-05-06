import { auth, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { toast } from 'sonner';

export const uploadToFirebase = async (file: File, folder: string): Promise<string> => {
  const extension = file.name.split('.').pop() || (file.type.startsWith('video') ? 'mp4' : 'jpg');
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  const fileRef = ref(storage, fileName);
  const result = await uploadBytes(fileRef, file);
  return await getDownloadURL(result.ref);
};

export const uploadToR2 = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('files', file, file.name);

  const response = await fetch('/api/upload-to-r2', { 
    method: 'POST', 
    body: formData 
  });

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data.error || errorMessage;
    } catch (e) {
      // If response is not JSON (e.g. HTML), we just keep the status-based error
    }
    
    if (errorMessage.includes("R2 is not configured")) {
      throw new Error("R2_NOT_CONFIGURED");
    }
    throw new Error(errorMessage);
  }

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error(`Failed to parse response as JSON. Status: ${response.status}`);
  }

  if (data.urls && data.urls.length > 0) {
    return data.urls[0].url;
  }
  
  throw new Error("No URL returned from server");
};

export const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
  try {
    // Try R2 first
    return await uploadToR2(file);
  } catch (error: any) {
    console.error("R2 upload error, falling back to Firebase:", error);
    try {
      return await uploadToFirebase(file, folder);
    } catch (fbError: any) {
      console.error("Firebase upload error:", fbError);
      toast.error("Faylni yuklab bo'lmadi.");
      throw new Error("Faylni yuklab bo'lmadi.");
    }
  }
};

