import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { cookies } from 'next/headers';

export async function POST(request) {
    try {
        const { email, password } = await request.json();
        
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check for Firestore profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            // If no Firestore profile exists, sign out and return error
            await auth.signOut();
            return NextResponse.json(
                { error: 'No user profile found. Please register first.' },
                { status: 401 }
            );
        }

        // Create session cookie
        const idToken = await user.getIdToken();
        cookies().set('session', idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 5 // 5 days
        });

        // Return user data with Firestore profile
        const userData = {
            uid: user.uid,
            email: user.email,
            ...userDoc.data()
        };
        return NextResponse.json({ user: userData });
    } catch (error) {
        console.error('Login failed:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 401 }
        );
    }
} 