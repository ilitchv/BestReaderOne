
import React from 'react';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onClose?: () => void;
  onHome?: () => void;
}

const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onClose, onHome }) => {
  return (
    <header className="flex justify-between items-center p-4 bg-light-card/80 dark:bg-dark-card/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-pink flex items-center justify-center shadow-neon-sm">
            <span className="font-bold text-black text-xs">BR</span>
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-pink tracking-tight">
            Beast Reader
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        {onHome && (
            <button 
                onClick={onHome}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors text-xs font-bold text-gray-700 dark:text-gray-300"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Home
            </button>
        )}

        {/* Professional Theme Toggle */}
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

        {/* Close Button - Windows Style / Discrete */}
        {onClose && (
            <button
                onClick={onClose}
                className="group w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-red-500 hover:rotate-90"
                aria-label="Close Playground"
                title="Close"
            >
                <svg className="text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors" data-lucide="x" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;
