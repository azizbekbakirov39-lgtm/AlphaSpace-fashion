import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithCustomToken,
  User as FirebaseUser 
} from 'firebase/auth';

import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp, 
  orderBy, 
  limit, 
  getDocFromServer, 
  increment 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, uploadBytesResumable, getDownloadURL, uploadString } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { safeJsonStringify } from './utils/jsonUtils';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const messaging = getMessaging(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await signInWithRedirect(auth, googleProvider);
      return null; // The app will reload and we'll handle the user in onAuthStateChanged
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error: any) {
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      return null;
    }
    console.error("Error signing in with Google", error.message || error);
    throw error;
  }
};

export const logout = () => signOut(auth);
export const loginWithCustomToken = (token: string) => signInWithCustomToken(auth, token);

// Email/Password Helpers
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const updateUserName = (name: string) => {
  if (auth.currentUser) {
    return updateProfile(auth.currentUser, { displayName: name });
  }
  return Promise.reject("No user logged in");
};

// Firestore Error Handling Spec
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Ignore offline/unavailable network errors safely without throwing
  if (
    error?.code === 'unavailable' || 
    errorMessage.toLowerCase().includes('offline') || 
    errorMessage.toLowerCase().includes('could not reach cloud firestore')
  ) {
    console.warn(`[Firebase] Client is temporarily offline or cannot reach backend. Client will cache and retry. Path: ${path}`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  const serializedErrorInfo = safeJsonStringify(errInfo);
  console.error('Firestore Error: ', serializedErrorInfo);
  throw new Error(serializedErrorInfo);
}

export { 
  collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, orderBy, limit, increment 
};

export { ref, uploadBytes, uploadBytesResumable, getDownloadURL, uploadString };

export const requestNotificationPermission = async (uid?: string) => {
  if (!('Notification' in window)) {
    console.log('This browser does not support desktop notification');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn("VITE_FIREBASE_VAPID_KEY yo'q. .env fayliga VAPID kalitni qo'shing.");
        return null;
      }
      
      const currentToken = await getToken(messaging, { vapidKey });
      if (currentToken) {
        console.log('FCM Token olindi:', currentToken);
        // Bu tokenni backend (Firestore) ga saqlashingiz mumkin
        if (uid) {
           try {
             await updateDoc(doc(db, 'users', uid), { fcmToken: currentToken });
           } catch (e: any) {
             console.error("Tokenni firestore ga saqlashda xatolik:", e.message || e);
           }
        }
        return currentToken;
      } else {
        console.log('Token olinmadi.');
        return null;
      }
    } else {
      console.log('Bildirishnomalarga ruxsat berilmadi.');
      return null;
    }
  } catch (error: any) {
    console.error('Bildirishnomalarga ruxsat so\'rashda xatolik:', error.message || error);
    return null;
  }
};

export { onMessage };