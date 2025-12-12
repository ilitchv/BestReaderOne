
import React from 'react';

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
    const isDark = theme === 'dark';

    return (
        <div 
            onClick={toggleTheme} 
            role="button" 
            aria-label="Toggle Theme"
            className={`relative w-[52px] h-[28px] rounded-full border cursor-pointer flex items-center p-[2px] transition-colors duration-500 ease-in-out ${
                isDark 
                ? 'bg-slate-800 border-white/10' 
                : 'bg-slate-200 border-slate-300'
            }`}
        >
            {/* Background Icons (Track) */}
            <div className="absolute inset-0 flex justify-between items-center px-1.5 text-[12px] pointer-events-none select-none">
                <span className={`transition-opacity duration-500 ${isDark ? 'opacity-30' : 'opacity-100'}`}>☀</span>
                <span className={`transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-30'}`}>☾</span>
            </div>

            {/* Sliding Thumb */}
            <div 
                className={`w-[22px] h-[22px] rounded-full shadow-md flex items-center justify-center transform transition-transform duration-500 cubic-bezier(0.4, 0.0, 0.2, 1) ${
                    isDark 
                    ? 'translate-x-[24px] bg-slate-900 text-yellow-400' 
                    : 'translate-x-0 bg-white text-amber-500'
                }`}
            >
                {isDark ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                )}
            </div>
        </div>
    );
};

export default ThemeToggle;
