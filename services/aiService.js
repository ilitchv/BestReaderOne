const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get the model
const getModel = () => {
    return genAI.getGenerativeModel({ model: "gemini-flash-latest" });
};

// Response schema for Ticket Interpretation
const TICKET_PROMPT = `
Analyze this lottery ticket image and return a JSON object.

CRITICAL READING INSTRUCTIONS (CONTEXT & ORDERING):

1. **ROW READING FOR CONTEXT (STEP 1)**:
   - Read each horizontal line completely to identify associated wagers.
   - **Example**: If you see "127-507  St 5.00", it means:
     - "127" (Col 1) has wager $5.00.
     - "507" (Col 2) has wager $5.00.
   - **DO NOT** split the image visually if it breaks this link.

2. **JSON OUTPUT ORDERING (STEP 2 - MANDATORY)**:
   - Although you read row-by-row, your **JSON OUTPUT MUST BE SORTED BY COLUMN**.
   - **ORDER**:
     1. List ALL "Column 1" (Left) plays from Top to Bottom.
     2. List ALL "Column 2" (Right) plays from Top to Bottom.
     3. List ALL Vertical/Margin plays.
   - **PROHIBITED**: Do NOT output "127", then "507", then "Next Row...". 
   - **REQUIRED**: Output "127", "Next Col 1...", THEN "507", "Next Col 2...".

3. **VERTICAL / MARGIN TEXT**:
   - Vertical/Sideways numbers are **INDIVIDUAL PLAYS**.
   - **NEVER** combine them (e.g. "112" stacked on "199" = 2 plays, NOT "112-199").

4. **FORMATS**:
   - **Win 4**: 4 digits.
   - **Pick 3**: 3 digits.
   - **Pairs**: 2 digits (keep separator "12-34").

JSON STRUCTURE:
{
  "detectedDate": "YYYY-MM-DD",
  "detectedTracks": ["TrackName1", "TrackName2"],
  "plays": [
    { "betNumber": "123", "straightAmount": 0.50, "boxAmount": 0, "comboAmount": 0, "totalAmount": 0.50 },
    { "betNumber": "456", "straightAmount": 0.50, "boxAmount": 0, "comboAmount": 0, "totalAmount": 0.50 }
  ]
}
If amounts are not clear, default to 0. Ignore non-lottery text.
RETURN ONLY RAW JSON. NO MARKDOWN.
`;

const NLP_PROMPT = `
Interpret this text as lottery plays. Return a JSON ARRAY of objects:
[
  {
    "betNumber": "123",
    "straightAmount": 1,
    "boxAmount": 0,
    "comboAmount": 0
  }
]
If the user mentions specific tracks/lotteries, ignore them for now (handled by UI), just extract the numbers and amounts.
If no amount is specified, default to 0.
RETURN ONLY RAW JSON. NO MARKDOWN.
`;

const SMART_PAPER_PROMPT = `
You are an expert lottery assistant. The user provides raw text (voice transcript, paste, or manual typing).
Your goal is to extract lottery plays (numbers and amounts) and interpret any global commands.

CRITICAL INSTRUCTIONS:
1. STRICT ENGLISH: YOUR OUTPUT MUST ALWAYS BE 100% IN ENGLISH. Even if the user prompt is in Spanish or another language, your responses, confirmations, and "feedback" MUST be in English. NEVER use Spanish.
2. NO TRACK QUESTIONS: Your ONLY job is to extract numbers and wagers. YOU MUST NEVER ask the user what lottery or track these plays are for. Ignore track information completely.
3. Normalization: Numbers provided as words (e.g. "twenty two") MUST be converted to digits ("22").
4. Global Commands: If the user says something like "change all to $5" or "clear all", reflect this in the extracted plays or provide confirmation in "feedback".
5. Pales/Pairs (Heuristic): If the input contains numbers separated by a hyphen (e.g., "04-26") or explicitly uses the word "Pale" (or "Pair"), you MUST categorize the gameMode as "Pale" and keep the exact string format for betNumber ("04-26"). DO NOT merge them into a "Pick 4" (e.g., do not output "0426").
6. Conversational Feedback: 
   - Use the "feedback" field for brief, professional English messages.
   - If plays are clear, "feedback" should be null unless you are confirming a global shift.
   - If everything is perfect, "feedback" should be null.

JSON FORMAT:
{
  "plays": [
    { "betNumber": "123", "gameMode": "Pick 3", "straightAmount": 5, "boxAmount": 0, "comboAmount": 0 }
  ],
  "feedback": "I've processed your request. Note: All wagers were set to $5 as requested."
}
`;

const aiService = {


    /**
     * Interpret a Ticket Image
     * @param {string} base64Image - Base64 encoded image string
     * @returns {Promise<Object>} - Parsed ticket data
     */
    interpretTicketImage: async (base64Image) => {
        try {
            const model = getModel();

            // Fix base64 header if present
            const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

            const imagePart = {
                inlineData: {
                    data: cleanBase64,
                    mimeType: "image/jpeg"
                },
            };

            const result = await model.generateContent([TICKET_PROMPT, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanText);

        } catch (error) {
            console.error("AI Ticket Interpretation Error:", error);
            throw new Error(`AI processing failed: ${error.message}`);
        }
    },

    /**
     * Interpret Natural Language Text (Chatbot/Assistant)
     * @param {string} prompt - User text input
     * @returns {Promise<Array>} - Array of plays
     */
    interpretText: async (prompt) => {
        try {
            const model = getModel();
            const result = await model.generateContent(`${NLP_PROMPT}\n\nUSER INPUT: "${prompt}"`);
            const response = await result.response;
            const text = response.text();

            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (error) {
            console.error("AI Text Interpretation Error:", error);
            throw new Error(`AI text processing failed: ${error.message}`);
        }
    },

    /**
     * Parse Smart Paper Natural Language Input (Voice/Text/Paste)
     * @param {string} text - User text/voice input
     * @returns {Promise<Object>} - Parsed tracks, plays, and feedback
     */
    parseNaturalLanguagePlays: async (text) => {
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-flash-latest",
                systemInstruction: SMART_PAPER_PROMPT
            });
            const result = await model.generateContent(`USER INPUT: "${text}"`);
            const response = await result.response;
            const responseText = response.text();

            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText);

        } catch (error) {
            console.error("AI Smart Paper Parsing Error:", error);
            throw new Error(`AI parsing failed: ${error.message}`);
        }
    },

    /**
     * Interpret Batch Handwriting (Optional stub/implementation)
     */
    interpretBatch: async (base64Image) => {
        try {
            const model = getModel();
            const BATCH_PROMPT = `
            Analyze this image of handwritten lottery numbers. 
            Return a JSON ARRAY of objects with structure: { "betNumber": "123", "straightAmount": 0, "boxAmount": 0, "comboAmount": 0 }.
            RETURN ONLY RAW JSON.
            `;

            const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
            const imagePart = { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } };

            const result = await model.generateContent([BATCH_PROMPT, imagePart]);
            const response = await result.response;
            const text = response.text();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanText);
        } catch (error) {
            console.error("AI Batch Error:", error);
            throw error;
        }
    },

    // Stub for Results Verification (can be expanded)
    /**
     * Interpret a screenshot of lottery results (Instant Cash Pyramid)
     * @param {string} base64Image - Base64 encoded screenshot
     * @returns {Promise<Object>} - Parsed results
     */
    interpretWinningResultsImage: async (base64Image) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
            const imagePart = { inlineData: { data: cleanBase64, mimeType: "image/jpeg" } };

            const RESULTS_PROMPT = `
            Analyze this Instant Cash results screenshot.
            
            STRUCTURE:
            - The results are in a yellow/black box.
            - There is a date (e.g., Feb 28, 2026) and a time (e.g., 05:30 PM).
            - The numbers are yellow balls arranged in a PYRAMID (14 numbers total):
              Row 1: 2 balls
              Row 2: 3 balls
              Row 3: 4 balls
              Row 4: 5 balls

            TASK:
            1. Extract the Date and Time.
            2. Extract ALL 14 numbers in order (Top to Bottom, Left to Right).
            
            DATES:
            - THE YEAR IS 2026. If you see "Feb 28", it is "2026-02-28".
            - DO NOT return 2024 or any other year.
            
            JSON FORMAT:
            {
              "drawDate": "2026-MM-DD",
              "drawTime": "HH:MM AM/PM",
              "numbers": ["num1", "num2", ..., "num14"]
            }
            
            RETURN ONLY RAW JSON. NO MARKDOWN.
            `;

            const result = await model.generateContent([RESULTS_PROMPT, imagePart]);
            const response = await result.response;
            const text = response.text();
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanText);
        } catch (error) {
            console.error("AI Results Image Error:", error);
            throw error;
        }
    },

    interpretResultsText: async (text) => {
        return [];
    },

    /**
     * Chat with Context (RAG-lite)
     * @param {string} query - User Question
     * @param {string} context - The reference document (Compensation Plan)
     * @returns {Promise<string>} - AI Answer
     */
    chatWithContext: async (query, context) => {
        try {
            const model = getModel(); // Use standard model

            const CONTEXT_PROMPT = `
            You are the "Beast Office AI", an intelligent assistant for the Network Marketing logic.
            Your role is to answer questions strictly based on the provided COMPENSATION PLAN context.
            
            RULES:
            1. Use ONLY the provided context to answer.
            2. If the answer is not in the context, say "Lo siento, no encuentro esa información en el Plan de Compensación actual."
            3. Be concise, professional, and helpful.
            4. Reply in Spanish (Español).
            5. Use Markdown for formatting (lists, bold).

            CONTEXT:
            ${context}

            USER QUESTION:
            "${query}"
            `;

            const result = await model.generateContent(CONTEXT_PROMPT);
            const response = await result.response;
            return response.text();

        } catch (error) {
            console.error("AI Chat Error:", error);
            throw new Error(`AI chat failed: ${error.message}`);
        }
    }
};

module.exports = aiService;
