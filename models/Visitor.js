import mongoose from 'mongoose';

const ActionSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'CLICK', 'SCROLL', 'ERROR'
    target: String, // 'btn-register', 'nav-home'
    meta: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
});

const PageViewSchema = new mongoose.Schema({
    path: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true }, // Client-generated UUID
    startTime: { type: Date, default: Date.now },
    lastPing: { type: Date, default: Date.now }, // For duration calc
    durationSeconds: { type: Number, default: 0 },
    pathLog: [PageViewSchema], // Sequence of pages
    actions: [ActionSchema], // Significant clicks
    deviceType: String, // Mobile/Desktop/Tablet
    isActive: { type: Boolean, default: true }
});

const VisitorSchema = new mongoose.Schema({
    // Identity
    fingerprint: { type: String, required: true, index: true }, // Browser Fingerprint
    ip: { type: String, index: true }, // Last known IP

    // Demographics (GeoIP)
    country: String,
    city: String,
    region: String,
    timezone: String,
    language: String, // Browser language

    // Device Info
    userAgent: String,
    os: String,
    browser: String,
    screenResolution: String,

    // Acquisition
    referrer: String, // Where did they come from?
    entryPage: String, // First page they saw
    campaign: String, // UTM tags if any

    // Engagement Stats
    totalVisits: { type: Number, default: 0 },
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },

    // Detailed History
    sessions: [SessionSchema]
}, { timestamps: true });

// Prevent schema recompilation error in dev
export default mongoose.models.Visitor || mongoose.model('Visitor', VisitorSchema);
