
require('dotenv').config({ path: 'backend/.env' });
const https = require('https');

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!apiKey) {
    console.error("No API KEY found in backend/.env");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error);
            } else {
                console.log("Available Models:");
                if (json.models) {
                    json.models.forEach(m => {
                        console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                    });
                } else {
                    console.log("No models returned (check JSON):", json);
                }
            }
        } catch (e) {
            console.error("Parse error:", e);
            console.log("Raw:", data);
        }
    });
}).on('error', (e) => {
    console.error("Request error:", e);
});
