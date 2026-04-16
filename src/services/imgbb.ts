export const uploadImageToImgBB = async (file: File): Promise<string> => {
  const apiKey = (import.meta as any).env.VITE_IMGBB_API_KEY;
  
  if (!apiKey) {
    console.error("ImgBB API Key is missing in environment variables");
    throw new Error("ImgBB API kaliti topilmadi. Iltimos, VITE_IMGBB_API_KEY ni sozlamalarga qo'shing.");
  }

  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ImgBB API response not OK:", response.status, errorText);
      throw new Error(`Server xatosi: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.data.url;
    } else {
      const errorMsg = data.error?.message || 'Rasmni yuklashda xatolik yuz berdi';
      console.error("ImgBB API Success False:", errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    console.error("ImgBB upload catch block:", error);
    throw error;
  }
};
