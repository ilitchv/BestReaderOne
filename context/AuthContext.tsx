import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../config/firebaseClient';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
            if (user) {
                console.log("User Logged In:", user.email);
                // TODO: Backend Handshake triggers here
            }
        });
        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const value = {
        currentUser,
        loading,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
