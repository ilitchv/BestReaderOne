const axios = require('axios');
const fs = require('fs');

const HTTP = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
    }
};

(async () => {
    try {
        console.log("Fetching page...");
        const { data } = await axios.get('https://www.lotteryusa.com/new-york/midday-numbers/', HTTP);
        fs.writeFileSync('debug_page.html', data);
        console.log("Saved to debug_page.html");
    } catch (e) {
        console.error(e.message);
    }
})();
