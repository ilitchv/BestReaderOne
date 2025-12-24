const axios = require('axios');
const crypto = require('crypto');

// Configuration (In a real app, use process.env)
const SHOPIFY_CONFIG = {
    shopName: 'alveyrobarberstyle', // myshopify.com is appended automatically or used in full
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN, // Load from .env
    apiVersion: '2024-01' // Use a recent stable version
};

const shopifyService = {

    /**
     * Creates a Draft Order > Generates a Checkout Link
     * @param {number} amount - Deposit amount in USD
     * @param {string} userId - User ID to credit
     * @param {string} email - User email (required for draft order)
     */
    createDepositLink: async (amount, userId, email) => {
        try {
            const url = `https://${SHOPIFY_CONFIG.shopName}.myshopify.com/admin/api/${SHOPIFY_CONFIG.apiVersion}/draft_orders.json`;

            const payload = {
                draft_order: {
                    line_items: [
                        {
                            title: "Wallet Deposit (Credit)",
                            price: amount.toString(),
                            quantity: 1,
                            taxable: false, // Usually credits are not taxed, depends on jurisdiction
                            requires_shipping: false
                        }
                    ],
                    customer: {
                        email: email || 'guest@example.com'
                    },
                    note_attributes: [
                        { name: "userId", value: userId },
                        { name: "type", value: "DEPOSIT" }
                    ],
                    use_customer_default_address: true,
                    tags: "deposit,wallet-credit"
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'X-Shopify-Access-Token': SHOPIFY_CONFIG.accessToken,
                    'Content-Type': 'application/json'
                }
            });

            const draftOrder = response.data.draft_order;

            // The 'invoice_url' is the checkout link for the user
            return {
                id: draftOrder.id,
                checkoutUrl: draftOrder.invoice_url,
                status: draftOrder.status
            };

        } catch (error) {
            const details = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error("Shopify Create Draft Order Error:", details);
            throw new Error(`Shopify Error: ${details}`);
        }
    },

    /**
     * Checks if a Draft Order is paid (completed)
     * @param {string} draftOrderId 
     */
    checkDraftOrder: async (draftOrderId) => {
        try {
            const url = `https://${SHOPIFY_CONFIG.shopName}.myshopify.com/admin/api/${SHOPIFY_CONFIG.apiVersion}/draft_orders/${draftOrderId}.json`;
            const response = await axios.get(url, {
                headers: { 'X-Shopify-Access-Token': SHOPIFY_CONFIG.accessToken }
            });
            return response.data.draft_order;
        } catch (error) {
            console.error("Shopify Check Error:", error.message);
            return null;
        }
    },

    /**
     * Verifies Shopify Webhook HMAC
     * @param {string} hmac - Header 'x-shopify-hmac-sha256'
     * @param {string} rawBody - Raw Request Body
     * @param {string} secret - Webhook Signing Secret
     */
    verifyWebhook: (hmac, rawBody, secret) => {
        const hash = crypto
            .createHmac('sha256', secret)
            .update(rawBody, 'utf8', 'hex')
            .digest('base64');
        return hash === hmac;
    }
};

module.exports = shopifyService;
