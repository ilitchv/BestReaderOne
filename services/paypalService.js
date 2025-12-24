const axios = require('axios');

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE } = process.env;
const BASE_URL = PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const paypalService = {
    // 1. Generate Access Token (OAuth2)
    generateAccessToken: async () => {
        try {
            if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
                throw new Error("MISSING_PAYPAL_CREDENTIALS");
            }

            const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
            const response = await axios.post(`${BASE_URL}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            return response.data.access_token;
        } catch (error) {
            console.error("❌ PayPal Token Error:", error.response ? error.response.data : error.message);
            throw new Error("Failed to generate PayPal Access Token");
        }
    },

    // 2. Create Order
    createOrder: async (amount, currency = 'USD') => {
        const accessToken = await paypalService.generateAccessToken();
        const url = `${BASE_URL}/v2/checkout/orders`;

        const payload = {
            intent: "CAPTURE",
            purchase_units: [
                {
                    amount: {
                        currency_code: currency,
                        value: amount.toString(),
                    },
                },
            ],
            payment_source: {
                paypal: {
                    experience_context: {
                        brand_name: "Beast Reader",
                        user_action: "PAY_NOW",
                        shipping_preference: "NO_SHIPPING"
                    }
                }
            }
        };

        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
        });

        console.log("💳 PayPal Order Created:", response.data.id);
        return response.data;
    },

    // 3. Capture Order
    captureOrder: async (orderId) => {
        const accessToken = await paypalService.generateAccessToken();
        const url = `${BASE_URL}/v2/checkout/orders/${orderId}/capture`;

        const response = await axios.post(url, {}, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
        });

        console.log("✅ PayPal Order Captured:", response.data.id);
        return response.data;
    },
};

module.exports = paypalService;
