const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('debug_page_eve.html', 'utf8');
const $ = cheerio.load(html);

console.log("--- Extracting React Props ---");
$('*').each((i, el) => {
    const props = $(el).attr('data-symfony--ux-react--react-props-value');
    if (props) {
        console.log(`\nElement <${el.name}> Props:`);
        try {
            const json = JSON.parse(props);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log("Invalid JSON:", props.substring(0, 100));
        }
    }
});
