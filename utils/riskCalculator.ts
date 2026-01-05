
import { Play, PrizeTable } from '../types';

// Helper to normalize any bet string to pure digits
const clean = (s: string) => s.trim().replace(/\s+/g, '').replace(/\D/g, '');

// Factorial for permutation calcs
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

// Permutation count helper for Box plays
const getPermutationCount = (numStr: string, length: number): number => {
    const freq: { [k: string]: number } = {};
    for (const char of numStr) freq[char] = (freq[char] || 0) + 1;
    const denom = Object.values(freq).reduce((acc, val) => acc * fact(val), 1);
    return fact(length) / denom;
};

/**
 * Calculates the Maximum Potential Payout (Risk) for a play.
 * Assumes the play wins in the most valuable way possible (Perfect Match).
 */
export const calculatePotentialPayout = (
    play: Play,
    prizeTable: PrizeTable,
    trackName: string = ''
): number => {
    // 1. Normalize Game Mode Key
    let modeKey = play.gameMode;
    if (modeKey.startsWith('Pulito')) modeKey = 'Pulito';
    if (modeKey.startsWith('Single Action')) modeKey = 'Single Action';

    const table = prizeTable[modeKey];
    if (!table) return 0;

    let totalRisk = 0;
    const betNum = clean(play.betNumber);

    // Business Rule: NY Tracks differ in payout? (Usually half for Pick 3/Win 4 compared to standard if configured)
    // For Risk Calculation, we should be Conservative and assume HIGHEST payout if unsure, 
    // OR respect the specific track rule if provided.
    // Assuming standard payouts unless logic dictates otherwise. 
    // If the AdminDashboard prize table already accounts for NY difference via separate keys or logic, we use table.
    // However, the prizeCalculator uses a hardcoded 'isNY' check. We should replicate that or assume worst-case (non-NY = higher payout) for safety?
    // Actually, NY pays MORE or LESS? Usually standard is 500/5000. 
    // prizeCalculator says: if (!isNY) multiplier = multiplier / 2; -> NY pays DOUBLE (Standard) compared to others?
    // Let's assume Standard (High Risk) for safety if trackName not provided.
    const isNY = trackName ? (trackName.toLowerCase().includes('new york') || trackName.toLowerCase().includes('horses')) : true;

    // -------------------------
    // PICK 3
    // -------------------------
    if (play.gameMode === 'Pick 3') {
        const isTriple = (betNum.length === 3) && (betNum[0] === betNum[1] && betNum[1] === betNum[2]);

        // STRAIGHT RISK
        if (play.straightAmount && play.straightAmount > 0) {
            const multiplier = isTriple ? (table.STRAIGHT_TRIPLE || 500) : (table.STRAIGHT || 700); // Standard 500/700
            totalRisk += play.straightAmount * multiplier;
        }

        // BOX RISK
        if (play.boxAmount && play.boxAmount > 0) {
            // Box pays a fixed pool divided by permutations.
            // Risk is strictly the payout amount.
            // Example: 6-way box on $1 bet pays roughly $116 ($700/6) or fixed amount.
            // We use the same formula as calculator.

            if (isTriple) {
                // Triple has NO box. It's a straight. But if they bet box... it's 0 risk technically or treated as straight?
                // Usually Box on Triple is invalid or treated as Straight. Let's assume 0 to be safe/strict, or straight if system allows.
            } else {
                const perms = getPermutationCount(betNum, 3);
                // Standard payout pool is 700 (or table.STRAIGHT)
                const pool = (table.STRAIGHT || 700);
                totalRisk += play.boxAmount * (pool / perms);
            }
        }

        // COMBO RISK
        if (play.comboAmount && play.comboAmount > 0) {
            // Combo = Straight bet on EVERY permutation.
            // Risk = Winning ONE of them (which is a Straight Win).
            // Payout for a Combo win is exactly the Straight Payout.
            const multiplier = isTriple ? (table.STRAIGHT_TRIPLE || 500) : (table.STRAIGHT || 700);
            totalRisk += play.comboAmount * multiplier;
        }
    }
    // -------------------------
    // WIN 4
    // -------------------------
    else if (play.gameMode === 'Win 4') {
        let straightMult = table.STRAIGHT || 5000;
        if (!isNY) straightMult = straightMult / 2; // Lower risk on non-NY

        // STRAIGHT
        if (play.straightAmount && play.straightAmount > 0) {
            totalRisk += play.straightAmount * straightMult;
        }

        // BOX
        if (play.boxAmount && play.boxAmount > 0) {
            const perms = getPermutationCount(betNum, 4);
            // Table might have explicit box keys
            let boxMult = 0;
            if (perms === 24) boxMult = table.BOX_24WAY || 200;
            else if (perms === 12) boxMult = table.BOX_12WAY || 400;
            else if (perms === 6) boxMult = table.BOX_6WAY || 800;
            else if (perms === 4) boxMult = table.BOX_4WAY || 1200;

            if (!isNY) boxMult = boxMult / 2;

            totalRisk += play.boxAmount * boxMult;
        }

        // COMBO
        if (play.comboAmount && play.comboAmount > 0) {
            // Pays straight amount per dollar
            totalRisk += play.comboAmount * straightMult;
        }
    }
    // -------------------------
    // VENEZUELA
    // -------------------------
    else if (play.gameMode === 'Venezuela') {
        // Highest Risk is hitting 1st Place (Highest Multiplier)
        // Straight: x55 (First) vs x15 vs x10. Worst case: x55
        if (play.straightAmount && play.straightAmount > 0) {
            totalRisk += play.straightAmount * (table.FIRST || 55);
        }
        // Box: x27.5 (First Box)
        if (play.boxAmount && play.boxAmount > 0) {
            totalRisk += play.boxAmount * (table.FIRST_BOX || 27.5);
        }
    }
    // -------------------------
    // PALÉ (USA)
    // -------------------------
    else if (play.gameMode === 'Palé') {
        // Straight: Matches 1st and 2nd (Highest Payout)
        if (play.straightAmount && play.straightAmount > 0) {
            totalRisk += play.straightAmount * (table.WIN_FULL || 700); // Usually $1000 or $700 depending on config
        }
        // Box: Matches Box
        if (play.boxAmount && play.boxAmount > 0) {
            totalRisk += play.boxAmount * (table.WIN_BOX || 175);
        }
    }
    // -------------------------
    // RD QUINIELA
    // -------------------------
    else if (play.gameMode === 'RD-Quiniela') {
        if (play.straightAmount && play.straightAmount > 0) {
            totalRisk += play.straightAmount * (table.FIRST || 60); // 60 is common, or 56
        }
        if (play.boxAmount && play.boxAmount > 0) {
            totalRisk += play.boxAmount * (table.FIRST_BOX || 30);
        }
    }
    // -------------------------
    // PALE RD
    // -------------------------
    else if (play.gameMode === 'Pale-RD') {
        // Highest payout is Full First+Second
        if (play.straightAmount && play.straightAmount > 0) {
            totalRisk += play.straightAmount * (table.WIN_FULL || 1300);
        }
        if (play.boxAmount && play.boxAmount > 0) {
            totalRisk += play.boxAmount * (table.BOX_FULL || 325);
        }
    }
    // -------------------------
    // PULITO
    // -------------------------
    else if (play.gameMode.startsWith('Pulito')) {
        // Straight x80
        if (play.straightAmount && play.straightAmount > 0) {
            totalRisk += play.straightAmount * (table.STRAIGHT || 80);
        }
        // Box x40
        if (play.boxAmount && play.boxAmount > 0) {
            totalRisk += play.boxAmount * (table.BOX || 40);
        }
    }

    return totalRisk;
};
