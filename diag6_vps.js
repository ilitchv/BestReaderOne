const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("--- NGINX-GEN Logs ---");
        const nxLogs = await ssh.execCommand('docker logs nginx-gen --tail 20');
        console.log(nxLogs.stdout);

        console.log("\n--- LE Logs ---");
        const leLogs = await ssh.execCommand('docker logs letsencrypt-nginx-proxy-companion --tail 20');
        console.log(leLogs.stdout);
        if (leLogs.stderr) console.error("LE STDERR:", leLogs.stderr);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
