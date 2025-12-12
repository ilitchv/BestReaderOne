
import { Play, WinningResult, PrizeTable, CalculationResult } from '../types';

// Helper to normalize any bet string to pure digits (and remove whitespace)
// UPDATED: Now also trims outer whitespace first for robustness
const clean = (s: string) => s.trim().replace(/\s+/g, '').replace(/\D/g, '');

// Helper to check permutations between two sets of digits
// Checks if set A contains same digits as set B regardless of order
const isPermutation = (numA: string, numB: string): boolean => {
    if (numA.length !== numB.length) return false;
    return numA.split('').sort().join('') === numB.split('').sort().join('');
};

// Helper to count unique digits to determine box type
const getPermutationType = (numStr: string, length: number): number => {
    const freq: {[k:string]:number} = {};
    for(const char of numStr) freq[char] = (freq[char] || 0) + 1;
    
    // Factorial calc
    const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
    
    // N! / (n1! * n2! ...)
    const denom = Object.values(freq).reduce((acc, val) => acc * fact(val), 1);
    return fact(length) / denom;
};

const isNewYorkTrack = (trackName: string): boolean => {
    const lower = trackName.toLowerCase();
    return lower.includes('new york') || lower.includes('horses');
};

export const calculateWinnings = (
    play: Play,
    result: WinningResult,
    prizeTable: PrizeTable
): CalculationResult[] => {
    const winners: CalculationResult[] = [];
    
    // NORMALIZE MODE KEY: Strip suffix (e.g. "Pulito-2" -> "Pulito")
    let modeKey = play.gameMode;
    if (modeKey.startsWith('Pulito')) modeKey = 'Pulito';
    if (modeKey.startsWith('Single Action')) modeKey = 'Single Action';

    const table = prizeTable[modeKey];
    const isNY = isNewYorkTrack(result.lotteryName);
    
    if (!table) return [];

    // --- BUSINESS RULE: HORSES DOES NOT SUPPORT VENEZUELA ---
    // User requested explicit incompatibility logic here.
    const isHorses = result.lotteryName.toLowerCase().includes('horses') || result.lotteryName.includes('Race');
    if (isHorses && play.gameMode === 'Venezuela') {
        return [];
    }

    // --- DERIVATION LOGIC (Banker Rules) ---
    // If explicit positions (1st, 2nd, 3rd) are missing (e.g. USA Track results),
    // derive them from Pick 3 and Pick 4 numbers.
    
    const p3 = result.pick3 ? clean(result.pick3) : '';
    const p4 = result.pick4 ? clean(result.pick4) : '';

    let win1 = result.first ? clean(result.first).slice(-2) : '';
    let win2 = result.second ? clean(result.second).slice(-2) : '';
    let win3 = result.third ? clean(result.third).slice(-2) : '';

    // Rule: 1st = Pick 3 Last 2
    if (!win1 && p3.length >= 2) win1 = p3.slice(-2);
    
    // Rule: 2nd = Win 4 First 2
    if (!win2 && p4.length >= 2) win2 = p4.slice(0, 2);
    
    // Rule: 3rd = Win 4 Last 2
    if (!win3 && p4.length >= 2) win3 = p4.slice(-2);

    // -------------------------
    // PICK 3
    // -------------------------
    if (play.gameMode === 'Pick 3') {
        const winningNum = p3;
        if (winningNum.length === 3) {
            const betNum = clean(play.betNumber);
            const isTriple = betNum[0] === betNum[1] && betNum[1] === betNum[2];

            // 1. STRAIGHT
            if (play.straightAmount && play.straightAmount > 0) {
                if (betNum === winningNum) {
                    const amount = isTriple ? (table.STRAIGHT_TRIPLE || 500) : (table.STRAIGHT || 700);
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, 
                        prizeAmount: play.straightAmount * amount, 
                        matchType: 'Exact Order'
                    });
                }
            }

            // 2. BOX (Strict Math: 700/3 or 700/6)
            if (play.boxAmount && play.boxAmount > 0 && !isTriple) {
                if (isPermutation(betNum, winningNum)) {
                    const perms = getPermutationType(winningNum, 3);
                    let prizeUnit = 0;
                    let type = '';

                    if (perms === 6) { prizeUnit = 700.0 / 6.0; type = 'Box 6-Way'; }
                    else if (perms === 3) { prizeUnit = 700.0 / 3.0; type = 'Box 3-Way'; }

                    if (prizeUnit > 0) {
                        winners.push({
                            ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                            wagerType: 'BOX', wagerAmount: play.boxAmount, prizeAmount: play.boxAmount * prizeUnit, matchType: type
                        });
                    }
                }
            }

            // 3. COMBO (Pays Straight if ANY permutation matches)
            if (play.comboAmount && play.comboAmount > 0) {
                if (isPermutation(betNum, winningNum)) {
                    const amount = isTriple ? (table.STRAIGHT_TRIPLE || 500) : (table.STRAIGHT || 700);
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'COMBO', wagerAmount: play.comboAmount, 
                        prizeAmount: play.comboAmount * amount, 
                        matchType: 'Combo Win (Straight Payout)'
                    });
                }
            }
        }
    } 
    // -------------------------
    // WIN 4
    // -------------------------
    else if (play.gameMode === 'Win 4') {
        const winningNum = p4;
        if (winningNum.length === 4) {
            const betNum = clean(play.betNumber);

            // 1. STRAIGHT
            if (play.straightAmount && play.straightAmount > 0) {
                if (betNum === winningNum) {
                    let multiplier = table.STRAIGHT || 5000;
                    if (!isNY) multiplier = multiplier / 2; 
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'STRAIGHT', wagerAmount: play.straightAmount, prizeAmount: play.straightAmount * multiplier, matchType: 'Exact Order'
                    });
                }
            }

            // 2. BOX
            if (play.boxAmount && play.boxAmount > 0) {
                if (isPermutation(betNum, winningNum)) {
                    const perms = getPermutationType(winningNum, 4);
                    let multiplier = 0;
                    let type = '';

                    if (perms === 24) { multiplier = table.BOX_24WAY || 200; type = 'Box 24-Way'; }
                    else if (perms === 12) { multiplier = table.BOX_12WAY || 400; type = 'Box 12-Way'; }
                    else if (perms === 6) { multiplier = table.BOX_6WAY || 800; type = 'Box 6-Way'; }
                    else if (perms === 4) { multiplier = table.BOX_4WAY || 1200; type = 'Box 4-Way'; }

                    if (!isNY) { multiplier = multiplier / 2; type += ' (Non-NY)'; }

                    if (multiplier > 0) {
                        winners.push({
                            ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                            wagerType: 'BOX', wagerAmount: play.boxAmount, prizeAmount: play.boxAmount * multiplier, matchType: type
                        });
                    }
                }
            }

            // 3. COMBO
            if (play.comboAmount && play.comboAmount > 0) {
                if (isPermutation(betNum, winningNum)) {
                    let multiplier = table.STRAIGHT || 5000;
                    if (!isNY) multiplier = multiplier / 2; 
                    
                    winners.push({
                        ticketNumber: '', playNumber: 0, trackName: result.lotteryName, betNumber: play.betNumber, gameMode: play.gameMode,
                        wagerType: 'COMBO', wagerAmount: play.comboAmount, 
                        prizeAmount: play.comboAmount * multiplier, 
                        matchType: 'Combo Win (Straight Payout)'
                    });
                }
            }
        }
    } 
    // -------------------------
    // VENEZUELA (Derived positions)
    // -------------------------
    else if (play.gameMode === 'Venezuela') {
        const betNum = clean(play.betNumber).slice(-2);
        
        // STRAIGHT
        if (play.straightAmount && play.straightAmount > 0) {
            if (betNum === win1) winners.push({ ...baseWin(play, result, play.straightAmount * (table.FIRST || 55), '1st Prize') });
            if (betNum === win2) winners.push({ ...baseWin(play, result, play.straightAmount * (table.SECOND || 15), '2nd Prize') });
            if (betNum === win3) winners.push({ ...baseWin(play, result, play.straightAmount * (table.THIRD || 10), '3rd Prize') });
        }
        // BOX (Permutations allowed, Half Prize)
        if (play.boxAmount && play.boxAmount > 0) {
            if (isPermutation(betNum, win1)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.FIRST_BOX || 27.5), '1st Box') });
            if (isPermutation(betNum, win2)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.SECOND_BOX || 7.5), '2nd Box') });
            if (isPermutation(betNum, win3)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.THIRD_BOX || 5), '3rd Box') });
        }
    }
    // -------------------------
    // PALE USA (Uses derived positions from Venezuela logic)
    // -------------------------
    else if (play.gameMode === 'Palé') {
        const parts = play.betNumber.split(/[-]/).map(clean);
        if (parts.length === 2) {
            const p1 = parts[0];
            const p2 = parts[1];
            
            // Normalize wins for comparison (default to 'XX' if missing to prevent false match on empty string)
            const w1 = win1 || 'XX';
            const w2 = win2 || 'YY';
            const w3 = win3 || 'ZZ';

            // Helpers
            const matchS = (myNum: string, winNum: string) => myNum === winNum;
            const matchB = (myNum: string, winNum: string) => isPermutation(myNum, winNum);

            // STRAIGHT ($700): Any combination of positions
            if (play.straightAmount && play.straightAmount > 0) {
                const checkStraightPair = (wA: string, wB: string) => (matchS(p1, wA) && matchS(p2, wB)) || (matchS(p1, wB) && matchS(p2, wA));
                
                if (checkStraightPair(w1, w2) || checkStraightPair(w1, w3) || checkStraightPair(w2, w3)) {
                     winners.push({ ...baseWin(play, result, play.straightAmount * (table.WIN_FULL || 700), 'Palé Straight') });
                }
            }

            // BOX ($175)
            if (play.boxAmount && play.boxAmount > 0) {
                const checkBoxPair = (wA: string, wB: string) => (matchB(p1, wA) && matchB(p2, wB)) || (matchB(p1, wB) && matchB(p2, wA));
                
                if (checkBoxPair(w1, w2) || checkBoxPair(w1, w3) || checkBoxPair(w2, w3)) {
                     winners.push({ ...baseWin(play, result, play.boxAmount * (table.WIN_BOX || 175), 'Palé Box') });
                }
            }
        }
    }
    // -------------------------
    // RD QUINIELA
    // -------------------------
    else if (play.gameMode === 'RD-Quiniela') {
        const betNum = clean(play.betNumber).slice(-2);
        
        // STRAIGHT
        if (play.straightAmount && play.straightAmount > 0) {
            if (betNum === win1) winners.push({ ...baseWin(play, result, play.straightAmount * (table.FIRST || 56), '1st Prize') });
            if (betNum === win2) winners.push({ ...baseWin(play, result, play.straightAmount * (table.SECOND || 12), '2nd Prize') });
            if (betNum === win3) winners.push({ ...baseWin(play, result, play.straightAmount * (table.THIRD || 4), '3rd Prize') });
        }
        // BOX
        if (play.boxAmount && play.boxAmount > 0) {
            if (isPermutation(betNum, win1)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.FIRST_BOX || 28), '1st Box') });
            if (isPermutation(betNum, win2)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.SECOND_BOX || 6), '2nd Box') });
            if (isPermutation(betNum, win3)) winners.push({ ...baseWin(play, result, play.boxAmount * (table.THIRD_BOX || 2), '3rd Box') });
        }
    }
    // -------------------------
    // PALE-RD (Strict Rules)
    // -------------------------
    else if (play.gameMode === 'Pale-RD') {
        const parts = play.betNumber.split(/[-]/).map(clean);
        if (parts.length === 2) {
            const p1 = parts[0];
            const p2 = parts[1];
            
            const w1 = win1 || 'XX';
            const w2 = win2 || 'YY';
            const w3 = win3 || 'ZZ';

            const exact = (a:string, b:string) => a === b;
            const perm = (a:string, b:string) => isPermutation(a, b);
            
            // STRAIGHT LOGIC
            if (play.straightAmount && play.straightAmount > 0) {
                // FULL: 1st + 2nd ONLY
                if ((exact(p1, w1) && exact(p2, w2)) || (exact(p1, w2) && exact(p2, w1))) {
                    winners.push({ ...baseWin(play, result, play.straightAmount * (table.WIN_FULL || 1300), 'Palé Full (1st+2nd)') });
                }
                // PARCIAL: (1st + 3rd) OR (2nd + 3rd)
                else {
                    const match13 = (exact(p1, w1) && exact(p2, w3)) || (exact(p1, w3) && exact(p2, w1));
                    const match23 = (exact(p1, w2) && exact(p2, w3)) || (exact(p1, w3) && exact(p2, w2));
                    if (match13 || match23) {
                        winners.push({ ...baseWin(play, result, play.straightAmount * (table.WIN_PARCIAL || 200), 'Palé Parcial') });
                    }
                }
            }

            // BOX LOGIC
            if (play.boxAmount && play.boxAmount > 0) {
                if ((perm(p1, w1) && perm(p2, w2)) || (perm(p1, w2) && perm(p2, w1))) {
                    winners.push({ ...baseWin(play, result, play.boxAmount * (table.BOX_FULL || 325), 'Box Full (1st+2nd)') });
                }
                else {
                    const match13 = (perm(p1, w1) && perm(p2, w3)) || (perm(p1, w3) && perm(p2, w1));
                    const match23 = (perm(p1, w2) && perm(p2, w3)) || (perm(p1, w3) && perm(p2, w2));
                    if (match13 || match23) {
                        winners.push({ ...baseWin(play, result, play.boxAmount * (table.BOX_PARCIAL || 50), 'Box Parcial') });
                    }
                }
            }
        }
    }
    // -------------------------
    // PULITO (4 Positions)
    // -------------------------
    else if (play.gameMode.startsWith('Pulito')) {
        const specifiedPositions = play.gameMode.split('-')[1]?.split(',').map(Number) || [1];
        const betNum = clean(play.betNumber).slice(-2);
        
        // Defined Positions from Derived/Actual values
        const winVals: {[k:number]: string} = {
            1: win1, // Pick3 Last 2 / First
            2: p3.length >= 3 ? p3.slice(-2) : win1, // P3 Last 2
        };
        
        // Re-map specifically for Pulito to ensure accuracy
        if (p3.length >= 2) winVals[1] = p3.slice(0, 2);
        if (p3.length >= 3) winVals[2] = p3.slice(-2);
        if (p4.length >= 2) winVals[3] = p4.slice(0, 2);
        if (p4.length >= 4) winVals[4] = p4.slice(-2);

        specifiedPositions.forEach(pos => {
            const winVal = winVals[pos];
            if (!winVal) return;

            // Straight
            if (play.straightAmount && play.straightAmount > 0) {
                if (betNum === winVal) {
                    winners.push({ ...baseWin(play, result, play.straightAmount * (table.STRAIGHT || 80), `Pulito Pos ${pos}`) });
                }
            }
            // Box
            if (play.boxAmount && play.boxAmount > 0) {
                if (isPermutation(betNum, winVal)) {
                    winners.push({ ...baseWin(play, result, play.boxAmount * (table.BOX || 40), `Pulito Box Pos ${pos}`) });
                }
            }
        });
    }

    return winners;
};

// Helper for standard winner object construction
const baseWin = (play: Play, result: WinningResult, amount: number, type: string): CalculationResult => ({
    ticketNumber: '', 
    playNumber: 0, 
    trackName: result.lotteryName, 
    betNumber: play.betNumber, 
    gameMode: play.gameMode,
    wagerType: type.includes('Box') ? 'BOX' : 'STRAIGHT', 
    wagerAmount: type.includes('Box') ? (play.boxAmount||0) : (play.straightAmount||0),
    prizeAmount: amount, 
    matchType: type
});
