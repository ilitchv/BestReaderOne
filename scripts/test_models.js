const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Access the model via the underlying API if possible or just try standard ones
        console.log("Checking API Key with model listing...");

        // Note: The SDK doesn't have a direct 'listModels' helper exposed easily on the main class in all versions,
        // but we can try to test a few known model names.

        const modelsToTest = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-flash-001",
            "gemini-1.5-pro",
            "gemini-pro",
            "gemini-pro-vision"
        ];

        for (const modelName of modelsToTest) {
            process.stdout.write(`Testing ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Test");
                const response = await result.response;
                console.log(`✅ OK (Response: ${response.text().trim()})`);
            } catch (e) {
                console.log(`❌ FAILED (${e.message.split('[')[0].trim()})`);
            }
        }
    } catch (error) {
        console.error("Critical Error", error);
    }
}

listModels();
