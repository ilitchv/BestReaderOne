require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow all origins for now (adjust for production)
app.use(express.json({ limit: '10mb' })); // Support large payloads

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Mongoose Model
const TrackSchema = new mongoose.Schema({
    userId: { type: String, required: true, default: 'default_user' }, // Future proofing
    lottery: String,
    date: Date,
    time: String,
    trackName: String, // e.g. "New York Evening"
    p3: String,
    w4: String,
    gap: Number,
    step: Number,
    // Add other fields as needed
    createdAt: { type: Date, default: Date.now }
});

const Track = mongoose.model('Track', TrackSchema);

// Routes

// 1. SYNC (Bulk Save)
// Receives the full list of rows (or delta) and updates the DB.
// For simplicity in this version, we might do a full replace or smart upsert.
app.post('/api/data/sync', async (req, res) => {
    try {
        const { rows, userId } = req.body;
        if (!rows || !Array.isArray(rows)) return res.status(400).json({ error: "Invalid data format" });

        console.log(`📥 Syncing ${rows.length} rows for user: ${userId || 'default'}`);

        // STRATEGY: Delete all for user and re-insert? (Easiest for sync)
        // OR Upsert based on ID.
        // Let's use Upsert based on 'id' if provided, or mapped properties.
        // Client sends "globalRawRows".

        // Faster approach for "Snapshot" sync:
        // 1. Delete all records for this user (Warning: destructive if concurrent sessions)
        // 2. Insert new batch.

        // safer: BulkWrite
        const ops = rows.map(row => ({
            updateOne: {
                filter: { userId: userId || 'default', date: row.date, time: row.time, lottery: row.lottery }, // Unique composite key
                update: {
                    $set: {
                        p3: row.p3,
                        w4: row.w4,
                        trackName: row.track,
                        gap: row.gap || 0, // specific state if we want to save it
                        step: row.step || 0
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
        const userId = req.query.userId || 'default';
        const tracks = await Track.find({ userId });

        // Transform back to client format if needed
        const formatted = tracks.map(t => ({
            id: t._id, // or generate random on client if mostly read-only
            lottery: t.lottery,
            date: t.date, // Client needs to format this
            time: t.time,
            track: t.trackName,
            p3: t.p3,
            w4: t.w4,
            priority: 0 // Client calculates priority normally
        }));

        res.json(formatted);
    } catch (error) {
        console.error("Load Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Vercel Serverless Export
module.exports = app;

// Local Start
if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}
