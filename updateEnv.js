const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const token = 'SHOPIFY_ACCESS_TOKEN=PLACEHOLDER_TOKEN';

try {
    let content = '';
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }

    // Check if token exists
    if (content.includes('SHOPIFY_ACCESS_TOKEN=')) {
        // Replace existing
        content = content.replace(/SHOPIFY_ACCESS_TOKEN=.*/g, token);
        console.log('Replaced existing token.');
    } else {
        // Append
        content += `\n${token}\n`;
        console.log('Appended new token.');
    }

    fs.writeFileSync(envPath, content, 'utf8');
    console.log('Successfully updated .env');
    console.log('Current Content Preview:');
    console.log(content.split('\n').filter(line => line.includes('SHOPIFY')).join('\n'));

} catch (e) {
    console.error('Error updating .env:', e);
}
