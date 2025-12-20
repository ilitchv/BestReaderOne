const fs = require('fs');
const content = `MONGODB_URI=mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet
GEMINI_API_KEY=
PORT=8080
BTCPAY_URL=https://mainnet.demo.btcpayserver.org
BTCPAY_STORE_ID=D7qX4xFFDTsfMV9ES2bJyd6sZNKqw9DbYkBEU5giBvKm6
BTCPAY_API_KEY=f4700f1a3e44c28e1fe94d98a16833128bdf84eb
BTCPAY_WEBHOOK_SECRET=42d4px9D91BYz6hxK8aQoSEueeNs
`;

fs.writeFileSync('.env', content, { encoding: 'utf8' });
console.log('.env written successfully');
