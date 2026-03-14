/**
 * alertEmailService.js
 * Sends email notifications to configured supervisor on-call addresses
 * when a system alert is created (e.g. lottery result not captured).
 *
 * Uses nodemailer + Gmail SMTP with App Password.
 * Setup: Set ALERT_EMAIL_FROM and ALERT_EMAIL_PASS in .env
 */

const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const GlobalConfig = require('../models/GlobalConfig');

// Cache the transporter so we don't re-create it each time
let _transporter = null;

const getTransporter = () => {
    if (_transporter) return _transporter;
    if (!process.env.ALERT_EMAIL_FROM || !process.env.ALERT_EMAIL_PASS) {
        console.warn('[AlertEmail] ⚠ No email credentials in .env — email alerts disabled.');
        return null;
    }
    _transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.ALERT_EMAIL_FROM,
            pass: process.env.ALERT_EMAIL_PASS, // Gmail App Password
        },
    });
    return _transporter;
};

/**
 * Load configured supervisor addresses from MongoDB GlobalConfig.
 * Returns array of up to 3 email strings.
 */
const getSupervisorEmails = async () => {
    try {
        const config = await GlobalConfig.findOne({ key: 'alert_supervisor_emails' }).lean();
        return Array.isArray(config?.value) ? config.value.filter(Boolean) : [];
    } catch (e) {
        console.error('[AlertEmail] Failed to load supervisor emails:', e.message);
        return [];
    }
};

/**
 * Send alert email to all configured supervisors.
 * @param {object} alert - SystemAlert-like object with type, severity, message, metadata, createdAt
 */
const sendAlertEmail = async (alert) => {
    const transporter = getTransporter();
    if (!transporter) return; // Email disabled

    const recipients = await getSupervisorEmails();
    if (recipients.length === 0) {
        console.log('[AlertEmail] No supervisor emails configured. Skipping email.');
        return;
    }

    const severityEmoji = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵' }[alert.severity] || '⚠';
    const now = alert.createdAt ? new Date(alert.createdAt).toLocaleString() : new Date().toLocaleString();
    const metaStr = alert.metadata ? JSON.stringify(alert.metadata, null, 2) : 'N/A';

    const subject = `${severityEmoji} [${alert.severity}] Alerta del Sistema: ${alert.type}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 12px;">
      <div style="border-left: 4px solid ${{ CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#3b82f6' }[alert.severity] || '#64748b'}; padding-left: 16px; margin-bottom: 20px;">
        <h2 style="color: #f8fafc; margin: 0 0 4px 0; font-size: 18px;">⚠ Alerta del Sistema</h2>
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">Beast Reader - Panel Admin</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="padding: 8px 12px; background: #1e293b; border-radius: 6px 6px 0 0; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Tipo</td>
          <td style="padding: 8px 12px; background: #1e293b; border-radius: 6px 6px 0 0; font-size: 14px; color: #f1f5f9;">${alert.type}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #0f172a; border: 1px solid #1e293b; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Severidad</td>
          <td style="padding: 8px 12px; background: #0f172a; border: 1px solid #1e293b; font-size: 14px; color: #f1f5f9;">${severityEmoji} ${alert.severity}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #1e293b; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Mensaje</td>
          <td style="padding: 8px 12px; background: #1e293b; font-size: 14px; color: #f1f5f9;">${alert.message}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #0f172a; border: 1px solid #1e293b; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Fecha/Hora</td>
          <td style="padding: 8px 12px; background: #0f172a; border: 1px solid #1e293b; font-size: 14px; color: #f1f5f9;">${now}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #1e293b; border-radius: 0 0 6px 6px; font-size: 12px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Detalles</td>
          <td style="padding: 8px 12px; background: #1e293b; border-radius: 0 0 6px 6px; font-size: 12px; color: #94a3b8; font-family: monospace;">${metaStr}</td>
        </tr>
      </table>

      <div style="background: #1e293b; border-radius: 8px; padding: 16px; text-align: center;">
        <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 13px;">Acción requerida: ir al panel de administración y actualizar el resultado manualmente.</p>
        <a href="http://localhost:8081" style="display: inline-block; background: #06b6d4; color: #000; padding: 10px 24px; border-radius: 8px; font-weight: bold; font-size: 14px; text-decoration: none;">Ir al Panel Admin</a>
      </div>
      
      <p style="margin-top: 20px; font-size: 11px; color: #475569; text-align: center;">
        Este mensaje fue generado automáticamente por Beast Reader. No responder.
      </p>
    </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Beast Reader Alerts" <${process.env.ALERT_EMAIL_FROM}>`,
            to: recipients.join(', '),
            subject,
            html,
        });
        console.log(`[AlertEmail] ✅ Sent to ${recipients.join(', ')} — ID: ${info.messageId}`);
    } catch (e) {
        console.error('[AlertEmail] ❌ Failed to send email:', e.message);
    }
};

module.exports = { sendAlertEmail };
