const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get the model
const getModel = () => {
    return genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
};

// Response schema for Ticket Interpretation
const TICKET_PROMPT = `
Analyze this lottery ticket image and return a JSON object.

CRITICAL READING INSTRUCTIONS:
1. **COLUMNAR ORDER**: Most tickets are written in vertical columns. You MUST read the numbers **DOWN** the first column, then **DOWN** the second column, etc. Do **NOT** read across rows horizontally.
   - Correct: 1st item Col 1, 2nd item Col 1 ... 1st item Col 2, 2nd item Col 2.
   - Incorrect: 1st item Col 1, 1st item Col 2 ...

2. **FORMAT RECOGNITION**:
   - **Win 4**: 4 digits (e.g., "1234").
   - **Pick 3**: 3 digits (e.g., "123").
   - **Pales / Pairs**: Two numbers separated by a dash, 'x', '+', or space.
     - **YOU MUST PRESERVE THE SEPARATOR**.
     - Example: If you see "12-34", return "12-34".
     - Example: If you see "12x34", return "12-34" or "12x34".
     - **DO NOT** combine them into "1234". "12-34" is a PALE, "1234" is a WIN 4.

JSON STRUCTURE:
{
  "detectedDate": "YYYY-MM-DD",
  "detectedTracks": ["TrackName1", "TrackName2"],
  "plays": [
    {
      "betNumber": "12-34", 
      "straightAmount": 0.50,
      "boxAmount": 0,
      "comboAmount": 0,
      "totalAmount": 0.50
    }
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
    interpretResultsImage: async (base64Image) => {
        return []; // Not fully implemented yet
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
