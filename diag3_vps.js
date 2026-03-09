const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Removing proxy container...");
        await ssh.execCommand('docker rm -f voice-agent-proxy');

        console.log("Starting proxy with --expose flag...");
        const cmd = `docker run -d \\
      --name voice-agent-proxy \\
      --restart=always \\
      --expose 8081 \\
      --network generated_default \\
      --add-host host.docker.internal:host-gateway \\
      -e VIRTUAL_HOST=api.beastreaderone.com \\
      -e LETSENCRYPT_HOST=api.beastreaderone.com \\
      -e VIRTUAL_PORT=8081 \\
      alpine/socat \\
      TCP-LISTEN:8081,fork TCP:host.docker.internal:8081`;

        const res = await ssh.execCommand(cmd);
        console.log(res.stdout);

        setTimeout(async () => {
            console.log("Checking if Nginx picked it up now...");
            const grepConf = await ssh.execCommand('grep -A 5 "api.beastreaderone.com" /var/lib/docker/volumes/generated_nginx_conf/_data/default.conf');
            console.log(grepConf.stdout || "STILL NOT FOUND");

            const sslStatus = await ssh.execCommand('ls -la /var/lib/docker/volumes/generated_nginx_certs/_data/api.beastreaderone.com || echo "No certs"');
            console.log("CERTS:", sslStatus.stdout);

            ssh.dispose();
        }, 10000);

    } catch (e) {
        console.error("Error:", e);
        ssh.dispose();
    }
}
run();
