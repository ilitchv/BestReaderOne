const path = require('path');
// Only load dotenv if we are not in production (or explicitly requested)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.resolve(__dirname, '.env') });
}

const express = require('express');
const mongoose = require('mongoose');
// -- CRITICAL CONFIGURATION BEFORE MODELS --
mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false); // Disable buffering globally

const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Import Models (Assuming models folder sits in root, so ../models)
const Ticket = require('../models/Ticket');
const LotteryResult = require('../models/LotteryResult');
// const Track = require('../models/Track'); // Keeping inline Track for now to respect previous logic

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors()); // Allow all origins for now (adjust for production)
app.use(express.json({ limit: '50mb' })); // Support large payloads (images)

// MongoDB Connection
// MongoDB Connection Strategy for Serverless (Vercel)
// Configuration moved to top

let cachedDb = null;

const connectDB = async () => {
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    if (!process.env.MONGODB_URI) {
        console.error("❌ CRTICAL: MONGODB_URI is missing in environment!");
        throw new Error("MONGODB_URI is missing");
    }

    try {
        console.log(`🔌 Connecting to MongoDB (current state: ${mongoose.connection.readyState})...`);

        // Attempt connection with aggressive timeouts
        const db = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'beastbet',
            // Increase timeout slightly for initial connect, but fail operation fast
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        cachedDb = db;
        console.log(`✅ MongoDB Connected (state: ${mongoose.connection.readyState})`);
        return db;
    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err);
        // Reset cache on failure
        cachedDb = null;
        throw err;
    }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    // Allow Health Check without potentially failing DB logic if desired, 
    // but usually we want to know DB status.
    if (req.path === '/api/health') return next();

    // ROOT API CHECK - Specialized Handler to debug
    if (req.path === '/api') {
        let connectError = null;
        if (mongoose.connection.readyState !== 1) {
            try {
                // Force a connection attempt to capture the error
                await connectDB();
            } catch (e) {
                connectError = e.message;
            }
        }

        const uri = process.env.MONGODB_URI || '';
        const uriStart = uri.substring(0, 8); // 'mongodb+'
        const uriEnd = uri.substring(uri.length - 5);

        return res.json({
            status: mongoose.connection.readyState === 1 ? 'online' : 'offline',
            message: 'Beast Reader API Root',
            dbState: mongoose.connection.readyState,
            envCheck: !!uri ? 'Has URI' : 'Missing URI',
            uriPrefix: uriStart,
            uriSuffix: uriEnd, // Check for trailing quote
            lastError: connectError
        });
    }

    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("DB Middleware Error:", error);
        res.status(500).json({
            error: "Database Connection Failed",
            details: error.message,
            state: mongoose.connection.readyState
        });
    }
});

// Mongoose Model
const TrackSchema = new mongoose.Schema({
    userId: { type: String, required: true, default: 'default_user' }, // Future proofing
    lottery: String,
    date: Date,
    time: String,
    trackName: String,
    p3: String,
    w4: String,
    // gap/step removed from persistence as they are dynamic
    createdAt: { type: Date, default: Date.now }
}, {
    // Critical for Serverless: Disable buffering to force immediate failure if not connected
    bufferCommands: false,
    autoCreate: false
});

const Track = mongoose.model('Track', TrackSchema, 'sniper_records');

// --- AI CONFIGURATION ---
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const MODEL_NAME = 'gemini-2.0-flash'; // Updated to latest flash model if available, or 1.5-flash

// ROOT API CHECK
app.get('/api', (req, res) => {
    res.json({
        status: 'online',
        message: 'Beast Reader API Root',
        dbState: mongoose.connection.readyState
    });
});

// Prompts & Constants
const TRACK_CATEGORIES_PRELOADED = [
    // We might need to pass this from frontend or duplicate logic. 
    // For now, let's keep the prompt generic or expect the frontend to pass context if critical.
    // But the prompt in geminiService.ts had a hardcoded list. 
    // Let's use a simplified generic list or ask frontend to send it if it changes often.
    // For now, I'll copy the core prompt structure.
];

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
- Traduce abreviaturas manuscritas a los nombres OFICIALES.
- "NYS", "NY NIGHT", "NY EVE" -> "New York Evening"
- "MIDDAY" (solo), "NY M" -> "New York Mid Day"
- "PALE" -> "Quiniela Pale" (si es contexto RD) o "Palé" (si es USA).
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
- **Horizontal:** Si ves "120-129" o "120 al 129", devuélvelo como "120-129".
- **Wildcards:** "12X" -> "12X".
- **IMPORTANTE:** NO expandas la secuencia. Solo transcribe el rango ("Inicio-Fin") en el campo 'betNumber'. El sistema lo expandirá.

3. REGLAS GENERALES
- **NO CALCULAR:** Tu trabajo es leer lo escrito. No sumes totales. No valides matemáticamente.
- **NO SUMAR VALORES:** Si ves "5" y luego "1", son 5 straight y 1 box. NO es 6.
- **Centavos:** 50 -> 0.50, 75 -> 0.75. Pero 5, 10, 20 suelen ser dólares enteros.
- **Idiomas:** Interpreta notas en Español, Inglés o Creole Haitiano sin problemas.
`;

// --- AI ENDPOINTS ---

// 1. Interpret Ticket Image
app.post('/api/ai/interpret-ticket', async (req, res) => {
    try {
        const { base64Image } = req.body;
        if (!base64Image) return res.status(400).json({ error: "Missing base64Image" });
        if (!apiKey) return res.status(500).json({ error: "Server API Key not configured" });

        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
            },
        };
        const textPart = { text: UPER_PROMPT_FOR_BEAST_READER };

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Safe default

        const result = await model.generateContent({
            contents: { role: "user", parts: [imagePart, textPart] },
            generationConfig: {
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

        const jsonString = result.response.text();
        res.json(JSON.parse(jsonString));

    } catch (error) {
        console.error("AI Ticket Error:", error);
        res.status(500).json({ error: error.message || "AI Interpretation Failed" });
    }
});

// 2. Interpret Natural Language
app.post('/api/ai/interpret-text', async (req, res) => {
    try {
        const { prompt: userPrompt } = req.body;
        if (!userPrompt) return res.status(400).json({ error: "Missing prompt" });

        const systemInstruction = `
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
        `;

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });

        const result = await model.generateContent({
            contents: { role: "user", parts: [{ text: userPrompt }] },
            generationConfig: {
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

        res.json(JSON.parse(result.response.text()));

    } catch (error) {
        console.error("AI Text Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Batch Handwriting
app.post('/api/ai/interpret-batch', async (req, res) => {
    try {
        const { base64Image } = req.body;
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.replace(/^data:image\/\w+;base64,/, '') } };

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

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent({
            contents: { role: "user", parts: [imagePart, { text: prompt }] },
            generationConfig: {
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
        res.json(JSON.parse(result.response.text()));
    } catch (error) {
        console.error("AI Batch Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Interpret Winning Results (Image)
app.post('/api/ai/interpret-results-image', async (req, res) => {
    try {
        const { base64Image, catalogIds } = req.body;
        const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image.replace(/^data:image\/\w+;base64,/, '') } };

        const prompt = `
        You are a Lottery Result Auditor. Analyze this image which contains lottery results.
        I need you to extract the lottery name/draw and the winning numbers found.
        CATALOG_IDS: ${JSON.stringify(catalogIds)}
        STRICT MAPPING RULES (Detail in system prompt or here):
        1. "State" / "State Evening" -> Map STRICTLY to "usa/ny/Evening".
        2. "N.Y." / "N.Y" -> "special/ny-horses/R1".
        RULES:
        1. Extract source, targetId, value.
        2. Output JSON Array.
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent({
            contents: { role: "user", parts: [imagePart, { text: prompt }] },
            generationConfig: {
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
        res.json(JSON.parse(result.response.text()));
    } catch (error) {
        console.error("AI Results Image Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 5. Interpret Winning Results (Text)
app.post('/api/ai/interpret-results-text', async (req, res) => {
    try {
        const { text, catalogIds } = req.body;

        const prompt = `
        You are a Lottery Result Parser for TABULAR TEXT input.
        CATALOG_IDS: ${JSON.stringify(catalogIds)}
        RAW TEXT INPUT: """ ${text.substring(0, 10000)} """
        YOUR TASK: Match source to targetId, extract value.
        OUTPUT JSON ARRAY.
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent({
            contents: { role: "user", parts: [{ text: prompt }] },
            generationConfig: {
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
        res.json(JSON.parse(result.response.text()));
    } catch (error) {
        console.error("AI Results Text Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// LEGACY / DASHBOARD API ROUTES (Ported)
// ==========================================

app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    res.status(200).json({
        server: 'online',
        database: statusMap[dbState] || 'unknown',
        env: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/results', async (req, res) => {
    try {
        await connectDB(); // Critical: Ensure connection is ready before querying
        const { date, resultId } = req.query;
        const query = {};

        if (date) query.drawDate = date;
        if (resultId) query.resultId = resultId;

        const results = await LotteryResult.find(query).sort({ drawDate: -1, country: 1, lotteryName: 1 });
        res.json(results);
    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ error: 'Failed to fetch results from DB' });
    }
});

app.get('/api/tickets', async (req, res) => {
    try {
        await connectDB();
        const tickets = await Ticket.find({}).sort({ transactionDateTime: -1 }).limit(500);
        res.json(tickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ error: 'Failed to fetch tickets from DB' });
    }
});

app.post('/api/tickets', async (req, res) => {
    try {
        await connectDB();
        const ticketData = req.body;
        if (!ticketData.ticketNumber || !ticketData.plays || ticketData.plays.length === 0) {
            return res.status(400).json({ message: 'Invalid ticket data provided.' });
        }
        const newTicket = new Ticket(ticketData);
        await newTicket.save();
        console.log(`✅ Ticket ${ticketData.ticketNumber} saved.`);
        res.status(201).json({ message: 'Ticket saved successfully.', ticketId: ticketData.ticketNumber });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ticket number already exists.' });
        }
        console.error('Error saving ticket:', error);
        res.status(500).json({ message: 'An error occurred.', error: error.message });
    }
});

app.get('/ver-db', async (req, res) => {
    try {
        await connectDB();
        const tickets = await Ticket.find({}).sort({ createdAt: -1 }).limit(50).lean();
        const results = await LotteryResult.find({}).sort({ createdAt: -1 }).limit(50).lean();

        let html = `
        <html><body style="background:#111; color:#eee; font-family:monospace; padding:20px;">
        <h1 style="color:#00ff00">Admin DB Viewer</h1>
        <p>Status: <strong>${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}</strong></p>
        <hr style="border-color:#333"/>
        <h2>Last 50 Tickets</h2>
        <div style="background:#222; padding:10px; border-radius:5px; overflow:auto; max-height:400px;">
            <pre>${JSON.stringify(tickets, null, 2)}</pre>
        </div>
        <h2>Recent Results</h2>
        <div style="background:#222; padding:10px; border-radius:5px; overflow:auto; max-height:400px;">
            <pre>${JSON.stringify(results, null, 2)}</pre>
        </div>
        </body></html>`;
        res.send(html);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Routes
// 1. SYNC (Bulk Save)
app.post('/api/data/sync', async (req, res) => {
    try {
        await connectDB();
        const { rows, userId } = req.body;
        if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: "Invalid data format" });

        // console.log(`📥 Syncing ${rows.length} rows for user: ${userId || 'default'}`);

        const ops = rows.map(row => ({
            updateOne: {
                filter: { userId: userId || 'default', date: row.date, time: row.time, lottery: row.lottery }, // Unique composite key
                update: {
                    $set: {
                        p3: row.p3,
                        w4: row.w4,
                        trackName: row.track
                    }
                },
                upsert: true
            }
        }));

        if (ops.length > 0) {
            await Track.bulkWrite(ops);
        }

        res.json({ success: true, message: `Synced ${rows.length} items` });
    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// LOAD
app.get('/api/data', async (req, res) => {
    try {
        await connectDB();
        const userId = req.query.userId || 'default';
        const tracks = await Track.find({ userId });

        const formatted = tracks.map(t => ({
            id: t._id,
            lottery: t.lottery,
            date: t.date,
            time: t.time,
            track: t.trackName,
            p3: t.p3,
            w4: t.w4,
            priority: 0
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Load Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// SEARCH
app.get('/api/data/search', async (req, res) => {
    try {
        await connectDB();
        const { startDate, endDate, lottery, userId } = req.query;
        let query = { userId: userId || 'default' };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }
        if (lottery && lottery !== 'ALL') {
            query.lottery = new RegExp(lottery, 'i');
        }

        const stats = await Track.find(query).sort({ date: -1 }).limit(1000);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/results (For Ultimate Dashboard)
app.get('/api/results', async (req, res) => {
    try {
        await connectDB();
        const { country, date } = req.query;
        let query = {};

        if (country) query.country = country; // Filter by USA, RD, etc.
        if (date) query.drawDate = date;

        const results = await LotteryResult.find(query).sort({ drawDate: -1, scrapedAt: -1 }).limit(100);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// EDIT
app.put('/api/data/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        await Track.findByIdAndUpdate(id, updateData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE
app.delete('/api/data/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Track.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Vercel Serverless Export
module.exports = app;

// Local Start
if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}
