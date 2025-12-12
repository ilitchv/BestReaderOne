
import React, { forwardRef } from 'react';
import { useSound } from '../hooks/useSound';

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    colorClasses: string;
    disabled?: boolean;
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(({ icon, label, onClick, colorClasses, disabled = false }, ref) => {
    // --- GALACTIC SLOT MACHINE 3D STYLE (Matched to TrackButton) ---
    const galacticBase = "group relative flex flex-col items-center justify-center rounded-2xl text-white font-bold transition-all duration-100 ease-out aspect-square isolate overflow-hidden";
    
    // "Normal" state: High profile, big shadow
    // UPDATED: Stronger top border and adjusted shadow for Light Mode visibility
    const galacticNormal = `
        transform hover:-translate-y-1 hover:scale-105
        border-t-2 border-white/60 dark:border-white/30 
        border-b-[6px] border-black/20 dark:border-black/50 
        shadow-[0_6px_0_rgba(0,0,0,0.25),0_10px_10px_rgba(0,0,0,0.15)]
        hover:shadow-[0_8px_0_rgba(0,0,0,0.25),0_0_20px_rgba(255,255,255,0.2)]
        active:translate-y-[6px] active:border-b-0 active:shadow-[inset_0_4px_12px_rgba(0,0,0,0.5)]
    `;

    // Disabled state: Low profile, grayed out
    const disabledClasses = "opacity-50 cursor-not-allowed grayscale filter border-b-[2px] border-black/20 translate-y-[4px] shadow-none";
    
    // Glass sheen overlay
    const glassOverlay = "absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 via-transparent to-black/10 pointer-events-none";

    const buttonClasses = `${galacticBase} ${colorClasses} ${disabled ? disabledClasses : galacticNormal}`;

    return (
        <button
            ref={ref}
            onClick={onClick}
            disabled={disabled}
            className={buttonClasses}
        >
            <div className={glassOverlay}></div>
            <div className="z-10 flex flex-col items-center justify-center transition-transform duration-100 group-active:scale-95">
                <div className="w-8 h-8 mb-1 drop-shadow-md">{icon}</div>
                <span className="text-xs text-center leading-tight drop-shadow-md">{label}</span>
            </div>
        </button>
    );
});
ActionButton.displayName = 'ActionButton';

interface ActionsPanelProps {
    onAddPlay: () => void;
    onDeleteSelected: () => void;
    onReset: () => void;
    onOpenOcr: () => void;
    onOpenWizard: () => void;
    onOpenChatbot: () => void;
    onGenerateTicket: () => void;
    isTicketGenerationDisabled: boolean;
    onPasteWagers: () => void;
    hasCopiedWagers: boolean;
    hasSelectedPlays: boolean;
    addPlayButtonRef: React.RefObject<HTMLButtonElement>;
}

const ActionsPanel: React.FC<ActionsPanelProps> = (props) => {
    const { 
        onAddPlay, onDeleteSelected, onReset, onOpenOcr, onOpenWizard, onOpenChatbot, onGenerateTicket, isTicketGenerationDisabled,
        onPasteWagers, hasCopiedWagers, hasSelectedPlays, addPlayButtonRef
    } = props;
    
    const { playSound } = useSound();

    // Wrapper to play specific sounds before the action
    const handleAction = (action: () => void, soundType: 'add' | 'delete' | 'open' | 'click' | 'pop') => {
        playSound(soundType);
        action();
    };

    // Updated colors to Gradients for 3D effect
    const actions = [
        {
            label: 'Add Play',
            icon: <svg data-lucide="plus-circle" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>,
            onClick: () => handleAction(onAddPlay, 'add'), // Distinct ADD sound
            color: 'bg-gradient-to-b from-blue-400 to-blue-700',
        },
        {
            label: 'Quick Wizard',
            icon: <svg data-lucide="magic-wand-2" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>,
            onClick: () => handleAction(onOpenWizard, 'open'), // Distinct OPEN sound
            color: 'bg-gradient-to-b from-purple-400 to-purple-700',
        },
        {
            label: 'Scan Ticket',
            icon: <svg data-lucide="scan-line" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>,
            onClick: () => handleAction(onOpenOcr, 'open'), // Distinct OPEN sound
            color: 'bg-gradient-to-b from-orange-400 to-orange-700',
        },
        {
            label: 'AI Assistant',
            icon: <svg data-lucide="message-circle" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>,
            onClick: () => handleAction(onOpenChatbot, 'open'), // Distinct OPEN sound
            color: 'bg-gradient-to-b from-cyan-400 to-cyan-700',
        },
         {
            label: 'Paste Wagers',
            icon: <svg data-lucide="clipboard-paste" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2Z"/><path d="M9 2v4h6V2"/><path d="M12 12v6"/><path d="M9 15h6"/></svg>,
            onClick: () => handleAction(onPasteWagers, 'pop'),
            color: 'bg-gradient-to-b from-gray-400 to-gray-600',
            disabled: !hasCopiedWagers || !hasSelectedPlays,
        },
        {
            label: 'Delete Sel.',
            icon: <svg data-lucide="trash-2" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>,
            onClick: () => handleAction(onDeleteSelected, 'delete'), // Distinct DELETE sound
            color: 'bg-gradient-to-b from-red-400 to-red-700',
        },
        {
            label: 'Reset All',
            icon: <svg data-lucide="rotate-cw" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>,
            onClick: () => handleAction(onReset, 'delete'), // Distinct DELETE sound
            color: 'bg-gradient-to-b from-yellow-400 to-yellow-600',
        },
        {
            label: 'Generate Ticket',
            icon: <svg data-lucide="ticket" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>,
            onClick: onGenerateTicket, // Note: No immediate sound here, logic handles it on success or error
            color: 'bg-gradient-to-b from-green-400 to-green-700',
            disabled: isTicketGenerationDisabled,
        },
    ];

    return (
        <div className="bg-light-card dark:bg-dark-card p-3 rounded-xl shadow-lg animate-fade-in">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {actions.map(action => (
                    <ActionButton
                        key={action.label}
                        icon={action.icon}
                        label={action.label}
                        onClick={action.onClick}
                        colorClasses={action.color}
                        disabled={action.disabled}
                        ref={action.label === 'Add Play' ? addPlayButtonRef : undefined}
                    />
                ))}
            </div>
        </div>
    );
};

export default ActionsPanel;
