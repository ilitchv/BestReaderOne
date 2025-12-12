const fs = require('fs');
const path = require('path');

const dockerfileContent = `FROM node:20-slim
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Start server
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
`;

const dockerignoreContent = `node_modules
dist
.git
.env
Dockerfile.txt
setup_deploy.js
`;

try {
    fs.writeFileSync(path.join(__dirname, 'Dockerfile'), dockerfileContent);
    fs.writeFileSync(path.join(__dirname, '.dockerignore'), dockerignoreContent);
    console.log("✅ Infrastructure files generated.");
} catch (error) {
    console.error("❌ Error generating infrastructure:", error);
}