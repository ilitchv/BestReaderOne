const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Checking Nginx...");
        const ngRes = await ssh.execCommand('ls -la /etc/nginx/sites-enabled');
        console.log(ngRes.stdout);
        if (ngRes.stderr) console.error("ERR:", ngRes.stderr);

        console.log("\nChecking PM2 logs for errors...");
        const logsRes = await ssh.execCommand('pm2 logs voice-agent --lines 20 --nostream');
        console.log(logsRes.stdout);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
