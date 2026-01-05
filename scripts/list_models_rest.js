const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log(`Querying API with Key: ...${API_KEY.slice(-4)}`);
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await axios.get(url);

        console.log("✅ API Connectivity Configured.");
        console.log("--- AVAILABLE MODELS ---");
        const models = response.data.models;
        if (models) {
            models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
        } else {
            console.log("No models field in response.");
        }

    } catch (error) {
        console.error("❌ REST Request Failed:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

listModels();
