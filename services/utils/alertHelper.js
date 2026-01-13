
const SystemAlert = require('../../models/SystemAlert');

/**
 * Creates a system alert if one does not already exist with the same type/message/activity.
 * @param {string} type - Alert type (e.g., 'SCRAPER_FAILURE', 'MISSING_DATA')
 * @param {string} message - User facing message
 * @param {object} metadata - Extra info
 * @param {string} severity - 'LOW', 'MEDIUM', 'HIGH'
 */
async function triggerAlert(type, message, metadata = {}, severity = 'MEDIUM') {
    try {
        // Prevent spam: Check existence of active alert
        const existing = await SystemAlert.findOne({ type, message, active: true });
        if (!existing) {
            await SystemAlert.create({ type, message, metadata, severity });
            console.log(`🚨 ALERT GENERATED: ${message}`);
        }
    } catch (e) {
        console.error("Failed to generate alert:", e);
    }
}

module.exports = { triggerAlert };
