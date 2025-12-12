
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
    const [view, setView] = useState<ViewState>('HOME');
    const [language, setLanguage] = useState<Language>('en');
    const [theme, setTheme] = useState<'light'|'dark'>('dark');
    const { isAuthenticated, user, logout } = useAuth();
    
    // Playback State: Holds ticket data to be loaded into Playground
    const [playbackTicket, setPlaybackTicket] = useState<TicketData | null>(null);

    // 1. SYNC THEME WITH DOM IMMEDIATELY
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [theme]);

    // 2. AUTO NAVIGATE LOGIC (CORRECTED)
    // Only redirect to dashboard if user is authenticated AND currently on the Login page (Product).
    // We REMOVED 'HOME' from here so users can actually visit the landing page while logged in.
    useEffect(() => {
        if (isAuthenticated && view === 'PRODUCT') {
            setView('USER_DASHBOARD');
        }
    }, [isAuthenticated, view]);

    // Lock body scroll when Playground or Admin is open
    useEffect(() => {
        if (view === 'PLAYGROUND' || view === 'ADMIN') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [view]);

    const handleOpenPlayground = () => {
        // IRON GATE PROTOCOL: Block access if not authenticated
        if (!isAuthenticated) {
            setView('PRODUCT');
            return;
        }
        setPlaybackTicket(null); // Clear any previous playback data
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
    
    // Smart Navigation: If logged in, skip login page and go straight to dashboard
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
        logout(); // 1. Clear Auth State
        setView('HOME'); // 2. Navigate Home
    };

    const handlePlayback = (ticket: TicketData) => {
        setPlaybackTicket(ticket);
        setView('PLAYGROUND');
    };
    
    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

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

const MainApp: React.FC = () => (
    <AuthProvider>
        <MainAppContent />
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
