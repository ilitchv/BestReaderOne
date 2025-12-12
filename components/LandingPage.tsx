
import React, { useEffect, useState } from 'react';
import { translations } from '../constants/translations';
import ThemeToggle from './ThemeToggle';
import ResultsDashboard from './ResultsDashboard';

interface LandingPageProps {
    onNavigateToProduct: () => void;
    onNavigateToResults: () => void;
    language: 'en' | 'es' | 'ht';
    setLanguage: (lang: 'en' | 'es' | 'ht') => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    onAdminAccess?: () => void; // New Prop
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToProduct, onNavigateToResults, language, setLanguage, theme, toggleTheme, onAdminAccess }) => {
    const t = translations[language];
    const isDark = theme === 'dark';
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const yearSpan = document.getElementById('year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear().toString();
        }
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }

    const handleAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === '198312') {
            setIsAdminModalOpen(false);
            setPin('');
            setError('');
            if (onAdminAccess) onAdminAccess();
        } else {
            setError('Access Denied');
            setPin('');
        }
    };

    // Dynamic Colors based on Theme State - UPDATED TO NAVY
    const bgGradient = isDark 
        ? 'radial-gradient(circle at top left, #1e293b 0, #0f172a 45%, #020617 100%)' // Navy Gradient
        : 'radial-gradient(circle at top left, #fff7ed 0, #fff1f2 45%, #ffffff 100%)';
    
    const textColor = isDark ? '#f1f5f9' : '#111827';
    const textMuted = isDark ? '#94a3b8' : '#6b7280';
    
    const cardBg = isDark 
        ? 'radial-gradient(circle at top left, #1e293b, #0f172a 70%)' // Navy Card
        : 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)';
        
    const headerBg = isDark
        ? 'linear-gradient(to bottom, rgba(11,17,33,0.96), rgba(11,17,33,0.78), transparent)' // Navy Header
        : 'linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(255,255,255,0.85), transparent)';
        
    const borderColor = isDark ? 'rgba(51,65,85,0.6)' : 'rgba(229,231,235,1)'; // Slate border

    const styles = `
        :root {
          --accent-cyan: #00f5ff;
          --accent-pink: #ff00ff;
          --accent-yellow: #ffd54a;
          --accent-green: #00d68f;
          --radius-lg: 18px;
          --radius-xl: 26px;
          --shadow-soft: ${isDark ? '0 18px 45px rgba(0,0,0,0.4)' : '0 18px 45px rgba(0,0,0,0.1)'};
          --transition-fast: 0.22s ease-out;
          --max-width: 1120px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: ${bgGradient} !important;
          color: ${textColor} !important;
          min-height: 100vh;
          transition: background 0.3s ease, color 0.3s ease;
        }
        a { text-decoration: none; color: inherit; }
        img { max-width: 100%; display: block; }
        .page { width: 100%; padding: 18px 16px 40px; }
        .page-inner { max-width: var(--max-width); margin: 0 auto; }
        .landing-header {
          position: sticky; top: 0; z-index: 40;
          backdrop-filter: blur(14px);
          background: ${headerBg};
          transition: background 0.3s ease;
        }
        .header-inner {
          max-width: var(--max-width); margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px 12px; gap: 14px;
        }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-mark {
          width: 32px; height: 32px; border-radius: 12px;
          background: conic-gradient(from 180deg, var(--accent-cyan), var(--accent-pink), var(--accent-yellow), var(--accent-cyan));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 18px rgba(0,245,255,0.55);
        }
        .brand-mark span { font-size: 17px; font-weight: 700; color: #020617; }
        .brand-text { display: flex; flex-direction: column; line-height: 1.1; }
        .brand-name {
          font-weight: 800; font-size: 18px; letter-spacing: 0.02em;
          background: linear-gradient(90deg, var(--accent-cyan), var(--accent-pink));
          -webkit-background-clip: text; color: transparent;
        }
        .brand-tagline { font-size: 12px; color: ${textMuted}; }
        .nav { display: none; align-items: center; gap: 18px; font-size: 13px; }
        .nav a { opacity: 0.8; transition: opacity var(--transition-fast), transform var(--transition-fast); }
        .nav a:hover { opacity: 1; transform: translateY(-1px); }
        .nav-cta { display: flex; align-items: center; gap: 10px; }
        .btn {
          border-radius: 999px; padding: 8px 16px; font-size: 13px; font-weight: 600;
          border: none; cursor: pointer; display: inline-flex; align-items: center;
          justify-content: center; gap: 8px;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          white-space: nowrap;
        }
        .btn-primary {
          background: linear-gradient(90deg, var(--accent-cyan), var(--accent-pink));
          color: #020617; box-shadow: 0 10px 26px rgba(0,0,0,0.55);
        }
        .btn-primary:hover { transform: translateY(-1px) scale(1.01); box-shadow: 0 18px 40px rgba(0,0,0,0.65); }
        .btn-ghost { background: transparent; color: ${textColor}; border: 1px solid rgba(148,163,184,0.6); }
        .btn-ghost:hover { background: rgba(148,163,184,0.12); }
        
        /* Lang Switcher */
        .lang-switch {
            display: flex; gap: 4px; align-items: center;
            background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; padding: 4px; border-radius: 8px;
        }
        .lang-btn.active {
            background: var(--accent-cyan); color: #000; box-shadow: 0 0 10px rgba(0,245,255,0.4);
        }
        .lang-btn {
            font-size: 11px; font-weight: 700; color: ${textMuted};
            padding: 4px 6px; border-radius: 6px; border: none; background: transparent; cursor: pointer;
            transition: all 0.2s;
        }

        .hero { text-align: center; padding: 26px 0 40px; }
        .hero-main-title {
          font-size: clamp(28px, 6vw, 42px); font-weight: 800; letter-spacing: 0.01em;
          margin-bottom: 12px; max-width: 720px; margin-inline: auto;
        }
        .hero-main-title span.highlight {
          background: linear-gradient(90deg, var(--accent-cyan), var(--accent-pink), var(--accent-yellow));
          -webkit-background-clip: text; color: transparent;
        }
        .hero-subtitle { font-size: 15px; color: ${textMuted}; max-width: 620px; line-height: 1.5; margin-inline: auto; }
        .hero-cta-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center; margin: 20px 0; }
        
        section { padding: 28px 0 16px; }
        .section-header { margin-bottom: 20px; text-align: center; }
        .eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: ${textMuted}; }
        .section-title { font-size: clamp(22px, 5vw, 28px); font-weight: 700; max-width: 600px; margin-inline: auto; margin-top: 8px; }
        .section-subtitle { font-size: 14px; color: ${textMuted}; max-width: 580px; margin-inline: auto; margin-top: 8px; }
        .card-grid { display: grid; grid-template-columns: minmax(0,1fr); gap: 14px; }
        .card {
          border-radius: var(--radius-lg); padding: 14px 16px 18px;
          background: ${cardBg};
          border: 1px solid ${borderColor}; box-shadow: var(--shadow-soft);
        }
        .card-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: ${textMuted}; margin-bottom: 6px; }
        .card-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
        .card-body { font-size: 13px; color: ${textMuted}; line-height: 1.5; }
        .card-cta { margin-top: 12px; }
        .landing-footer {
          margin-top: 22px; font-size: 11px; color: ${textMuted};
          border-top: 1px solid ${borderColor}; padding-top: 12px;
          display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: center;
        }
        .landing-footer a { text-decoration: underline; text-decoration-style: dotted; }
        @media (min-width: 768px) {
          .nav { display: flex; }
          .nav-cta-mobile { display: none !important; }
          .card-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }
    `;

    return (
        <div id="top">
            {/* Inject dynamic styles based on theme state */}
            <style dangerouslySetInnerHTML={{ __html: styles }} />
            
            <header className="landing-header">
                <div className="header-inner">
                <a href="#" onClick={(e) => e.preventDefault()} className="brand">
                    <div className="brand-mark"><span>BR</span></div>
                    <div className="brand-text">
                    <div className="brand-name">Beast Reader Lotto</div>
                    <div className="brand-tagline">Resultados y Estrategia</div>
                    </div>
                </a>
                <nav className="nav">
                    {/* UPDATED: Trigger ResultsPage instead of scrolling */}
                    <a href="#results" onClick={(e) => { e.preventDefault(); onNavigateToResults(); }}>{t.navResults}</a>
                    <a href="#tools" onClick={(e) => { e.preventDefault(); scrollTo('tools'); }}>{t.navTools}</a>
                    <a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo('faq'); }}>{t.navHelp}</a>
                </nav>
                <div className="nav-cta">
                    {/* Language Switcher */}
                    <div className="lang-switch">
                        <button onClick={() => setLanguage('en')} className={`lang-btn ${language === 'en' ? 'active' : ''}`}>EN</button>
                        <button onClick={() => setLanguage('es')} className={`lang-btn ${language === 'es' ? 'active' : ''}`}>ES</button>
                        <button onClick={() => setLanguage('ht')} className={`lang-btn ${language === 'ht' ? 'active' : ''}`}>HT</button>
                    </div>
                    
                    {/* Shared Theme Toggle */}
                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                </div>
                </div>
            </header>

            <main className="page">
                <div className="page-inner">
                <section className="hero">
                    <div className="hero-main-title">
                    {t.heroTitle} <span className="highlight">{t.heroTitleHighlight}</span>
                    </div>
                    <p className="hero-subtitle">
                    {t.heroSubtitle}
                    </p>
                    <div className="hero-cta-row">
                    <button onClick={onNavigateToProduct} className="btn btn-primary">
                        {t.ctaAccess}
                    </button>
                    <button className="btn btn-ghost" onClick={() => scrollTo('tools')}>
                        {t.ctaViewTools}
                    </button>
                    </div>
                </section>

                <section id="results">
                    {/* Replaced inline dashboard with CTA to full dashboard */}
                    <div className="text-center py-8">
                        <h3 className="text-xl font-bold mb-4 text-[var(--text)]">Latest Live Results</h3>
                        <ResultsDashboard />
                        <div className="mt-6">
                            <button onClick={onNavigateToResults} className="btn btn-ghost border-2 border-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-black">
                                View Full Ultimate Dashboard →
                            </button>
                        </div>
                    </div>
                </section>

                <section id="tools">
                    <div className="section-header">
                    <div className="eyebrow">Premium</div>
                    <h2 className="section-title">{t.premiumTitle}</h2>
                    <p className="section-subtitle">
                        {t.premiumSubtitle}
                    </p>
                    </div>
                    <div className="card-grid">
                    <div className="card">
                        <div className="card-kicker">Sim + AI</div>
                        <div className="card-title">{t.cardPlaygroundTitle}</div>
                        <p className="card-body">
                        {t.cardPlaygroundBody}
                        </p>
                        <div className="card-cta">
                        <button onClick={onNavigateToProduct} className="btn btn-ghost">{t.btnOpenPlayground}</button>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-kicker">Pro</div>
                        <div className="card-title">{t.cardGenTitle}</div>
                        <p className="card-body">
                        {t.cardGenBody}
                        </p>
                        <div className="card-cta">
                        <button className="btn btn-ghost" disabled>{t.btnComingSoon}</button>
                        </div>
                    </div>
                    </div>
                </section>

                <footer className="landing-footer">
                    <div className="flex items-center gap-4">
                        <span>© <span id="year"></span> {t.footerRights}</span>
                        {/* New Admin Access Link */}
                        <button onClick={() => setIsAdminModalOpen(true)} className="opacity-60 hover:opacity-100 hover:text-[var(--accent-pink)] transition-colors text-[10px] uppercase tracking-wider font-bold border border-transparent hover:border-[var(--accent-pink)] px-2 py-0.5 rounded-full">
                            Admin Access
                        </button>
                    </div>
                    <span>
                    <a href="#top" onClick={(e) => { e.preventDefault(); scrollTo('top'); }}>Top</a>
                    </span>
                </footer>
                </div>
            </main>

            {/* PIN MODAL */}
            {isAdminModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-4 text-center">Admin Gatekeeper</h3>
                        <form onSubmit={handleAdminSubmit} className="space-y-4">
                            <input 
                                type="password" 
                                autoFocus
                                placeholder="Enter PIN" 
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                className="w-full bg-black/50 border border-slate-600 rounded-lg p-3 text-center text-xl tracking-widest text-white focus:border-neon-cyan outline-none"
                            />
                            {error && <p className="text-red-500 text-center text-sm animate-pulse">{error}</p>}
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setIsAdminModalOpen(false)} className="bg-slate-700 text-white py-2 rounded-lg font-bold hover:bg-slate-600">Cancel</button>
                                <button type="submit" className="bg-gradient-to-r from-neon-cyan to-blue-600 text-white py-2 rounded-lg font-bold hover:brightness-110">Unlock</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LandingPage;
