const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("--- 1. Checking if api.beastreaderone.com is in Nginx config ---");
        const grepConf = await ssh.execCommand('grep -A 10 "api.beastreaderone.com" /var/lib/docker/volumes/generated_nginx_conf/_data/default.conf');
        console.log(grepConf.stdout || "NOT FOUND");

        console.log("\n--- 2. Curlling locally (HTTP) ---");
        const curlLocal = await ssh.execCommand('curl -v -H "Host: api.beastreaderone.com" http://localhost');
        console.log(curlLocal.stdout);
        if (curlLocal.stderr) console.log("CURL STDERR:", curlLocal.stderr);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
