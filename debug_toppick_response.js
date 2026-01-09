const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function debugFetch() {
    try {
        console.log("Fetching tplotto.com with AJAX header...");
        const response = await axios.post(
            'https://tplotto.com/procedure_load_numbers_public',
            new URLSearchParams({
                date: '2026-01-07' // Matches param name in scraperTopPick.js ('date', not 'action')
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }
        );

        console.log("Status:", response.status);
        // console.log("Response Type:", typeof response.data);

        if (response.data && response.data.answer) {
            const outPath = path.resolve(__dirname, 'debug_toppick.html');
            console.log("Writing " + response.data.answer.length + " chars to " + outPath);
            fs.writeFileSync(outPath, response.data.answer);
            console.log("Done.");
        } else {
            console.log("No 'answer' field yet. Keys:", Object.keys(response.data));
            if (typeof response.data === 'string') {
                console.log("Response starts with:", response.data.substring(0, 500));
            }
        }

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

debugFetch();
