import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play } from '../types';
import { RESULTS_CATALOG } from '../constants';
import { useLiveAudioContext } from '../contexts/LiveAudioContext';

interface SmartPaperModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (plays: Play[], tracks: string[]) => void;
    currentLanguage?: 'en' | 'es' | 'ht';
}

const SmartPaperModal: React.FC<SmartPaperModalProps> = ({ isOpen, onClose, onApply, currentLanguage = 'en' }) => {
    const [slateText, setSlateText] = useState('');
    const [chatReply, setChatReply] = useState('');
    const [selectedModalTrack, setSelectedModalTrack] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [showAssistant, setShowAssistant] = useState(false);
    const [parsedPreview, setParsedPreview] = useState<Play[] | null>(null);
    const [detectedTracksPreview, setDetectedTracksPreview] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Filter and Sort Tracks
    const sortedTracks = React.useMemo(() => {
        const priorityOrder = ['Georgia', 'New Jersey', 'Pennsylvania', 'Florida', 'Connecticut', 'New York'];

        return [...RESULTS_CATALOG]
            .filter(t => t.visible)
            .sort((a, b) => {
                const aPrio = priorityOrder.indexOf(a.lottery);
                const bPrio = priorityOrder.indexOf(b.lottery);

                if (aPrio !== -1 && bPrio !== -1) return aPrio - bPrio;
                if (aPrio !== -1) return -1;
                if (bPrio !== -1) return 1;

                return a.lottery.localeCompare(b.lottery);
            });
    }, []);

    const { isRecording, toggleVoice, isSpeaking, stopRecording } = useLiveAudioContext();

    // -- VOICE REAL-TIME DIGITIZATION --
    useEffect(() => {
        const handleVoiceUpdate = (e: any) => {
            const text = e.detail;
            if (text && isOpen) {
                // Append text with a newline if the current slate isn't empty
                setSlateText(prev => {
                    const separator = (prev === '' || prev.endsWith('\n')) ? '' : '\n';
                    return prev + separator + text;
                });

                // Keep the textarea scrolled to bottom as new text arrives
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                }
            }
        };

        window.addEventListener('voice-smart-paper-update', handleVoiceUpdate);
        return () => window.removeEventListener('voice-smart-paper-update', handleVoiceUpdate);
    }, [isOpen]);


    // Handle Paste
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setSlateText(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + text);
                setAiFeedback(null);
            }
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            setAiFeedback("Could not access clipboard. Please paste manually.");
        }
    };

    const handleParse = async (manualText?: string) => {
        const textToParse = manualText || slateText;
        if (!textToParse.trim()) return;

        setIsParsing(true);
        setAiFeedback(null);
        if (isRecording) stopRecording();

        try {
            const res = await fetch('/api/ai/parse-plays', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToParse })
            });

            const data = await res.json();

            if (res.ok) {
                if (data.feedback) {
                    setAiFeedback(data.feedback);
                    setShowAssistant(true);
                }

                if (data.plays && data.plays.length > 0) {
                    const mappedPlays: Play[] = data.plays.map((p: any, i: number) => ({
                        id: Date.now() + i,
                        betNumber: p.betNumber,
                        gameMode: p.gameMode || "Pick 3",
                        straightAmount: p.straightAmount || null,
                        boxAmount: p.boxAmount || null,
                        comboAmount: p.comboAmount || null
                    }));

                    setParsedPreview(mappedPlays);
                    setDetectedTracksPreview(data.detectedTracks || []);
                } else if (!data.feedback) {
                    setAiFeedback("No valid plays found in the text.");
                }
            } else {
                setAiFeedback(`Error: ${data.error || 'Parsing failed'} `);
            }
        } catch (error: any) {
            setAiFeedback("Connection error with AI Assistant.");
            console.error(error);
        } finally {
            setIsParsing(false);
        }
    };

    const handleConfirm = () => {
        if (!parsedPreview) return;
        const tracks = detectedTracksPreview.length > 0
            ? detectedTracksPreview
            : (selectedModalTrack ? [selectedModalTrack] : []);
        onApply(parsedPreview, tracks);
        setSlateText('');
        setParsedPreview(null);
        setAiFeedback(null);
        setShowAssistant(false);
    };

    const handleChatReply = () => {
        if (!chatReply.trim()) return;
        const context = parsedPreview
            ? `Current Plays: ${JSON.stringify(parsedPreview)}\nCommand: ${chatReply}`
            : slateText + "\n\n" + chatReply;

        setChatReply('');
        handleParse(context);
    };

    if (!isOpen) return null;

    const labels = {
        title: "SMART PAPER",
        subtitle: "AI ASSISTED ENTRY",
        placeholder: "Type or dictate your plays here...",
        process: "PROCESS",
        thinking: "THINKING...",
        assistantSays: "Assistant Says:",
        replyPlaceholder: "Ask the assistant to modify or clarify...",
        confirm: "CONFIRM PLAYS",
        reedit: "EDIT TEXT",
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
            <div className="bg-slate-900/90 w-full h-full md:h-[90vh] md:w-[90vw] md:max-w-6xl md:rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden">

                <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between pl-8 pr-4">
                    <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 py-2 pr-4 mr-4 border-r border-white/10">
                        {sortedTracks.map(track => {
                            const isSelected = selectedModalTrack === track.id;
                            return (
                                <button
                                    key={track.id}
                                    onClick={() => setSelectedModalTrack(isSelected ? null : track.id)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${isSelected
                                        ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                        } `}
                                >
                                    {track.lottery} {track.draw}
                                </button>
                            );
                        })}
                    </div>

                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all transition-transform active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className={`flex-1 px-8 pt-24 pb-8 flex flex-col relative ${(parsedPreview || showAssistant || aiFeedback) ? 'z-20' : 'z-0'} `}>
                    <textarea
                        ref={textareaRef}
                        value={slateText}
                        onChange={(e) => setSlateText(e.target.value)}
                        placeholder={labels.placeholder}
                        className="flex-1 w-full bg-transparent text-white/90 text-2xl md:text-4xl lg:text-5xl font-light outline-none resize-none placeholder-white/20 leading-relaxed custom-scrollbar"
                        spellCheck="false"
                    />

                    {parsedPreview && (
                        <div className="absolute inset-0 bg-slate-950 z-50 p-8 flex flex-col animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tighter">PREVIEW TICKET</h3>
                                    <p className="text-neon-cyan text-sm font-mono uppercase tracking-widest">Verify interpreted plays</p>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setParsedPreview(null)}
                                        className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10"
                                    >
                                        {labels.reedit}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        className="px-8 py-3 rounded-xl bg-neon-cyan text-black font-black tracking-widest hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)]"
                                    >
                                        {labels.confirm}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar border border-white/10 rounded-2xl bg-black/20">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-800 text-gray-400 text-xs uppercase tracking-widest font-bold">
                                        <tr>
                                            <th className="p-4 border-b border-white/5 text-center w-[10%]">#</th>
                                            <th className="p-4 border-b border-white/5 text-center w-[20%]">BET NUMBER</th>
                                            <th className="p-4 border-b border-white/5 text-center w-[25%]">GAME MODE</th>
                                            <th className="p-4 border-b border-white/5 text-center w-[15%]">STR</th>
                                            <th className="p-4 border-b border-white/5 text-center w-[15%]">BOX</th>
                                            <th className="p-4 border-b border-white/5 text-center w-[15%]">COMB</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-white">
                                        {parsedPreview.map((play, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 border-b border-white/5 transition-colors">
                                                <td className="p-4 text-center text-gray-500 font-mono">{idx + 1}</td>
                                                <td className="p-4 text-center text-xl font-bold text-neon-cyan">{play.betNumber}</td>
                                                <td className="p-4 text-center text-sm text-white/60">{play.gameMode}</td>
                                                <td className="p-4 text-center font-mono">${play.straightAmount || 0}</td>
                                                <td className="p-4 text-center font-mono">${play.boxAmount || 0}</td>
                                                <td className="p-4 text-center font-mono">${play.comboAmount || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {(aiFeedback || showAssistant) && (
                        <div className="absolute bottom-32 left-8 right-8 bg-black/60 border border-neon-cyan/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,255,255,0.1)] backdrop-blur-xl animate-in zoom-in-95 duration-300 z-50">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 bg-neon-cyan/20 rounded-full text-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-neon-cyan font-black tracking-tighter uppercase text-sm mb-1">{labels.assistantSays}</h4>
                                    <p className="text-white/90 text-lg md:text-xl leading-snug">{aiFeedback || "How can I help you adjust your plays?"}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setAiFeedback(null);
                                        setShowAssistant(false);
                                    }}
                                    className="p-2 text-gray-500 hover:text-white transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>

                            <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 focus-within:border-neon-cyan/50 transition-all">
                                <input
                                    type="text"
                                    value={chatReply}
                                    onChange={(e) => setChatReply(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleChatReply()}
                                    placeholder={labels.replyPlaceholder}
                                    className="flex-1 bg-transparent border-none outline-none text-white px-3"
                                />
                                <button
                                    onClick={handleChatReply}
                                    className="bg-neon-cyan text-black px-4 py-2 rounded-xl font-bold text-xs hover:bg-cyan-400 transition-all"
                                >
                                    REPLY
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-24 bg-black/40 border-t border-white/5 flex items-center justify-center gap-4 px-8 z-10 backdrop-blur-xl">
                    <button
                        onClick={toggleVoice}
                        className={`w - 16 h - 16 rounded - full flex items - center justify - center relative transition - all ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110' : 'bg-white/10 hover:bg-white/20'} ${isSpeaking ? 'animate-pulse' : ''} `}
                        title="Voice Agent (Gemini Live)"
                    >
                        {isSpeaking && (
                            <div className="absolute -top-2 -right-2 bg-neon-cyan w-4 h-4 rounded-full shadow-[0_0_10px_#0ff] animate-ping"></div>
                        )}
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRecording ? "text-white" : "text-gray-300"}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                    </button>

                    <button
                        onClick={handlePaste}
                        className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-gray-300"
                        title="Paste from clipboard"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                    </button>

                    <button
                        onClick={() => setShowAssistant(!showAssistant)}
                        className={`w - 16 h - 16 rounded - full flex items - center justify - center transition - all ${showAssistant ? 'bg-neon-cyan text-black shadow-[0_0_20px_rgba(0,255,255,0.4)]' : 'bg-white/10 hover:bg-white/20 text-gray-300'} `}
                        title="AI Assistant"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </button>

                    <button
                        onClick={() => {
                            setSlateText('');
                            setAiFeedback(null);
                        }}
                        className="w-16 h-16 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center transition-all text-gray-300"
                        title="Clear Slate"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>

                    <div className="flex-1"></div>

                    <button
                        onClick={() => handleParse()}
                        disabled={isParsing || !slateText.trim()}
                        className="h-16 px-8 rounded-full bg-gradient-to-r from-neon-cyan to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black tracking-widest text-lg flex items-center gap-3 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(0,255,255,0.3)] disabled:shadow-none"
                    >
                        {isParsing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                {labels.thinking}
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>
                                {labels.process}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartPaperModal;
