
const SystemAlert = require('../../models/SystemAlert');
const alertEmailService = require('../alertEmailService');

/**
 * Creates a system alert if one does not already exist with the same type/message/activity.
 * Also sends an email notification to configured supervisor addresses.
 * @param {string} type - Alert type (e.g., 'SCRAPER_FAILURE', 'MISSING_DATA')
 * @param {string} message - User facing message
 * @param {object} metadata - Extra info
 * @param {string} severity - 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
 */
async function triggerAlert(type, message, metadata = {}, severity = 'MEDIUM') {
    try {
        // Prevent spam: Check existence of active alert
        const existing = await SystemAlert.findOne({ type, message, active: true });
        if (!existing) {
            const alert = await SystemAlert.create({ type, message, metadata, severity });
            console.log(`🚨 ALERT GENERATED: ${message}`);

            // Notify supervisor(s) via email asynchronously (non-blocking)
            alertEmailService.sendAlertEmail({
                type,
                message,
                metadata,
                severity,
                createdAt: alert.createdAt
            }).catch(e => console.error('[AlertHelper] Email notification failed:', e.message));
        }
    } catch (e) {
        console.error("Failed to generate alert:", e);
    }
}

module.exports = { triggerAlert };
