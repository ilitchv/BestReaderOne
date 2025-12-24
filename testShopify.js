require('dotenv').config();
const axios = require('axios');

const SHOPIFY_CONFIG = {
    shopName: 'alveyrobarberstyle',
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: '2024-01'
};

async function testConnection() {
    console.log(`Testing Shopify Connection...`);
    console.log(`Store: ${SHOPIFY_CONFIG.shopName}`);
    console.log(`Token: ${SHOPIFY_CONFIG.accessToken ? SHOPIFY_CONFIG.accessToken.substring(0, 10) + '...' : 'MISSING'}`);

    const url = `https://${SHOPIFY_CONFIG.shopName}.myshopify.com/admin/api/${SHOPIFY_CONFIG.apiVersion}/shop.json`;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_CONFIG.accessToken,
                'Content-Type': 'application/json'
            }
        });
        console.log("✅ Success! Connected to shop:", response.data.shop.name);
    } catch (error) {
        console.error("❌ Connection Failed!");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testConnection();
