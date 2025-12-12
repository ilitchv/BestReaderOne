
import { WinningResult } from '../types';

export const determineGameMode = (betNumber: string, selectedTracks: string[], pulitoPositions: number[]): string => {
    if (!betNumber) return "-";
    
    const isUSA = selectedTracks.some(t => ["New York", "Georgia", "New Jersey", "Florida", "Connecticut", "Pensilvania", "Brooklyn", "Front", "Pulito", "Horses"].some(s => t.includes(s)));
    const isSD = selectedTracks.some(t => ["Real", "Gana mas", "Loteka", "Nacional", "Quiniela Pale", "Primera", "Suerte", "Lotería", "Lotedom", "Panama"].some(s => t.includes(s)));
    const isVenezuela = selectedTracks.includes('Venezuela');

    // Allow 'x' and 'X' as valid separators for Palé plays
    const cleanBetNumber = String(betNumber).replace(/[^0-9-xX]/g, '');
    const paleRegex = /^\d{2}[-xX]\d{2}$/;

    if (paleRegex.test(cleanBetNumber)) {
        // If we are in USA context (even mixed), prioritize USA Palé
        if (isUSA) return "Palé";
        return isSD ? "Pale-RD" : "Palé";
    }

    // Remove any separator before counting length for other game modes
    const length = cleanBetNumber.replace(/[-xX]/g, '').length;

    if (length === 1) {
        // Single Action with Position Selection (via Pulito Track)
        if (selectedTracks.includes('Pulito') && pulitoPositions.length > 0) {
            return `Single Action-${pulitoPositions.sort((a, b) => a - b).join(',')}`;
        }
        // Generic Single Action (Legacy/Default)
        if (isUSA) {
            return "Single Action";
        }
    }

    if (length === 2) {
        if (selectedTracks.includes('Pulito') && pulitoPositions.length > 0) {
            return `Pulito-${pulitoPositions.sort((a, b) => a - b).join(',')}`;
        }
        if (isVenezuela) {
            return "Venezuela";
        }
        return isSD ? "RD-Quiniela" : "Pick 2";
    }
    if (length === 3) return "Pick 3";
    if (length === 4) return "Win 4";

    return "-";
};

// Check if a number is a pure repetition (e.g. 22, 777, 5555)
// These numbers effectively have NO Box/Combo permutations.
export const isRepetitiveNumber = (betNumber: string): boolean => {
    if (!betNumber) return false;
    const clean = betNumber.replace(/[^0-9]/g, '');
    if (clean.length < 2) return false; // Single digits handled by GameMode check
    const firstChar = clean[0];
    return clean.split('').every(char => char === firstChar);
};

const calcCombos = (str: string): number => {
    const freq: { [key: string]: number } = {};
    for (let c of str) { freq[c] = (freq[c] || 0) + 1; }
    const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);
    let denom = 1;
    for (let k in freq) { denom *= factorial(freq[k]); }
    return factorial(str.length) / denom;
};

// Helper to calculate specific Palé combinations
const calculatePaleCombinations = (betNumber: string): number => {
    // Expected format "XX-YY" or "XXXYY" (normalized)
    const cleanBet = betNumber.replace(/[^0-9]/g, '');
    if (cleanBet.length !== 4) return 4; // Default/Fallback

    const p1 = cleanBet.substring(0, 2);
    const p2 = cleanBet.substring(2, 4);

    // Calc combos for each part
    // If it's repetitive (e.g. 22), it has 1 combo.
    // If it's mixed (e.g. 12), it has 2 combos (12, 21).
    const combos1 = isRepetitiveNumber(p1) ? 1 : 2;
    const combos2 = isRepetitiveNumber(p2) ? 1 : 2;

    return combos1 * combos2;
};

export const calculateRowTotal = (betNumber: string, gameMode: string, stVal: number | null, bxVal: number | null, coVal: number | null): number => {
    if (!betNumber || gameMode === "-") return 0;

    const st = stVal ?? 0;
    const bx = bxVal ?? 0;
    const co = coVal ?? 0;

    if (gameMode.startsWith("Pulito-") || gameMode.startsWith("Single Action-")) {
        const positionsPart = gameMode.split('-')[1] || '';
        const positionCount = positionsPart ? positionsPart.split(',').length : 1;
        
        // Combo Logic for Pulito (Pairs)
        let comboCost = 0;
        if (co > 0 && !gameMode.startsWith("Single Action")) {
             const isDouble = isRepetitiveNumber(betNumber);
             const comboMultiplier = isDouble ? 1 : 2;
             comboCost = co * comboMultiplier;
        }

        return (st + bx + comboCost) * Math.max(1, positionCount);
    }

    // --- PALÉ COMBO LOGIC (Dynamic based on digits) ---
    if (["Pale-RD", "Palé"].includes(gameMode)) {
        let comboCost = 0;
        if (co > 0) {
             const multiplier = calculatePaleCombinations(betNumber);
             comboCost = co * multiplier;
        }
        return st + bx + comboCost;
    }

    if (["RD-Quiniela", "Pick 2", "Venezuela"].includes(gameMode)) {
        // Combo Logic for Pairs (Pick 2, etc.)
        let comboCost = 0;
        if (co > 0) {
             const isDouble = isRepetitiveNumber(betNumber);
             const comboMultiplier = isDouble ? 1 : 2;
             comboCost = co * comboMultiplier;
        }
        
        return st + bx + comboCost;
    }
    
    // Single Action Standard (1 digit)
    if (gameMode === "Single Action") {
        // Typically only Straight applies
        return st;
    }
    
    if (gameMode === "Win 4" || gameMode === "Pick 3") {
        const combosCount = calcCombos(String(betNumber).replace(/[^0-9]/g, ''));
        return st + bx + (co * combosCount);
    }
    
    return st + bx + co;
};

export const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URI prefix, e.g., "data:image/jpeg;base64,"
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

export const convertNumberWordsToDigits = (text: string): string => {
    let processedText = text.toLowerCase();

    const map: { [key: string]: number } = {
        'cero': 0, 'zéro': 0,
        'uno': 1, 'un': 1, 'una': 1, 'yon': 1, 'youn': 1,
        'dos': 2, 'de': 2, 'deux': 2,
        'tres': 3, 'twaz': 3, 'twa': 3,
        'cuatro': 4, 'kat': 4,
        'cinco': 5, 'senk': 5,
        'seis': 6, 'sis': 6,
        'siete': 7, 'sèt': 7,
        'ocho': 8, 'uit': 8,
        'nueve': 9, 'nèf': 9,
        'diez': 10, 'dis': 10,
        'once': 11, 'onze': 11,
        'doce': 12, 'douz': 12,
        'trece': 13, 'trèz': 13,
        'catorce': 14, 'katòz': 14,
        'quince': 15, 'kenz': 15,
        'dieciseis': 16, 'dieciséis': 16, 'sèz': 16,
        'diecisiete': 17, 'disèt': 17,
        'dieciocho': 18, 'dizwit': 18,
        'diecinueve': 19, 'diznèf': 19,
        'veinte': 20, 'ven': 20,
        'veintiuno': 21, 'venteyen': 21, 'veintiún': 21,
        'veintidos': 22, 'veintidós': 22, 'vennde': 22,
        'veintitres': 23, 'veintitrés': 23, 'venntwa': 23,
        'veinticuatro': 24, 'vennkat': 24,
        'veinticinco': 25, 'vennsenk': 25,
        'veintiseis': 26, 'veintiséis': 26, 'vennsis': 26,
        'veintisiete': 27, 'vennsèt': 27,
        'veintiocho': 28, 'venntuit': 28,
        'veintinueve': 29, 'venntnèf': 29,
        'treinta': 30, 'trant': 30,
        'cuarenta': 40, 'karant': 40,
        'cincuenta': 50, 'senkant': 50,
        'sesenta': 60, 'swasant': 60,
        'setenta': 70, 'swasanndis': 70,
        'ochenta': 80, 'katreven': 80,
        'noventa': 90, 'katrevendis': 90,
        'cien': 100, 'san': 100
    };

    // Handle Compound Spanish (e.g., "treinta y cinco")
    // We iterate from 90 down to 30 to match tens
    const tensES = [
        { w: 'noventa', v: 90 }, { w: 'ochenta', v: 80 }, { w: 'setenta', v: 70 },
        { w: 'sesenta', v: 60 }, { w: 'cincuenta', v: 50 }, { w: 'cuarenta', v: 40 }, { w: 'treinta', v: 30 }
    ];
    const unitsES = [
        { w: 'nueve', v: 9 }, { w: 'ocho', v: 8 }, { w: 'siete', v: 7 }, { w: 'seis', v: 6 }, { w: 'cinco', v: 5 },
        { w: 'cuatro', v: 4 }, { w: 'tres', v: 3 }, { w: 'dos', v: 2 }, { w: 'uno', v: 1 }, { w: 'un', v: 1 }
    ];

    tensES.forEach(ten => {
        unitsES.forEach(unit => {
            const pattern = new RegExp(`${ten.w}\\s*y\\s*${unit.w}`, 'gi');
            processedText = processedText.replace(pattern, (ten.v + unit.v).toString());
        });
    });

    // Handle simple mapping
    // Use word boundaries to avoid replacing inside other words (though loose matching is safer for chat)
    Object.keys(map).sort((a, b) => b.length - a.length).forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        processedText = processedText.replace(regex, map[word].toString());
    });

    return processedText;
};

export const expandBetSequence = (betNumber: string): string[] => {
    const cleanBet = betNumber.toUpperCase().trim();
    const expanded: string[] = [];

    if (cleanBet.includes('X')) {
        const parts = cleanBet.split('');
        const resolveWildcards = (current: string, index: number) => {
            if (index === parts.length) {
                expanded.push(current);
                return;
            }
            if (parts[index] === 'X') {
                for (let i = 0; i <= 9; i++) {
                    resolveWildcards(current + i, index + 1);
                }
            } else {
                resolveWildcards(current + parts[index], index + 1);
            }
        };
        resolveWildcards('', 0);
        return expanded;
    }

    const rangeMatch = cleanBet.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
        const startStr = rangeMatch[1];
        const endStr = rangeMatch[2];
        
        if (startStr.length === 2 && endStr.length === 2) {
            return [cleanBet];
        }

        const startNum = parseInt(startStr, 10);
        const endNum = parseInt(endStr, 10);

        if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
            const padLength = startStr.length;
            
            const isFullRangeTriples = startStr === '000' && endStr === '999';
            const isFullRangePairs = startStr === '00' && endStr === '99';
            const isFullRangeQuads = startStr === '0000' && endStr === '9999';

            if (isFullRangeTriples || isFullRangePairs || isFullRangeQuads) {
                for (let i = 0; i <= 9; i++) {
                    expanded.push(String(i).repeat(padLength));
                }
                return expanded;
            }

            if ((endNum - startNum) <= 100) {
                for (let i = startNum; i <= endNum; i++) {
                    expanded.push(String(i).padStart(padLength, '0'));
                }
                return expanded;
            }
        }
    }

    return [cleanBet];
};

export const getAbbreviation = (name: string): string => {
    if (!name) return '??';
    const n = name.toLowerCase();
    
    if (n.includes('usa/ny')) return 'NY';
    if (n.includes('usa/nj')) return 'NJ';
    if (n.includes('usa/fl')) return 'FL';
    if (n.includes('usa/ga')) return 'GA';
    if (n.includes('usa/ct')) return 'CT';
    if (n.includes('usa/pa')) return 'PA';
    if (n.includes('usa/tx')) return 'TX';
    
    if (n.includes('real') || n.includes('/real')) return 'R';
    if (n.includes('gana') || n.includes('/gana')) return 'G';
    if (n.includes('nacional') || n.includes('/nacional')) return 'N';
    if (n.includes('loteka') || n.includes('/loteka')) return 'L';
    if (n.includes('primera') || n.includes('/primer')) return 'P';
    if (n.includes('suerte') || n.includes('/suerte')) return 'S';
    if (n.includes('lotedom') || n.includes('/lotedom')) return 'LD';
    if (n.includes('quiniela') || n.includes('/quiniela')) return 'QP';

    if (n.includes('new york')) return 'NY';
    if (n.includes('new jersey')) return 'NJ';
    if (n.includes('florida')) return 'FL';
    if (n.includes('georgia')) return 'GA';
    if (n.includes('connect')) return 'CT';
    
    return name.substring(0, 2).toUpperCase();
};

export const getTrackColorClasses = (trackIdOrName: string): string => {
    const t = trackIdOrName ? trackIdOrName.toLowerCase() : '';

    if (t.includes('/ny/') || t.includes('new york') || t.includes('ny-')) {
        if (t.includes('horses')) return 'bg-gradient-to-b from-lime-500 to-lime-700';
        if (t.includes('bk') || t.includes('brooklyn')) return 'bg-gradient-to-b from-sky-500 to-sky-700';
        if (t.includes('front')) return 'bg-gradient-to-b from-purple-500 to-purple-700';
        return 'bg-gradient-to-b from-blue-600 to-blue-800'; 
    }
    
    if (t.includes('/nj/') || t.includes('new jersey')) return 'bg-gradient-to-b from-orange-500 to-orange-700';
    
    if (t.includes('/fl/') || t.includes('florida') || t.includes('/flp2/')) return 'bg-gradient-to-b from-cyan-600 to-cyan-800';
    
    if (t.includes('/ga/') || t.includes('georgia')) return 'bg-gradient-to-b from-green-600 to-green-800';
    
    // CT FIXED: Removed text-black, used darker amber for white text readability
    if (t.includes('/ct/') || t.includes('connect')) return 'bg-gradient-to-b from-amber-600 to-amber-800';
    
    if (t.includes('/pa/') || t.includes('penn')) return 'bg-gradient-to-b from-pink-700 to-pink-900';

    // SANTO DOMINGO - DISTINCT COLORS
    if (t.includes('real')) return 'bg-gradient-to-b from-red-600 to-red-900'; // Real (Red)
    if (t.includes('gana') || t.includes('nacional')) return 'bg-gradient-to-b from-blue-700 to-blue-950'; // Nacional (Blue)
    if (t.includes('loteka')) return 'bg-gradient-to-b from-fuchsia-700 to-purple-900'; // Loteka (Purple)
    if (t.includes('quiniela') || t.includes('pale')) return 'bg-gradient-to-b from-rose-600 to-rose-900'; // Leidsa (Red/Black)
    if (t.includes('primera')) return 'bg-gradient-to-b from-yellow-600 to-yellow-800'; // Primera (Dark Yellow/Gold)
    if (t.includes('suerte')) return 'bg-gradient-to-b from-emerald-600 to-emerald-900'; // La Suerte (Green)
    if (t.includes('lotedom')) return 'bg-gradient-to-b from-sky-700 to-blue-900'; // Lotedom (Blue/Sky)

    if (t.includes('/tx/') || t.includes('texas')) return 'bg-gradient-to-b from-stone-600 to-stone-800';
    if (t.includes('/md/') || t.includes('maryland')) return 'bg-gradient-to-b from-red-700 to-red-900';
    if (t.includes('/sc/') || t.includes('south c')) return 'bg-gradient-to-b from-teal-600 to-teal-800';
    if (t.includes('/mi/') || t.includes('michigan')) return 'bg-gradient-to-b from-violet-600 to-violet-800';
    if (t.includes('/tn/') || t.includes('tennessee')) return 'bg-gradient-to-b from-amber-700 to-red-900';
    
    if (t.includes('venezuela')) return 'bg-gradient-to-br from-yellow-600 via-blue-700 to-red-700';
    if (t.includes('anguilla')) return 'bg-gradient-to-br from-orange-500 via-blue-500 to-blue-700';
    if (t.includes('pulito')) return 'bg-gradient-to-b from-indigo-600 to-indigo-900';

    return 'bg-gradient-to-b from-gray-700 to-gray-900';
};

// --- NEW HELPER: Format WinningResult to String ---
export const formatWinningResult = (result: WinningResult | undefined): string => {
    if (!result) return '—';
    
    // Priority 1: If pick3 AND pick4 exist (Combined style)
    if (result.pick3 && result.pick3.trim() && result.pick4 && result.pick4.trim()) {
        return `${result.pick3} - ${result.pick4}`;
    }

    // Priority 2: Individual (fallback if one missing)
    if (result.pick4 && result.pick4.trim()) return result.pick4;
    if (result.pick3 && result.pick3.trim()) return result.pick3;
    
    // Priority 3: Quiniela style (1st-2nd-3rd)
    if (result.first) {
        let str = result.first;
        if (result.second) str += `-${result.second}`;
        if (result.third) str += `-${result.third}`;
        return str;
    }
    
    return '—';
};
