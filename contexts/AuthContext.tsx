import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, googleProvider } from '../config/firebaseClient';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';

// Define User Interface (Matches Server Model)
export interface User {
    id: string; // MongoDB _id
    email: string;
    name: string;
    balance: number;
    role: 'user' | 'admin';
    status?: 'active' | 'suspended';
    networkEnabled?: boolean;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    loading: boolean;
    refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Backend Handshake: Exchange Firebase Token for Mongo User
    // Moved outside to be reusable
    const backendHandshake = async (firebaseUser: FirebaseUser) => {
        try {
            const token = await firebaseUser.getIdToken();
            const referralCode = localStorage.getItem('ref') || undefined; // Get stored referral

            const res = await fetch('/api/auth/firebase-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, referralCode })
            });

            if (res.ok) {
                const userData = await res.json();
                const normalizedUser = { ...userData, id: userData.id || userData._id };
                setUser(normalizedUser);
                localStorage.setItem('beast_user_id', normalizedUser.id);
            } else {
                const errText = await res.text();
                console.error("Backend Handshake Failed", errText);
                alert("Login Error: Backend Handshake Failed. " + errText); // DEBUG ALERT
                setUser(null);
            }
        } catch (error: any) {
            console.error("Handshake Error", error);
            alert("Login System Error: " + error.message); // DEBUG ALERT
            setUser(null);
        }
    };

    // Init: Listen to Firebase Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // console.log("Firebase User Detected:", firebaseUser.email);
                await backendHandshake(firebaseUser);
            } else {
                // console.log("No Firebase User");
                setUser(null);
                localStorage.removeItem('beast_user_id');
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Helper to Fetch User Data (Polling)
    const fetchUser = async (userId: string) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const res = await fetch(`/api/auth/me?userId=${userId}`, {
                headers: { 'x-user-id': userId },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const userData = await res.json();
                return { ...userData, id: userData.id || userData._id };
            }
        } catch (e) {
            console.error("Auth Fetch Error/Timeout", e);
        }
        return null;
    };

    // --- REAL-TIME SYNC (THE HEARTBEAT) ---
    useEffect(() => {
        if (!user) return;

        const syncInterval = setInterval(async () => {
            // Verify if Firebase session is still valid? 
            // onAuthStateChanged handles that generally, but we want fresh DB balance.
            const freshUser = await fetchUser(user.id);
            if (freshUser) {
                if (freshUser.balance !== user.balance || freshUser.networkEnabled !== user.networkEnabled) {
                    // console.log(`♻️ Syncing User Data`); // Reduce noise
                    setUser(prev => prev ? { ...prev, balance: freshUser.balance, networkEnabled: freshUser.networkEnabled } : freshUser);
                }
            } else {
                // Session invalid (e.g. user deleted)
                // Don't auto-logout here immediately to avoid blips, but logic suggests we should.
            }
        }, 5000);

        return () => clearInterval(syncInterval);
    }, [user?.id, user?.balance]);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        localStorage.removeItem('beast_user_id');
    };

    const refreshBalance = async () => {
        if (user) {
            const fresh = await fetchUser(user.id);
            if (fresh) setUser(fresh);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loginWithGoogle, logout, isAuthenticated: !!user, loading, refreshBalance }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
