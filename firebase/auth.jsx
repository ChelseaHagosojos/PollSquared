import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { app } from "./firebaseConfig"; // Ensure correct path
import { getFirestore, doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

const auth = getAuth(app);
const db = getFirestore(app);

export const registerUser = async (email, password, username) => {
  try {
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Temporarily store user data in local state (backend logic can be added here)
    const userData = {
      username,
      email,
      createdAt: new Date(),
      verified: false, // Track email verification status
    };

    // Register user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Ensure authentication is synced before proceeding
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Send email verification
    await sendEmailVerification(user);

    // Store user data in Firestore **AFTER** authentication is complete
    await setDoc(doc(db, "users", user.uid), userData);

    return user;
  } catch (error) {
    throw error;
  }
};
