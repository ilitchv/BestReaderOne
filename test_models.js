const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function checkModels() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();

        const bidiModels = data.models.filter(m =>
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes('bidiGenerateContent')
        );

        console.log("Models supporting BidiGenerateContent:");
        bidiModels.forEach(m => console.log(m.name));
    } catch (e) {
        console.error(e);
    }
}

checkModels();
