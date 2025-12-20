const axios = require('axios');
require('dotenv').config();

const CTX = {
    url: process.env.BTCPAY_URL,
    storeId: process.env.BTCPAY_STORE_ID,
    apiKey: process.env.BTCPAY_API_KEY
};

async function testPayout() {
    console.log("🧪 Testing Payout Creation");

    const methods = ["BTC-CHAIN", "BTC", "BTC_OnChain"];
    const destination = "bc1qhnlnemg2dytwg8xzkrwsqfvjd3ln7du5k5wuk7"; // User's known address
    const amount = "0.00001"; // Tiny amount ~ $1

    const config = {
        headers: {
            'Authorization': `token ${CTX.apiKey}`,
            'Content-Type': 'application/json'
        },
        validateStatus: () => true
    };

    const url = `${CTX.url}/api/v1/stores/${CTX.storeId}/payouts`;

    for (const method of methods) {
        console.log(`\n👉 Trying Method: ${method}`);
        const payload = {
            destination: destination,
            amount: amount,
            payoutMethodId: method, // Updated for V2?
            metadata: {
                test: "true",
                source: "Script"
            }
        };

        try {
            const response = await axios.post(url, payload, config);

            console.log(`   Status: ${response.status}`);
            if (response.status === 200 || response.status === 201) {
                console.log("   ✅ SUCCESS:", response.data);
                // Clean up? No, let it hang or approve it in UI.
                return;
            } else {
                console.log("   ❌ ERROR:", JSON.stringify(response.data, null, 2));
            }

        } catch (e) {
            console.error("   ❌ EXCEPTION:", e.message);
        }
    }
}

testPayout();
