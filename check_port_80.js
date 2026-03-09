const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Checking port 80...");
        const p80Res = await ssh.execCommand('lsof -i :80 || netstat -tulpn | grep :80');
        console.log(p80Res.stdout);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
