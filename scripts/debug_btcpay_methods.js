const axios = require('axios');
require('dotenv').config();

const CTX = {
    url: process.env.BTCPAY_URL,
    storeId: process.env.BTCPAY_STORE_ID,
    apiKey: process.env.BTCPAY_API_KEY
};

async function checkMethods() {
    try {
        const config = {
            headers: {
                'Authorization': `token ${CTX.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        console.log(`Checking Store: ${CTX.storeId}`);

        // 1. Get Payout Methods
        try {
            const url = `${CTX.url}/api/v1/stores/${CTX.storeId}/payout-methods`;
            const res = await axios.get(url, config);
            console.log("\n--- PAYOUT METHODS ---");
            console.log(JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.log("Payout Methods Check Failed:", e.message);
            if (e.response) console.log(e.response.data);
        }

    } catch (e) {
        console.error("Main Error:", e.message);
    }
}

checkMethods();
