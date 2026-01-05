const fs = require('fs');
const path = require('path');

const content = `MONGODB_URI=mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet
GEMINI_API_KEY=PLACEHOLDER_KEY
PORT=8080
BTCPAY_URL=https://mainnet.demo.btcpayserver.org
BTCPAY_STORE_ID=PLACEHOLDER_STORE_ID
BTCPAY_API_KEY=PLACEHOLDER_API_KEY
BTCPAY_WEBHOOK_SECRET=PLACEHOLDER_SECRET
SHOPIFY_ACCESS_TOKEN=PLACEHOLDER_TOKEN`;

fs.writeFileSync(path.join(__dirname, '.env'), content.trim(), 'utf8');
console.log('.env created successfully');
