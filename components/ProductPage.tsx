import React, { useEffect, useState } from 'react';
import { translations } from '../constants/translations';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

interface ProductPageProps {
    onOpenPlayground: () => void;
    onBack: () => void;
    language: 'en' | 'es' | 'ht';
    setLanguage: (lang: 'en' | 'es' | 'ht') => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ProductPage: React.FC<ProductPageProps> = ({ onOpenPlayground, onBack, language, setLanguage, theme, toggleTheme }) => {
    const t = translations[language];
    const { loginWithGoogle, isAuthenticated } = useAuth();

    // Login State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const yearSpan = document.getElementById('prod-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear().toString();
        }
    }, []);

    // FIX: Auto-transition when authenticated
    useEffect(() => {
        if (isAuthenticated && isLoading) {
            setIsLoading(false);
            onOpenPlayground();
        }
    }, [isAuthenticated, isLoading, onOpenPlayground]);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            console.error(err);
            setError("Google Login failed");
            setIsLoading(false);
        }
    };

    const handleEnterPlaygroundClick = () => {
        if (isAuthenticated) {
            onOpenPlayground();
        } else {
            scrollTo('login-section');
        }
    };

    return (
        <div className="bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300 font-sans">

            {/* HEADER */}
            <header className="sticky top-0 z-40 backdrop-blur-xl bg-light-card/80 dark:bg-dark-card/80 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div onClick={onBack} className="cursor-pointer flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-pink flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                <span className="font-bold text-black text-xs">BR</span>
                            </div>
                            <span className="font-bold hidden sm:block text-gray-800 dark:text-white group-hover:text-neon-cyan transition-colors">Beast Reader</span>
                        </div>

                        {/* HOME BUTTON */}
                        <button onClick={onBack} className="ml-4 px-3 py-1.5 text-xs font-bold rounded-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            {t.btnHome}
                        </button>
                    </div>

                    <div className="flex gap-3 items-center">
                        <div className="flex gap-1 bg-gray-200 dark:bg-white/5 p-1 rounded-lg">
                            <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-neon-cyan text-black shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>EN</button>
                            <button onClick={() => setLanguage('es')} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${language === 'es' ? 'bg-white dark:bg-neon-cyan text-black shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>ES</button>
                            <button onClick={() => setLanguage('ht')} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${language === 'ht' ? 'bg-white dark:bg-neon-cyan text-black shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>HT</button>
                        </div>

                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                    </div>
                </div>
            </header>

            {/* HERO SECTION */}
            <section className="py-12 sm:py-20 px-4">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                    {/* Left Content */}
                    <div className="text-left space-y-6 animate-fade-in">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
                            {t.prodHeroTitle} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-pink">{t.prodHeroHighlight}</span>
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl leading-relaxed">
                            {t.prodHeroSubtitle}
                        </p>

                        <div className="flex flex-wrap gap-3 text-xs font-medium">
                            <div className="px-3 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30 text-green-700 dark:text-neon-green flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {t.prodBadgeBeta}
                            </div>
                            <div className="px-3 py-1.5 rounded-full bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300">
                                {t.prodBadgeFeatures}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <button onClick={handleEnterPlaygroundClick} className="px-8 py-4 rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink text-black font-bold text-lg shadow-lg shadow-neon-cyan/20 hover:shadow-neon-cyan/40 hover:-translate-y-1 transition-all duration-300 transform">
                                {t.prodCtaEnter}
                            </button>
                            <button onClick={() => scrollTo('how')} className="px-6 py-4 rounded-full text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium underline decoration-dotted underline-offset-4 transition-colors">
                                {t.prodCtaHow}
                            </button>
                        </div>
                    </div>

                    {/* Right Content: Preview */}
                    <div className="relative perspective-[1500px] group">
                        <div className="relative w-full max-w-md mx-auto bg-light-card dark:bg-[#0a0a0a] rounded-[26px] p-4 sm:p-6 border-t border-white/60 dark:border-white/10 border-b-[8px] border-gray-300 dark:border-black/50 shadow-2xl transform rotate-y-[-5deg] rotate-x-[5deg] group-hover:rotate-0 group-hover:-translate-y-2 transition-all duration-700 ease-out">
                            <div className="flex justify-between items-center mb-4 opacity-80">
                                <div className="flex gap-2 items-center">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <div className="text-[10px] font-mono text-gray-400">PLAYGROUND v2.5</div>
                            </div>
                            {/* Visual Content Placeholder */}
                            <div className="h-64 flex items-center justify-center text-gray-500 border border-dashed border-gray-700 rounded-xl">
                                Visual Preview
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES GRID */}
            <section className="py-20 bg-gray-50 dark:bg-white/5 border-y border-gray-200 dark:border-white/5">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="text-neon-cyan text-xs font-bold tracking-widest uppercase">{t.prodBadgeFeatures}</span>
                        <h2 className="text-3xl font-bold mt-2 mb-4">{t.featTitle}</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">{t.featSub}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t.feat1Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t.feat1Body}</p>
                        </div>

                        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" /><path d="M17.8 11.8 19 13" /><path d="M15 9h.01" /><path d="M17.8 6.2 19 5" /><path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" /></svg>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t.feat2Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t.feat2Body}</p>
                        </div>

                        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t.feat3Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t.feat3Body}</p>
                        </div>

                        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform">
                            <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></svg>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t.feat4Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t.feat4Body}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how" className="py-20">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold">{t.prodCtaHow}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="relative p-6 border-l-4 border-blue-500 bg-gray-50 dark:bg-white/5 rounded-r-xl">
                            <div className="absolute -left-3 top-6 w-6 h-6 bg-blue-500 rounded-full text-white flex items-center justify-center font-bold text-sm">1</div>
                            <h3 className="font-bold text-xl mb-2">{t.step1Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.step1Body}</p>
                        </div>
                        <div className="relative p-6 border-l-4 border-purple-500 bg-gray-50 dark:bg-white/5 rounded-r-xl">
                            <div className="absolute -left-3 top-6 w-6 h-6 bg-purple-500 rounded-full text-white flex items-center justify-center font-bold text-sm">2</div>
                            <h3 className="font-bold text-xl mb-2">{t.step2Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.step2Body}</p>
                        </div>
                        <div className="relative p-6 border-l-4 border-green-500 bg-gray-50 dark:bg-white/5 rounded-r-xl">
                            <div className="absolute -left-3 top-6 w-6 h-6 bg-green-500 rounded-full text-white flex items-center justify-center font-bold text-sm">3</div>
                            <h3 className="font-bold text-xl mb-2">{t.step3Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t.step3Body}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section className="py-20 bg-gray-50 dark:bg-white/5 border-y border-gray-200 dark:border-white/5">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">{t.faqTitle}</h2>
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm">
                            <h3 className="font-bold text-lg mb-2">{t.faq1Q}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{t.faq1A}</p>
                        </div>
                        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm">
                            <h3 className="font-bold text-lg mb-2">{t.faq2Q}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{t.faq2A}</p>
                        </div>
                        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm">
                            <h3 className="font-bold text-lg mb-2">{t.faq3Q}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{t.faq3A}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING / LOGIN SECTION WITH ID FOR SCROLLING */}
            <section className="py-24 px-4" id="login-section">
                <div className="max-w-md mx-auto text-center">
                    <span className="inline-block py-1 px-3 rounded-full bg-neon-pink/10 text-neon-pink text-xs font-bold mb-4">{t.prodBadgeBeta}</span>
                    <h2 className="text-4xl font-bold mb-2">{t.pricingTitle}</h2>
                    <p className="text-gray-500 mb-10">{t.pricingSubtitle}</p>

                    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-6 text-left">{t.loginTitle}</h3>

                        <div className="space-y-4">
                            <button
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full py-4 flex items-center justify-center gap-3 rounded-xl bg-white text-gray-800 font-bold text-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <span className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full"></span>
                                ) : (
                                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                                {isLoading ? 'Verifying...' : 'Sign in with Google'}
                            </button>

                            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                        </div>

                        <p className="text-[10px] text-gray-400 mt-6">{t.loginFooter}</p>
                    </div>
                </div>
            </section>

            <footer className="py-8 text-center text-xs text-gray-500 border-t border-gray-200 dark:border-white/5">
                <span id="prod-year">2025</span> {t.footerRights}
            </footer>
        </div>
    );
};

export default ProductPage;
