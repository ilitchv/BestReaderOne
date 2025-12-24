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
                    orderId: orderId, // Store the reference ID here
                    buyerEmail: buyerEmail
                },
                checkout: {
                    speedPolicy: "MediumSpeed",
                    expirationMinutes: 15,
                    // Use VERCEL_URL if available (adding https://), otherwise fallback to localhost:3000 (matching vite.config.ts)
                    redirectURL: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/success.html` : "http://localhost:8080/success.html"
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
            // Propagate full error info for upper layer handling
            const detailedError = new Error(error.response ? JSON.stringify(error.response.data) : error.message);
            detailedError.response = error.response; // Attach response for extracting data later
            throw detailedError;
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
    },

    // 3. Get Invoice (For Manual Claim)
    getInvoice: async (invoiceId) => {
        try {
            const url = `${CTX.url}/api/v1/stores/${CTX.storeId}/invoices/${invoiceId}`;
            const config = {
                headers: {
                    'Authorization': `token ${CTX.apiKey}`,
                    'Content-Type': 'application/json'
                }
            };
            const response = await axios.get(url, config);
            return response.data;
        } catch (error) {
            console.error("❌ Get Invoice Error:", error.message);
            throw error;
        }
    },

    // 4. Create Payout (Automated Withdrawal)
    createPayout: async (amount, currency, destination, userId, userLabel) => {
        // "BTC-CHAIN" is the ID visible in the user's screenshot (Mainnet Demo)
        const potentialMethods = ["BTC-CHAIN", "BTC-OnChain", "BTC", "TBTC-OnChain", "BTC_OnChain"];
        let lastError = null;

        console.log(`💸 Creating Payout: ${amount} ${currency} to ${destination} for ${userLabel}`);

        const config = {
            headers: {
                'Authorization': `token ${CTX.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        for (const method of potentialMethods) {
            try {
                console.log(`🔄 Trying Payout Method: ${method}`);

                const payload = {
                    destination: destination,
                    amount: amount.toString(),
                    payoutMethodId: method, // V2 API requires this field name
                    metadata: {
                        userId: userId,
                        source: userLabel || "SniperStrategyApp"
                    }
                };



                // 1. Create Payout
                const createUrl = `${CTX.url}/api/v1/stores/${CTX.storeId}/payouts`;
                const response = await axios.post(createUrl, payload, config);
                const payout = response.data;
                console.log(`✅ Payout Created with ${method}:`, payout.id);

                // 2. Auto-Approve
                try {
                    const approveUrl = `${CTX.url}/api/v1/stores/${CTX.storeId}/payouts/${payout.id}/approve`;
                    const approveRes = await axios.post(approveUrl, {}, config);
                    console.log("✅ Payout Approved (Staged):", payout.id);

                    // On Demo Server, status usually becomes 'AwaitingPayment' (Waiting for signature)
                    // We attach the link for the admin to sign it.
                    payout.status = approveRes.data.state || 'AwaitingPayment';
                } catch (err) {
                    console.warn("⚠️ Auto-Approve failed (might need manual approval):", err.message);
                }

                // Construct Signing Link (Direct link to BTCPay UI)
                // Construct Signing Link (General Dashboard to avoid 404s on specific IDs)
                const signingLink = `${CTX.url}/stores/${CTX.storeId}/payouts`;

                return { ...payout, signingLink, isSemiAuto: true }; // Success!

            } catch (error) {
                const errDetail = error.response ? JSON.stringify(error.response.data) : error.message;

                // 1. Check for Duplicate Payout (Idempotency)
                if (errDetail.includes('duplicate-destination') || errDetail.includes('already used')) {
                    console.warn(`⚠️ Duplicate Payout Detected for ${destination}. Recovering existing one...`);
                    lastError = "DUPLICATE_FOUND_BUT_RECOVERY_FAILED";

                    try {
                        // Check ALL states including final ones
                        const statusesToCheck = ['AwaitingPayment', 'AwaitingApproval', 'New', 'Processing', 'Completed', 'Cancelled'];
                        let existing = null;
                        const debugFoundList = [];

                        for (const status of statusesToCheck) {
                            try {
                                const getUrl = `${CTX.url}/api/v1/stores/${CTX.storeId}/payouts?state=${status}`;
                                const existingRes = await axios.get(getUrl, config);

                                // Debug collection
                                if (existingRes.data && Array.isArray(existingRes.data)) {
                                    existingRes.data.forEach(p => debugFoundList.push({ id: p.id, state: p.state, dest: p.destination }));
                                    // Case-insensitive check
                                    const found = existingRes.data.find(p => p.destination && p.destination.trim() === destination.trim());
                                    if (found) {
                                        existing = found;
                                        break;
                                    }
                                }
                            } catch (e) {
                                debugFoundList.push({ error: `Failed to fetch state ${status}: ${e.message}` });
                            }
                        }

                        if (existing) {
                            console.log(`✅ Recovered Existing Payout: ${existing.id} [State: ${existing.state}]`);
                            console.log(`✅ Recovered Existing Payout: ${existing.id} [State: ${existing.state}]`);
                            // Use general dashboard link to ensure accessibility
                            const signingLink = `${CTX.url}/stores/${CTX.storeId}/payouts`;
                            // Determine if we need signature based on state
                            const needsSig = ['AwaitingPayment', 'AwaitingApproval', 'New'].includes(existing.state);
                            return { ...existing, signingLink, isSemiAuto: needsSig };
                        } else {
                            console.warn("⚠️ Could not locate the conflicting payout in ANY state.");

                            // DUMP DEBUG FILE
                            try {
                                const debugInfo = {
                                    lookingFor: destination,
                                    allFound: debugFoundList
                                };
                                require('fs').writeFileSync('_debug_payout_list.json', JSON.stringify(debugInfo, null, 2));
                            } catch (e) { }

                            throw new Error("Duplicate payout exists but cannot be retrieved. See _debug_payout_list.json.");
                        }
                    } catch (recError) {
                        console.error("❌ Recovery Failed:", recError.message);
                        throw recError; // Stop loop
                    }
                } else {
                    try { require('fs').writeFileSync('_debug_payout_fail_reason.txt', `[${new Date().toISOString()}] FAIL: ${errDetail}\n`); } catch (e) { }
                }

                // 2. Specific Check for BTCPay 2.0 + Watch-Only + AutoProcessor Conflict
                if (error.response && error.response.status === 422 && errDetail.includes('Invalid payment method')) {
                    console.warn(`❌ Method ${method} Rejected. Hint: Disable 'Automated Bitcoin Sender' in BTCPay > Settings > Payouts.`);
                } else {
                    console.warn(`❌ Method ${method} failed:`, errDetail);
                }

                lastError = errDetail;
                // Continue to next method
            }
        }

        // If loop finishes without return, all failed
        console.error("❌ All Payout Methods Failed.");
        throw new Error("Payout failed with all methods. Last error: " + lastError);
    }
};

module.exports = paymentService;
