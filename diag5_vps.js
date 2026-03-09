const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Looking for nginx/proxy containers:");
        const psCmd = await ssh.execCommand('docker ps | grep -E "nginx|letsencrypt|proxy|gen"');
        console.log(psCmd.stdout);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
