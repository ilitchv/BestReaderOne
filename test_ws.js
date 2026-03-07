const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8081/api/voice-agent');

ws.on('open', () => {
    console.log("Connected to local bridge");
});

ws.on('message', (data) => {
    console.log("Message from bridge:", data.toString());
});

ws.on('close', (code, reason) => {
    console.log("Closed:", code, reason.toString());
});
