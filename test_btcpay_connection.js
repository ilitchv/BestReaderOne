const axios = require('axios');

async function checkConnection() {
    console.log("📡 Testing Connectivity to BTCPay...");
    const url = "https://mainnet.demo.btcpayserver.org";

    try {
        const start = Date.now();
        const res = await axios.get(url);
        const duration = Date.now() - start;
        console.log(`✅ SUCCESS! Connected to BTCPay in ${duration}ms`);
        console.log(`Status: ${res.status}`);
    } catch (e) {
        console.error(`❌ FAILURE! Connection failed.`);
        console.error(`Error Code: ${e.code}`);
        console.error(`Message: ${e.message}`);
        if (e.response) {
            console.error(`Response Status: ${e.response.status}`);
        }
    }
}

checkConnection();
