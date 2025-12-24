const https = require('https');

const options = {
    hostname: 'pay.beastreaderone.com',
    port: 443,
    path: '/api/v1/stores',
    method: 'GET',
    headers: {
        'Authorization': 'token d0f7402d531e08698585ed524ac4094b4bfd6f54',
        'Content-Type': 'application/json'
    },
    rejectUnauthorized: false // Self-signed cert might still be an issue initially
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (d) => {
        data += d;
    });
    res.on('end', () => {
        try {
            const stores = JSON.parse(data);
            if (Array.isArray(stores) && stores.length > 0) {
                console.log(`STORE_ID_FOUND: ${stores[0].id}`);
            } else {
                console.log("No stores found in response:", data);
            }
        } catch (e) {
            console.log("Failed to parse response:", data);
        }
    });
});

req.on('error', (error) => {
    console.error("Error:", error);
});

req.end();
