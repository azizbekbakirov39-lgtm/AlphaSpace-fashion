import axios from 'axios';
import { uploadFile } from './uploadService';

const api = axios.create({
  baseURL: '/api'
});

// Auth Helpers
export const authService = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token: string) => localStorage.getItem('auth_token'),
  clearToken: () => localStorage.removeItem('auth_token'),
  
  register: async (email: string, pass: string, name?: string) => {
    const res = await api.post('/auth/register', { email, password: pass, displayName: name });
    localStorage.setItem('auth_token', res.data.token);
    return res.data.user;
  },
  
  login: async (email: string, pass: string) => {
    const res = await api.post('/auth/login', { email, password: pass });
    localStorage.setItem('auth_token', res.data.token);
    return res.data.user;
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
  },
  
  getMe: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    try {
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.user;
    } catch (e) {
      localStorage.removeItem('auth_token');
      return null;
    }
  }
};

// DB Helpers (Mocking Firestore API for easier migration)
export const dbService = {
  getDocs: async (path: string) => {
    const collection = path.split('/')[0];
    const res = await api.get(`/db/${collection}`);
    return {
      docs: res.data.map((doc: any) => ({
        id: doc.uid || doc.id || doc.email,
        data: () => doc,
        exists: () => true
      }))
    };
  },
  
  getDoc: async (path: string) => {
    const parts = path.split('/');
    const collection = parts[0];
    const id = parts[1];
    try {
      const res = await api.get(`/db/${collection}/${id}`);
      return {
        id,
        data: () => res.data,
        exists: () => true
      };
    } catch (e: any) {
      if (e.response?.status === 404) {
        return { exists: () => false };
      }
      throw e;
    }
  },
  
  setDoc: async (path: string, data: any) => {
    const parts = path.split('/');
    const collection = parts[0];
    const id = parts[1];
    await api.post(`/db/${collection}/${id}`, data);
  },
  
  addDoc: async (path: string, data: any) => {
    const collection = path.split('/')[0];
    const id = crypto.randomUUID();
    await api.post(`/db/${collection}/${id}`, { ...data, id });
    return { id };
  },
  
  updateDoc: async (path: string, data: any) => {
    const parts = path.split('/');
    const collection = parts[0];
    const id = parts[1];
    // Fetch current data and merge (since R2 SET overwrites)
    const current = await dbService.getDoc(path);
    const merged = { ...(current.data() || {}), ...data };
    await api.post(`/db/${collection}/${id}`, merged);
  },
  
  deleteDoc: async (path: string) => {
    const parts = path.split('/');
    const collection = parts[0];
    const id = parts[1];
    await api.delete(`/db/${collection}/${id}`);
  }
};

// Storage Helpers
export const storageService = {
  uploadFile: async (file: File | Blob) => {
    return await uploadFile(file as File);
  }
};
