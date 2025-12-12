
import { GoogleGenAI, Type } from "@google/genai";
import type { OcrResult, ImageInterpretationResult } from '../types';
import { TRACK_CATEGORIES } from '../constants';

// Create a flat list of all known track names for the AI prompt
const allTracksMap = TRACK_CATEGORIES.flatMap(category => category.tracks.map(track => track.name)).join(', ');

const UPER_PROMPT_FOR_BEAST_READER = `
Eres Beast Reader, un experto auditor de lotería políglota (Español, Inglés, Creole Haitiano). Tu trabajo es digitalizar tickets manuscritos con precisión.

1. ESQUEMA DE SALIDA OBLIGATORIO (JSON)
{
  "detectedDate": "YYYY-MM-DD",
  "detectedTracks": ["Track Name"],
  "plays": [
    { "betNumber": "123", "straightAmount": 1.00, "boxAmount": 0.50, "comboAmount": 0.00 }
  ]
}

2. REGLAS CRÍTICAS DE INTERPRETACIÓN

2.1. DETECCIÓN DE TRACKS (SORTEOS)
- Busca marcas (checks, X) en las listas impresas.
- Traduce abreviaturas manuscritas a los nombres OFICIALES de esta lista: [${allTracksMap}].
- **Reglas de Mapeo:**
  - "NYS", "NY NIGHT", "NY EVE" -> "New York Evening"
  - "MIDDAY" (solo), "NY M" -> "New York Mid Day"
  - "PALE" -> "Quiniela Pale" (si es contexto RD) o "Palé" (si es USA).
  - "Bòlèt", "Bollette", "Lotery" -> Contexto general de lotería.
- **IMPORTANTE:** Si no hay marca explícita, NO inventes tracks.

2.2. LECTURA DE JUGADAS (Sintaxis: Número - Straight - Box)
El formato más común es horizontal:
**[NÚMERO]** ... separador ... **[MONTO STRAIGHT]** ... separador ... **[MONTO BOX]**

**DETECCIÓN DE BOX (CRÍTICO):**
El monto BOX suele estar al final de la línea, a la derecha del straight.
Busca estos indicadores visuales para el Box:
1. **Símbolo de División/Caja:**  '⟌', '[', ']', '/'
2. **Paréntesis o "C":** A veces escriben '(1' o 'C1' (C de Combo/Cubierto). **Esto significa Box.**
3. **Posición:** Si ves "1234 - 5  1", el 5 es Straight y el 1 es Box. NO ignores el número final.

2.3. RANGOS Y SECUENCIAS (RUN DOWNS) - **REGLA PRIORITARIA**
- **Vertical (CRÍTICO):** Si ves un número ARRIBA (ej: '000') y otro ABAJO (ej: '999') que parecen definir el inicio y fin de un bloque (conectados por línea, flecha, o simplemente alineados indicando secuencia):
  - **NO** los leas como dos jugadas separadas.
  - **FUSIÓNALOS** en un solo registro con guion: "000-999".
  - *Ejemplo Visual:*
    000
     |
    999
    => Resultado: "000-999"
- **Horizontal:** Si ves "120-129" o "120 al 129", devuélvelo como "120-129".
- **Wildcards:** "12X" -> "12X".
- **IMPORTANTE:** NO expandas la secuencia. Solo transcribe el rango ("Inicio-Fin") en el campo 'betNumber'. El sistema lo expandirá.

3. REGLAS GENERALES
- **NO CALCULAR:** Tu trabajo es leer lo escrito. No sumes totales. No valides matemáticamente.
- **NO SUMAR VALORES:** Si ves "5" y luego "1", son 5 straight y 1 box. NO es 6.
- **Centavos:** 50 -> 0.50, 75 -> 0.75. Pero 5, 10, 20 suelen ser dólares enteros.
- **Idiomas:** Interpreta notas en Español, Inglés o Creole Haitiano sin problemas.
`;

const imageCache = new Map<string, ImageInterpretationResult>();

export const interpretTicketImage = async (base64Image: string): Promise<ImageInterpretationResult> => {
    if (imageCache.has(base64Image)) {
        return imageCache.get(base64Image)!;
    }

    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
        },
    };

    const textPart = { text: UPER_PROMPT_FOR_BEAST_READER };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        detectedDate: { type: Type.STRING },
                        detectedTracks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        plays: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    betNumber: { type: Type.STRING },
                                    straightAmount: { type: Type.NUMBER },
                                    boxAmount: { type: Type.NUMBER },
                                    comboAmount: { type: Type.NUMBER }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const jsonString = response.text.trim();
        const parsedData = JSON.parse(jsonString);

        if (!parsedData || !Array.isArray(parsedData.plays)) {
            throw new Error("AI response was not in the expected format.");
        }

        const results: ImageInterpretationResult = {
            detectedDate: parsedData.detectedDate || null,
            detectedTracks: parsedData.detectedTracks || [],
            plays: parsedData.plays
                .filter((item: any) => item && typeof item.betNumber === 'string' && item.betNumber.trim() !== '')
                .map((item: any) => ({
                    betNumber: item.betNumber || '',
                    straightAmount: item.straightAmount > 0 ? item.straightAmount : null,
                    boxAmount: item.boxAmount > 0 ? item.boxAmount : null,
                    comboAmount: item.comboAmount > 0 ? item.comboAmount : null,
                })),
        };
        
        imageCache.set(base64Image, results);
        return results;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        let errorMessage = "Failed to interpret the ticket image.";
        if (error instanceof Error) errorMessage = error.message;
        throw new Error(errorMessage);
    }
};

export const interpretNaturalLanguagePlays = async (prompt: string): Promise<OcrResult[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: `
                You are a multilingual lottery assistant (English, Spanish, Haitian Creole). 
                Extract plays from natural language.
                Understand terms like:
                - "Straight", "Directo", "Dirèk" -> straightAmount
                - "Box", "Candado", "Kouvri" -> boxAmount
                - "Combo", "Combinado" -> comboAmount
                - "Pale", "Maryaj" -> Bets with two numbers (e.g., 12-34)
                - "Run down", "Del 0 al 9", "12X" -> Keep ranges intact in 'betNumber' field (e.g., return "12X", do not expand).
                
                Rules:
                1. If amounts > 50 are used without currency keywords, assume they are cents (e.g. "75" -> 0.75).
                2. Output strictly a JSON array of objects.
                3. Ignore conversational filler.
                `,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            betNumber: { type: Type.STRING },
                            straightAmount: { type: Type.NUMBER },
                            boxAmount: { type: Type.NUMBER },
                            comboAmount: { type: Type.NUMBER }
                        }
                    }
                }
            }
        });

        const jsonString = response.text.trim();
        const parsedData = JSON.parse(jsonString);

        if (!Array.isArray(parsedData)) throw new Error("Invalid format");

        return parsedData
            .filter(item => item && item.betNumber)
            .map(item => ({
                betNumber: item.betNumber,
                straightAmount: item.straightAmount > 0 ? item.straightAmount : null,
                boxAmount: item.boxAmount > 0 ? item.boxAmount : null,
                comboAmount: item.comboAmount > 0 ? item.comboAmount : null,
            }));

    } catch (error) {
        throw new Error("Failed to interpret request.");
    }
};

export const interpretBatchHandwriting = async (base64Image: string): Promise<OcrResult[]> => {
    if (!process.env.API_KEY) throw new Error("API_KEY not set");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
    const prompt = `
    Analyze this image which contains a compilation of handwritten lottery plays (one or more lines).
    Read EVERY line as a separate play.
    
    Interpret handwriting styles:
    - "123 5 5" -> Bet: 123, Straight: 5, Box: 5
    - "1234 - 10" -> Bet: 1234, Straight: 10
    - "564 / 1/2" -> Bet: 564, Straight: 1, Box: 2
    - "75" usually means 0.75 cents if implied by context, but output raw number here.
    - "Run downs" like "12X" or "000-999" -> Keep format intact (e.g., "12X") for post-processing.
    
    Return strictly a JSON array of objects.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            betNumber: { type: Type.STRING },
                            straightAmount: { type: Type.NUMBER },
                            boxAmount: { type: Type.NUMBER },
                            comboAmount: { type: Type.NUMBER }
                        }
                    }
                }
            }
        });
        
        const jsonString = response.text.trim();
        const parsedData = JSON.parse(jsonString);
        return parsedData.map((item: any) => ({
            betNumber: item.betNumber,
            straightAmount: item.straightAmount || null,
            boxAmount: item.boxAmount || null,
            comboAmount: item.comboAmount || null
        }));
    } catch (e) {
        console.error("Batch handwriting error", e);
        throw new Error("Failed to interpret batch handwriting.");
    }
};

export const interpretWinningResultsImage = async (base64Image: string, catalogIds: string[]): Promise<{source: string, targetId: string, value: string}[]> => {
    if (!process.env.API_KEY) throw new Error("API_KEY not set");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
    
    const prompt = `
    You are a Lottery Result Auditor. Analyze this image which contains lottery results.
    I need you to extract the lottery name/draw and the winning numbers found.
    
    I will provide a list of valid CATALOG_IDS in my system. 
    Your job is to Fuzzy Match the text in the image to the closest CATALOG_ID.
    
    CATALOG_IDS:
    ${JSON.stringify(catalogIds)}
    
    STRICT MAPPING RULES (Banker Jargon):
    1. "State" / "State Evening" -> Map STRICTLY to "usa/ny/Evening". Do not map to New York AM or generic NY.
    2. "N.Y." / "N.Y" / "Race" / "Races" / "Horses" -> Map STRICTLY to "special/ny-horses/R1".
       - SPECIAL RULE FOR HORSES: This track has variable length (1 to 4 digits).
       - Do NOT force Pick 3/4 format. Return exactly what you see (e.g. "7", "58", "123", "4567").
       - If digits are separated by spaces (e.g. "5 8 7"), combine them (e.g. "587").
    
    RULES:
    1. Extract the "source" (what you see in the image, e.g. "State", "N.Y.", "NY Midday").
    2. Suggest the best "targetId" from my list. If no good match, return null.
    3. Extract the "value" (winning numbers). Format them strictly:
       - USA Pick 3/4: "123", "1234", "123-4567" (if combined).
       - Santo Domingo: "12-34-56" (1st-2nd-3rd).
       - Horses: "X" or "XX" or "XXX" or "XXXX" (Variable length).
    
    OUTPUT JSON ARRAY:
    [
      { "source": "State", "targetId": "usa/ny/Evening", "value": "915-2415" },
      { "source": "N.Y.", "targetId": "special/ny-horses/R1", "value": "587" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            source: { type: Type.STRING },
                            targetId: { type: Type.STRING },
                            value: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Image result parse error", e);
        throw new Error("Failed to interpret image results.");
    }
};

export const interpretWinningResultsText = async (text: string, catalogIds: string[]): Promise<{source: string, targetId: string, value: string}[]> => {
    if (!process.env.API_KEY) throw new Error("API_KEY not set");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    You are a Lottery Result Parser for TABULAR TEXT input.
    The user has pasted a block of text where each line contains a lottery name and numbers.
    
    I will provide a list of VALID CATALOG_IDS. You must Fuzzy Match the name found in the text to the closest ID.

    CATALOG_IDS:
    ${JSON.stringify(catalogIds)}

    STRICT MAPPING RULES (Banker Jargon):
    1. "State" / "State Evening" -> Map STRICTLY to "usa/ny/Evening".
    2. "N.Y." / "N.Y" / "Race" / "Races" / "Horses" -> Map STRICTLY to "special/ny-horses/R1".
       - SPECIAL RULE FOR HORSES: Variable length (1 to 4 digits). Do NOT force standard P3/P4 format.

    RAW TEXT INPUT:
    """
    ${text.substring(0, 10000)}
    """

    YOUR TASK:
    For each line in the input:
    1. Extract the "source" (the name provided in the text).
    2. Match to the closest "targetId" from the provided list.
    3. Extract and Format the "value":
       - If Pick 3 or Pick 4 (cols 4/5) exist and are numbers, prioritize them (e.g., "123" or "1234").
       - If only 1st/2nd/3rd exist (cols 1/2/3), format as "12-34-56".
       - For Horses, return exact digits found (e.g. "587").
       - Ignore '---', 'xx', 'xxx'.

    OUTPUT JSON ARRAY:
    [
      { "source": "State", "targetId": "usa/ny/Evening", "value": "858-4307" },
      { "source": "N.Y.", "targetId": "special/ny-horses/R1", "value": "587" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            source: { type: Type.STRING },
                            targetId: { type: Type.STRING },
                            value: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        
        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Text result parse error", e);
        throw new Error("Failed to interpret text results.");
    }
};
