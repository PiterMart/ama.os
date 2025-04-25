'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('AuthProvider - Initializing');
        
        // Check for existing session
        const checkSession = async () => {
            try {
                console.log('AuthProvider - Checking session');
                const response = await fetch('/api/auth/session');
                const data = await response.json();
                console.log('AuthProvider - Session check result:', data);
                
                if (data.user) {
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('AuthProvider - Session check failed:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        // Set up Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('AuthProvider - Firebase auth state changed:', firebaseUser?.uid);
            
            if (firebaseUser) {
                try {
                    // Check for Firestore profile
                    const response = await fetch('/api/auth/session');
                    const data = await response.json();
                    console.log('AuthProvider - Session check after auth change:', data);
                    
                    if (data.user) {
                        setUser(data.user);
                    } else {
                        // If no Firestore profile, sign out
                        console.log('AuthProvider - No Firestore profile, signing out');
                        await auth.signOut();
                        setUser(null);
                    }
                } catch (error) {
                    console.error('AuthProvider - Session check failed:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        });

        checkSession();
        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        console.log('AuthProvider - Login attempt for:', email);
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log('AuthProvider - Login response:', data);

            if (response.ok) {
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('AuthProvider - Login failed:', error);
            return { success: false, error: 'Login failed' };
        }
    };

    const logout = async () => {
        console.log('AuthProvider - Logout attempt');
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
            });
            await auth.signOut();
            setUser(null);
        } catch (error) {
            console.error('AuthProvider - Logout failed:', error);
        }
    };

    const value = {
        user,
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
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