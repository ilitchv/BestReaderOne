require('dotenv').config();

console.log("--- ENV DEBUG ---");
console.log("MONGODB_URI:", process.env.MONGODB_URI);
console.log("Expected Atlas Start:", "mongodb+srv://");
console.log("Matches Expectation:", process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith("mongodb+srv://"));
console.log("--- END DEBUG ---");
