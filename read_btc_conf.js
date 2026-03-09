const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '168.231.71.31',
            username: 'root',
            password: 'AmigoUnaLuz2468@'
        });

        console.log("Reading default.conf:");
        const cat = await ssh.execCommand('head -n 50 /var/lib/docker/volumes/generated_nginx_conf/_data/default.conf');
        console.log(cat.stdout);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        ssh.dispose();
    }
}
run();
