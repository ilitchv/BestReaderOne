
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { localDbService } from '../services/localDbService';

// Define User Interface (Extensible for Firebase User later)
export interface User {
    id: string;
    email: string;
    name: string;
    balance: number;
    pendingBalance: number;
    role: 'user' | 'admin';
    status?: 'active' | 'suspended';
    avatarUrl?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Init: Check for persisted session
    useEffect(() => {
        const storedUser = localStorage.getItem('beast_user_session');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Session parse error", e);
                localStorage.removeItem('beast_user_session');
            }
        }
        setLoading(false);
    }, []);

    // --- REAL-TIME SYNC (THE HEARTBEAT) ---
    // This allows the user's balance to update automatically if the Admin changes it
    // while the user is still logged in.
    useEffect(() => {
        if (!user) return;

        const syncInterval = setInterval(() => {
            // 1. Fetch fresh data from the "Server" (Local DB)
            const allUsers = localDbService.getUsers();
            const freshUser = allUsers.find(u => u.id === user.id);

            if (freshUser) {
                // 2. Check for discrepancies (Money or Status)
                const hasBalanceChanged = freshUser.balance !== user.balance;
                const hasPendingChanged = freshUser.pendingBalance !== user.pendingBalance;
                const hasStatusChanged = freshUser.status !== user.status;

                // 3. Update State if needed
                if (hasBalanceChanged || hasPendingChanged || hasStatusChanged) {
                    console.log(`♻️ Syncing User Data: Balance ${user.balance} -> ${freshUser.balance}`);
                    setUser(freshUser);
                    localStorage.setItem('beast_user_session', JSON.stringify(freshUser));
                }
            } else {
                // Edge case: User was deleted by admin while logged in
                logout();
            }
        }, 2000); // Check every 2 seconds for snappier updates

        return () => clearInterval(syncInterval);
    }, [user]); // Re-establish listener if user object reference changes

    const login = async (email: string, pass: string): Promise<boolean> => {
        // --- REAL MOCK LOGIC (LOCAL DB) ---
        return new Promise((resolve) => {
            setTimeout(() => {
                // Get fresh list of users from the service
                const users = localDbService.getUsers();
                // Find matching user (Case insensitive email, sensitive password)
                const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);

                if (foundUser) {
                    setUser(foundUser);
                    localStorage.setItem('beast_user_session', JSON.stringify(foundUser));
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 800); // Simulate network delay
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('beast_user_session');
        // Clear specific app settings if needed, but keep tickets/results for now
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
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
