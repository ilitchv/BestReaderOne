const axios = require('axios');
const crypto = require('crypto');

// CREDENTIALS (Using Environment Variables for Production)
const CTX = {
    url: process.env.BTCPAY_URL,
    storeId: process.env.BTCPAY_STORE_ID,
    apiKey: process.env.BTCPAY_API_KEY,
    webhookSecret: process.env.BTCPAY_WEBHOOK_SECRET
};

const paymentService = {
    // 1. Create Invoice
    createInvoice: async (amount, currency, orderId, buyerEmail) => {
        try {
            console.log(`💸 Creating Invoice: ${amount} ${currency} for ${orderId}`);

            const payload = {
                amount: amount,
                currency: currency,
                metadata: {
                    orderId: orderId,
                    buyerEmail: buyerEmail
                },
                checkout: {
                    speedPolicy: "MediumSpeed",
                    expirationMinutes: 15,
                    // In production, this should be your domain or configured Vercel URL
                    redirectURL: process.env.VITE_APP_URL || "http://localhost:5173"
                }
            };

            const config = {
                headers: {
                    'Authorization': `token ${CTX.apiKey}`,
                    'Content-Type': 'application/json'
                }
            };

            const url = `${CTX.url}/api/v1/stores/${CTX.storeId}/invoices`;
            const response = await axios.post(url, payload, config);

            console.log("✅ Invoice Created:", response.data.id);
            return response.data; // Contains 'checkoutLink'

        } catch (error) {
            console.error("❌ BTCPay API Error Details:", error.response ? JSON.stringify(error.response.data) : error.message);
            throw new Error('Payment generation failed');
        }
    },

    // 2. Verify Webhook Signature
    verifyWebhook: (body, signature) => {
        if (!CTX.webhookSecret) return true;

        try {
            const hmac = crypto.createHmac('sha256', CTX.webhookSecret);
            const digest = Buffer.from('sha256=' + hmac.update(JSON.stringify(body)).digest('hex'), 'utf8');
            const checksum = Buffer.from(signature, 'utf8');

            if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
                return false;
            }
            return true;
        } catch (e) {
            console.error("Sig Verify Error", e);
            return false;
        }
    }
};

module.exports = paymentService;
