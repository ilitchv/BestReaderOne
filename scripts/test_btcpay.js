require('dotenv').config();
const paymentService = require('../services/paymentService');

const testConnection = async () => {
    console.log("🔌 Testing BTCPay Connection...");
    try {
        const invoice = await paymentService.createInvoice(3.00, "USD", "TEST-CONN-3USD", "test@example.com");
        console.log("\n✅ SUCCESS!");
        console.log("Invoice ID:", invoice.id);
        console.log("Payment Link:", invoice.checkoutLink);

        const openCmd = process.platform === 'win32' ? 'start' : 'open';
        console.log(`\n(Try opening this link in browser to verify visible UI)`);
    } catch (e) {
        console.error("\n❌ FAILED:", e.message);
    }
};

testConnection();
