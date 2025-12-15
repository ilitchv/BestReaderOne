import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define User Interface (Matches Server Model)
export interface User {
    id: string; // MongoDB _id
    email: string;
    name: string;
    balance: number;
    role: 'user' | 'admin';
    status?: 'active' | 'suspended';
}

interface AuthContextType {
    user: User | null;
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
    refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper to Fetch User Data
    const fetchUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/auth/me?userId=${userId}`, {
                headers: { 'x-user-id': userId }
            });
            if (res.ok) {
                const userData = await res.json();
                // Map _id to id for frontend consistency logic
                return { ...userData, id: userData.id || userData._id };
            }
        } catch (e) {
            console.error("Auth Fetch Error", e);
        }
        return null;
    };

    // Init: Check for persisted session
    useEffect(() => {
        const initAuth = async () => {
            const storedUserId = localStorage.getItem('beast_user_id');
            if (storedUserId) {
                const userData = await fetchUser(storedUserId);
                if (userData) {
                    setUser(userData);
                } else {
                    localStorage.removeItem('beast_user_id'); // Invalid session
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // --- REAL-TIME SYNC (THE HEARTBEAT) ---
    // Polls the server every 5 seconds to keep balance updated
    useEffect(() => {
        if (!user) return;

        const syncInterval = setInterval(async () => {
            const freshUser = await fetchUser(user.id);
            if (freshUser) {
                if (freshUser.balance !== user.balance) {
                    console.log(`♻️ Syncing Balance: $${user.balance} -> $${freshUser.balance}`);
                    setUser(prev => prev ? { ...prev, balance: freshUser.balance } : freshUser);
                }
            } else {
                // Session invalid (e.g. user deleted)
                logout();
            }
        }, 5000);

        return () => clearInterval(syncInterval);
    }, [user?.id, user?.balance]); // Dep on primitives to avoid loops

    const login = async (email: string, pass: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pass })
            });

            if (res.ok) {
                const userData = await res.json();
                const normalizedUser = { ...userData, id: userData.id || userData._id };
                setUser(normalizedUser);
                localStorage.setItem('beast_user_id', normalizedUser.id);
                return true;
            }
        } catch (e) {
            console.error("Login Error", e);
        }
        return false;
    };

    const logout = () => {
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
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading, refreshBalance }}>
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
