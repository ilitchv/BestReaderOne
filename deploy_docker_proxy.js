const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Starting socat proxy container...");
        const cmd = `docker run -d \\
      --name voice-agent-proxy \\
      --restart=always \\
      --network btcpayserver_default \\
      --add-host host.docker.internal:host-gateway \\
      -e VIRTUAL_HOST=api.beastreaderone.com \\
      -e LETSENCRYPT_HOST=api.beastreaderone.com \\
      -e VIRTUAL_PORT=8081 \\
      alpine/socat \\
      TCP-LISTEN:8081,fork TCP:host.docker.internal:8081`;

        const res = await ssh.execCommand(cmd);
        console.log(res.stdout);
        if (res.stderr) console.error("ERR:", res.stderr);

        // Check if it started
        console.log("Container logs:");
        const logs = await ssh.execCommand('sleep 3 && docker logs voice-agent-proxy');
        console.log(logs.stdout);
        if (logs.stderr) console.error("Logs stderr:", logs.stderr);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
