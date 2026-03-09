const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Removing failed container...");
        await ssh.execCommand('docker rm -f voice-agent-proxy');

        console.log("Starting socat proxy container on generated_default network...");
        const cmd = `docker run -d \\
      --name voice-agent-proxy \\
      --restart=always \\
      --network generated_default \\
      --add-host host.docker.internal:host-gateway \\
      -e VIRTUAL_HOST=api.beastreaderone.com \\
      -e LETSENCRYPT_HOST=api.beastreaderone.com \\
      -e VIRTUAL_PORT=8081 \\
      alpine/socat \\
      TCP-LISTEN:8081,fork TCP:host.docker.internal:8081`;

        const res = await ssh.execCommand(cmd);
        console.log(res.stdout);
        if (res.stderr) console.error("ERR:", res.stderr);

        // Trigger btcpay nginx reload just in case
        console.log("Triggering nginx proxy reload to generate SSL...");
        await ssh.execCommand('docker restart generated_nginx_1 generated_letsencrypt-nginx-proxy-companion_1');

        console.log("Waiting 15 seconds for Let's Encrypt generation...");

        setTimeout(async () => {
            const logsCmd = await ssh.execCommand('docker logs generated_letsencrypt-nginx-proxy-companion_1 --tail 50');
            console.log(logsCmd.stdout);

            console.log("Proxy started. SSL should be ready via BTCPay LetsEncrypt companion!");
            ssh.dispose();
        }, 15000);

    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}
run();
