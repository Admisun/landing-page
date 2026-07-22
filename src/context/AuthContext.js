"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to create user doc in Firestore if it doesn't exist
  const createUserDocument = async (userAuth, additionalData = {}) => {
    if (!userAuth) return;
    
    const userRef = doc(db, "users", userAuth.uid);
    try {
      const snapShot = await getDoc(userRef);

      if (!snapShot.exists()) {
        const { email, displayName, photoURL } = userAuth;
        const createdAt = serverTimestamp();
        
        await setDoc(userRef, {
          email,
          displayName: displayName || "",
          photoURL: photoURL || "",
          createdAt,
          ...additionalData
        });
      }
      return userRef;
    } catch (error) {
      console.warn("Firestore access warning: Could not read/write user document. Check your Firestore Security Rules.", error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      try {
        if (userAuth) {
          await createUserDocument(userAuth);
          setUser(userAuth);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth state change error", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Try to add additional info like name to Firestore, but don't crash signup if Firestore fails
    try {
      await createUserDocument(userCredential.user, { displayName: name });
    } catch (fsErr) {
      console.warn("Could not save signup info to Firestore", fsErr);
    }
    
    try {
      await sendEmailVerification(userCredential.user);
    } catch (verifyErr) {
      console.warn("Could not send email verification", verifyErr);
    }
    return userCredential;
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await createUserDocument(result.user);
    return result;
  };

  const logout = () => {
    return signOut(auth);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signup, 
      login, 
      loginWithGoogle, 
      logout, 
      resetPassword 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
