const axios = require('axios');
require('dotenv').config();

const CTX = {
    url: process.env.BTCPAY_URL,
    storeId: process.env.BTCPAY_STORE_ID,
    apiKey: process.env.BTCPAY_API_KEY
};

async function listPayouts() {
    console.log("🔍 Checking Existing Payouts for Store:", CTX.storeId);

    try {
        const config = {
            headers: {
                'Authorization': `token ${CTX.apiKey}`,
                'Content-Type': 'application/json'
            }
        };

        // Fetch payouts in AwaitingApproval, AwaitingPayment
        const url = `${CTX.url}/api/v1/stores/${CTX.storeId}/payouts?status=AwaitingPayment&status=AwaitingApproval`;
        const response = await axios.get(url, config);

        console.log("✅ Pending Payouts Count:", response.data.length);
        if (response.data.length > 0) {
            console.log("\n⚠️ ACTIVE PAYOUTS FOUND:");
            response.data.forEach(p => {
                console.log(`- ID: ${p.id} | Amount: ${p.amount} ${p.currency} | Dest: ${p.destination}`);
            });
        } else {
            // Maybe they are in another state?
            const urlAll = `${CTX.url}/api/v1/stores/${CTX.storeId}/payouts`;
            const resAll = await axios.get(urlAll, config);
            console.log("\nAll Payouts Check:", resAll.data.map(p => `${p.id} (${p.state})`).join(", "));
        }

    } catch (error) {
        console.error("❌ Error fetching payouts:", error.response ? error.response.data : error.message);
    }
}

listPayouts();
