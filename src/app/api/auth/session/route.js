import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const sessionCookie = cookies().get('session')?.value;
        
        if (!sessionCookie) {
            return NextResponse.json({ user: null });
        }

        // Verify the session token with Firebase
        const decodedToken = await auth.verifyIdToken(sessionCookie);
        const uid = decodedToken.uid;

        // Get the user's Firestore profile
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (!userDoc.exists()) {
            // If no Firestore profile exists, force logout
            cookies().delete('session');
            return NextResponse.json({ user: null });
        }

        // Return user data with Firestore profile
        return NextResponse.json({
            user: {
                uid,
                email: decodedToken.email,
                ...userDoc.data()
            }
        });
    } catch (error) {
        console.error('Session check failed:', error);
        // Clear invalid session
        cookies().delete('session');
        return NextResponse.json({ user: null });
    }
} 