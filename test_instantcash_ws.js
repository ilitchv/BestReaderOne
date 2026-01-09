const WebSocket = require('ws');

// URL extracted from main.dart.js
const wsUrl = `wss://instantcash.bet/ws/gamingLTSDrawHandler?v=${Date.now()}`;

console.log(`Connecting to ${wsUrl}...`);

const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
    console.log('Connected!');

    // Probes
    const probes = [
        'subscribe',
        JSON.stringify({ type: 'subscribe' }),
        JSON.stringify({ action: 'subscribe' }),
        JSON.stringify({ command: 'subscribe' }),
        JSON.stringify({ msg: 'subscribe' }),
        'init',
        JSON.stringify({ type: 'init' })
    ];

    // Send probes with slight delay
    probes.forEach((p, i) => {
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                console.log('Sending probe:', p);
                ws.send(p);
            }
        }, i * 2000);
    });
});

ws.on('message', function incoming(data) {
    console.log('Received:', data.toString());
});

ws.on('error', (err) => {
    console.error('Error:', err);
});

ws.on('close', () => {
    console.log('Disconnected');
});

// Force exit after 30s
setTimeout(() => {
    console.log('Timeout reached. Exiting.');
    process.exit(0);
}, 30000);
