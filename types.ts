
export interface Play {
  id: number;
  betNumber: string;
  gameMode: string;
  straightAmount: number | null;
  boxAmount: number | null;
  comboAmount: number | null;
  paymentStatus?: 'pending' | 'paid' | 'unpaid'; // NEW: Track payment status per play
}

export interface WizardPlay {
    betNumber: string;
    gameMode: string;
    straight: number | null;
    box: number | null;
    combo: number | null;
}

export interface Track {
  name: string;
  id: string;
}

export interface TrackCategory {
  name: string;
  tracks: Track[];
}

export interface OcrResult {
  betNumber: string;
  straightAmount: number | null;
  boxAmount: number | null;
  comboAmount: number | null;
}

export interface ImageInterpretationResult {
  plays: OcrResult[];
  detectedTracks: string[];
  detectedDate: string | null;
}


export interface CopiedWagers {
  straightAmount: number | null;
  boxAmount: number | null;
  comboAmount: number | null;
}

export type ChatUser = 'user' | 'bot' | 'system';

export interface ChatMessage {
  id: number;
  user: ChatUser;
  text?: string;
  interpretationResult?: ImageInterpretationResult;
  isLoading?: boolean;
}

export interface LotteryResult {
    resultId: string;
    country: 'USA' | 'SD' | 'SPECIAL';
    lotteryName: string;
    drawName: string;
    numbers: string;
    drawDate: string;
    scrapedAt: string;
    lastDrawTime?: string;
    closeTime?: string;
}

// --- NEW: WINNING RESULT FOR ADMIN ---
export interface WinningResult {
    id: string; // Unique ID (Date + TrackID)
    date: string; // YYYY-MM-DD
    lotteryId: string;
    lotteryName: string;
    first: string;
    second: string;
    third: string;
    pick3: string;
    pick4: string;
    createdAt: string;
}

// --- AUDIT LOG ENTRY ---
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'FINANCE' | 'PAYOUT' | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE' | 'USER_APPROVE' | 'USER_REJECT';
    targetId: string; // The ID of the result/user affected
    details: string; // Description
    user: string; // Usually 'Admin'
    amount?: number; // Optional financial amount
}

export type ServerHealth = 'checking' | 'offline' | 'db_error' | 'online';

export interface TicketData {
    ticketNumber: string;
    transactionDateTime: Date | string;
    betDates: string[];
    tracks: string[];
    grandTotal: number;
    // Enhanced play data for auditing
    plays: (Play & { totalAmount: number; jugadaNumber: number; timestamp: string })[]; 
    ticketImage?: string; 
    syncStatus?: 'local' | 'synced' | 'failed';
    savedAt?: string;
    userId?: string; // NEW: Link ticket to user
}

// --- PRIZE CALCULATOR TYPES ---
export interface PrizeTable {
    [game: string]: {
        [type: string]: number;
    };
}

export interface CalculationResult {
    ticketNumber: string;
    playNumber: number; // 1-based index
    trackName: string;
    betNumber: string;
    gameMode: string;
    wagerType: 'STRAIGHT' | 'BOX' | 'COMBO';
    wagerAmount: number;
    prizeAmount: number;
    matchType: string; // e.g. "Exact Match", "Box 6-Way"
}

// --- CATALOG ITEM ---
export interface CatalogItem {
    id: string;
    section: 'usa' | 'rd' | 'special';
    lottery: string;
    draw: string;
    drawTime: string;
    closeTime: string;
    days: number[];
    visible: boolean;
}

// --- USER MANAGEMENT ---
export interface User {
    id: string;
    email: string;
    password?: string; // Only used for mock auth/reset
    name: string;
    role: 'admin' | 'user';
    status: 'active' | 'suspended' | 'pending';
    balance: number;
    pendingBalance: number;
    phone?: string;
    address?: string;
    notes?: string;
    createdAt: string;
    avatarUrl?: string;
    sponsorId?: string; // NEW: Referral System
}
