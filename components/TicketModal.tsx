
import React, { useRef, useEffect } from 'react';
import type { Play, ServerHealth, WinningResult } from '../types';
import { calculateRowTotal } from '../utils/helpers';
import { calculateWinnings } from '../utils/prizeCalculator';
import { DEFAULT_PRIZE_TABLE } from '../constants'; // Using default prize table for visualization
import { useSound } from '../hooks/useSound';

declare var QRCode: any;
declare var html2canvas: any;
declare var jspdf: any;

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    plays: Play[];
    selectedTracks: string[];
    selectedDates: string[];
    grandTotal: number;
    isConfirmed: boolean;
    setIsConfirmed: (isConfirmed: boolean) => void;
    ticketNumber: string;
    setTicketNumber: (ticketNumber: string) => void;
    ticketImageBlob: Blob | null;
    setTicketImageBlob: (blob: Blob | null) => void;
    terminalId: string;
    cashierId: string;
    onSaveTicket: (ticketData: any) => void;
    isSaving: boolean;
    serverHealth: ServerHealth;
    lastSaveStatus: 'success' | 'error' | null;
    variant?: 'default' | 'admin' | 'results-only';
    resultsContext?: WinningResult[]; // Optional context for Admin/User view to calculate winnings
}

const TicketModal: React.FC<TicketModalProps> = ({ 
    isOpen, onClose, plays, selectedTracks, selectedDates, grandTotal, 
    isConfirmed, setIsConfirmed, ticketNumber, setTicketNumber, 
    ticketImageBlob, setTicketImageBlob, terminalId, cashierId,
    onSaveTicket, isSaving, serverHealth, lastSaveStatus,
    variant = 'default',
    resultsContext = []
}) => {
    const ticketContentRef = useRef<HTMLDivElement>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { playSound } = useSound();

    // Determine layout flags
    const showResultsOnly = variant === 'results-only';
    // Admin layout is used for both Admin and Results-Only views to show the data table
    const showAdminLayout = (variant === 'admin' && isConfirmed) || showResultsOnly;

    // Filter out Game Modes disguised as tracks for display
    // CORRECTION: 'New York Horses' is a legitimate track and should be displayed.
    const displayTracks = selectedTracks.filter(t => !['Venezuela', 'Pulito'].includes(t));

    // Generate a cryptographically secure, collision-resistant ID
    const generateSecureTicketId = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const length = 10;
        const randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);
        
        let result = 'T-';
        for (let i = 0; i < length; i++) {
            result += chars[randomValues[i] % chars.length];
        }
        return result;
    };

    useEffect(() => {
        if (isConfirmed && ticketNumber && qrCodeRef.current && !showResultsOnly) {
            qrCodeRef.current.innerHTML = '';
            new QRCode(qrCodeRef.current, {
                text: `Ticket #${ticketNumber}`,
                width: 128,
                height: 128,
            });
        }
    }, [isConfirmed, ticketNumber, showResultsOnly]);

    useEffect(() => {
        const modalElement = modalRef.current;
        if (isOpen && modalElement) {
            const handleWheel = (e: WheelEvent) => { e.stopPropagation(); };
            const handleTouchMove = (e: TouchEvent) => { e.stopPropagation(); };
            modalElement.addEventListener('wheel', handleWheel, { passive: true });
            modalElement.addEventListener('touchmove', handleTouchMove, { passive: true });
            return () => {
                modalElement.removeEventListener('wheel', handleWheel);
                modalElement.removeEventListener('touchmove', handleTouchMove);
            };
        }
    }, [isOpen]);


    const handleConfirmAndPrint = async () => {
        playSound('warp'); // Celebration Sound triggers here!
        const newTicketNumber = generateSecureTicketId();
        setIsConfirmed(true);
        setTicketNumber(newTicketNumber);
    
        setTimeout(async () => {
            const ticketElement = ticketContentRef.current;
            if (ticketElement && qrCodeRef.current) {
                qrCodeRef.current.innerHTML = '';
                new QRCode(qrCodeRef.current, {
                    text: `Ticket #${newTicketNumber}`,
                    width: 128,
                    height: 128,
                });
                
                await new Promise(resolve => setTimeout(resolve, 50));

                try {
                    // --- Step 1: Capture High-Res for User ---
                    const canvas = await html2canvas(ticketElement, { 
                        scale: 3, 
                        backgroundColor: '#ffffff',
                        useCORS: true,
                    });
    
                    const { jsPDF } = jspdf;
                    const imgData = canvas.toDataURL('image/jpeg', 0.9); 
                    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgProps = pdf.getImageProperties(imgData);
                    const aspectRatio = imgProps.height / imgProps.width;
                    let finalImgWidth = pdfWidth - 20; 
                    let finalImgHeight = finalImgWidth * aspectRatio;
                    if (finalImgHeight > pdfHeight - 20) {
                        finalImgHeight = pdfHeight - 20;
                        finalImgWidth = finalImgHeight / aspectRatio;
                    }
                    const x = (pdfWidth - finalImgWidth) / 2;
                    const y = 10; 
                    pdf.addImage(imgData, 'JPEG', x, y, finalImgWidth, finalImgHeight);
                    const pdfBlob = pdf.output('blob');
                    setTicketImageBlob(pdfBlob);
                    
                    // --- Step 1.5: Auto Download (Restore Legacy Behavior) ---
                    // Only auto-download if we are in default mode (transactional)
                    if (variant === 'default') {
                        pdf.save(`ticket-${newTicketNumber}.pdf`);
                    }

                    // --- Step 2: Capture Optimized Low-Res for Database ---
                    const optimizedImageBase64 = canvas.toDataURL('image/jpeg', 0.6);

                    // --- Step 3: Send Data to Backend ---
                    // NOTE: PlaygroundApp strips the image before sending to DB
                    const ticketData = {
                        ticketNumber: newTicketNumber,
                        transactionDateTime: new Date(),
                        betDates: selectedDates,
                        tracks: selectedTracks,
                        grandTotal: grandTotal,
                        plays: plays.map((p, i) => ({
                            ...p,
                            totalAmount: calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount),
                            jugadaNumber: i + 1
                        })),
                        ticketImage: optimizedImageBase64 
                    };
                    
                    onSaveTicket(ticketData);
    
                } catch (error) {
                    console.error("Error generating ticket image/pdf:", error);
                }
            }
        }, 200);
    };
    
    const handleRetrySave = async () => {
        const ticketElement = ticketContentRef.current;
        if (ticketElement) {
            try {
                 const canvas = await html2canvas(ticketElement, { 
                    scale: 1, 
                    backgroundColor: '#ffffff'
                });
                const optimizedImageBase64 = canvas.toDataURL('image/jpeg', 0.6);
                
                const ticketData = {
                    ticketNumber: ticketNumber,
                    transactionDateTime: new Date(),
                    betDates: selectedDates,
                    tracks: selectedTracks,
                    grandTotal: grandTotal,
                    plays: plays.map((p, i) => ({
                        ...p,
                        totalAmount: calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount),
                        jugadaNumber: i + 1
                    })),
                    ticketImage: optimizedImageBase64
                };
                onSaveTicket(ticketData);
            } catch(e) {
                console.error("Retry failed", e);
            }
        }
    };


    const handleShare = async () => {
        if (ticketImageBlob && navigator.share) {
            const file = new File([ticketImageBlob], `ticket-${ticketNumber}.pdf`, { type: 'application/pdf' });
            try {
                await navigator.share({
                    title: `Lotto Ticket ${ticketNumber}`,
                    text: `Here is my ticket for a total of $${grandTotal.toFixed(2)}`,
                    files: [file],
                });
            } catch (error) {
                console.error('Error sharing ticket:', error);
            }
        } else {
            alert('Sharing is not supported on this browser, or the file is not ready.');
        }
    };


    const formatTime = () => {
        return new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    // TRACK MAPPING HELPER (Replicated locally for consistency with AdminDashboard)
    const getResultId = (trackName: string) => {
        const map: Record<string, string> = {
            // USA Regular
            'New York AM': 'usa/ny/Midday', 'New York PM': 'usa/ny/Evening',
            'Georgia Midday': 'usa/ga/Midday', 'Georgia Evening': 'usa/ga/Evening', 'Georgia Night': 'usa/ga/Night',
            'New Jersey AM': 'usa/nj/Midday', 'New Jersey PM': 'usa/nj/Evening',
            'Florida AM': 'usa/fl/Midday', 'Florida PM': 'usa/fl/Evening',
            'Connect AM': 'usa/ct/Day', 'Connect PM': 'usa/ct/Night',
            'Pennsylvania AM': 'usa/pa/Day', 'Pennsylvania PM': 'usa/pa/Evening',
            
            // USA New
            'Texas Morning': 'usa/tx/Morning', 'Texas Day': 'usa/tx/Day', 'Texas Evening': 'usa/tx/Evening', 'Texas Night': 'usa/tx/Night',
            'Maryland AM': 'usa/md/AM', 'Maryland PM': 'usa/md/PM',
            'South C Midday': 'usa/sc/Midday', 'South C Evening': 'usa/sc/Evening',
            'Michigan Day': 'usa/mi/Day', 'Michigan Night': 'usa/mi/Night',
            'Delaware AM': 'usa/de/Day', 'Delaware PM': 'usa/de/Night',
            'Tennessee Midday': 'usa/tn/Midday', 'Tennessee Evening': 'usa/tn/Evening',
            'Massachusetts Midday': 'usa/ma/Midday', 'Massachusetts Evening': 'usa/ma/Evening',
            'Virginia Day': 'usa/va/Day', 'Virginia Night': 'usa/va/Night',
            'North Carolina AM': 'usa/nc/Day', 'North Carolina PM': 'usa/nc/Evening',

            // Santo Domingo
            'La Primera': 'rd/primer/AM', 'La Primera AM': 'rd/primer/AM', 'La Primera PM': 'rd/primer/PM',
            'Lotedom': 'rd/lotedom/Tarde',
            'La Suerte': 'rd/suerte/AM', 'La Suerte PM': 'rd/suerte/PM',
            'Loteria Real': 'rd/real/Mediodía',
            'Gana Mas': 'rd/ganamas/Tarde',
            'Loteka': 'rd/loteka/Noche',
            'Quiniela Pale': 'rd/quiniela/Diario',
            'Nacional': 'rd/nacional/Noche',

            // Special / Legacy
            'New York Horses': 'special/ny-horses/R1',
            'Brooklyn Midday': 'special/ny-bk/AM', 'Brooklyn Evening': 'special/ny-bk/PM',
            'Front Midday': 'special/ny-fp/AM', 'Front Evening': 'special/ny-fp/PM',
            'Venezuela': 'special/venezuela', 
            'Pulito': 'special/pulito',
        };
        return map[trackName];
    };

    if (!isOpen) return null;

    const isOnline = serverHealth === 'online';

    return (
        <div ref={modalRef} className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
            <div 
                className={`bg-light-card dark:bg-dark-card rounded-xl shadow-lg w-full flex flex-col overflow-hidden max-h-[85vh] transition-all duration-300 ${
                    showAdminLayout ? 'max-w-6xl' : 'max-w-[350px]'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header (Fixed) */}
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0 bg-light-card dark:bg-dark-card z-10">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-neon-cyan truncate mr-2">{isConfirmed ? `Ticket #${ticketNumber}` : 'Confirm Ticket'}</h2>
                        {isConfirmed && <span className="text-[10px] text-gray-500 uppercase font-bold">{formatTime()}</span>}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                        <svg data-lucide="x" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                
                {/* Content Area */}
                <div className="flex-grow min-h-0 overflow-y-auto overscroll-contain bg-gray-50 dark:bg-black/20">
                    <div className={`h-full ${showAdminLayout && !showResultsOnly ? 'grid grid-cols-1 md:grid-cols-2' : ''}`}>
                        
                        {/* LEFT COLUMN: VISUAL TICKET (THERMAL VIEW) */}
                        {/* Hidden entirely in 'results-only' mode */}
                        {!showResultsOnly && (
                            <div className={`flex justify-center p-4 ${showAdminLayout ? 'border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700' : ''}`}>
                                <div ref={ticketContentRef} className="bg-white p-3 text-black font-mono text-xs w-full max-w-[320px] mx-auto leading-normal shadow-sm">
                                    <div className="text-center space-y-1 mb-4">
                                        <p className="font-bold text-sm">BEAST READER</p>
                                        <p className="text-[10px]">Terminal ID: {terminalId}</p>
                                        <p className="text-[10px]">Cashier: {cashierId}</p>
                                        <p>{formatTime().replace(',', ', ')}</p>
                                        {isConfirmed && <p className="font-bold">TICKET# {ticketNumber}</p>}
                                    </div>

                                    <div className="space-y-2 mb-3 text-[11px]">
                                        <p><span className="font-bold">BET DATES</span><br/>{selectedDates.join(', ')}</p>
                                        <p><span className="font-bold">TRACKS</span><br/>{displayTracks.join(', ')}</p>
                                    </div>

                                    <div className="border-t border-b border-dashed border-gray-400 py-2">
                                        <table className="w-full table-fixed">
                                            <thead>
                                                <tr className="text-left !text-black">
                                                    <th className="font-normal !text-black p-0 text-[10px] w-[8%]">#</th>
                                                    <th className="font-normal !text-black p-0 text-[10px] w-[15%]">BET</th>
                                                    <th className="font-normal !text-black p-0 text-[10px] w-[15%]">MODE</th>
                                                    <th className="font-normal !text-black p-0 text-[10px] text-right w-[14%]">STR</th>
                                                    <th className="font-normal !text-black p-0 text-[10px] text-right w-[14%]">BOX</th>
                                                    <th className="font-normal !text-black p-0 text-[10px] text-right w-[14%]">COM</th>
                                                    <th className="font-normal !text-black p-0 text-[10px] text-right w-[20%]">TOT</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plays.map((play, index) => (
                                                    <tr key={play.id} className="border-t border-dashed border-gray-300 !text-black">
                                                        <td className="py-1 px-0 text-[11px] align-top !text-black">{index + 1}</td>
                                                        <td className="py-1 px-0 text-[11px] align-top !text-black font-bold">{play.betNumber}</td>
                                                        <td className="py-1 px-0 text-[10px] align-top !text-black break-words">
                                                            {play.gameMode === 'Single Action' ? 'Sing. Act.' : play.gameMode}
                                                        </td>
                                                        <td className="py-1 px-0 text-[11px] align-top !text-black text-right">{play.straightAmount ? play.straightAmount.toFixed(2) : '-'}</td>
                                                        <td className="py-1 px-0 text-[11px] align-top !text-black text-right">{play.boxAmount ? play.boxAmount.toFixed(2) : '-'}</td>
                                                        <td className="py-1 px-0 text-[11px] align-top !text-black text-right">{play.comboAmount ? play.comboAmount.toFixed(2) : '-'}</td>
                                                        <td className="py-1 px-0 text-[11px] align-top !text-black text-right font-bold">${calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div className="text-center mt-4 space-y-2">
                                        <p className="font-bold text-base">GRAND TOTAL: ${grandTotal.toFixed(2)}</p>
                                        <div ref={qrCodeRef} className="flex justify-center pt-2 min-h-[128px]"></div>
                                        <p className="text-[10px] pt-2">Please check your ticket, no claims for errors.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RIGHT COLUMN: DIGITAL TWIN (ADMIN/USER VIEW) - ONLY SHOW IF ADMIN/RESULTS VARIANT */}
                        {showAdminLayout && (
                            <div className="p-4 md:p-6 bg-slate-900 overflow-y-auto col-span-full">
                                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-[10px] uppercase text-gray-500 font-bold">Bet Dates</p>
                                        <p className="text-white font-bold">{selectedDates.length > 2 ? `${selectedDates[0]} +${selectedDates.length-1}` : selectedDates.join(', ')}</p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-[10px] uppercase text-gray-500 font-bold">Tracks</p>
                                        <p className="text-white font-bold truncate" title={displayTracks.join(', ')}>{displayTracks[0]}</p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-[10px] uppercase text-gray-500 font-bold">Grand Total</p>
                                        <p className="text-green-400 font-bold text-lg">${grandTotal.toFixed(2)}</p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-[10px] uppercase text-gray-500 font-bold">Total Plays</p>
                                        <p className="text-white font-bold text-lg">{plays.length}</p>
                                    </div>
                                </div>

                                {/* SCROLL CONTAINER ADDED FOR TABLE */}
                                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden overflow-x-auto">
                                    <table className="w-full text-left text-sm text-gray-400">
                                        <thead className="bg-slate-950 text-xs uppercase font-bold text-gray-500">
                                            <tr>
                                                <th className="p-3">#</th>
                                                <th className="p-3">Bet</th>
                                                <th className="p-3">Mode</th>
                                                <th className="p-3 text-right">STR</th>
                                                <th className="p-3 text-right">BOX</th>
                                                <th className="p-3 text-right">COM</th>
                                                <th className="p-3 text-right">TOTAL</th>
                                                <th className="p-3 text-center text-white">STATUS</th>
                                                <th className="p-3 text-right text-green-400">WON</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {plays.map((play, index) => {
                                                // Dynamic Win Calculation
                                                let totalWin = 0;
                                                let isWinner = false;
                                                let isPending = false;

                                                // If context provided, check results
                                                if (resultsContext.length > 0) {
                                                    selectedTracks.forEach(track => {
                                                        const resultId = getResultId(track);
                                                        
                                                        // Iterate dates
                                                        selectedDates.forEach(d => {
                                                            const result = resultsContext.find(r => 
                                                                (r.lotteryId === resultId || r.lotteryName === track) && r.date === d
                                                            );
                                                            if (result) {
                                                                const wins = calculateWinnings(play, result, DEFAULT_PRIZE_TABLE);
                                                                const winAmt = wins.reduce((sum, w) => sum + w.prizeAmount, 0);
                                                                if (winAmt > 0) {
                                                                    totalWin += winAmt;
                                                                    isWinner = true;
                                                                }
                                                            } else {
                                                                isPending = true;
                                                            }
                                                        });
                                                    });
                                                }

                                                let status = 'PENDING';
                                                let badgeClass = 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
                                                
                                                if (isWinner) {
                                                    status = 'WINNER';
                                                    badgeClass = 'bg-green-500/20 text-green-400 border-green-500/50';
                                                } else if (!isPending) {
                                                    status = 'LOSER';
                                                    // UPDATED: Gray color for losers instead of red to be less discouraging
                                                    badgeClass = 'bg-slate-700/50 text-slate-400 border-slate-600';
                                                }

                                                return (
                                                    <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                                                        <td className="p-3 text-slate-600">{index + 1}</td>
                                                        <td className="p-3 font-mono font-bold text-white text-base">{play.betNumber}</td>
                                                        <td className="p-3 text-xs">{play.gameMode}</td>
                                                        <td className="p-3 text-right font-mono">{play.straightAmount?.toFixed(2) || '-'}</td>
                                                        <td className="p-3 text-right font-mono">{play.boxAmount?.toFixed(2) || '-'}</td>
                                                        <td className="p-3 text-right font-mono">{play.comboAmount?.toFixed(2) || '-'}</td>
                                                        <td className="p-3 text-right font-bold text-white">
                                                            ${calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount).toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-green-400">
                                                            {totalWin > 0 ? `$${totalWin.toFixed(2)}` : '-'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer with Action Buttons (Fixed) */}
                <div className="p-3 sm:p-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 space-y-3 bg-light-card dark:bg-dark-card z-10 pb-safe">
                    
                    {/* CONFIRMED STATE (Step 2) */}
                    {isConfirmed ? (
                        <div className="space-y-3">
                             {/* LARGE STATUS INDICATORS */}
                            {isSaving && !showResultsOnly && (
                                <div className="w-full bg-blue-500/20 border border-blue-500 rounded-lg p-3 text-center">
                                    <p className="text-sm text-blue-400 font-bold animate-pulse">Saving...</p>
                                </div>
                            )}
                            
                            {!isSaving && lastSaveStatus === 'success' && !showResultsOnly && (
                                <div className="w-full bg-green-500/20 border border-green-500 rounded-lg p-3 text-center">
                                    <p className="text-sm text-green-500 font-bold flex items-center justify-center gap-2">
                                        <svg data-lucide="check" className="w-4 h-4"/> Saved to Database
                                    </p>
                                </div>
                            )}

                            {!isSaving && lastSaveStatus === 'error' && !showResultsOnly && (
                                <div className="w-full bg-red-500/20 border border-red-500 rounded-lg p-3 text-center space-y-2">
                                    <p className="text-sm text-red-500 font-bold flex items-center justify-center gap-2">
                                        <svg data-lucide="wifi-off" className="w-4 h-4"/> Failed (Offline)
                                    </p>
                                    <button onClick={handleRetrySave} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded shadow-lg transition-colors">
                                        RETRY
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 w-full">
                                {/* Renamed "Close Viewer" to "Done" per request */}
                                <button onClick={onClose} className="w-full px-4 py-3 rounded-lg bg-gray-600 text-white font-bold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                                    {variant === 'default' ? 'Done' : 'Close Viewer'}
                                </button>
                                {/* Share Button - Hidden in Results Only Mode */}
                                {!showResultsOnly && (
                                    <button onClick={handleShare} disabled={!ticketImageBlob} className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-neon-cyan to-neon-pink text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                        Share
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                    /* PRE-CONFIRM STATE (Step 1) */
                         <div className="space-y-3">
                            {/* BIG VISIBLE SERVER STATUS */}
                            {!isOnline && (
                                <div className="w-full bg-red-500/10 border border-red-500/50 rounded-lg p-2 flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-red-500 font-bold text-xs">OFFLINE MODE</span>
                                </div>
                            )}
                            {isOnline && (
                                <div className="w-full bg-green-500/10 border border-green-500/50 rounded-lg p-2 flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="text-green-500 font-bold text-xs">ONLINE</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={onClose} className="w-full px-2 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-bold flex items-center justify-center gap-2 text-sm">
                                    Edit
                                </button>
                                {/* Renamed "Confirm" to "Print" per request */}
                                <button onClick={handleConfirmAndPrint} className="w-full px-2 py-3 rounded-lg bg-neon-green text-black font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm">
                                    <svg data-lucide="printer" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                                    Print
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TicketModal;
