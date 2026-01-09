const WebSocket = require('ws');

const SUB_VARIANTS = [
    // Simple Action/Type
    { action: 'subscribe' },
    { type: 'subscribe' },
    { command: 'subscribe' },
    { msg: 'subscribe' },

    // With Payload/Data
    { action: 'subscribe', data: {} },
    { action: 'subscribe', channel: 'draws' },
    { action: 'subscribe', topic: 'gamingLTSDrawHandler' },

    // Auth/ID variants
    { action: 'init', clientId: 'INSTANTCASH-USER-APP' },
    { type: 'init', clientId: 'INSTANTCASH-USER-APP' },
    { action: 'connect', clientId: 'INSTANTCASH-USER-APP' },

    // Specifics guessed from log
    { action: 'subscribe', clientId: 'INSTANTCASH-USER-APP' },
    { action: 'join', room: 'global' },

    // Raw strings
    'subscribe',
    'init',
    'connect'
];

// Discovered URL
const WS_URL = `wss://instantcash.bet/ws/gamingLTSDrawHandler?v=${Date.now()}`;

function testHandshake(payload) {
    return new Promise((resolve) => {
        const ws = new WebSocket(WS_URL);
        let solved = false;

        const cleanup = () => {
            if (!solved) {
                ws.terminate();
                resolve({ payload, success: false, response: null });
            }
        };

        const timeout = setTimeout(cleanup, 5000); // 5s timeout per attempt

        ws.on('open', () => {
            console.log(`[${typeof payload === 'string' ? payload : JSON.stringify(payload)}] Sending...`);
            const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
            ws.send(str);
        });

        ws.on('message', (data) => {
            const msg = data.toString();
            console.log(`[${typeof payload === 'string' ? payload : JSON.stringify(payload)}] RESPONSE: ${msg}`);
            solved = true;
            clearTimeout(timeout);
            ws.terminate();
            resolve({ payload, success: true, response: msg });
        });

        ws.on('error', (err) => {
            console.log(`[${typeof payload === 'string' ? payload : JSON.stringify(payload)}] Error: ${err.message}`);
        });
    });
}

async function runFuzzer() {
    console.log('Starting WebSocket Fuzzer...');
    console.log(`Target: ${WS_URL}`);

    for (const variant of SUB_VARIANTS) {
        await testHandshake(variant);
        await new Promise(r => setTimeout(r, 500)); // Pace it
    }
    console.log('Fuzzer complete.');
}

runFuzzer();
