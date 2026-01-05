const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

const content = `MONGODB_URI=mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet
GEMINI_API_KEY=PLACEHOLDER_KEY
PORT=8080
BTCPAY_URL=https://pay.beastreaderone.com
BTCPAY_STORE_ID=PLACEHOLDER_STORE_ID
BTCPAY_API_KEY=PLACEHOLDER_API_KEY
BTCPAY_WEBHOOK_SECRET=PLACEHOLDER_SECRET
PAYPAL_CLIENT_ID=PLACEHOLDER_CLIENT_ID
VITE_PAYPAL_CLIENT_ID=PLACEHOLDER_CLIENT_ID
PAYPAL_CLIENT_SECRET=PLACEHOLDER_CLIENT_SECRET
PAYPAL_MODE=sandbox
SHOPIFY_ACCESS_TOKEN=PLACEHOLDER_TOKEN
`;

fs.writeFileSync(envPath, content);
console.log('.env file updated successfully');
