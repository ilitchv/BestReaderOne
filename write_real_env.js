const fs = require('fs');
const content = `MONGODB_URI=mongodb+srv://BeastBetTwo:Amiguito2468@beastbet.lleyk.mongodb.net/beastbetdb?retryWrites=true&w=majority&appName=Beastbet
GEMINI_API_KEY=
PORT=8080
BTCPAY_URL=https://pay.beastreaderone.com
BTCPAY_STORE_ID=8T3dtmTXWz6b4H94VPwyv4qKX3AqD9S3L2G1tGvoVZyX
BTCPAY_API_KEY=d0f7402d531e08698585ed524ac4094b4bfd6f54
BTCPAY_WEBHOOK_SECRET=2YrXSAHUBUEwvHgxmwb1VfBoQGxU
PAYPAL_CLIENT_ID=AT6yCq66Ztl9uKlls4YZN3oADXc9DSvw7-6WwhHnbgBr1CVw0GURPnA8hAjfxRaSaUnEhC03ro26xi-k
VITE_PAYPAL_CLIENT_ID=AT6yCq66Ztl9uKlls4YZN3oADXc9DSvw7-6WwhHnbgBr1CVw0GURPnA8hAjfxRaSaUnEhC03ro26xi-k
PAYPAL_CLIENT_SECRET=EJegBDooC0ZpakdE9N8KJVqBfaZn6Osh8KxuBn0n4jz9oqTMVxZBvfts6FCbXlWTC8aHRw-Kp6lim8eZ
PAYPAL_MODE=sandbox
`;


fs.writeFileSync('.env', content, { encoding: 'utf8' });
console.log('.env updated with CORRECT user credentials');
