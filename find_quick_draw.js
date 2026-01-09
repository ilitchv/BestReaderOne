const axios = require('axios');

const ENDPOINTS = [
    'procedure_load_numbers_public_quick_draw',
    'procedure_load_numbers_public_quick',
    'procedure_load_numbers_public_qd',
    'procedure_load_quick_draw',
    'procedure_load_numbers_quick_draw',
    'load_quick_draw_results',
    'get_quick_draw_results',
    'procedure_load_numbers_public_hourly'
];

async function guessEndpoint() {
    console.log('Starting Brute Force...');
    for (const ep of ENDPOINTS) {
        const url = `https://tplotto.com/${ep}`;
        try {
            console.log(`Trying ${url}...`);
            const response = await axios.post(url, new URLSearchParams({
                date: '2026-01-07'
            }), {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.data && response.data.answer) {
                console.log(`[SUCCESS] Found endpoint: ${ep}`);
                console.log('Sample Data:', response.data.answer.substring(0, 200));
                return;
            }
        } catch (e) {
            // console.log(`Failed ${ep}: ${e.response ? e.response.status : e.message}`);
        }
    }
    console.log('Brute Force Finished.');
}

guessEndpoint();
