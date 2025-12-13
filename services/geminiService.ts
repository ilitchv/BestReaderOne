import type { OcrResult, ImageInterpretationResult } from '../types';

export const interpretTicketImage = async (base64Image: string): Promise<ImageInterpretationResult> => {
    try {
        const response = await fetch('/api/ai/interpret-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Image })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to interpret ticket");
        }

        const data = await response.json();
        const plays = data.plays || [];

        return {
            detectedDate: data.detectedDate || null,
            detectedTracks: data.detectedTracks || [],
            plays: plays.map((item: any) => ({
                betNumber: item.betNumber || '',
                straightAmount: item.straightAmount > 0 ? item.straightAmount : null,
                boxAmount: item.boxAmount > 0 ? item.boxAmount : null,
                comboAmount: item.comboAmount > 0 ? item.comboAmount : null,
            }))
        };
    } catch (error) {
        console.error("Error calling AI Service:", error);
        throw error;
    }
};

export const interpretNaturalLanguagePlays = async (prompt: string): Promise<OcrResult[]> => {
    try {
        const response = await fetch('/api/ai/interpret-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error("Failed to interpret request");
        }

        const data = await response.json();

        if (!Array.isArray(data)) throw new Error("Invalid format received form server");

        return data
            .filter((item: any) => item && item.betNumber)
            .map((item: any) => ({
                betNumber: item.betNumber,
                straightAmount: item.straightAmount > 0 ? item.straightAmount : null,
                boxAmount: item.boxAmount > 0 ? item.boxAmount : null,
                comboAmount: item.comboAmount > 0 ? item.comboAmount : null,
            }));
    } catch (error) {
        console.error("Error calling AI Text Service:", error);
        throw error;
    }
};

export const interpretBatchHandwriting = async (base64Image: string): Promise<OcrResult[]> => {
    try {
        const response = await fetch('/api/ai/interpret-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Image })
        });

        if (!response.ok) throw new Error("Failed to interpret batch");

        const data = await response.json();
        return data.map((item: any) => ({
            betNumber: item.betNumber,
            straightAmount: item.straightAmount || null,
            boxAmount: item.boxAmount || null,
            comboAmount: item.comboAmount || null
        }));
    } catch (error) {
        console.error("Batch handwriting error", error);
        throw error;
    }
};

export const interpretWinningResultsImage = async (base64Image: string, catalogIds: string[]): Promise<{ source: string, targetId: string, value: string }[]> => {
    try {
        const response = await fetch('/api/ai/interpret-results-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Image, catalogIds })
        });

        if (!response.ok) throw new Error("Failed to interpret results image");
        return await response.json();
    } catch (error) {
        console.error("Image result parse error", error);
        throw error;
    }
};

export const interpretWinningResultsText = async (text: string, catalogIds: string[]): Promise<{ source: string, targetId: string, value: string }[]> => {
    try {
        const response = await fetch('/api/ai/interpret-results-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, catalogIds })
        });

        if (!response.ok) throw new Error("Failed to interpret results text");
        return await response.json();
    } catch (error) {
        console.error("Text result parse error", error);
        throw error;
    }
};
