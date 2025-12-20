const axios = require('axios');

async function testPayment() {
    console.log('--- TESTING PAYMENT ROUTE ---');
    try {
        const res = await axios.post('http://localhost:8080/api/payment/invoice', {
            amount: 10,
            currency: 'USD',
            orderId: 'TEST-DEBUG',
            buyerEmail: 'debug@test.com'
        });
        console.log('STATUS:', res.status);
        console.log('DATA:', res.data);
    } catch (e) {
        if (e.response) {
            console.log('ERROR STATUS:', e.response.status);
            console.log('ERROR DATA:', e.response.data);
        } else {
            console.log('ERROR:', e.message);
        }
    }
}

async function testTicketSilent() {
    console.log('\n--- TESTING TICKET SILENT ROUTE ---');
    try {
        // Need a valid user ID or this will fail early
        const res = await axios.post('http://localhost:8080/api/tickets', {
            ticketNumber: 'TEST-SILENT-' + Date.now(),
            plays: [],
            grandTotal: 1000000, // Excessive amount to trigger insufficient funds
            userId: '507f1f77bcf86cd799439011', // Guest ID
            silent: true
        });
        console.log('STATUS:', res.status); // Should be 200
        console.log('DATA:', res.data);     // Should contain silent: true
    } catch (e) {
        if (e.response) {
            console.log('ERROR STATUS:', e.response.status);
            console.log('ERROR DATA:', e.response.data);
        } else {
            console.log('ERROR:', e.message);
        }
    }
}

testPayment().then(() => testTicketSilent());
