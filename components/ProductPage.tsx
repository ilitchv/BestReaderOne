
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
    const { login, isAuthenticated } = useAuth();
    
    // Login State
    const [email, setEmail] = useState('user@demo.com');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const yearSpan = document.getElementById('prod-year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear().toString();
        }
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            const success = await login(email, password);
            if (!success) {
                setError("Invalid credentials. Try user@demo.com / 123456");
            }
            // If success, the MainApp useEffect will detect auth change and redirect to Dashboard
        } catch (err) {
            setError("Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnterPlaygroundClick = () => {
        if (isAuthenticated) {
            onOpenPlayground();
        } else {
            // Iron Gate: Scroll to login section
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
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                             {t.btnHome}
                        </button>
                    </div>
                    
                    <div className="flex gap-3 items-center">
                        <div className="flex gap-1 bg-gray-200 dark:bg-white/5 p-1 rounded-lg">
                            <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${language === 'en' ? 'bg-white dark:bg-neon-cyan text-black shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>EN</button>
                            <button onClick={() => setLanguage('es')} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${language === 'es' ? 'bg-white dark:bg-neon-cyan text-black shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>ES</button>
                            <button onClick={() => setLanguage('ht')} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${language === 'ht' ? 'bg-white dark:bg-neon-cyan text-black shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>HT</button>
                        </div>
                        
                        {/* Professional Theme Toggle */}
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
                            {t.prodHeroTitle} <br/>
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

                    {/* Right Content: High Fidelity 3D Preview */}
                    <div className="relative perspective-[1500px] group">
                         {/* Galactic 3D Container */}
                         <div className="relative w-full max-w-md mx-auto bg-light-card dark:bg-[#0a0a0a] rounded-[26px] p-4 sm:p-6 border-t border-white/60 dark:border-white/10 border-b-[8px] border-gray-300 dark:border-black/50 shadow-2xl transform rotate-y-[-5deg] rotate-x-[5deg] group-hover:rotate-0 group-hover:-translate-y-2 transition-all duration-700 ease-out">
                             
                             {/* Header of the Fake App */}
                             <div className="flex justify-between items-center mb-4 opacity-80">
                                 <div className="flex gap-2 items-center">
                                     <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                     <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                     <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                 </div>
                                 <div className="text-[10px] font-mono text-gray-400">PLAYGROUND v2.5</div>
                             </div>

                             {/* Track Selectors (Visual Mockup) */}
                             <div className="grid grid-cols-4 gap-2 mb-4">
                                 <div className="aspect-square rounded-xl bg-gradient-to-b from-blue-400 to-blue-600 border-b-4 border-black/20 shadow-lg"></div>
                                 <div className="aspect-square rounded-xl bg-gradient-to-b from-blue-400 to-blue-600 border-b-4 border-black/20 shadow-lg opacity-50 scale-90"></div>
                                 <div className="aspect-square rounded-xl bg-gradient-to-br from-red-500 to-red-700 border-b-4 border-black/20 shadow-lg"></div>
                                 <div className="aspect-square rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 border-b-4 border-black/20 shadow-lg opacity-50 scale-90"></div>
                             </div>

                             {/* Actions Panel (Visual Mockup) */}
                             <div className="bg-white/5 dark:bg-white/5 rounded-xl p-2 mb-4 border border-gray-200 dark:border-white/5">
                                 <div className="flex justify-between gap-2">
                                     <div className="h-8 w-full rounded-lg bg-gradient-to-b from-blue-400 to-blue-600 shadow-sm"></div>
                                     <div className="h-8 w-full rounded-lg bg-gradient-to-b from-purple-400 to-purple-600 shadow-sm"></div>
                                     <div className="h-8 w-full rounded-lg bg-gradient-to-b from-orange-400 to-orange-600 shadow-sm"></div>
                                     <div className="h-8 w-full rounded-lg bg-gradient-to-b from-green-400 to-green-600 shadow-sm"></div>
                                 </div>
                             </div>

                             {/* Table (Visual Mockup) */}
                             <div className="bg-white dark:bg-[#151515] rounded-xl p-3 border border-gray-200 dark:border-white/5 space-y-2">
                                 <div className="flex justify-between text-[10px] text-gray-400 border-b border-gray-200 dark:border-white/10 pb-1">
                                     <span>BET</span><span>MODE</span><span>STR</span><span>BOX</span>
                                 </div>
                                 <div className="flex justify-between text-xs font-mono items-center">
                                     <span className="bg-gray-100 dark:bg-white/10 px-1 rounded">1234</span>
                                     <span className="text-gray-500">Win 4</span>
                                     <span>$1.00</span>
                                     <span>$0.50</span>
                                 </div>
                                 <div className="flex justify-between text-xs font-mono items-center">
                                     <span className="bg-gray-100 dark:bg-white/10 px-1 rounded">56-99</span>
                                     <span className="text-gray-500">Palé</span>
                                     <span>$5.00</span>
                                     <span>$0.00</span>
                                 </div>
                                 <div className="flex justify-between text-xs font-mono items-center opacity-50">
                                     <span className="bg-gray-100 dark:bg-white/10 px-1 rounded">----</span>
                                     <span className="text-gray-500">-</span>
                                     <span>$0.00</span>
                                     <span>$0.00</span>
                                 </div>
                             </div>
                             
                             {/* Total Bar */}
                             <div className="mt-4 bg-gradient-to-r from-neon-cyan to-neon-pink p-[1px] rounded-xl">
                                 <div className="bg-white dark:bg-black rounded-[11px] p-3 flex justify-between items-center">
                                     <span className="text-[10px] font-bold tracking-widest text-gray-500">GRAND TOTAL</span>
                                     <span className="text-lg font-bold text-gray-900 dark:text-white">$294.00</span>
                                 </div>
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t.feat1Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t.feat1Body}</p>
                        </div>

                        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform">
                             <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t.feat2Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t.feat2Body}</p>
                        </div>

                        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform">
                             <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{t.feat3Title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{t.feat3Body}</p>
                        </div>

                        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg hover:-translate-y-1 transition-transform">
                             <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
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
                        
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="text-left">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{t.labelEmail}</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg p-3 focus:border-neon-cyan outline-none transition-colors" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="text-left">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">{t.labelPass}</label>
                                <input 
                                    type="password" 
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg p-3 focus:border-neon-cyan outline-none transition-colors" 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            
                            {/* CHECKBOX ADDED */}
                            <div className="flex items-center gap-2 text-left">
                                <input 
                                    type="checkbox" 
                                    id="rememberMe" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-neon-cyan focus:ring-neon-cyan"
                                />
                                <label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">{t.labelRemember}</label>
                            </div>

                            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

                            <button type="submit" disabled={isLoading} className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-pink text-black font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50">
                                {isLoading ? 'Verifying...' : t.btnSignIn}
                            </button>
                        </form>
                        <p className="text-[10px] text-gray-400 mt-6">{t.loginFooter}</p>
                    </div>
                 </div>
            </section>

            <footer className="py-8 text-center text-xs text-gray-500 border-t border-gray-200 dark:border-white/5">
                <span id="prod-year"></span> {t.footerRights}
            </footer>
        </div>
    );
};

export default ProductPage;
