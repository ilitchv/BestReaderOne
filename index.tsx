
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import PlaygroundApp from './PlaygroundApp';
import LandingPage from './components/LandingPage';
import ProductPage from './components/ProductPage';
import ResultsPage from './components/ResultsPage';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TicketData } from './types';

type ViewState = 'HOME' | 'PRODUCT' | 'PLAYGROUND' | 'RESULTS' | 'ADMIN' | 'USER_DASHBOARD';
type Language = 'en' | 'es' | 'ht';

const MainAppContent: React.FC = () => {
    // 1. INITIALIZE VIEW FROM STORAGE TO PREVENT FLASH
    const [view, setView] = useState<ViewState>(() => {
        const saved = localStorage.getItem('beast_last_view');
        // Only restore valid views
        if (saved && ['HOME', 'PRODUCT', 'PLAYGROUND', 'RESULTS', 'ADMIN', 'USER_DASHBOARD'].includes(saved)) {
            return saved as ViewState;
        }
        return 'HOME';
    });

    const [language, setLanguage] = useState<Language>('en');
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const { isAuthenticated, user, logout, loading } = useAuth(); // ADDED LOADING

    // Playback State
    const [playbackTicket, setPlaybackTicket] = useState<TicketData | null>(null);

    // PERSIST VIEW STATE
    useEffect(() => {
        if (view) {
            localStorage.setItem('beast_last_view', view);
        }
    }, [view]);

    // SYNC THEME
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    // 2. SMART REDIRECT & PROTECTION LOGIC
    useEffect(() => {
        if (loading) return; // Wait for session check

        // If NOT authenticated but trying to access protected areas -> Redirect to Product (Login)
        if (!isAuthenticated) {
            if (['PLAYGROUND', 'USER_DASHBOARD', 'ADMIN'].includes(view)) {
                setView('PRODUCT');
            }
        }

        // If AUTHENTICATED but on "Guest" pages -> Redirect to Dashboard (Restore Session)
        // Only if the user didn't explicitly choose to go there (we can't easily know "explicit" vs "default" here without more state, 
        // allows "Sticky Session". If I am logged in, and I reload on HOME, should I stay on Home? 
        // User Request: "always maintained logged in unless explicitly logout".
        // If they are on HOME and hit refresh, staying on HOME is fine. 
        // BUT if they just logged in fresh, we want Dashboard. 
        // This existing logic handles "If I am on Product Page, go to Dashboard".
        else if (isAuthenticated && view === 'PRODUCT') {
            setView('USER_DASHBOARD');
        }
    }, [isAuthenticated, loading, view]);

    // Lock body scroll
    useEffect(() => {
        if (view === 'PLAYGROUND' || view === 'ADMIN') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [view]);

    const handleOpenPlayground = () => {
        if (!isAuthenticated) {
            setView('PRODUCT');
            return;
        }
        setPlaybackTicket(null);
        setView('PLAYGROUND');
    };

    const handleClosePlayground = () => {
        setPlaybackTicket(null);
        if (isAuthenticated) {
            setView('USER_DASHBOARD');
        } else {
            setView('PRODUCT');
        }
    };

    // Smart Navigation
    const handleNavigateToProduct = () => {
        if (isAuthenticated) {
            setView('USER_DASHBOARD');
        } else {
            setView('PRODUCT');
        }
    };

    const handleNavigateToResults = () => setView('RESULTS');
    const handleBackToHome = () => setView('HOME');
    const handleAdminAccess = () => setView('ADMIN');

    // Real Logout Action
    const handleUserLogout = () => {
        logout();
        localStorage.removeItem('beast_last_view'); // Clear history
        setView('HOME');
    };

    const handlePlayback = (ticket: TicketData) => {
        setPlaybackTicket(ticket);
        setView('PLAYGROUND');
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // 3. LOADING SCREEN (PREVENT FLASH)
    if (loading) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin mx-auto"></div>
                    <p className="text-neon-cyan font-mono animate-pulse">VERIFYING SESSION...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {view === 'HOME' && (
                <LandingPage
                    onNavigateToProduct={handleNavigateToProduct}
                    onNavigateToResults={handleNavigateToResults}
                    language={language}
                    setLanguage={setLanguage}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    onAdminAccess={handleAdminAccess}
                />
            )}

            {view === 'RESULTS' && (
                <ResultsPage
                    onBack={handleBackToHome}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
            )}

            {view === 'PRODUCT' && (
                <ProductPage
                    onOpenPlayground={handleOpenPlayground}
                    onBack={handleBackToHome}
                    language={language}
                    setLanguage={setLanguage}
                    theme={theme}
                    toggleTheme={toggleTheme}
                />
            )}

            {view === 'USER_DASHBOARD' && (
                <UserDashboard
                    onOpenPlayground={handleOpenPlayground}
                    onLogout={handleUserLogout}
                    onHome={handleBackToHome}
                    onPlayback={handlePlayback}
                />
            )}

            {view === 'PLAYGROUND' && (
                <div className="fixed inset-0 z-50 bg-light-bg dark:bg-dark-bg overflow-y-auto">
                    <PlaygroundApp
                        onClose={handleClosePlayground}
                        onHome={isAuthenticated ? () => setView('USER_DASHBOARD') : handleBackToHome}
                        language={language}
                        initialTicket={playbackTicket}
                    />
                </div>
            )}

            {view === 'ADMIN' && (
                <div className="fixed inset-0 z-50 bg-gray-900 overflow-y-auto">
                    <AdminDashboard onClose={handleBackToHome} />
                </div>
            )}
        </>
    );
};

import ErrorBoundary from './components/ErrorBoundary';

const MainApp: React.FC = () => (
    <AuthProvider>
        <ErrorBoundary>
            <MainAppContent />
        </ErrorBoundary>
    </AuthProvider>
);

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <MainApp />
        </React.StrictMode>
    );
}
