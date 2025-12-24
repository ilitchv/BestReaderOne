const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('debug_win4.html', 'utf8');
const $ = cheerio.load(html);

console.log("--- Extracting React Props (Win 4) ---");
$('*').each((i, el) => {
    const props = $(el).attr('data-symfony--ux-react--react-props-value');
    if (props) {
        try {
            const json = JSON.parse(props);
            if (json.drawDate) {
                console.log(`DrawDate: ${json.drawDate} | Numbers: ${json.winningNumbers || 'N/A'}`);
            }
        } catch (e) { }
    }
});
