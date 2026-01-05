const aiService = require('../services/aiService');

console.log("Verifying AI Service...");

if (typeof aiService.interpretTicketImage === 'function') {
    console.log("✅ interpretTicketImage exists");
} else {
    console.error("❌ interpretTicketImage MISSING");
    process.exit(1);
}

if (typeof aiService.interpretText === 'function') {
    console.log("✅ interpretText exists");
} else {
    console.error("❌ interpretText MISSING");
    process.exit(1);
}

if (typeof aiService.interpretBatch === 'function') {
    console.log("✅ interpretBatch exists");
} else {
    console.error("❌ interpretBatch MISSING");
    process.exit(1);
}

console.log("AI Service module structure verified.");
