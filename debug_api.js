
async function checkApi() {
    // Try 5000 first
    let port = 8080;
    try {
        console.log(`Fetching from localhost:${port}...`);
        let res = await fetch(`http://localhost:${port}/api/results`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        let data = await res.json();

        console.log(`Total results: ${data.length}`);

        const nacional = data.filter(r => r.lotteryName && r.lotteryName.includes('Nacional'));
        console.log("--- Nacional Results (Top 2) ---");
        nacional.slice(0, 2).forEach(r => {
            console.log(`ID: ${r.resultId}, Numbers: "${r.numbers}", Country: "${r.country}", Date: ${r.drawDate}`);
        });

        // Check for empty numbers
        const messedUp = data.filter(r => !r.numbers || r.numbers === '' || r.numbers.includes('---'));
        console.log(`--- Broken/Empty entries: ${messedUp.length} ---`);
        if (messedUp.length > 0) {
            console.log("Sample Broken:", JSON.stringify(messedUp[0]));
        }

    } catch (e) {
        console.error(`Failed on ${port}:`, e.cause || e.message);
        // Fallback?
    }
}

checkApi();
