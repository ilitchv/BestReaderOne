const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('./debug_toppick.html', 'utf8');
const $ = cheerio.load('<table>' + html + '</table>');

const rows = $('tr');
console.log(`Total TRs: ${rows.length}`);

rows.each((i, el) => {
    const $row = $(el);
    const date = $row.find('.winning-date').text().trim();
    const hasData = $row.find('ul.number-list').length > 0;
    console.log(`Row ${i}: Date="${date}" HasData=${hasData} Parent=${$row.parent().get(0).tagName}`);
});
