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
        // Track start time for minimum loading duration
        const startTime = Date.now();
        // Match LoadingScreen animation duration (9000ms) + fadeOut (500ms) = 9500ms
        const minLoadingTime = 9600; // Minimum loading time in milliseconds (slightly longer than LoadingScreen)
        let timeoutId = null;
        let isMounted = true;
        
        // Set up Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setFirebaseUser(firebaseUser);
            
            if (firebaseUser) {
                try {
                    // Get Firestore profile
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    
                    if (userDoc.exists()) {
                        const userData = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            ...userDoc.data()
                        };
                        if (isMounted) {
                            setUser(userData);
                            setError(null);
                        }
                    } else {
                        await signOut(auth);
                        if (isMounted) {
                            setUser(null);
                            setError('User profile not found. Please register first.');
                        }
                    }
                } catch (error) {
                    console.error('AuthProvider - Profile check failed:', error);
                    if (isMounted) {
                        setError(error.message || 'Authentication failed');
                        setUser(null);
                    }
                }
            } else {
                if (isMounted) {
                    setUser(null);
                    setError(null);
                }
            }
            
            // Ensure minimum loading time for aesthetic purposes
            if (isMounted) {
                const elapsedTime = Date.now() - startTime;
                const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
                
                timeoutId = setTimeout(() => {
                    if (isMounted) {
                        setLoading(false);
                    }
                }, remainingTime);
            }
        });

        return () => {
            isMounted = false;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
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