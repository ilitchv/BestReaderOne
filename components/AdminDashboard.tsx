
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TicketData, WinningResult, PrizeTable, CalculationResult, AuditLogEntry, Play, User } from '../types';
import { localDbService } from '../services/localDbService';
import { DEFAULT_PRIZE_TABLE, GAME_RULES_TEXT, RESULTS_CATALOG } from '../constants';
import { calculateWinnings } from '../utils/prizeCalculator';
import { fileToBase64, formatWinningResult } from '../utils/helpers';
import { interpretWinningResultsImage, interpretWinningResultsText } from '../services/geminiService';
import { processLocalOcr } from '../services/localOcrService';
import { useSound } from '../hooks/useSound';
import TicketModal from './TicketModal';
import WalletManagerModal from './WalletManagerModal';
import ReferralTree from './ReferralTree'; // Import Tree
import SniperFrame from './SniperFrame';

// Declare jsQR from global scope
declare var jsQR: any;

interface AdminDashboardProps {
    onClose: () => void;
}

interface OcrStagingRow {
    id: string;
    source: string;
    targetId: string;
    value: string;
    status: 'pending' | 'saved';
}

// --- TRACK MAPPING FOR AUDIT (UI Name -> DB Result ID) ---
const TRACK_MAP: Record<string, string> = {
    // USA Regular
    'New York AM': 'usa/ny/Midday',
    'New York PM': 'usa/ny/Evening',
    'Georgia Midday': 'usa/ga/Midday',
    'Georgia Evening': 'usa/ga/Evening',
    'Georgia Night': 'usa/ga/Night',
    'New Jersey AM': 'usa/nj/Midday',
    'New Jersey PM': 'usa/nj/Evening',
    'Florida AM': 'usa/fl/Midday',
    'Florida PM': 'usa/fl/Evening',
    'Connect AM': 'usa/ct/Day',
    'Connect PM': 'usa/ct/Night',
    'Pennsylvania AM': 'usa/pa/Day',
    'Pennsylvania PM': 'usa/pa/Evening',

    // USA New
    'Texas Morning': 'usa/tx/Morning',
    'Texas Day': 'usa/tx/Day',
    'Texas Evening': 'usa/tx/Evening',
    'Texas Night': 'usa/tx/Night',
    'Maryland AM': 'usa/md/AM',
    'Maryland PM': 'usa/md/PM',
    'South C Midday': 'usa/sc/Midday',
    'South C Evening': 'usa/sc/Evening',
    'Michigan Day': 'usa/mi/Day',
    'Michigan Night': 'usa/mi/Night',
    'Delaware AM': 'usa/de/Day',
    'Delaware PM': 'usa/de/Night',
    'Tennessee Midday': 'usa/tn/Midday',
    'Tennessee Evening': 'usa/tn/Evening',
    'Massachusetts Midday': 'usa/ma/Midday',
    'Massachusetts Evening': 'usa/ma/Evening',
    'Virginia Day': 'usa/va/Day',
    'Virginia Night': 'usa/va/Night',
    'North Carolina AM': 'usa/nc/Day',
    'North Carolina PM': 'usa/nc/Evening',

    // Santo Domingo
    'La Primera': 'rd/primer/AM',
    'La Primera AM': 'rd/primer/AM',
    'La Primera PM': 'rd/primer/PM',
    'Lotedom': 'rd/lotedom/Tarde',
    'La Suerte': 'rd/suerte/AM',
    'La Suerte PM': 'rd/suerte/PM',
    'Loteria Real': 'rd/real/Mediodía',
    'Gana Mas': 'rd/ganamas/Tarde',
    'Loteka': 'rd/loteka/Noche',
    'Quiniela Pale': 'rd/quiniela/Diario',
    'Nacional': 'rd/nacional/Noche',

    // Special / Legacy
    'New York Horses': 'special/ny-horses/R1',
    'Brooklyn Midday': 'special/ny-bk/AM',
    'Brooklyn Evening': 'special/ny-bk/PM',
    'Front Midday': 'special/ny-fp/AM',
    'Front Evening': 'special/ny-fp/PM',
    'Venezuela': 'special/venezuela',
    'Pulito': 'special/pulito',
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'sales' | 'results' | 'ocr' | 'payouts' | 'winners' | 'users' | 'requests' | 'audit' | 'network' | 'strategy'>('sales');
    const [salesViewMode, setSalesViewMode] = useState<'tickets' | 'plays'>('tickets');
    const { playSound } = useSound();

    // SALES STATE
    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
    const [isLoadingTickets, setIsLoadingTickets] = useState(false);

    // CLAIMS PROCESSING STATE (Sales > Plays)
    // Key format: "ticketNumber_playIndex"
    const [selectedClaimKeys, setSelectedClaimKeys] = useState<Set<string>>(new Set());

    // SCANNER STATE
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const qrFileInputRef = useRef<HTMLInputElement>(null);

    // RESULTS STATE
    const [results, setResults] = useState<WinningResult[]>([]);
    const [resultsSearch, setResultsSearch] = useState('');
    const [isAddResultOpen, setIsAddResultOpen] = useState(false);
    const [resultsDateRange, setResultsDateRange] = useState<{ start: string, end: string }>({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [viewResultsDate, setViewResultsDate] = useState(new Date().toISOString().split('T')[0]);

    // DELETE & AUDIT STATE
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resultToDelete, setResultToDelete] = useState<string | null>(null);
    const [deletePin, setDeletePin] = useState('');
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    const [auditFilter, setAuditFilter] = useState<'ALL' | 'FINANCE' | 'RESULTS' | 'USERS'>('ALL');

    // OCR STATE
    const [ocrImage, setOcrImage] = useState<string | null>(null);
    const [ocrText, setOcrText] = useState('');
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [ocrResults, setOcrResults] = useState<OcrStagingRow[]>([]);
    const [ocrDate, setOcrDate] = useState(new Date().toISOString().split('T')[0]);
    const ocrFileInputRef = useRef<HTMLInputElement>(null);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [successCount, setSuccessCount] = useState(0);

    // USER MANAGEMENT STATE
    const [users, setUsers] = useState<User[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newUserForm, setNewUserForm] = useState<Partial<User>>({});

    // WALLET MANAGER STATE
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [selectedUserForWallet, setSelectedUserForWallet] = useState<User | null>(null);

    // PAYOUTS STATE
    const [prizeTable, setPrizeTable] = useState<PrizeTable>(DEFAULT_PRIZE_TABLE);

    // CALCULATOR TOOL STATE
    const [calcGame, setCalcGame] = useState('Pick 3');
    const [calcType, setCalcType] = useState('STRAIGHT');
    const [calcWager, setCalcWager] = useState<string>('1');
    const [calcIsNY, setCalcIsNY] = useState(true);
    const [activeRule, setActiveRule] = useState<number | null>(null);

    // SIMULATOR LAB STATE
    const [simBet, setSimBet] = useState('');
    const [simMode, setSimMode] = useState('Pick 3');
    const [simStr, setSimStr] = useState('');
    const [simBox, setSimBox] = useState('');
    const [simCom, setSimCom] = useState('');
    const [simRes1, setSimRes1] = useState('');
    const [simRes2, setSimRes2] = useState('');
    const [simRes3, setSimRes3] = useState('');
    const [simResP3, setSimResP3] = useState('');
    const [simResP4, setSimResP4] = useState('');
    const [simOutput, setSimOutput] = useState<CalculationResult[] | null>(null);

    // New Result Form Variables
    const [newResultTrack, setNewResultTrack] = useState('');
    const [newResult1st, setNewResult1st] = useState('');
    const [newResult2nd, setNewResult2nd] = useState('');
    const [newResult3rd, setNewResult3rd] = useState('');
    const [newResultP3, setNewResultP3] = useState('');
    const [newResultP4, setNewResultP4] = useState('');

    const allTracks = RESULTS_CATALOG.map(c => ({
        id: c.id,
        name: `${c.lottery} - ${c.draw}`,
        originalName: c.lottery
    }));

    const loadResultsFromDb = () => {
        const resultData = localDbService.getResults();
        resultData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setResults(resultData);
    };

    const loadUsersFromDb = () => {
        const userData = localDbService.getUsers();
        setUsers(userData);
    };

    const loadAuditLog = () => {
        const logs = localDbService.getAuditLog();
        setAuditLog(logs);
    };

    const reloadTickets = () => {
        const localTickets = localDbService.getTickets();
        localTickets.sort((a, b) => new Date(b.transactionDateTime).getTime() - new Date(a.transactionDateTime).getTime());
        setTickets(localTickets);
    };

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoadingTickets(true);
            reloadTickets();
            loadResultsFromDb();
            loadUsersFromDb();
            loadAuditLog();
            setPrizeTable(localDbService.getPrizeTable());
            setIsLoadingTickets(false);
        };

        fetchAllData();
    }, []);

    // Refresh Audit Log when tab is selected
    useEffect(() => {
        if (activeTab === 'audit') {
            loadAuditLog();
        }
    }, [activeTab]);

    useEffect(() => {
        let res = tickets;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(t =>
                t.ticketNumber.toLowerCase().includes(lower) ||
                t.tracks.some(tr => tr.toLowerCase().includes(lower))
            );
        }

        if (dateRange.start && dateRange.end) {
            res = res.filter(t => {
                const tDate = new Date(t.transactionDateTime).toISOString().split('T')[0];
                return tDate >= dateRange.start && tDate <= dateRange.end;
            });
        } else if (dateRange.start) {
            res = res.filter(t => new Date(t.transactionDateTime).toISOString().split('T')[0] === dateRange.start);
        }

        setFilteredTickets(res);
    }, [searchTerm, dateRange, tickets]);

    // ... (UseEffects for auto-fill logic unchanged) ...
    useEffect(() => { const p3 = newResultP3.replace(/\D/g, ''); if (p3.length >= 2) { setNewResult1st(p3.slice(-2)); } }, [newResultP3]);
    useEffect(() => { const p4 = newResultP4.replace(/\D/g, ''); if (p4.length >= 2) { setNewResult2nd(p4.slice(0, 2)); } if (p4.length >= 4) { setNewResult3rd(p4.slice(-2)); } }, [newResultP4]);

    // ... (FlattenedPlays logic unchanged) ...
    const flattenedPlays = useMemo(() => {
        return filteredTickets.flatMap(t => {
            return t.plays.map((play, index) => {
                let totalWon = 0; let isWinner = false; let isPending = false; const winningTracks: string[] = [];
                const effectiveTracks = t.tracks.filter(tr => !['Pulito', 'Venezuela'].includes(tr));
                effectiveTracks.forEach(track => {
                    let trackWin = 0; let trackPending = false;
                    t.betDates.forEach(date => {
                        const resultId = TRACK_MAP[track];
                        const result = results.find(r => (r.lotteryId === resultId || r.lotteryName === track) && r.date === date);
                        if (result) {
                            const wins = calculateWinnings(play, result, prizeTable);
                            const winAmount = wins.reduce((sum, w) => sum + w.prizeAmount, 0);
                            if (winAmount > 0) { trackWin += winAmount; }
                        } else { trackPending = true; }
                    });
                    if (trackWin > 0) { totalWon += trackWin; winningTracks.push(track); isWinner = true; }
                    if (trackPending) isPending = true;
                });
                let status = 'PENDING'; let color = 'text-yellow-500'; let bg = 'bg-yellow-500/20';
                if (isWinner) { status = 'WINNER'; color = 'text-green-400'; bg = 'bg-green-500/20'; } else if (!isPending) { status = 'NO MATCH'; color = 'text-slate-400'; bg = 'bg-slate-700/50'; }
                const isPaid = play.paymentStatus === 'paid'; const key = `${t.ticketNumber}_${index}`; const displayTracks = isWinner ? winningTracks.join(', ') : effectiveTracks.join(', ');
                return { ...play, uniqueKey: key, playIndex: index, userId: t.userId, parentTicketNumber: t.ticketNumber, parentTransactionDate: t.transactionDateTime, finalTimestamp: new Date(t.transactionDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), targetDate: t.betDates.join(', '), targetTrack: displayTracks, status, color, bg, amount: totalWon, isPaid, canPay: isWinner && !isPaid };
            });
        });
    }, [filteredTickets, results, prizeTable]);

    // ... (Claims handlers unchanged) ...
    const toggleClaimSelection = (key: string) => { const newSet = new Set(selectedClaimKeys); if (newSet.has(key)) newSet.delete(key); else newSet.add(key); setSelectedClaimKeys(newSet); };
    const handleSelectAllClaims = () => { const allPayable = flattenedPlays.filter(p => p.canPay); const allKeys = allPayable.map(p => p.uniqueKey); const allSelected = allKeys.every(k => selectedClaimKeys.has(k)); if (allSelected) { setSelectedClaimKeys(new Set()); } else { setSelectedClaimKeys(new Set(allKeys)); } };
    const handleProcessClaims = () => { const claimsToPay = flattenedPlays.filter(p => selectedClaimKeys.has(p.uniqueKey) && p.canPay); if (claimsToPay.length === 0) return; const userPayloads: Record<string, { amount: number, ticketUpdates: Record<string, number[]> }> = {}; claimsToPay.forEach(p => { const uid = p.userId || 'u-12345'; if (!userPayloads[uid]) userPayloads[uid] = { amount: 0, ticketUpdates: {} }; userPayloads[uid].amount += p.amount; if (!userPayloads[uid].ticketUpdates[p.parentTicketNumber]) { userPayloads[uid].ticketUpdates[p.parentTicketNumber] = []; } userPayloads[uid].ticketUpdates[p.parentTicketNumber].push(p.playIndex); }); Object.entries(userPayloads).forEach(([uid, payload]) => { localDbService.updateUserBalance(uid, payload.amount, 'WIN', `Payout for ${Object.keys(payload.ticketUpdates).length} tickets`); Object.entries(payload.ticketUpdates).forEach(([ticketNum, indices]) => { localDbService.markPlaysAsPaid(ticketNum, indices); }); }); playSound('add'); setSelectedClaimKeys(new Set()); reloadTickets(); loadUsersFromDb(); };
    const totalClaimsAmount = flattenedPlays.filter(p => selectedClaimKeys.has(p.uniqueKey)).reduce((sum, p) => sum + p.amount, 0);
    const displayedResults = results.filter(r => { if (resultsDateRange.start && resultsDateRange.end) { if (r.date < resultsDateRange.start || r.date > resultsDateRange.end) return false; } else if (resultsDateRange.start) { if (r.date !== resultsDateRange.start) return false; } if (resultsSearch && !r.lotteryName.toLowerCase().includes(resultsSearch.toLowerCase())) return false; return true; });

    // ... (Audit Stats & User Handlers unchanged) ...
    const auditStats = useMemo(() => { let totalPayout = 0; const winningTicketsMap = new Map<string, boolean>(); const winnersList: any[] = []; const integrityBreaches: any[] = []; tickets.forEach(ticket => { const ticketTime = new Date(ticket.transactionDateTime).getTime(); ticket.plays.forEach(play => { ticket.betDates.forEach(date => { let dateTotalWin = 0; const winningTracks: string[] = []; const matchTypes: Set<string> = new Set(); let resultNumbersStr = ''; let minIntegrityOk = true; let maxTimeGap = 0; ticket.tracks.forEach(trackName => { const resultId = TRACK_MAP[trackName]; const result = results.find(r => (r.lotteryId === resultId || r.lotteryName === trackName) && r.date === date); if (result) { const resultTime = new Date(result.createdAt).getTime(); const integrityOk = ticketTime < (resultTime + 60000); const wins = calculateWinnings(play, result, prizeTable); if (wins.length > 0) { const winAmt = wins.reduce((sum, w) => sum + w.prizeAmount, 0); if (winAmt > 0) { dateTotalWin += winAmt; winningTracks.push(trackName); wins.forEach(w => matchTypes.add(w.matchType)); resultNumbersStr = formatWinningResult(result); if (!integrityOk) minIntegrityOk = false; maxTimeGap = Math.max(maxTimeGap, Math.round((resultTime - ticketTime) / 1000)); } } } }); if (dateTotalWin > 0) { const winnerEntry = { id: `${ticket.ticketNumber}-${play.jugadaNumber}-${date}`, ticketNumber: ticket.ticketNumber, date: date, track: winningTracks.join(', '), betNumber: play.betNumber, gameMode: play.gameMode, prize: dateTotalWin, integrityOk: minIntegrityOk, matchType: Array.from(matchTypes).join(', '), resultNumbers: resultNumbersStr, timeGapSeconds: maxTimeGap, soldAt: ticket.transactionDateTime }; winnersList.push(winnerEntry); if (minIntegrityOk) { totalPayout += dateTotalWin; winningTicketsMap.set(ticket.ticketNumber, true); } else { integrityBreaches.push(winnerEntry); } } }); }); }); winnersList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); return { totalPayout, winningTicketsCount: winningTicketsMap.size, winnersList, integrityBreaches }; }, [tickets, results, prizeTable]);
    const handleOpenUserModal = (user?: User) => { if (user) { setEditingUser(user); setNewUserForm(user); } else { setEditingUser(null); setNewUserForm({ role: 'user', status: 'active', balance: 0, pendingBalance: 0 }); } setIsUserModalOpen(true); };
    const handleSaveUser = (e: React.FormEvent) => { e.preventDefault(); const userData: User = { id: editingUser ? editingUser.id : `u-${Date.now()}`, email: newUserForm.email || '', name: newUserForm.name || 'New User', role: newUserForm.role || 'user', status: newUserForm.status || 'active', balance: newUserForm.balance || 0, pendingBalance: newUserForm.pendingBalance || 0, phone: newUserForm.phone || '', address: newUserForm.address || '', notes: newUserForm.notes || '', createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(), avatarUrl: editingUser ? editingUser.avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserForm.name || 'User')}&background=random&color=fff`, password: newUserForm.password || editingUser?.password || '123456', sponsorId: newUserForm.sponsorId }; const success = localDbService.saveUser(userData); if (success) { loadUsersFromDb(); setIsUserModalOpen(false); playSound('success'); } else { alert("Error saving user."); } };
    const handleDeleteUser = (userId: string) => { if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) { if (localDbService.deleteUser(userId)) { loadUsersFromDb(); playSound('delete'); } } };
    const handleOpenWallet = (user: User) => { setSelectedUserForWallet(user); setIsWalletOpen(true); };
    const filteredUsers = users.filter(u => (u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())) && u.status !== 'pending');
    const pendingUsers = users.filter(u => u.status === 'pending');

    // APPROVAL LOGIC
    const handleApproveUser = (user: User) => {
        const updatedUser: User = { ...user, status: 'active' };
        if (localDbService.saveUser(updatedUser)) {
            // Also log specific approval action if needed (saveUser logs generic update)
            localDbService.logAction({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                action: 'USER_APPROVE',
                targetId: user.id,
                details: `Approved new agent: ${user.name} (Sponsor: ${users.find(s => s.id === user.sponsorId)?.name || 'Root'})`,
                user: 'Admin'
            });
            loadUsersFromDb();
            playSound('success');
        }
    };

    const handleRejectUser = (user: User) => {
        if (confirm(`Reject and delete application for ${user.name}?`)) {
            localDbService.deleteUser(user.id);
            localDbService.logAction({
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                action: 'USER_REJECT',
                targetId: user.id,
                details: `Rejected application: ${user.name} (${user.email})`,
                user: 'Admin'
            });
            loadUsersFromDb();
            playSound('delete');
        }
    };

    const filteredAuditLog = auditLog.filter(log => { if (auditFilter === 'ALL') return true; if (auditFilter === 'FINANCE') return ['FINANCE', 'PAYOUT'].includes(log.action); if (auditFilter === 'RESULTS') return ['CREATE', 'UPDATE', 'DELETE'].includes(log.action); if (auditFilter === 'USERS') return ['USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_APPROVE', 'USER_REJECT'].includes(log.action); return true; });

    // ... (QR / Results / OCR / Payout handlers unchanged) ...
    const parseRowValue = (val: string) => { const cleaned = val.replace(/-{2,}|x{2,}/gi, '').trim(); const parts = cleaned.split(/[\s\-\t,]+/).filter(p => /^\d+$/.test(p)); let f = '', s = '', t = '', p3 = '', p4 = ''; const p3Candidates = parts.filter(p => p.length === 3); const p4Candidates = parts.filter(p => p.length === 4); if (p3Candidates.length > 0) p3 = p3Candidates[p3Candidates.length - 1]; if (p4Candidates.length > 0) p4 = p4Candidates[p4Candidates.length - 1]; const pairCandidates = parts.filter(p => p.length <= 2); if (pairCandidates.length > 0) f = pairCandidates[0].padStart(2, '0'); if (pairCandidates.length > 1) s = pairCandidates[1].padStart(2, '0'); if (pairCandidates.length > 2) t = pairCandidates[2].padStart(2, '0'); return { f, s, t, p3, p4 }; };
    const startScan = async () => { setIsScanning(true); if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) { try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.setAttribute("playsinline", "true"); videoRef.current.play(); requestAnimationFrame(tick); } } catch (err) { console.error(err); } } };
    const stopScan = () => { setIsScanning(false); if (videoRef.current && videoRef.current.srcObject) { const stream = videoRef.current.srcObject as MediaStream; stream.getTracks().forEach(track => track.stop()); videoRef.current.srcObject = null; } if (animationRef.current) { cancelAnimationFrame(animationRef.current); } };
    const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const img = new Image(); img.onload = () => { const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) { canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0); const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); processQrData(imageData.data, imageData.width, imageData.height); } } }; img.src = event.target.result as string; }; reader.readAsDataURL(file); if (qrFileInputRef.current) qrFileInputRef.current.value = ''; };
    const processQrData = (data: Uint8ClampedArray, width: number, height: number) => { if (typeof jsQR !== 'undefined') { const code = jsQR(data, width, height, { inversionAttempts: "dontInvert" }); if (code) { const match = code.data.match(/Ticket\s*#?(T-[A-Z0-9]+)/i); if (match) { const ticketId = match[1]; const ticket = tickets.find(t => t.ticketNumber === ticketId); if (ticket) { stopScan(); playBeep(); setSelectedTicket(ticket); return; } else { alert("Ticket not found in database. Try syncing."); } } else { alert("QR Code format not recognized."); } } } };
    const tick = () => { if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) { const canvas = canvasRef.current; const video = videoRef.current; canvas.height = video.videoHeight; canvas.width = video.videoWidth; const ctx = canvas.getContext('2d'); if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); processQrData(imageData.data, imageData.width, imageData.height); } } if (isScanning) { animationRef.current = requestAnimationFrame(tick); } };
    const playBeep = () => { const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.type = "square"; osc.frequency.value = 800; gain.gain.value = 0.1; osc.start(); setTimeout(() => osc.stop(), 100); };
    const handleSaveResult = (e: React.FormEvent) => { e.preventDefault(); if (!newResultTrack || !viewResultsDate || (!newResult1st && !newResultP3 && !newResultP4)) return; const trackObj = allTracks.find(t => t.id === newResultTrack); if (!trackObj) return; let f = newResult1st; let s = newResult2nd; let t = newResult3rd; if (!f && !s && !t) { const p3Clean = newResultP3.replace(/\D/g, ''); const p4Clean = newResultP4.replace(/\D/g, ''); if (p3Clean.length >= 2) f = p3Clean.slice(-2); if (p4Clean.length >= 2) s = p4Clean.slice(0, 2); if (p4Clean.length >= 2) t = p4Clean.slice(-2); } const newResult: WinningResult = { id: `${viewResultsDate}_${newResultTrack}`, date: viewResultsDate, lotteryId: newResultTrack, lotteryName: trackObj.originalName, first: f, second: s, third: t, pick3: newResultP3, pick4: newResultP4, createdAt: new Date().toISOString() }; localDbService.saveResult(newResult); loadResultsFromDb(); setIsAddResultOpen(false); setNewResult1st(''); setNewResult2nd(''); setNewResult3rd(''); setNewResultP3(''); setNewResultP4(''); };
    const handleEditInitiate = (res: WinningResult) => { setViewResultsDate(res.date); setNewResultTrack(res.lotteryId); setNewResult1st(res.first || ''); setNewResult2nd(res.second || ''); setNewResult3rd(res.third || ''); setNewResultP3(res.pick3 || ''); setNewResultP4(res.pick4 || ''); setIsAddResultOpen(true); };
    const handleDeleteInitiate = (id: string) => { setResultToDelete(id); setDeletePin(''); setIsDeleteModalOpen(true); };
    const handleConfirmDelete = () => { if (deletePin !== '198312') { alert('Invalid PIN'); return; } if (resultToDelete) { localDbService.deleteResult(resultToDelete); loadResultsFromDb(); setIsDeleteModalOpen(false); setResultToDelete(null); playSound('delete'); } };
    const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { try { const base64 = await fileToBase64(file); setOcrImage(base64); } catch (err) { console.error(err); alert("Error reading file."); } } if (ocrFileInputRef.current) ocrFileInputRef.current.value = ''; };
    const handlePaste = async (e: React.ClipboardEvent) => { const items = e.clipboardData.items; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { const file = items[i].getAsFile(); if (file) { const base64 = await fileToBase64(file); setOcrImage(base64); } } } };
    const handleProcessOcr = async (base64: string) => { setIsProcessingOcr(true); setOcrResults([]); try { const catalogIds = allTracks.map(t => t.id); const parsed = await interpretWinningResultsImage(base64, catalogIds); const rows: OcrStagingRow[] = parsed.map((p, idx) => ({ id: `ocr-${Date.now()}-${idx}`, source: p.source, targetId: p.targetId || '', value: p.value, status: 'pending' })); setOcrResults(rows); } catch (e) { console.error(e); alert("OCR Failed. Please try again."); } finally { setIsProcessingOcr(false); } };
    const handleProcessText = async () => { if (!ocrText.trim()) return; setIsProcessingOcr(true); setOcrResults([]); try { const catalogIds = allTracks.map(t => t.id); const parsed = await interpretWinningResultsText(ocrText, catalogIds); const rows: OcrStagingRow[] = parsed.map((p, idx) => ({ id: `txt-${Date.now()}-${idx}`, source: p.source, targetId: p.targetId || '', value: p.value, status: 'pending' })); setOcrResults(rows); } catch (e) { console.error(e); alert("Text processing failed. Check logs."); } finally { setIsProcessingOcr(false); } };
    const handleOcrRowChange = (id: string, field: keyof OcrStagingRow, value: string) => { setOcrResults(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row)); };
    const handleSaveOcrRow = (row: OcrStagingRow) => { if (!row.targetId || !row.value) return alert("Please select a valid lottery and check value."); const trackObj = allTracks.find(t => t.id === row.targetId); if (!trackObj) return; let { f, s, t, p3, p4 } = parseRowValue(row.value); if ((!f || !s || !t) && (p3 || p4)) { if (!f && p3 && p3.length >= 2) f = p3.slice(-2); if (!s && p4 && p4.length >= 2) s = p4.slice(0, 2); if (!t && p4 && p4.length >= 2) t = p4.slice(-2); } const newResult: WinningResult = { id: `${ocrDate}_${row.targetId}`, date: ocrDate, lotteryId: row.targetId, lotteryName: trackObj.originalName, first: f, second: s, third: t, pick3: p3, pick4: p4, createdAt: new Date().toISOString() }; localDbService.saveResult(newResult); setOcrResults(prev => prev.map(r => r.id === row.id ? { ...r, status: 'saved' } : r)); loadResultsFromDb(); setViewResultsDate(ocrDate); };
    const handleSaveAllOcrRows = () => { const pendingRows = ocrResults.filter(r => r.status !== 'saved'); if (pendingRows.length === 0) return alert("No pending rows to save."); const validPendingRows = pendingRows.filter(r => r.targetId && r.targetId.trim() !== ''); if (validPendingRows.length === 0) return alert(`Found ${pendingRows.length} pending rows, but NONE have a Lottery (Map) selected.`); let savedCount = 0; const newResults = ocrResults.map(row => { if (row.status === 'saved') return row; if (!row.targetId || !row.targetId.trim() || !row.value || !row.value.trim()) return row; const trackObj = allTracks.find(t => t.id === row.targetId); if (!trackObj) return row; try { let { f, s, t, p3, p4 } = parseRowValue(row.value); if ((!f || !s || !t) && (p3 || p4)) { if (!f && p3 && p3.length >= 2) f = p3.slice(-2); if (!s && p4 && p4.length >= 2) s = p4.slice(0, 2); if (!t && p4 && p4.length >= 2) t = p4.slice(-2); } const resultEntry: WinningResult = { id: `${ocrDate}_${row.targetId}`, date: ocrDate, lotteryId: row.targetId, lotteryName: trackObj.originalName, first: f, second: s, third: t, pick3: p3, pick4: p4, createdAt: new Date().toISOString() }; localDbService.saveResult(resultEntry); savedCount++; return { ...row, status: 'saved' as const }; } catch (e) { return row; } }); if (savedCount > 0) { setOcrResults(newResults); loadResultsFromDb(); setViewResultsDate(ocrDate); setSuccessCount(savedCount); setShowSuccessOverlay(true); playSound('success'); setTimeout(() => setShowSuccessOverlay(false), 2500); } };
    const handlePrizeTableChange = (game: string, type: string, value: string) => { const newVal = parseFloat(value); if (isNaN(newVal)) return; const newTable = { ...prizeTable }; if (!newTable[game]) newTable[game] = {}; newTable[game][type] = newVal; setPrizeTable(newTable); localDbService.savePrizeTable(newTable); };
    const getCalculatedPayout = () => { const gameTable = prizeTable[calcGame]; if (!gameTable) return 0; let multiplier = gameTable[calcType] || 0; if (calcGame === 'Win 4' && !calcIsNY) multiplier = multiplier / 2; const wagerVal = parseFloat(calcWager); return isNaN(wagerVal) ? 0 : wagerVal * multiplier; };
    const handleRunSimulator = () => { const mockPlay: Play = { id: 0, betNumber: simBet, gameMode: simMode, straightAmount: simStr ? parseFloat(simStr) : null, boxAmount: simBox ? parseFloat(simBox) : null, comboAmount: simCom ? parseFloat(simCom) : null, }; const mockResult: WinningResult = { id: 'mock', date: 'today', lotteryId: 'mock-track', lotteryName: 'Simulation Track', first: simRes1, second: simRes2, third: simRes3, pick3: simResP3, pick4: simResP4, createdAt: new Date().toISOString() }; const wins = calculateWinnings(mockPlay, mockResult, prizeTable); setSimOutput(wins); playSound(wins.length > 0 ? 'success' : 'error'); };

    const totalSales = filteredTickets.reduce((acc, t) => acc + t.grandTotal, 0);
    const totalPlays = filteredTickets.reduce((acc, t) => acc + t.plays.length, 0);
    const netProfit = totalSales - auditStats.totalPayout;

    return (
        <div className="min-h-screen bg-slate-900 text-gray-200 font-sans" onPaste={activeTab === 'ocr' ? handlePaste : undefined}>
            <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-neon-cyan to-blue-600 flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                        BO
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">BEAST OFFICE</h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Admin Command Center</p>
                    </div>
                </div>

                <div className="flex bg-slate-700 rounded-lg p-1 overflow-x-auto max-w-[60vw]">
                    <button onClick={() => setActiveTab('sales')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'sales' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>Sales</button>
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>Users</button>

                    {/* NEW REQUESTS TAB */}
                    <button onClick={() => setActiveTab('requests')} className={`relative px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'requests' ? 'bg-orange-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}>
                        Requests
                        {pendingUsers.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                                {pendingUsers.length}
                            </span>
                        )}
                    </button>

                    <button onClick={() => setActiveTab('network')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'network' ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}>Network</button>

                    <button onClick={() => setActiveTab('results')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'results' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>Results</button>
                    <button onClick={() => setActiveTab('winners')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'winners' ? 'bg-neon-green text-black shadow' : 'text-gray-400 hover:text-white'}`}>Winners</button>
                    <button onClick={() => setActiveTab('audit')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'audit' ? 'bg-purple-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Audit</button>
                    <button onClick={() => setActiveTab('strategy')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'strategy' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Sniper AI</button>
                    <button onClick={() => setActiveTab('ocr')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ocr' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>OCR</button>
                    <button onClick={() => setActiveTab('payouts')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'payouts' ? 'bg-neon-cyan text-black shadow' : 'text-gray-400 hover:text-white'}`}>Payouts</button>
                </div>

                <button onClick={onClose} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded border border-red-500/30 transition-all text-sm font-bold">
                    EXIT
                </button>
            </header>

            <div className="p-6 max-w-[1800px] mx-auto space-y-6">

                {/* EXISTING TABS ... */}
                {activeTab === 'sales' && ( /* ... Sales Content ... */ <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Sales</p><p className="text-3xl font-bold text-green-400">${totalSales.toFixed(2)}</p></div><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Tickets Sold</p><p className="text-3xl font-bold text-blue-400">{filteredTickets.length}</p></div><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Plays</p><p className="text-3xl font-bold text-purple-400">{totalPlays}</p></div></div><div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-wrap gap-4 items-center justify-between"><div className="flex flex-wrap gap-4 items-center"><input type="text" placeholder="Search Ticket ID..." className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-neon-cyan outline-none w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded-lg px-2"><span className="text-xs font-bold text-slate-500">FROM</span><input type="date" className="bg-transparent py-2 text-sm focus:outline-none text-white w-32" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} /><span className="text-slate-600">|</span><span className="text-xs font-bold text-slate-500">TO</span><input type="date" className="bg-transparent py-2 text-sm focus:outline-none text-white w-32" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} /></div><button onClick={() => { setSearchTerm(''); setDateRange({ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }) }} className="text-xs text-slate-400 hover:text-white underline">Clear</button></div><div className="flex items-center gap-4">{isLoadingTickets && (<span className="text-xs text-neon-cyan animate-pulse flex items-center gap-2"><div className="w-2 h-2 bg-neon-cyan rounded-full"></div> Syncing...</span>)}<div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700"><button onClick={() => setSalesViewMode('tickets')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${salesViewMode === 'tickets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>Tickets View</button><button onClick={() => setSalesViewMode('plays')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${salesViewMode === 'plays' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}>Plays View</button></div><button onClick={startScan} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5 border border-slate-600"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M7 12h10" /></svg> Scan QR</button></div></div>{salesViewMode === 'plays' && selectedClaimKeys.size > 0 && (<div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[70] bg-black/90 border border-neon-cyan/50 shadow-[0_0_30px_rgba(0,255,255,0.3)] rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300"><div className="text-white font-bold"><span className="text-neon-cyan">{selectedClaimKeys.size}</span> Selected Wins</div><div className="h-6 w-px bg-gray-700"></div><div className="text-green-400 font-mono font-bold text-lg">${totalClaimsAmount.toFixed(2)}</div><button onClick={handleProcessClaims} className="ml-2 px-6 py-2 bg-neon-cyan hover:bg-cyan-400 text-black font-black rounded-full shadow-lg transition-all transform hover:scale-105">PAY OUT</button><button onClick={() => setSelectedClaimKeys(new Set())} className="text-gray-500 hover:text-white ml-2">✕</button></div>)}<div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"><div className="overflow-x-auto max-h-[600px]">{salesViewMode === 'tickets' ? (<table className="w-full text-sm text-left text-slate-400"><thead className="bg-slate-900/50 text-xs uppercase font-bold border-b border-slate-700 sticky top-0 z-10 backdrop-blur-md"><tr><th className="p-4">Date</th><th className="p-4">Ticket #</th><th className="p-4">Player</th><th className="p-4">Tracks</th><th className="p-4 text-center">Plays</th><th className="p-4 text-right">Grand Total</th></tr></thead><tbody className="divide-y divide-slate-700">{filteredTickets.map(ticket => { const ticketUser = users.find(u => u.id === ticket.userId); return (<tr key={ticket.ticketNumber} onClick={() => setSelectedTicket(ticket)} className="hover:bg-slate-700/50 cursor-pointer transition-colors"><td className="p-4 text-white font-bold">{new Date(ticket.transactionDateTime).toLocaleString()}</td><td className="p-4 font-mono text-neon-cyan">{ticket.ticketNumber}</td><td className="p-4">{ticketUser ? (<div className="flex items-center gap-2"><img src={ticketUser.avatarUrl} alt="" className="w-5 h-5 rounded-full" /><span className="text-white text-xs font-bold">{ticketUser.name}</span></div>) : (<span className="text-xs text-gray-500 italic">Guest / Walk-in</span>)}</td><td className="p-4 max-w-xs truncate" title={ticket.tracks.join(', ')}>{ticket.tracks.length > 2 ? `${ticket.tracks[0]} +${ticket.tracks.length - 1}` : ticket.tracks.join(', ')}</td><td className="p-4 text-center">{ticket.plays.length}</td><td className="p-4 text-right font-bold text-green-400">${ticket.grandTotal.toFixed(2)}</td></tr>); })}</tbody></table>) : (<table className="w-full text-xs text-left text-gray-300 whitespace-nowrap"><thead className="bg-slate-900/90 text-[10px] uppercase font-bold border-b border-slate-700 sticky top-0 z-10 text-gray-500"><tr><th className="p-3 text-center w-10"><input type="checkbox" onChange={(e) => handleSelectAllClaims()} title="Select all visible UNPAID WINNERS" className="w-4 h-4 accent-neon-cyan cursor-pointer rounded opacity-50 hover:opacity-100" /></th><th className="p-3">Ticket</th><th className="p-3">Player</th><th className="p-3">Date</th><th className="p-3">Tracks</th><th className="p-3">Bet Number</th><th className="p-3">Game Mode</th><th className="p-3 text-right">Cost</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Payment</th><th className="p-3 text-right">Won ($)</th></tr></thead><tbody className="divide-y divide-slate-700 bg-slate-800">{flattenedPlays.map((play, idx) => (<tr key={play.uniqueKey} className={`transition-colors ${selectedClaimKeys.has(play.uniqueKey) ? 'bg-neon-cyan/10' : 'hover:bg-slate-700/30'}`}><td className="p-3 text-center">{play.canPay && (<input type="checkbox" checked={selectedClaimKeys.has(play.uniqueKey)} onChange={() => toggleClaimSelection(play.uniqueKey)} className="w-4 h-4 accent-neon-cyan cursor-pointer rounded" />)}</td><td className="p-3 font-mono text-neon-cyan">{play.parentTicketNumber}</td><td className="p-3">{users.find(u => u.id === play.userId) ? (<div className="flex items-center gap-2"><img src={users.find(u => u.id === play.userId)?.avatarUrl} alt="" className="w-5 h-5 rounded-full" /><span className="text-white text-xs font-bold">{users.find(u => u.id === play.userId)?.name}</span></div>) : (<span className="text-xs text-gray-500 italic">Guest</span>)}</td><td className="p-3 font-bold text-white">{play.targetDate}</td><td className="p-3 max-w-[200px] truncate font-bold text-slate-300" title={play.targetTrack}>{play.targetTrack}</td><td className="p-3 font-bold font-mono text-white text-base">{play.betNumber}</td><td className="p-3 text-xs uppercase tracking-wider">{play.gameMode}</td><td className="p-3 text-right font-bold">${(play.totalAmount).toFixed(2)}</td><td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-[9px] font-bold border border-current ${play.color} ${play.bg}`}>{play.status}</span></td><td className="p-3 text-center">{play.status === 'WINNER' && (play.isPaid ? (<span className="px-2 py-0.5 bg-green-500 text-black font-bold text-[9px] rounded uppercase">PAID</span>) : (<span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500 font-bold text-[9px] rounded uppercase animate-pulse">UNPAID</span>))}</td><td className={`p-3 text-right font-bold ${play.amount > 0 ? 'text-green-400' : 'text-gray-500'}`}>${play.amount.toFixed(2)}</td></tr>))}</tbody></table>)}</div></div></div>)}
                {activeTab === 'users' && ( /* ... Users Content ... */ <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Users</p><p className="text-3xl font-bold text-white">{users.length}</p></div><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Balance Held</p><p className="text-3xl font-bold text-green-400">${users.reduce((acc, u) => acc + u.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Active vs Suspended</p><div className="flex gap-4"><span className="text-2xl font-bold text-blue-400">{users.filter(u => u.status === 'active').length} <span className="text-xs text-slate-500 font-normal">Active</span></span><span className="text-2xl font-bold text-red-400">{users.filter(u => u.status === 'suspended').length} <span className="text-xs text-slate-500 font-normal">Suspended</span></span></div></div></div><div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700"><div className="flex gap-4 items-center w-full max-w-lg"><input type="text" placeholder="Search by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm focus:border-neon-cyan outline-none flex-grow" /></div><button onClick={() => handleOpenUserModal()} className="px-4 py-2 bg-gradient-to-r from-neon-cyan to-blue-600 text-black font-bold rounded-lg shadow-lg hover:brightness-110 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" x2="20" y1="8" y2="14" /><line x1="23" x2="17" y1="11" y2="11" /></svg> Create User</button></div><div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"><table className="w-full text-sm text-left text-gray-300"><thead className="bg-slate-900/50 text-xs uppercase font-bold text-gray-500 border-b border-slate-700"><tr><th className="p-4 w-16">User</th><th className="p-4">Name / Email</th><th className="p-4">Role</th><th className="p-4">Sponsor</th><th className="p-4 text-right">Balance</th><th className="p-4 text-center">Status</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-700">{filteredUsers.map(u => (<tr key={u.id} className="hover:bg-slate-700/50 transition-colors"><td className="p-4"><img src={u.avatarUrl} alt={u.name} className="w-10 h-10 rounded-full border border-slate-600" /></td><td className="p-4"><div className="font-bold text-white">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></td><td className="p-4"><span className={`text-xs font-bold uppercase px-2 py-1 rounded ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>{u.role}</span></td><td className="p-4">{u.sponsorId && users.find(s => s.id === u.sponsorId) ? (<div className="flex items-center gap-1 text-xs text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg> {users.find(s => s.id === u.sponsorId)?.name}</div>) : (<span className="text-xs text-gray-600">-</span>)}</td><td className="p-4 text-right font-mono font-bold text-white">${u.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td><td className="p-4 text-center">{u.status === 'active' ? (<span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold uppercase">Active</span>) : (<span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold uppercase">Suspended</span>)}</td><td className="p-4 text-right flex justify-end gap-2"><button onClick={() => handleOpenWallet(u)} className="p-2 bg-slate-700 hover:bg-green-600/20 hover:text-green-400 rounded text-slate-300" title="Manage Wallet"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg></button><button onClick={() => handleOpenUserModal(u)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-blue-400" title="Edit User"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg></button><button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-slate-700 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400" title="Delete User"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg></button></td></tr>))}{filteredUsers.length === 0 && (<tr><td colSpan={6} className="p-8 text-center text-slate-500">No users found.</td></tr>)}</tbody></table></div></div>)}

                {/* NEW REQUESTS TAB */}
                {activeTab === 'requests' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white">Pending Requests</h2>
                            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/50">
                                {pendingUsers.length} Pending
                            </span>
                        </div>

                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="bg-slate-900/50 text-xs uppercase font-bold text-gray-500 border-b border-slate-700">
                                    <tr>
                                        <th className="p-4 w-16"></th>
                                        <th className="p-4">Candidate</th>
                                        <th className="p-4">Sponsor</th>
                                        <th className="p-4">Applied At</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {pendingUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-700/50 transition-colors">
                                            <td className="p-4">
                                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                                                    ?
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-white">{u.name}</div>
                                                <div className="text-xs text-slate-500">{u.email}</div>
                                                <div className="text-xs text-slate-500">{u.phone}</div>
                                            </td>
                                            <td className="p-4">
                                                {u.sponsorId && users.find(s => s.id === u.sponsorId) ? (
                                                    <div className="flex items-center gap-1 text-blue-400 font-bold text-sm">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" x2="20" y1="8" y2="14" /><line x1="23" x2="17" y1="11" y2="11" /></svg>
                                                        {users.find(s => s.id === u.sponsorId)?.name}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-500 italic">Direct / Root</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-xs font-mono text-slate-400">
                                                {new Date(u.createdAt).toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-3">
                                                <button onClick={() => handleRejectUser(u)} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg font-bold text-xs border border-red-500/30 transition-all">
                                                    Reject
                                                </button>
                                                <button onClick={() => handleApproveUser(u)} className="px-4 py-2 bg-green-500 text-black hover:bg-green-400 rounded-lg font-bold text-xs shadow-lg shadow-green-500/20 transition-all flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                    Approve
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {pendingUsers.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-slate-500 italic">No pending requests.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* NETWORK TAB - GLOBAL TREE */}
                {activeTab === 'network' && (
                    <div className="space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <h3 className="text-amber-400 font-bold text-lg">Organization Network</h3>
                                <p className="text-xs text-amber-200/70">Global view of all referrals starting from Company Root.</p>
                            </div>
                            <div className="p-2 bg-amber-500/20 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                            </div>
                        </div>
                        {/* SPECIAL RENDER FOR ADMIN: Force Company Root */}
                        <ReferralTree rootUserId="COMPANY_ROOT" />
                    </div>
                )}

                {/* OTHER TABS ... */}
                {activeTab === 'results' && (<div className="space-y-6"><div className="flex flex-wrap gap-4 items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700"><div className="flex items-center gap-4"><div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded-lg px-2"><span className="text-xs font-bold text-slate-500">FROM</span><input type="date" className="bg-transparent py-2 text-sm focus:outline-none text-white w-32" value={resultsDateRange.start} onChange={e => setResultsDateRange({ ...resultsDateRange, start: e.target.value })} /><span className="text-slate-600">|</span><span className="text-xs font-bold text-slate-500">TO</span><input type="date" className="bg-transparent py-2 text-sm focus:outline-none text-white w-32" value={resultsDateRange.end} onChange={e => setResultsDateRange({ ...resultsDateRange, end: e.target.value })} /></div><input type="text" placeholder="Filter by Name..." value={resultsSearch} onChange={e => setResultsSearch(e.target.value)} className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-neon-cyan text-sm w-48" /></div><div className="flex gap-3"><button onClick={() => { setIsAddResultOpen(true); }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold text-xs flex items-center gap-1 shadow-lg shadow-green-500/20"><span className="text-lg leading-none">+</span> Add Result</button></div></div><div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"><div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-300"><thead className="bg-slate-900/50 text-xs uppercase font-bold border-b border-slate-700 text-gray-500"><tr><th className="p-4 w-1/6">Draw Date</th><th className="p-4 w-1/5">Lotería</th><th className="p-4 text-center text-blue-400 w-16">1st</th><th className="p-4 text-center w-16">2nd</th><th className="p-4 text-center w-16">3rd</th><th className="p-4 text-center text-purple-400 w-20">Pick 3</th><th className="p-4 text-center text-orange-400 w-20">Pick 4</th><th className="p-4 text-center w-24">Posted At</th><th className="p-4 text-right w-12">Actions</th></tr></thead><tbody className="divide-y divide-slate-700">{displayedResults.map(res => (<tr key={res.id} className="hover:bg-slate-700/50 transition-colors"><td className="p-4 font-mono font-bold text-white text-xs">{res.date}</td><td className="p-4 font-bold text-white">{res.lotteryName} <span className="text-xs font-normal text-slate-500 ml-1">({res.lotteryId.split('/').pop()})</span></td><td className="p-4 text-center font-mono font-bold text-lg text-blue-400">{res.first || '---'}</td><td className="p-4 text-center font-mono text-base">{res.second || '---'}</td><td className="p-4 text-center font-mono text-base">{res.third || '---'}</td><td className="p-4 text-center font-mono text-purple-400">{res.pick3 || '---'}</td><td className="p-4 text-center font-mono text-orange-400">{res.pick4 || '---'}</td><td className="p-4 text-center font-mono text-xs text-gray-500">{new Date(res.createdAt).toLocaleTimeString()}</td><td className="p-4 text-right flex justify-end gap-2"><button onClick={() => handleEditInitiate(res)} className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/10 rounded"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg></button><button onClick={() => handleDeleteInitiate(res.id)} className="text-red-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg></button></td></tr>))}{displayedResults.length === 0 && (<tr><td colSpan={9} className="p-12 text-center text-gray-500">No results found for range.</td></tr>)}</tbody></table></div></div></div>)}
                {activeTab === 'winners' && (<div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Total Payout Liability</p><p className="text-3xl font-bold text-red-400">${auditStats.totalPayout.toFixed(2)}</p></div><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Net Profit</p><p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-500'}`}>${netProfit.toFixed(2)}</p></div><div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg"><p className="text-xs text-slate-400 uppercase font-bold mb-1">Winning Tickets</p><p className="text-3xl font-bold text-white">{auditStats.winningTicketsCount}</p></div></div>{auditStats.integrityBreaches.length > 0 && (<div className="bg-red-900/20 border border-red-500 rounded-xl p-4 flex items-center gap-4 animate-pulse"><div className="p-3 bg-red-500 rounded-full text-white font-bold">!</div><div><h4 className="text-red-500 font-bold text-lg">Integrity Breach Detected</h4><p className="text-red-300 text-sm">Found {auditStats.integrityBreaches.length} tickets sold AFTER results were posted.</p></div></div>)}<div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"><div className="p-4 border-b border-slate-700 bg-slate-900/50"><h3 className="font-bold text-white">Winners Feed</h3></div><div className="overflow-x-auto max-h-[600px]"><table className="w-full text-sm text-left text-slate-400"><thead className="bg-slate-900/50 text-xs uppercase font-bold border-b border-slate-700 sticky top-0 z-10 backdrop-blur-md"><tr><th className="p-4">Ticket</th><th className="p-4">Date</th><th className="p-4">Tracks</th><th className="p-4">Play</th><th className="p-4">Match Type</th><th className="p-4 text-right">Prize</th><th className="p-4 text-center">Status</th></tr></thead><tbody className="divide-y divide-slate-700">{auditStats.winnersList.map((win, idx) => (<tr key={idx} className="hover:bg-slate-700/50 transition-colors"><td className="p-4 font-mono text-neon-cyan">{win.ticketNumber}</td><td className="p-4">{win.date}</td><td className="p-4 text-white text-xs font-bold">{win.track}</td><td className="p-4 font-bold text-white">{win.betNumber} <span className="text-xs text-slate-500 font-normal">({win.gameMode})</span></td><td className="p-4 text-xs">{win.matchType} <span className="text-slate-500">vs {win.resultNumbers}</span></td><td className="p-4 text-right font-bold text-green-400">${win.prize.toFixed(2)}</td><td className="p-4 text-center">{win.integrityOk ? (<span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-bold">VALID</span>) : (<span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">LATE ({win.timeGapSeconds}s)</span>)}</td></tr>))}{auditStats.winnersList.length === 0 && (<tr><td colSpan={7} className="p-8 text-center text-slate-500">No winners found yet.</td></tr>)}</tbody></table></div></div></div>)}
                {activeTab === 'audit' && (<div className="space-y-6"><div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg p-4"><div className="flex gap-4 border-b border-slate-700 pb-4 mb-4"><button onClick={() => setAuditFilter('ALL')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${auditFilter === 'ALL' ? 'border-neon-cyan text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>All Activity</button><button onClick={() => setAuditFilter('FINANCE')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${auditFilter === 'FINANCE' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Finance</button><button onClick={() => setAuditFilter('RESULTS')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${auditFilter === 'RESULTS' ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Results</button><button onClick={() => setAuditFilter('USERS')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${auditFilter === 'USERS' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Users</button></div><div className="max-h-[70vh] overflow-y-auto"><table className="w-full text-sm text-left text-gray-400"><thead className="bg-slate-900/50 text-xs uppercase font-bold text-gray-500 sticky top-0"><tr><th className="p-3">Timestamp</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Target ID</th><th className="p-3 w-1/2">Details</th></tr></thead><tbody className="divide-y divide-slate-700/50">{filteredAuditLog.map(log => (<tr key={log.id} className="hover:bg-slate-700/20"><td className="p-3 font-mono text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</td><td className="p-3 font-bold text-white">{log.user}</td><td className="p-3"><span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${log.action === 'DELETE' || log.action === 'USER_DELETE' ? 'bg-red-500/10 text-red-400 border-red-500/20' : log.action === 'UPDATE' || log.action === 'USER_UPDATE' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : log.action === 'FINANCE' || log.action === 'PAYOUT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{log.action}</span></td><td className="p-3 font-mono text-xs">{log.targetId}</td><td className="p-3 text-gray-300">{log.details}</td></tr>))}{filteredAuditLog.length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-slate-600">No logs found for this filter.</td></tr>)}</tbody></table></div></div></div>)}
                {activeTab === 'ocr' && (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]"><div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center gap-4 h-full"><div className="w-full flex justify-center mb-2"><div className="flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-slate-600"><label className="text-xs font-bold text-neon-cyan uppercase">FECHA DE CARGA:</label><input type="date" value={ocrDate} onChange={(e) => setOcrDate(e.target.value)} className="bg-slate-700 border border-slate-600 rounded p-1 text-white text-sm outline-none focus:border-neon-cyan" /></div></div>{ocrImage ? (<div className="relative w-full max-w-lg"><img src={`data:image/jpeg;base64,${ocrImage}`} alt="OCR Preview" className="rounded-lg border border-slate-600 max-h-[200px] mx-auto object-contain" /><button onClick={() => { setOcrImage(null); setOcrResults([]); }} className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button></div>) : (<div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) { const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>; handleOcrFileChange(event); } }} onClick={() => ocrFileInputRef.current?.click()} className="w-full p-10 border-2 border-dashed border-slate-600 rounded-lg hover:border-neon-cyan transition-colors cursor-pointer flex flex-col items-center gap-2"><svg className="w-10 h-10 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg><p className="text-sm font-bold text-slate-300">Arrastra imágenes. Previsualiza y guarda.</p><button className="px-4 py-1 bg-slate-700 rounded text-xs text-white mt-2">Choose Files</button></div>)}<input type="file" ref={ocrFileInputRef} accept="image/*" className="hidden" onChange={handleOcrFileChange} /><div className="flex gap-4 w-full max-w-lg justify-center flex-wrap">{ocrImage && (<button onClick={() => ocrImage && handleProcessOcr(ocrImage)} disabled={isProcessingOcr} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow disabled:opacity-50">{isProcessingOcr ? 'Processing...' : 'Ejecutar OCR Imagen'}</button>)}<button onClick={handleProcessText} disabled={!ocrText.trim() || isProcessingOcr} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow disabled:opacity-50">{isProcessingOcr ? 'Processing...' : 'Procesar Texto'}</button><button onClick={() => { setOcrImage(null); setOcrText(''); setOcrResults([]); }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold">Limpiar todo</button></div><textarea value={ocrText} onChange={(e) => setOcrText(e.target.value)} className="w-full max-w-3xl h-24 bg-black/30 border border-slate-700 rounded p-2 text-xs font-mono text-green-400 focus:border-neon-cyan outline-none" placeholder="Pega aquí el texto tabulado (ej.: 'ANGUILLA 10AM	23	70	69	---	---')" /></div><div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full shadow-lg"><div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center"><h3 className="font-bold text-white uppercase tracking-wider">Staging Area ({ocrResults.length})</h3>{ocrResults.length > 0 && (<button onClick={handleSaveAllOcrRows} disabled={ocrResults.filter(r => r.status !== 'saved').length === 0} className="px-4 py-2 bg-neon-green hover:bg-green-400 text-black font-bold rounded shadow-lg shadow-neon-green/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> SAVE ALL ({ocrResults.filter(r => r.status !== 'saved').length})</button>)}</div><div className="flex-1 overflow-y-auto"><table className="w-full text-sm text-left text-gray-300"><thead className="bg-slate-900/50 text-xs uppercase font-bold text-green-400 border-b border-slate-700 sticky top-0"><tr><th className="p-4 w-1/4">Abbrev.</th><th className="p-4 w-1/4">Map</th><th className="p-4 w-1/6">Detected</th><th className="p-4 w-1/6">Value</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-700">{ocrResults.map(row => (<tr key={row.id} className={row.status === 'saved' ? 'opacity-50 bg-green-900/10' : 'hover:bg-slate-700/30'}><td className="p-4 font-bold text-white uppercase">{row.source}</td><td className="p-4"><select value={row.targetId} onChange={(e) => handleOcrRowChange(row.id, 'targetId', e.target.value)} disabled={row.status === 'saved'} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-neon-cyan text-xs"><option value="">—</option>{allTracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></td><td className="p-4 font-mono text-white">{row.value}</td><td className="p-4"><input type="text" value={row.value} onChange={(e) => handleOcrRowChange(row.id, 'value', e.target.value)} disabled={row.status === 'saved'} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white font-mono outline-none focus:border-neon-cyan text-xs" /></td><td className="p-4 text-right">{row.status === 'saved' ? (<span className="text-green-500 font-bold text-xs uppercase">Saved</span>) : (<button onClick={() => handleSaveOcrRow(row)} className="px-4 py-1.5 bg-green-900/50 hover:bg-green-800 border border-green-700 text-white text-xs font-bold rounded shadow uppercase tracking-wider">Save</button>)}</td></tr>))}{ocrResults.length === 0 && !isProcessingOcr && (<tr><td colSpan={5} className="p-12 text-center text-gray-500">Waiting for input...</td></tr>)}</tbody></table></div></div></div>)}
                {activeTab === 'payouts' && (<div className="space-y-6"><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg"><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><svg className="text-neon-cyan" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="14" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg> Prize Calculator</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] uppercase font-bold text-gray-500">GAME</label><select value={calcGame} onChange={e => { setCalcGame(e.target.value); setCalcType(Object.keys(prizeTable[e.target.value] || {})[0]); }} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white">{Object.keys(prizeTable).map(g => <option key={g} value={g}>{g}</option>)}</select></div><div><label className="text-[10px] uppercase font-bold text-gray-500">TYPE</label><select value={calcType} onChange={e => setCalcType(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white">{Object.keys(prizeTable[calcGame] || {}).map(t => <option key={t} value={t}>{t}</option>)}</select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] uppercase font-bold text-gray-500">WAGER</label><div className="relative"><span className="absolute left-2 top-2 text-gray-400">$</span><input type="number" value={calcWager} onChange={e => setCalcWager(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 pl-6 text-white" /></div></div><div className="flex items-end"><label className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded p-2 w-full cursor-pointer hover:bg-slate-700"><span className="text-xs font-bold text-gray-300">Is New York?</span><input type="checkbox" checked={calcIsNY} onChange={e => setCalcIsNY(e.target.checked)} className="accent-neon-cyan w-4 h-4 ml-auto" /></label></div></div></div><div className="bg-black/40 rounded-xl border border-neon-cyan/20 flex flex-col items-center justify-center p-4 relative overflow-hidden"><div className="absolute inset-0 bg-neon-cyan/5"></div><p className="text-[10px] uppercase text-neon-cyan font-bold tracking-widest relative z-10">ESTIMATED PAYOUT</p><p className="text-4xl font-black text-green-400 font-mono relative z-10 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">${getCalculatedPayout().toLocaleString('en-US', { minimumFractionDigits: 2 })}</p></div></div></div><div className="lg:col-span-1 bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col max-h-[300px]"><h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Game Rules Reference</h3><div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">{GAME_RULES_TEXT.map((rule, idx) => (<div key={idx} className="border border-slate-700 rounded bg-slate-900/50"><button onClick={() => setActiveRule(activeRule === idx ? null : idx)} className="w-full flex justify-between p-2 text-xs font-bold text-gray-300 hover:text-white">{rule.title} <span>{activeRule === idx ? '-' : '+'}</span></button>{activeRule === idx && <div className="p-2 text-[10px] text-gray-400 border-t border-slate-700 whitespace-pre-line">{rule.content}</div>}</div>))}</div></div></div><div><h3 className="text-lg font-bold text-neon-cyan mb-4">Payout Configuration</h3><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Object.keys(prizeTable).map(game => (<div key={game} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-md hover:border-slate-600 transition-colors"><div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2"><h4 className="font-bold text-white text-base">{game}</h4><span className="text-[10px] text-slate-500 uppercase">Per $1</span></div><div className="grid grid-cols-2 gap-3">{Object.keys(prizeTable[game]).map(type => (<div key={type}><label className="block text-[9px] uppercase text-gray-500 font-bold mb-1">{type.replace(/_/g, ' ')}</label><div className="relative"><span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span><input type="number" value={prizeTable[game][type]} onChange={(e) => handlePrizeTableChange(game, type, e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 pl-5 text-sm text-white focus:border-neon-cyan outline-none font-mono" /></div></div>))}</div></div>))}</div></div><div className="bg-slate-800 rounded-xl border border-neon-cyan/30 p-1 shadow-lg shadow-neon-cyan/5"><div className="bg-slate-900/80 rounded-lg p-5"><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><svg className="text-purple-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg> Payout Scenario Simulator</h3><div className="flex flex-col lg:flex-row gap-6"><div className="flex-1 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-black/30 p-3 rounded border border-slate-700"><p className="text-[10px] text-neon-cyan uppercase font-bold mb-2">Test Play</p><div className="grid grid-cols-2 gap-2 mb-2"><input type="text" placeholder="Bet Number (e.g. 123)" value={simBet} onChange={e => setSimBet(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" /><select value={simMode} onChange={e => setSimMode(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm">{Object.keys(prizeTable).map(g => <option key={g} value={g}>{g}</option>)}</select></div><div className="grid grid-cols-3 gap-2"><input type="number" placeholder="Str $" value={simStr} onChange={e => setSimStr(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs text-center" /><input type="number" placeholder="Box $" value={simBox} onChange={e => setSimBox(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs text-center" /><input type="number" placeholder="Com $" value={simCom} onChange={e => setSimCom(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs text-center" /></div></div><div className="bg-black/30 p-3 rounded border border-slate-700"><p className="text-[10px] text-orange-400 uppercase font-bold mb-2">Hypothetical Result</p><div className="grid grid-cols-3 gap-2 mb-2"><input type="text" placeholder="1st" value={simRes1} onChange={e => setSimRes1(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs text-center" /><input type="text" placeholder="2nd" value={simRes2} onChange={e => setSimRes2(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs text-center" /><input type="text" placeholder="3rd" value={simRes3} onChange={e => setSimRes3(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs text-center" /></div><div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Pick 3" value={simResP3} onChange={e => setSimResP3(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs text-center" /><input type="text" placeholder="Pick 4" value={simResP4} onChange={e => setSimResP4(e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-2 text-white text-xs text-center" /></div></div></div><button onClick={handleRunSimulator} className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg transform hover:scale-[1.01] transition-all">RUN SCENARIO</button></div><div className="flex-1 bg-black/50 rounded border border-slate-700 p-4 flex flex-col justify-center min-h-[150px]">{!simOutput ? (<p className="text-center text-gray-500 text-sm">Enter data and run to see results.</p>) : simOutput.length === 0 ? (<div className="text-center"><p className="text-red-500 font-bold text-lg">NO WIN</p><p className="text-xs text-gray-500">The played numbers did not match the result based on {simMode} rules.</p></div>) : (<div className="space-y-3 w-full"><div className="text-center border-b border-gray-700 pb-2"><p className="text-green-400 font-black text-3xl drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">WINNER!</p><p className="text-sm text-white font-bold">Total: ${simOutput.reduce((a, b) => a + b.prizeAmount, 0).toFixed(2)}</p></div><div className="space-y-1">{simOutput.map((win, idx) => (<div key={idx} className="flex justify-between text-xs bg-slate-800/50 p-2 rounded"><span className="text-cyan-400 font-bold">{win.matchType}</span><span className="text-white">${win.prizeAmount.toFixed(2)}</span></div>))}</div></div>)}</div></div></div></div></div>)}
                {activeTab === 'strategy' && (
                    <div className="h-[calc(100vh-140px)]">
                        <SniperFrame mode="admin" />
                    </div>
                )}
            </div>

            {/* MODALS */}
            {isDeleteModalOpen && (<div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"><div className="bg-slate-800 p-6 rounded-xl border border-red-500/50 shadow-2xl max-w-sm w-full text-center"><h3 className="text-xl font-bold text-white mb-2">Confirm Deletion</h3><p className="text-sm text-gray-400 mb-4">This action cannot be undone.</p><input type="password" placeholder="Enter PIN" value={deletePin} onChange={e => setDeletePin(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-center text-white mb-4 focus:border-red-500 outline-none" autoFocus /><div className="flex gap-2"><button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2 bg-slate-700 text-white rounded">Cancel</button><button onClick={handleConfirmDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded">DELETE</button></div></div></div>)}
            {isUserModalOpen && (<div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] animate-fade-in" onClick={() => setIsUserModalOpen(false)}><div className="bg-slate-800 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}><div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-2xl"><h3 className="text-xl font-bold text-white flex items-center gap-2">{editingUser ? (<><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg> Edit User</>) : (<><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" x2="20" y1="8" y2="14" /><line x1="23" x2="17" y1="11" y2="11" /></svg> Create New User</>)}</h3><button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">✕</button></div><div className="flex-1 overflow-y-auto p-6 space-y-6"><form id="userForm" onSubmit={handleSaveUser}><div className="space-y-4"><h4 className="text-xs uppercase font-bold text-neon-cyan border-b border-slate-700 pb-1 mb-2">Identity</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Full Name</label><input type="text" required className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-neon-cyan outline-none" value={newUserForm.name || ''} onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })} /></div><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Email</label><input type="email" required className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-neon-cyan outline-none" value={newUserForm.email || ''} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} /></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Role</label><select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-neon-cyan outline-none" value={newUserForm.role || 'user'} onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as any })}><option value="user">User</option><option value="admin">Admin</option></select></div><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Status</label><select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-neon-cyan outline-none" value={newUserForm.status || 'active'} onChange={e => setNewUserForm({ ...newUserForm, status: e.target.value as any })}><option value="active">Active</option><option value="suspended">Suspended</option></select></div></div><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Network / Sponsor</label><select className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-neon-cyan outline-none" value={newUserForm.sponsorId || ''} onChange={e => setNewUserForm({ ...newUserForm, sponsorId: e.target.value })}><option value="">-- No Sponsor (Root) --</option>{users.filter(u => u.id !== editingUser?.id).map(u => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}</select></div></div><div className="space-y-4 mt-6"><h4 className="text-xs uppercase font-bold text-blue-400 border-b border-slate-700 pb-1 mb-2">Profile Details</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Phone</label><input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-blue-400 outline-none" value={newUserForm.phone || ''} onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })} /></div><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Address</label><input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-blue-400 outline-none" value={newUserForm.address || ''} onChange={e => setNewUserForm({ ...newUserForm, address: e.target.value })} /></div></div><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Admin Notes</label><textarea className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-blue-400 outline-none h-20" value={newUserForm.notes || ''} onChange={e => setNewUserForm({ ...newUserForm, notes: e.target.value })} placeholder="Internal notes about this user..." /></div></div><div className="space-y-4 mt-6 bg-red-500/5 p-4 rounded-lg border border-red-500/20"><h4 className="text-xs uppercase font-bold text-red-400 border-b border-red-500/20 pb-1 mb-2">Security Zone</h4><div><label className="block text-xs uppercase text-gray-500 font-bold mb-1">Set New Password</label><div className="flex gap-2"><input type="text" className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white focus:border-red-400 outline-none font-mono" placeholder={editingUser ? "Leave blank to keep current" : "Required for new user"} value={newUserForm.password || ''} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} /><button type="button" onClick={() => setNewUserForm({ ...newUserForm, password: Math.random().toString(36).slice(-8) })} className="px-3 py-2 bg-slate-700 text-xs font-bold text-white rounded hover:bg-slate-600">Generate</button></div></div></div></form></div><div className="p-5 border-t border-slate-700 bg-slate-900/50 rounded-b-2xl flex justify-end gap-3"><button onClick={() => setIsUserModalOpen(false)} className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors">Cancel</button><button type="submit" form="userForm" className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-neon-cyan to-blue-600 hover:brightness-110 text-white font-bold shadow-lg transition-transform hover:-translate-y-0.5">{editingUser ? 'Save Changes' : 'Create User'}</button></div></div></div>)}
            {selectedTicket && (<TicketModal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} plays={selectedTicket.plays} selectedTracks={selectedTicket.tracks} selectedDates={selectedTicket.betDates} grandTotal={selectedTicket.grandTotal} ticketNumber={selectedTicket.ticketNumber} isConfirmed={true} setIsConfirmed={() => { }} setTicketNumber={() => { }} ticketImageBlob={null} setTicketImageBlob={() => { }} terminalId="ADMIN-VIEW" cashierId="ADMIN" onSaveTicket={() => { }} isSaving={false} serverHealth="online" lastSaveStatus="success" variant="admin" resultsContext={results} />)}
            {isAddResultOpen && (<div className="fixed inset-0 bg-black/90 z-[250] flex items-center justify-center p-4"><div className="bg-slate-800 w-full max-w-md p-6 rounded-xl border border-slate-600 shadow-2xl"><h3 className="text-xl font-bold text-white mb-6">Add Result to Local DB</h3><form onSubmit={handleSaveResult} className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Date</label><input type="date" required value={viewResultsDate} onChange={e => setViewResultsDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-neon-cyan" /></div><div><label className="block text-[10px] uppercase text-gray-400 font-bold mb-1">Lottery</label><select required value={newResultTrack} onChange={e => setNewResultTrack(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white outline-none focus:border-neon-cyan"><option value="">Select...</option>{allTracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div></div><div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4"><div className="grid grid-cols-3 gap-3"><div><label className="block text-center text-xs font-bold text-blue-400 mb-1">1st</label><input type="text" maxLength={2} value={newResult1st} onChange={e => setNewResult1st(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-xl font-bold text-white focus:border-blue-500 outline-none" placeholder="00" /></div><div><label className="block text-center text-xs font-bold text-gray-400 mb-1">2nd</label><input type="text" maxLength={2} value={newResult2nd} onChange={e => setNewResult2nd(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-lg text-gray-300 focus:border-gray-500 outline-none" placeholder="00" /></div><div><label className="block text-center text-xs font-bold text-gray-400 mb-1">3rd</label><input type="text" maxLength={2} value={newResult3rd} onChange={e => setNewResult3rd(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-lg text-gray-300 focus:border-gray-500 outline-none" placeholder="00" /></div></div><div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700"><div><label className="block text-xs text-purple-400 mb-1">Pick 3</label><input type="text" maxLength={3} value={newResultP3} onChange={e => setNewResultP3(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-white font-mono focus:border-purple-500 outline-none" placeholder="000" /></div><div><label className="block text-xs text-orange-400 mb-1">Pick 4</label><input type="text" maxLength={4} value={newResultP4} onChange={e => setNewResultP4(e.target.value)} className="w-full bg-black border border-slate-600 rounded p-2 text-center text-white font-mono focus:border-orange-500 outline-none" placeholder="0000" /></div></div></div><div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsAddResultOpen(false)} className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-600 transition-colors">Cancel</button><button type="submit" className="px-6 py-2 rounded bg-neon-cyan text-black font-bold hover:brightness-110 transition-all shadow-[0_0_10px_rgba(0,255,255,0.3)]">Save</button></div></form></div></div>)}
            <WalletManagerModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} user={selectedUserForWallet} onSuccess={() => { loadUsersFromDb(); }} />
        </div>
    );
};

export default AdminDashboard;
