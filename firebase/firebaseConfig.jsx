import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth, 
  getReactNativePersistence 
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCPPGNicodOVf_P6ao18XF4OWTwKzoe6AQ",
  authDomain: "pollapp-se2g1.firebaseapp.com",
  projectId: "pollapp-se2g1",
  storageBucket: "pollapp-se2g1.firebasestorage.app",
  messagingSenderId: "907321394448",
  appId: "1:907321394448:web:d062d4dddf1053eed09195"
};

// Ensure Firebase is initialized
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Ensure Auth is initialized with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore instance
const db = getFirestore(app);

const storage = getStorage(app);

// Debug log to verify storage initialization
console.log("Firebase Storage initialized:", !!storage);

export { auth, db, storage };
export default app;
