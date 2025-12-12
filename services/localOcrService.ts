
import { RESULTS_CATALOG } from '../constants';

// Declare global Tesseract variable loaded via CDN in index.html
declare const Tesseract: any;

interface OcrMatch {
    source: string;
    targetId: string;
    value: string;
}

// Simple Levenshtein Distance Algorithm
const levenshtein = (a: string, b: string): number => {
    const matrix = [];
    let i, j;
    for (i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

// Fuzzy match logic to find best catalog entry
const fuzzyMatch = (text: string, candidates: {id: string, name: string}[]): { id: string, name: string, score: number } | null => {
    const normalizedText = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    let bestMatch = null;
    let minDist = Infinity;

    for (const cand of candidates) {
        const normalizedCand = cand.name.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        
        // Fast path: Exact substring match
        if (normalizedText.includes(normalizedCand) || normalizedCand.includes(normalizedText)) {
             // Prefer matches that are closer in length (fewer extra chars)
             const dist = Math.abs(normalizedText.length - normalizedCand.length) * 0.1;
             if (dist < minDist) {
                 minDist = dist;
                 bestMatch = cand;
             }
             continue;
        }

        // Levenshtein calculation
        const dist = levenshtein(normalizedText, normalizedCand);
        // Normalize distance relative to length
        const relativeDist = dist / Math.max(normalizedText.length, normalizedCand.length);
        
        // Threshold: Allow up to 40% difference for valid match
        if (relativeDist < 0.4 && dist < minDist) { 
            minDist = dist;
            bestMatch = cand;
        }
    }
    
    return bestMatch;
};

export const processLocalOcr = async (base64Image: string): Promise<OcrMatch[]> => {
    if (typeof Tesseract === 'undefined') {
        throw new Error("Tesseract.js is not loaded in the browser window.");
    }

    try {
        // 1. Recognize text using Tesseract
        const { data: { text } } = await Tesseract.recognize(
            base64Image,
            'eng', // English model covers alphanumeric needed for lotto
            // { logger: (m: any) => console.log(m) } // Uncomment for debug
        );

        const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
        const matches: OcrMatch[] = [];

        // 2. Build Candidate List from Catalog + Manual Aliases
        const candidates = RESULTS_CATALOG.map(c => ({
            id: c.id,
            name: `${c.lottery} ${c.draw}`
        }));
        
        // Inject Banker Jargon Aliases for better local matching
        const manualAliases = [
            { id: 'usa/ny/Evening', name: 'State' },
            { id: 'usa/ny/Evening', name: 'NY State' },
            { id: 'usa/ny/Evening', name: 'NY Eve' },
            { id: 'usa/ny/Midday', name: 'NY Mid' },
            { id: 'usa/ny/Midday', name: 'Midday' },
            { id: 'special/ny-horses/R1', name: 'Horses' },
            { id: 'special/ny-horses/R1', name: 'N.Y.' }, // Matches "N.Y."
            { id: 'special/ny-horses/R1', name: 'NY' },
            { id: 'special/ny-horses/R1', name: 'Race' },
            { id: 'usa/ga/Evening', name: 'Georgia Eve' },
            { id: 'usa/ga/Evening', name: 'GA Eve' },
            { id: 'usa/fl/Evening', name: 'Florida Eve' },
            { id: 'usa/fl/Evening', name: 'FL Eve' },
            { id: 'rd/nacional/Noche', name: 'Nacional' },
            { id: 'rd/real/Mediodía', name: 'Real' },
            { id: 'rd/loteka/Noche', name: 'Loteka' },
        ];
        
        const allCandidates = [...candidates, ...manualAliases];

        // 3. Process Line by Line
        for (const line of lines) {
            // Extract potential numbers first
            const digitSequences = line.match(/\b\d+\b/g);
            
            // Need at least one number to be a valid result line
            if (!digitSequences || digitSequences.length === 0) continue;

            const numericPart = digitSequences.join('-');
            
            // Extract potential text name (remove numbers and special chars)
            const textPart = line.replace(/[^a-zA-Z\s]/g, '').trim();

            if (textPart.length < 2) continue; // Noise check

            // Fuzzy Match Name
            const match = fuzzyMatch(textPart, allCandidates);
            
            if (match) {
                matches.push({
                    source: line.trim(), // Keep original line context for user verification
                    targetId: match.id,
                    value: numericPart   // "123-4567" format
                });
            }
        }

        return matches;

    } catch (e) {
        console.error("Local OCR processing failed:", e);
        throw e;
    }
};
