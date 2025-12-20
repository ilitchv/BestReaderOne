const fs = require('fs');
const content = `MONGODB_URI=mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet
GEMINI_API_KEY=
PORT=8080
BTCPAY_URL=https://mainnet.demo.btcpayserver.org
BTCPAY_STORE_ID=D7qX4xFDTSfMV9ES2bJyd6sZNKqw9DbYkBEU5giBvKm6
BTCPAY_API_KEY=83cab7ae3e1e1a2270f77376801ad91370d0ba17
BTCPAY_WEBHOOK_SECRET=42d4px9D91BYz6hxK8aQoSEueeNs
`;

fs.writeFileSync('.env', content, { encoding: 'utf8' });
console.log('.env updated with CORRECT user credentials');
