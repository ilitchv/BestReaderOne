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
        console.log("Fetching Evening page...");
        const { data } = await axios.get('https://www.lotteryusa.com/new-york/numbers/', HTTP);
        fs.writeFileSync('debug_page_eve.html', data);
        console.log("Saved to debug_page_eve.html");
    } catch (e) {
        console.error(e.message);
    }
})();
