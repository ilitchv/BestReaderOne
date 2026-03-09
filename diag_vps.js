const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("--- 1. Checking PM2 Process ---");
        const pm2 = await ssh.execCommand('pm2 list');
        console.log(pm2.stdout);

        console.log("\n--- 2. Checking if PM2 is listening on 8081 ---");
        const netstat = await ssh.execCommand('ss -tuln | grep 8081');
        console.log(netstat.stdout);

        console.log("\n--- 3. Checking Socat Proxy Status ---");
        const proxyStatus = await ssh.execCommand('docker ps -a --filter name=voice-agent-proxy');
        console.log(proxyStatus.stdout);

        console.log("\n--- 4. Checking Socat Proxy Logs ---");
        const proxyLogs = await ssh.execCommand('docker logs --tail 20 voice-agent-proxy');
        console.log(proxyLogs.stdout);
        if (proxyLogs.stderr) console.log("Proxy Stderr:", proxyLogs.stderr);

        console.log("\n--- 5. Checking Let's Encrypt Cert Status for domain ---");
        const certLogs = await ssh.execCommand('docker exec generated_letsencrypt-nginx-proxy-companion_1 /app/cert_status || echo "No direct cert status command"');
        const btcpayLogs = await ssh.execCommand('docker logs --tail 50 generated_letsencrypt-nginx-proxy-companion_1 | grep api.beastreaderone.com');
        console.log(btcpayLogs.stdout);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
