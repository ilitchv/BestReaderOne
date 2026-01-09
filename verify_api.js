const axios = require('axios');

(async () => {
    try {
        console.log('Fetching API...');
        // Add random param to bypass cache
        const res = await axios.get('http://localhost:8080/api/results?date=2026-01-08&t=' + Date.now());

        const topPick = res.data.find(r => r.resultId === 'special/top-pick');

        if (topPick) {
            const draws = JSON.parse(topPick.numbers);
            console.log(`[VERIFY] Top Pick found. ID: ${topPick._id}`);
            console.log(`[VERIFY] Total Draws: ${draws.length}`);
            console.log(`[VERIFY] Draws dump (first 5 and entries around 7 PM):`);

            draws.forEach(d => {
                if (d.time.includes('07:00 PM') || d.time.includes('06:00 PM') || d.time.includes('08:00 PM')) {
                    console.log(`   >> ${d.time}: ${JSON.stringify(d.draws || d.numbers)}`);
                }
            });
            console.log(`First 3:`, draws.slice(0, 3));
        } else {
            console.error('[VERIFY] Top Pick NOT FOUND in API response!');
        }

    } catch (e) {
        console.error(e.message);
    }
})();
