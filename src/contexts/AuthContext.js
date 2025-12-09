'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('AuthProvider - Initializing');
        
        // Set up Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('AuthProvider - Firebase auth state changed:', firebaseUser?.uid);
            setFirebaseUser(firebaseUser);
            
            if (firebaseUser) {
                try {
                    // Get Firestore profile
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    console.log('AuthProvider - Firestore profile exists:', userDoc.exists());
                    
                    if (userDoc.exists()) {
                        const userData = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            ...userDoc.data()
                        };
                        setUser(userData);
                        setError(null);
                    } else {
                        console.log('AuthProvider - No Firestore profile, signing out');
                        await signOut(auth);
                        setUser(null);
                        setError('User profile not found. Please register first.');
                    }
                } catch (error) {
                    console.error('AuthProvider - Profile check failed:', error);
                    setError(error.message || 'Authentication failed');
                    setUser(null);
                }
            } else {
                setUser(null);
                setError(null);
            }
            
            // Ensure minimum loading time for aesthetic purposes
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
            
            setTimeout(() => {
                setLoading(false);
            }, remainingTime);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        console.log('AuthProvider - Login attempt for:', email);
        try {
            setError(null);
            setLoading(true);
            
            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            
            // Get Firestore profile
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            
            if (!userDoc.exists()) {
                await signOut(auth);
                throw new Error('No user profile found. Please register first.');
            }
            
            const userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...userDoc.data()
            };
            
            setUser(userData);
            setFirebaseUser(firebaseUser);
            return { success: true };
        } catch (error) {
            console.error('AuthProvider - Login failed:', error);
            setError(error.message || 'Login failed');
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        console.log('AuthProvider - Logout attempt');
        try {
            setLoading(true);
            await signOut(auth);
            setUser(null);
            setFirebaseUser(null);
            setError(null);
        } catch (error) {
            console.error('AuthProvider - Logout failed:', error);
            setError('Logout failed');
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        firebaseUser,
        loading,
        error,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 