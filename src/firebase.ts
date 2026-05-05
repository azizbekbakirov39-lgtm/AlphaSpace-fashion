import { authService, dbService, storageService } from './services/apiService';

export { storageService };

// Mimic Firebase Auth
export const auth = {
  currentUser: null as any,
  onAuthStateChanged: (callback: (user: any) => void) => {
    // Initial check
    authService.getMe().then(user => {
      auth.currentUser = user;
      callback(user);
    });
    return () => {}; // Unsubscribe mock
  },
  signOut: async () => {
    await authService.logout();
    auth.currentUser = null;
  }
};

export const signInWithGoogle = async () => {
  // Mock Google sign-in since we don't have Firebase anymore
  // In a real app, you'd use OAuth integration (see oauth skill)
  console.warn("Google sign-in is not implemented in custom auth yet. Use email/password.");
  return null;
};

export const logout = () => auth.signOut();
export const loginWithCustomToken = async (token: string) => {}; 

export const registerWithEmail = (email: string, pass: string) => authService.register(email, pass);
export const loginWithEmail = (email: string, pass: string) => authService.login(email, pass);
export const resetPassword = async (email: string) => {};
export const updateUserName = async (name: string) => {
  if (auth.currentUser) {
    const updated = { ...auth.currentUser, displayName: name };
    await dbService.setDoc(`users/${auth.currentUser.email}`, updated);
    auth.currentUser = updated;
    return;
  }
  throw new Error("No user logged in");
};

// Mimic Firestore
export const db = {}; // Dummy db object

export const collection = (db: any, path: string) => path;
export const doc = (db: any, collection: string, id: string) => `${collection}/${id}`;

export const getDoc = async (path: string) => dbService.getDoc(path);
export const getDocs = async (collectionRef: string) => dbService.getDocs(collectionRef);
export const setDoc = async (path: string, data: any) => dbService.setDoc(path, data);
export const addDoc = async (path: string, data: any) => dbService.addDoc(path, data);
export const updateDoc = async (path: string, data: any) => dbService.updateDoc(path, data);
export const deleteDoc = async (path: string) => dbService.deleteDoc(path);

// Alias Timestamp
export const Timestamp = {
  now: () => ({
    toMillis: () => Date.now(),
    toDate: () => new Date(),
    toISOString: () => new Date().toISOString()
  }),
  fromDate: (date: Date) => ({
    toMillis: () => date.getTime(),
    toDate: () => date,
    toISOString: () => date.toISOString()
  })
};

export const uploadBytesResumable = (ref: string, file: File) => {
  // Simple mock
  let progress = 0;
  const listeners: any[] = [];
  const task = {
    on: (evt: string, next: any) => {
      listeners.push(next);
      // Simulate progress
      setTimeout(() => {
        progress = 100;
        next({ bytesTransferred: 100, totalBytes: 100 });
      }, 500);
    },
    then: (cb: any) => {
      storageService.uploadFile(file).then(url => cb({ ref, url }));
    }
  };
  return task;
};

// Real-time listener mock (polling for now to keep it simple while removing Firebase)
export const onSnapshot = (pathOrQuery: any, onNext: (snapshot: any) => void, onError?: (err: any) => void) => {
  const poll = async () => {
    try {
      if (typeof pathOrQuery === 'string') {
        const snap = await dbService.getDocs(pathOrQuery);
        onNext(snap);
      } else {
        // Handle query objects if needed
      }
    } catch (e) {
      if (onError) onError(e);
    }
  };

  poll();
  const interval = setInterval(poll, 10000); // Poll every 10s
  return () => clearInterval(interval);
};

export const query = (col: string, ...constraints: any[]) => col;
export const where = (field: string, op: string, val: any) => ({ field, op, val });
export const orderBy = (field: string, dir: string) => ({ field, dir });
export const limit = (n: number) => ({ limit: n });
export const serverTimestamp = () => Timestamp.now();
export const increment = (n: number) => (current: number) => (current || 0) + n;

// Mimic Storage
export const storage = {}; 
export const ref = (storage: any, path: string) => path;
export const uploadBytes = async (ref: string, file: File) => {
  const url = await storageService.uploadFile(file);
  return { ref, url };
};
export const getDownloadURL = async (uploadRes: any) => uploadRes.url;

export const requestNotificationPermission = async () => null;
export const onMessage = () => () => {};
export const messaging = {};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
export function handleFirestoreError(error: any, op: any, path: any) {
  console.error("Custom DB Error:", error, op, path);
}

export type User = any;
