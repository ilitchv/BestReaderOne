import React, { useRef, useEffect } from 'react';
import type { Play, ServerHealth, WinningResult } from '../types';
import { calculateRowTotal } from '../utils/helpers';
import { calculateWinnings } from '../utils/prizeCalculator';
import { DEFAULT_PRIZE_TABLE, RESULTS_CATALOG } from '../constants'; // Using default prize table for visualization
import { useSound } from '../hooks/useSound';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

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
    isPaymentRequired?: boolean; // Payment Flow
    userId?: string; // --- ADDED USER ID ---
}

const TicketModal: React.FC<TicketModalProps> = ({
    isOpen, onClose, plays, selectedTracks, selectedDates, grandTotal,
    isConfirmed, setIsConfirmed, ticketNumber, setTicketNumber,
    ticketImageBlob, setTicketImageBlob, terminalId, cashierId,
    onSaveTicket, isSaving, serverHealth, lastSaveStatus,
    variant = 'default',
    resultsContext = [],
    isPaymentRequired = false,
    userId // --- DESTRUCTURED ---
}) => {
    const ticketContentRef = useRef<HTMLDivElement>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { playSound } = useSound();
    const [isPaymentLoading, setIsPaymentLoading] = React.useState(false);
    const [currentInvoiceId, setCurrentInvoiceId] = React.useState<string | null>(null);
    const [showResultsOnly, setShowResultsOnly] = React.useState(variant === 'results-only'); // Adjusted based on variant
    const [isCheckoutMode, setIsCheckoutMode] = React.useState(false);
    const [shopifyOrderId, setShopifyOrderId] = React.useState<string | null>(null);
    const [isPollingShopify, setIsPollingShopify] = React.useState(false);

    // Determine layout flags
    // The original `showResultsOnly` was derived from `variant`.
    // Now we have a state `showResultsOnly` and a derived `showResultsOnlyFromVariant`.
    // Let's keep the original logic for `showResultsOnly` derived from `variant` for consistency,
    // unless `initialTicketId` is meant to override it.
    // Assuming the user intended to add new states and keep the original `showResultsOnly` derivation.
    const showResultsOnlyFromVariant = variant === 'results-only';
    // Admin layout is used for both Admin and Results-Only views to show the data table
    const showAdminLayout = (variant === 'admin' && isConfirmed) || showResultsOnlyFromVariant;

    // Helper to get clean track name from ID
    const getTrackName = (id: string) => {
        // Special legacy handling if needed, or rely on Catalog
        if (id === 'special/pulito') return 'Pulito';
        if (id === 'special/venezuela') return 'Venezuela';

        const item = RESULTS_CATALOG.find(t => t.id === id);
        if (item) {
            // e.g. "New York Midday", "Texas Morning"
            return item.draw ? `${item.lottery} ${item.draw}` : item.lottery;
        }
        return id; // Fallback to ID if not found
    };

    // Filter out Game Modes disguised as tracks for display
    // CORRECTION: 'New York Horses' is a legitimate track and should be displayed.
    const displayTracks = selectedTracks
        .filter(t => !['Venezuela', 'special/venezuela', 'Pulito', 'special/pulito'].includes(t))
        .map(id => getTrackName(id));

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




    // --- AUTO-POLL FOR PAYMENT SUCCESS ---
    useEffect(() => {
        let interval: any;
        if (isPaymentRequired && isOpen) {
            interval = setInterval(async () => {
                // We reuse handleRetrySave which checks the backend
                await handleRetrySave(true);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isPaymentRequired, isOpen]);

    // --- SHOPIFY IMMEDIATE CHECK ON TAB FOCUS ---
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isPollingShopify && shopifyOrderId) {
                console.log("Welcome back! Checking Shopify status immediately...");
                try {
                    const res = await fetch('/api/payment/shopify-status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: shopifyOrderId })
                    });
                    const statusData = await res.json();
                    if (statusData.status === 'completed' || statusData.status === 'paid') {
                        setIsPollingShopify(false);
                        handleRetrySave(true);
                    }
                } catch (e) { console.error("Immediate check failed", e); }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleVisibilityChange); // Extra backup

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleVisibilityChange);
        };
    }, [isPollingShopify, shopifyOrderId]);

    // --- LISTEN FOR BROADCAST SUCCESS (Seamless Return) ---
    useEffect(() => {
        const channel = new BroadcastChannel('payment_channel');
        channel.onmessage = async (event) => {
            // Support both object { status: 'success' } and older string formats if any
            if ((event.data && event.data.status === 'success') || event.data === 'payment_success') {
                console.log("💳 Payment broadcast received! Unlocking ticket...");

                // --- MANUAL CLAIM TRIGGER (Localhost/Zero-Conf Fix) ---
                if (currentInvoiceId) {
                    try {
                        console.log(`🔎 Claiming Invoice: ${currentInvoiceId}`);
                        const claimRes = await fetch('/api/payment/claim', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            // USE PROP USER ID OR FALLBACK TO GUEST
                            body: JSON.stringify({ invoiceId: currentInvoiceId, userId: userId || 'guest-session' })
                        });

                        const claimData = await claimRes.json();

                        if (claimRes.ok) {
                            console.log("✅ Invoice Claimed (Simulated Webhook)", claimData);
                        } else {
                            console.warn("⚠️ Claim Failed:", claimData);
                            // If claim fails (e.g. not settled yet), we should probably not unlock immediately
                            // But we will let the polling continue.
                        }
                    } catch (err) {
                        console.error("Claim Fetch Error:", err);
                    }
                }

                // setIsPaymentRequired(false); // Removed: Not available in this scope. Relies on handleRetrySave success.

                // setLastSaveStatus('idle');   // Removed: Not available in this scope. Managed by parent.

                // Wait a moment for DB update to propagate if needed, or retry immediately
                setTimeout(() => {
                    handleRetrySave(true); // Retry silently first
                }, 500);
            }
        };
        return () => channel.close();
    }, [currentInvoiceId]); // Added dependency

    // --- DEFERRED CONFIRMATION LOGIC ---
    // We strictly wait for the backend to confirm "Success" before showing the ticket/QR.

    // 1. Trigger Save (Optimistic ID generation for the request, but visual blocking)
    const handleConfirmAndPrint = async () => {
        const newTicketNumber = generateSecureTicketId();
        // Update state to track this specific attempt's ID
        setTicketNumber(newTicketNumber);

        // Prepare Payload (No Image needed for backend)
        const ticketData = {
            ticketNumber: newTicketNumber,
            transactionDateTime: new Date(),
            betDates: selectedDates,
            tracks: selectedTracks,
            grandTotal: grandTotal,
            plays: plays.map((p, i) => ({
                ...p,
                straightAmount: p.straightAmount || 0,
                boxAmount: p.boxAmount || 0,
                comboAmount: p.comboAmount || 0,
                totalAmount: calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount),
                jugadaNumber: i + 1
            })),
            ticketImage: '' // Backend doesn't need it
        };

        // Trigger Parent Save
        onSaveTicket(ticketData);
    };

    // 2. Listen for Success to Reveal Ticket (The "Zero Trust" Reveal)
    useEffect(() => {
        // Only trigger if we are open, not yet confirmed visually, but backend says success
        if (isOpen && !isConfirmed && lastSaveStatus === 'success' && ticketNumber && !isPaymentRequired) {
            playSound('warp'); // Celebration Sound only when ACTUALLY saved
            setIsConfirmed(true);

            // Generate the Visual Assets (QR + PDF) AFTER confirmation
            setTimeout(async () => {
                const ticketElement = ticketContentRef.current;

                if (qrCodeRef.current) {
                    qrCodeRef.current.innerHTML = '';
                    new QRCode(qrCodeRef.current, {
                        text: `Ticket #${ticketNumber}`,
                        width: 128,
                        height: 128,
                    });
                }

                if (ticketElement) {
                    try {
                        // Capture High-Res for User PDF
                        await new Promise(resolve => setTimeout(resolve, 100)); // Allow DOM render
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

                        // Auto Download (Legacy Behavior)
                        if (variant === 'default') {
                            pdf.save(`ticket-${ticketNumber}.pdf`);
                        }

                        // NEW: Upload Final Image to Backend (Firebase)
                        try {
                            // Use the same optimized base64 as the PDF or a slightly lower quality for DB storage
                            // The canvas is already captured.
                            const dbImageBase64 = canvas.toDataURL('image/jpeg', 0.6);

                            await fetch(`/api/tickets/${ticketNumber}/image`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ticketImage: dbImageBase64 })
                            });
                            console.log("📸 Final Ticket Image synced to backend.");

                        } catch (uploadErr) {
                            console.error("Failed to upload ticket image:", uploadErr);
                        }

                    } catch (error) {
                        console.error("Error generating ticket image/pdf:", error);
                    }
                }
            }, 200);
        }
    }, [lastSaveStatus, isOpen, isConfirmed, ticketNumber, isPaymentRequired, variant, playSound]);

    const handleRetrySave = async (silentMode = false) => {
        const ticketElement = ticketContentRef.current;
        if (ticketElement) {
            try {
                const canvas = await html2canvas(ticketElement, {
                    scale: 1,
                    backgroundColor: '#ffffff'
                });
                const optimizedImageBase64 = canvas.toDataURL('image/jpeg', 0.6);

                // --- FIX: ENSURE TICKET NUMBER EXISTS ---
                let finalTicketNumber = ticketNumber;
                if (!finalTicketNumber) {
                    finalTicketNumber = generateSecureTicketId();
                    setTicketNumber(finalTicketNumber);
                    console.log("⚠️ Auto-generated missing Ticket ID during retry:", finalTicketNumber);
                }

                const ticketData = {
                    ticketNumber: finalTicketNumber,
                    transactionDateTime: new Date(),
                    betDates: selectedDates,
                    tracks: selectedTracks,
                    grandTotal: grandTotal,
                    plays: plays.map((p, i) => ({
                        ...p,
                        straightAmount: p.straightAmount || 0,
                        boxAmount: p.boxAmount || 0,
                        comboAmount: p.comboAmount || 0,
                        totalAmount: calculateRowTotal(p.betNumber, p.gameMode, p.straightAmount, p.boxAmount, p.comboAmount),
                        jugadaNumber: i + 1
                    })),
                    ticketImage: optimizedImageBase64,
                    silent: silentMode // Pass silent flag to parent/service if supported, or handle 400 locally (requires modifying onSaveTicket wrapper, but here we assume onSaveTicket might need adjustment or we catch errors if onSaveTicket was async and threw, but it's likely a void-returning prop. The request is to silence console errors, which originate from the network request. If onSaveTicket triggers the fetch, we need to ensure the fetch doesn't log 400s. Since onSaveTicket is a prop, we can't easily change the fetch behavior inside IT without changing the parent. However, if onSaveTicket returns a Promise, we can catch it.)
                };

                // Assuming onSaveTicket might be handling the fetch. The user's request specifically asked to "silence" 400 errors. 
                // A common pattern is that the parent (UserDashboard) handles the logic. 
                // To truly silence the 400 network error log from the BROWSER console is impossible (browser behavior), 
                // but we can silence the "console.error" calls in our code.
                // WE ARE MODIFYING THE CALLER HERE.

                await onSaveTicket(ticketData);

            } catch (e: any) {
                // If silentMode is on, and it's a 400-range error (validation/funds), we suppress logging.
                // Note: Network tab will still show 400, but Console will be cleaner.
                if (silentMode && e?.response?.status === 400) {
                    // Shhh... waiting for funds.
                } else {
                    console.error("Retry failed", e);
                }
            }
        }
    };


    const handleShare = async () => {
        if (ticketImageBlob && navigator.share) {
            const file = new File([ticketImageBlob], `ticket-${ticketNumber}.pdf`, { type: 'application/pdf' });
            try {
                await navigator.share({
                    title: `Lotto Ticket ${ticketNumber}`,
                    text: `Here is my ticket for a total of $${(grandTotal || 0).toFixed(2)}`,
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
        <div ref={modalRef} className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100]" onClick={onClose}>
            <div
                className={`bg-light-card dark:bg-dark-card rounded-xl shadow-lg w-full flex flex-col overflow-hidden max-h-[85vh] transition-all duration-300 ${showAdminLayout ? 'max-w-6xl' : 'max-w-[350px]'
                    }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header (Fixed) */}
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0 bg-light-card dark:bg-dark-card z-10">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-neon-cyan truncate mr-2">{isConfirmed ? `Ticket #${ticketNumber}` : 'Confirmar y Pagar Ticket'}</h2>
                        {isConfirmed && <span className="text-[10px] text-gray-500 uppercase font-bold">{formatTime()}</span>}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                        <svg data-lucide="x" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
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
                                        <p><span className="font-bold">BET DATES</span><br />{selectedDates.join(', ')}</p>
                                        <p><span className="font-bold">TRACKS</span><br />{displayTracks.join(', ')}</p>
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
                                                        <td className="py-1 px-0 text-[11px] align-top !text-black text-right font-bold">${(calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount) || 0).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="text-center mt-4 space-y-2">
                                        <p className="font-bold text-base">GRAND TOTAL: ${(grandTotal || 0).toFixed(2)}</p>

                                        {/* STRICT GUARD: QR CODE ONLY RENDERS IF CONFIRMED */}
                                        {isConfirmed ? (
                                            <div ref={qrCodeRef} className="flex justify-center pt-2 min-h-[128px]"></div>
                                        ) : !isPaymentRequired ? (
                                            /* Show Placeholder only if NOT confirmed AND NOT waiting for payment explicitly (or show it always if not confirmed?) 
                                               Actually, if isPaymentRequired is true, we want to show it? 
                                               The visual bug was "Stuck Processing" overlaid or conflicting. 
                                               If confirmed, we show QR. If not confirmed, we show placeholder. 
                                               The logic was: isConfirmed ? QR : Placeholder. 
                                               If "Processing" is overlapping, it's likely in the Footer, not here. 
                                               But let's ensure the placeholder doesn't look like a real QR. 
                                               The previous logic was valid for this section. 
                                               The "Processing" overlay mentioned in the plan might be the footer area. 
                                               Let's stick to cleaning this part simply. */
                                            <div className="flex items-center justify-center pt-2 min-h-[128px] opacity-20">
                                                <div className="border-2 border-dashed border-black p-2 rounded">
                                                    <span className="text-[10px] font-bold uppercase">Payment Required</span>
                                                </div>
                                            </div>
                                        ) : (
                                            // If Payment is Required, we also show the placeholder usually. 
                                            // The bug report said "UI displays confirmed ticket (QR) alongside Insufficient Funds message".
                                            // That implies isConfirmed=true AND isPaymentRequired=true. 
                                            // This shouldn't happen if logic is correct, but let's guard against it.
                                            <div className="flex items-center justify-center pt-2 min-h-[128px] opacity-20">
                                                <div className="border-2 border-dashed border-black p-2 rounded">
                                                    <span className="text-[10px] font-bold uppercase">Payment Required</span>
                                                </div>
                                            </div>
                                        )}
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
                                        <p className="text-white font-bold">{selectedDates.length > 2 ? `${selectedDates[0]} +${selectedDates.length - 1}` : selectedDates.join(', ')}</p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-[10px] uppercase text-gray-500 font-bold">Tracks</p>
                                        <p className="text-white font-bold truncate" title={displayTracks.join(', ')}>{displayTracks[0]}</p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-[10px] uppercase text-gray-500 font-bold">Grand Total</p>
                                        <p className="text-green-400 font-bold text-lg">${(grandTotal || 0).toFixed(2)}</p>
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
                                                            ${(calculateRowTotal(play.betNumber, play.gameMode, play.straightAmount, play.boxAmount, play.comboAmount) || 0).toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right font-bold text-green-400">
                                                            {totalWin > 0 ? `$${(totalWin || 0).toFixed(2)}` : '-'}
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

                {/* Footer with Action Buttons (Refactored) */}
                <div className="p-3 sm:p-4 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 space-y-3 bg-light-card dark:bg-dark-card z-10 pb-safe">

                    {/* 1. CONFIRMED STATE (Success) */}
                    {isConfirmed ? (
                        <div className="space-y-3">
                            {!isSaving && lastSaveStatus === 'success' && !showResultsOnly && (
                                <div className="w-full bg-green-500/20 border border-green-500 rounded-lg p-3 text-center">
                                    <p className="text-sm text-green-500 font-bold flex items-center justify-center gap-2">
                                        <svg data-lucide="check" className="w-4 h-4" /> Saved to Database
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={onClose} className="w-full px-2 py-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold transition-colors">
                                    Close
                                </button>
                                {!showResultsOnly && (
                                    <button onClick={handleShare} disabled={!ticketImageBlob} className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-neon-cyan to-neon-pink text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                        Share
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* NOT CONFIRMED */
                        <>
                            {/* SAVING OVERLAY */}
                            {isSaving && !showResultsOnly && (
                                <div className="w-full bg-blue-500/20 border border-blue-500 rounded-lg p-3 text-center">
                                    <p className="text-sm text-blue-400 font-bold animate-pulse">Processing Transaction...</p>
                                </div>
                            )}

                            {/* CHECKOUT MODE or PAYMENT REQUIRED */}
                            {!isSaving && (isCheckoutMode || isPaymentRequired) && !showResultsOnly && (
                                <div className="w-full bg-light-surface dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
                                    <h3 className={`text-sm font-bold text-center mb-2 ${isPaymentRequired ? 'text-yellow-500' : 'text-gray-900 dark:text-white'}`}>
                                        {isPaymentRequired ? (
                                            <span className="flex items-center justify-center gap-2"><svg data-lucide="alert-circle" className="w-4 h-4" /> Insufficient Funds</span>
                                        ) : (
                                            "Select Payment Method"
                                        )}
                                    </h3>

                                    {/* WALLET BUTTON (NEW) */}
                                    <button
                                        onClick={handleConfirmAndPrint}
                                        disabled={isPaymentRequired || isSaving}
                                        className={`w-full p-3 rounded-lg border flex items-center justify-between transition-colors ${isPaymentRequired
                                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60 cursor-not-allowed'
                                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-neon-cyan hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 dark:text-gray-300"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">Pay with Wallet</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    {isPaymentRequired ? 'Balance too low' : 'Use your available balance'}
                                                </p>
                                            </div>
                                        </div>
                                        {isPaymentRequired && <span className="text-[10px] font-bold text-red-500 uppercase">Top Up</span>}
                                    </button>

                                    {/* SEPARATOR */}
                                    <div className="relative py-2">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-300 dark:border-gray-600"></span></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-light-surface dark:bg-dark-surface px-2 text-gray-500">Or Pay With</span></div>
                                    </div>

                                    {/* BITCOIN BUTTON */}
                                    <button
                                        disabled={isPaymentLoading}
                                        onClick={async () => {
                                            if (isPaymentLoading) return;
                                            setIsPaymentLoading(true);
                                            try {
                                                const res = await fetch('/api/payment/invoice', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        amount: Number((grandTotal || 0).toFixed(2)),
                                                        currency: 'USD',
                                                        orderId: `TICKET-${Date.now()}`,
                                                        buyerEmail: 'guest@example.com'
                                                    })
                                                });
                                                const data = await res.json();
                                                if (data.checkoutLink) {
                                                    setCurrentInvoiceId(data.id);
                                                    console.log("📝 Active Invoice ID:", data.id);
                                                    window.open(data.checkoutLink, '_blank');
                                                } else {
                                                    const errMsg = data.error || JSON.stringify(data);
                                                    alert(`Error setting up payment: ${errMsg} \nCheck console for details.`);
                                                    console.error("Payment API Response:", data);
                                                    setIsPaymentLoading(false);
                                                }
                                            } catch (e: any) {
                                                console.error("Payment Fetch Error:", e);
                                                alert(`Connection failed: ${e.message}`);
                                                setIsPaymentLoading(false);
                                            }
                                        }}
                                        className={`w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded shadow-lg transition-colors flex items-center justify-center gap-2 ${isPaymentLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isPaymentLoading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : (
                                            <>
                                                <svg data-lucide="bitcoin" className="w-4 h-4" /> Pay with Bitcoin
                                            </>
                                        )}
                                    </button>


                                    {/* SHOPIFY POLLING UI */}
                                    {isPollingShopify && shopifyOrderId ? (
                                        <div className="mb-4 bg-yellow-500/10 border border-yellow-500 rounded-lg p-3 text-center space-y-3">
                                            <div className="flex items-center justify-center gap-2 text-yellow-500 font-bold animate-pulse">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-2 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                                Waiting for Payment...
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                1. Complete payment in the new tab.<br />
                                                2. <b>Close that tab and RETURN here</b> to finish.
                                            </p>

                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch('/api/payment/shopify-status', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ id: shopifyOrderId })
                                                        });
                                                        const data = await res.json();
                                                        if (data.status === 'completed' || data.status === 'paid') {
                                                            handleRetrySave(true);
                                                        } else {
                                                            alert(`Payment Status: ${data.status || 'Unknown'}. If you paid, please wait a moment.`);
                                                        }
                                                    } catch (e) {
                                                        alert("Check Failed. Please try again.");
                                                    }
                                                }}
                                                className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-bold text-xs"
                                            >
                                                I have paid (Manual Check)
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const response = await fetch("/api/payment/shopify", {
                                                            method: "POST",
                                                            headers: { "Content-Type": "application/json" },
                                                            body: JSON.stringify({
                                                                amount: Number((grandTotal || 0).toFixed(2)),
                                                                userId: userId || 'guest-session',
                                                                email: 'guest@example.com'
                                                            }),
                                                        });
                                                        const data = await response.json();
                                                        if (data.checkoutUrl) {
                                                            setShopifyOrderId(data.id);
                                                            setIsPollingShopify(true);
                                                            window.open(data.checkoutUrl, '_blank');

                                                            // Start Polling
                                                            const poll = setInterval(async () => {
                                                                try {
                                                                    const res = await fetch('/api/payment/shopify-status', {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ id: data.id })
                                                                    });
                                                                    const statusData = await res.json();
                                                                    if (statusData.status === 'completed' || statusData.status === 'paid') {
                                                                        clearInterval(poll);
                                                                        setIsPollingShopify(false);
                                                                        handleRetrySave(true);
                                                                    }
                                                                } catch (e) { console.error("Poll Error", e); }
                                                            }, 5000);

                                                            // Stop polling after 5 minutes
                                                            setTimeout(() => { clearInterval(poll); setIsPollingShopify(false); }, 300000);

                                                        } else {
                                                            alert("Shopify Error: " + (data.error || 'Unknown error'));
                                                        }
                                                    } catch (e) {
                                                        alert("Shopify Connection Failed");
                                                    }
                                                }}
                                                className="w-full mt-3 bg-[#95BF47] text-white p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#85AB3F] transition-colors font-bold"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-bag"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                                Pay with Shopify
                                            </button>
                                        </>
                                    )}

                                    {/* PAYPAL BUTTON */}
                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                        <p className="text-xs text-center text-gray-500 mb-2">Or pay directly with:</p>
                                        <PayPalScriptProvider options={{
                                            clientId: (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || "sb",
                                            currency: "USD",
                                            intent: "capture"
                                        }}>
                                            <PayPalButtons
                                                style={{ layout: "horizontal", tagLine: false, color: "gold", height: 40 }}
                                                createOrder={async (data, actions) => {
                                                    const response = await fetch("/api/payment/paypal/create-order", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            amount: Number((grandTotal || 0).toFixed(2)),
                                                            userId: userId || 'guest-session',
                                                            email: 'guest@example.com'
                                                        }),
                                                    });
                                                    const orderData = await response.json();
                                                    return orderData.id;
                                                }}
                                                onApprove={async (data, actions) => {
                                                    console.log("PayPal Ticket Approved:", data);
                                                    const response = await fetch("/api/payment/paypal/capture-order", {
                                                        method: "POST",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            orderId: data.orderID,
                                                            userId: userId || 'guest-session'
                                                        }),
                                                    });

                                                    const details = await response.json();
                                                    if (details.status === 'COMPLETED') {
                                                        handleRetrySave(true);
                                                    } else {
                                                        alert("PayPal Capture Failed. Please contact support.");
                                                    }
                                                }}
                                            />
                                        </PayPalScriptProvider>
                                    </div>

                                    {/* OPTIONS FOOTER */}
                                    {isPaymentRequired ? (
                                        <button onClick={handleRetrySave} className="w-full py-2 text-sm text-blue-500 hover:text-blue-400 font-bold">
                                            Check Balance & Retry
                                        </button>
                                    ) : (
                                        <button onClick={() => setIsCheckoutMode(false)} className="w-full py-2 text-xs text-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline">
                                            Cancel and Review
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* OFFLINE ERROR */}
                            {!isSaving && lastSaveStatus === 'error' && !isPaymentRequired && !showResultsOnly && (
                                <div className="w-full bg-red-500/20 border border-red-500 rounded-lg p-3 text-center space-y-2">
                                    <p className="text-sm text-red-500 font-bold flex items-center justify-center gap-2">
                                        <svg data-lucide="wifi-off" className="w-4 h-4" /> Failed (Offline)
                                    </p>
                                    <button onClick={handleRetrySave} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded shadow-lg transition-colors">
                                        RETRY
                                    </button>
                                </div>
                            )}

                            {/* REVIEW STATE (DEFAULT) */}
                            {!isSaving && !isCheckoutMode && !isPaymentRequired && !showResultsOnly && lastSaveStatus !== 'error' && (
                                <div className="space-y-3">
                                    {/* STATUS INDICATORS */}
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
                                        <button
                                            onClick={() => setIsCheckoutMode(true)}
                                            disabled={isSaving}
                                            className={`w-full px-2 py-3 rounded-lg bg-neon-green text-black font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <svg data-lucide="printer" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" /><rect x="6" y="14" width="12" height="8" rx="1" /></svg>
                                            Confirm and Pay
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>      {/* FOOTER BUTTONS (DONE / SHARE) - MOVED OUTSIDE OF CONDITIONS TO BE ALWAYS VISIBLE IF CONFIRMED */}
            </div>
        </div>
    );
};

export default TicketModal;
