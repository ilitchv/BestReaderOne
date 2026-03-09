const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Looking at docker-gen logs to see why container is skipped:");
        // If docker-gen skipped it, it might log why if we restart voice-agent-proxy while tailing
        const res = await ssh.execCommand('docker restart voice-agent-proxy && sleep 2 && docker logs nginx-gen --tail 20');
        console.log(res.stdout);

        console.log("Looking closely at the btcpayserver container inspect configs:");
        const inspectStr = await ssh.execCommand('docker inspect generated_btcpayserver_1 | grep -i virtual');
        console.log(inspectStr.stdout);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
