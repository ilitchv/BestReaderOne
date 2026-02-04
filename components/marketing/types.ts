// Domain Models for the Casino Logic

export interface SystemSettings {
    surchargePercent: number; // e.g., 0.10 for 10%
    initialRTP: number; // e.g., 0.90 for 90%
    minRTP: number; // e.g., 0.60 for 60%
    currentRTP: number; // Dynamic variable
    decayRate: number; // e.g., 0.005 for 0.5% drop per win
    globalPool: number; // The accumulated money

    // Specific Prize Probabilities (0.0 to 1.0)
    // These should roughly sum up to <= currentRTP (normalized in logic)
    oddsJackpot: number; // 100% Off
    oddsTier2: number;   // 50% Off
    oddsTier3: number;   // 15% Off
}

export interface UserProfile {
    id: string;
    name: string;
    phoneNumber: string;
    totalSpent: number;
    totalWon: number;
    gamesPlayed: number;
    consecutiveLosses: number;
}

export enum GameOutcome {
    WIN = 'WIN',
    LOSS = 'LOSS',
    NEAR_MISS = 'NEAR_MISS',
}

export interface SpinResult {
    outcome: GameOutcome;
    billAmount: number;
    surchargeAmount: number;
    finalPayout: number; // 0 if loss, billAmount if win
    isLoyaltyRescue: boolean; // Was this forced by the algorithm?
    stopAngle: number; // For the UI animation
    prizeLabel: string; // "100% OFF", "50% OFF", etc.
}

export type ViewState = 'HOME' | 'GAME' | 'SPINNING' | 'RESULT' | 'ADMIN';
