import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  increment,
  Timestamp,
  limit,
  startAfter,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  uploadBytesResumable 
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

// Auth Helpers
export const googleProvider = new GoogleAuthProvider();

// IMPORTANT: Requires "YOUR_SERVER_CLIENT_ID" in capacitor.config.ts / strings.xml 
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize({
    clientId: '692431917555-2ut6tiqfbuplb78shl5r6tnr9sv31bph.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

let isAuthInProgress = false;

export const signInWithGoogle = async () => {
  if (isAuthInProgress) {
    console.warn("Sign-in already in progress");
    return null; // Ignore duplicate calls
  }
  
  isAuthInProgress = true;
  try {
    if (Capacitor.isNativePlatform()) {
      const googleUser = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    }
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    if (error.code === 'auth/popup-blocked') {
      alert("Please allow popups for this site to sign in with Google.");
      return null;
    } else if (error.code === 'auth/cancelled-popup-request') {
      console.warn("Popup request was cancelled.");
      return null;
    } else if (error.code === 'auth/network-request-failed') {
      alert("Network request failed. Please check your internet connection.");
      return null;
    }
    throw error;
  } finally {
    isAuthInProgress = false;
  }
};

export const logout = () => signOut(auth);

export const registerWithEmail = (email: string, pass: string) => 
  createUserWithEmailAndPassword(auth, email, pass);

export const loginWithEmail = (email: string, pass: string) => 
  signInWithEmailAndPassword(auth, email, pass);

export const resetPassword = (email: string) => 
  sendPasswordResetEmail(auth, email);

export const updateUserName = async (name: string) => {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: name });
    // Also sync with firestore users collection
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName: name });
  }
};

// Custom Auth State Changed
export { onAuthStateChanged };

// Firestore Exports
export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
  limit,
  startAfter,
  getDocFromServer,
  writeBatch
};

// Storage Exports
export {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable
};

// Error Handler
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
async function testConnection() {
  await new Promise(resolve => setTimeout(resolve, 2000));
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
