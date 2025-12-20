const axios = require('axios');
require('dotenv').config();

const CTX = {
    url: process.env.BTCPAY_URL,
    storeId: process.env.BTCPAY_STORE_ID,
    apiKey: process.env.BTCPAY_API_KEY
};

async function checkMethods() {
    console.log("🔍 Probing Store Configuration:", CTX.storeId);

    const endpoints = [
        `/api/v1/stores/${CTX.storeId}/payment-methods`, // V2 Unified Endpoint
        `/api/v1/stores/${CTX.storeId}/payout-processors` // Check active processors
    ];

    const config = {
        headers: {
            'Authorization': `token ${CTX.apiKey}`,
            'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on error status
    };

    for (const ep of endpoints) {
        try {
            console.log(`\n👉 Trying: ${ep}`);
            const url = `${CTX.url}${ep}`;
            const response = await axios.get(url, config);
            console.log(`   Status: ${response.status}`);

            if (response.status === 200) {
                console.log("   ✅ DATA:", JSON.stringify(response.data, null, 2));
            } else {
                console.log("   ❌ ERROR:", response.statusText, response.data);
            }
        } catch (error) {
            console.error("   ❌ EXCEPTION:", error.message);
        }
    }
}

checkMethods();
